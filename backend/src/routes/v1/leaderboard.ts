import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { createPublicClient, getAddress, http, type Address } from "viem";
import { oracleControllerAbi } from "../../lib/oracleControllerAbi.js";
import { addressToTeamKey } from "../../indexer/scoring.js";
import { groupLetterFromId } from "../../lib/worldCupGroups.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

/** Story 6.2 — leaderboard read model (written by indexer, read by API). */
export const leaderboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/leaderboard", async (request, reply) => {
    const q = z
      .object({
        chainId: z.string().regex(/^\\d+$/),
        leagueAddress: addressSchema,
      })
      .safeParse(request.query);
    if (!q.success) throw q.error;
    const chainId = Number(q.data.chainId);
    const leagueAddress = q.data.leagueAddress.toLowerCase();

    const league = await prisma.league.findFirst({
      where: { chainId, contractAddress: { equals: leagueAddress, mode: "insensitive" } },
      select: { lastCalculatedAt: true },
    });

    const rows = await prisma.leaderboardRow.findMany({
      where: { chainId, leagueAddress },
      orderBy: [{ rank: "asc" }],
      select: { walletAddress: true, entryIndex: true, totalPoints: true, rank: true, prevRank: true, updatedAt: true },
    });

    return sendSuccess(reply, {
      lastUpdatedAt: league?.lastCalculatedAt?.toISOString() ?? null,
      rows: rows.map((r) => ({
        walletAddress: r.walletAddress,
        entryIndex: r.entryIndex,
        totalPoints: r.totalPoints,
        rank: r.rank,
        rankDelta: r.prevRank ? r.prevRank - r.rank : 0,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  fastify.get("/leaderboard/health", async (_request, reply) => {
    // Quick sanity endpoint: helps detect "indexer not running" in dev.
    const count = await prisma.leaderboardRow.count();
    if (count === 0) {
      return sendError(reply, 404, "NOT_READY", "No leaderboard rows yet. Run the indexer after results post.");
    }
    return sendSuccess(reply, { ok: true, count });
  });

  fastify.get("/leaderboard/breakdown", async (request, reply) => {
    const q = z
      .object({
        chainId: z.string().regex(/^\\d+$/),
        leagueAddress: addressSchema,
        walletAddress: addressSchema,
        entryIndex: z.string().regex(/^\\d+$/),
      })
      .safeParse(request.query);
    if (!q.success) throw q.error;
    const chainId = Number(q.data.chainId);
    const leagueAddress = q.data.leagueAddress.toLowerCase();
    const walletAddress = q.data.walletAddress.toLowerCase();
    const entryIndex = Number(q.data.entryIndex);

    const entry = await prisma.entry.findUnique({
      where: {
        chainId_leagueAddress_walletAddress_entryIndex: {
          chainId,
          leagueAddress,
          walletAddress,
          entryIndex,
        },
      },
    });
    if (!entry) return sendError(reply, 404, "NOT_FOUND", "Entry not found.");

    const controller = getAddress(process.env[`ORACLE_CONTROLLER_${chainId}`] ?? "") as Address;
    const rpcUrl = process.env[`RPC_URL_${chainId}`] ?? "";
    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    const predictedGroups = entry.groups as unknown as Record<string, [string, string, string, string]>;

    const groups = await Promise.all(
      Array.from({ length: 12 }).map(async (_, groupId) => {
        const letter = groupLetterFromId(groupId);
        const predicted = letter ? predictedGroups[letter] ?? null : null;

        const scoreRow = await prisma.score.findUnique({
          where: {
            chainId_leagueAddress_walletAddress_entryIndex_groupId: {
              chainId,
              leagueAddress,
              walletAddress,
              entryIndex,
              groupId,
            },
          },
          select: { points: true, perfectBonus: true },
        });

        let posted: boolean | null = null;
        let actualTeamKeys: [string | null, string | null, string | null, string | null] | null = null;
        try {
          posted = await publicClient.readContract({
            address: controller,
            abi: oracleControllerAbi,
            functionName: "hasResultsPosted",
            args: [groupId],
          });
          if (posted) {
            const res = await publicClient.readContract({
              address: controller,
              abi: oracleControllerAbi,
              functionName: "getResults",
              args: [groupId],
            });
            const a = res as unknown as [Address, Address, Address, Address];
            actualTeamKeys = [
              addressToTeamKey({ groupId, address: a[0] }),
              addressToTeamKey({ groupId, address: a[1] }),
              addressToTeamKey({ groupId, address: a[2] }),
              addressToTeamKey({ groupId, address: a[3] }),
            ];
          }
        } catch {
          // keep nulls
        }

        return {
          groupId,
          groupLabel: letter ? `Group ${letter}` : `Group ${groupId}`,
          predicted,
          actual: actualTeamKeys,
          status: posted === true ? "posted" : posted === false ? "pending" : "unknown",
          points: scoreRow?.points ?? null,
          perfectBonus: scoreRow?.perfectBonus ?? null,
        };
      }),
    );

    return sendSuccess(reply, {
      entry: { walletAddress: entry.walletAddress, entryIndex: entry.entryIndex, tiebreakerTotalGoals: entry.tiebreakerTotalGoals },
      groups,
    });
  });
};

