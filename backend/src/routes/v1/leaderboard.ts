import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";

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
};

