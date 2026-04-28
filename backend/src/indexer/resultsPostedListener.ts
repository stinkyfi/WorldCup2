import "dotenv/config";
import { prisma } from "../db.js";
import { computeGroupScore } from "./scoring.js";
import { createPublicClient, getAddress, http, type Address } from "viem";
import { oracleControllerAbi } from "../lib/oracleControllerAbi.js";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

export async function runResultsPostedIndexerOnce(params?: { chainId?: number }): Promise<void> {
  const chainIds = params?.chainId ? [params.chainId] : parseCsvInts(mustGetEnv("ORACLE_CHAIN_IDS"));

  for (const chainId of chainIds) {
    const controller = getAddress(mustGetEnv(`ORACLE_CONTROLLER_${chainId}`)) as Address;
    const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    const state = await prisma.indexerState.upsert({
      where: { chainId },
      create: { chainId, lastProcessedBlock: 0n },
      update: {},
      select: { id: true, lastProcessedBlock: true },
    });

    const latest = await publicClient.getBlockNumber();
    if (latest <= state.lastProcessedBlock) continue;

    const logs = await publicClient.getLogs({
      address: controller,
      event: oracleControllerAbi[0] as never,
      fromBlock: state.lastProcessedBlock + 1n,
      toBlock: latest,
    });

    for (const log of logs) {
      const args = (log as unknown as { args?: { groupId?: number; rankings?: Address[] } }).args;
      const groupId = Number(args?.groupId);
      const rankings = args?.rankings as Address[] | undefined;
      if (!Number.isFinite(groupId) || groupId < 0 || groupId > 11) continue;
      if (!rankings || rankings.length !== 4) continue;
      const actual = [rankings[0]!, rankings[1]!, rankings[2]!, rankings[3]!] as const;
      const groupLetter = "ABCDEFGHIJKL"[groupId]!;

      // Fetch all stored entries for leagues on this chain (we only have leagueAddress, not leagueId).
      const entries = await prisma.entry.findMany({
        where: { chainId },
        select: { leagueAddress: true, walletAddress: true, entryIndex: true, groups: true },
      });

      for (const e of entries) {
        const groups = e.groups as unknown as Record<string, [string, string, string, string]>;
        const predicted = groups[groupLetter];
        if (!predicted) continue;

        const score = computeGroupScore({
          groupId,
          predictedTeamKeys: predicted,
          actualRankings: actual,
        });

        await prisma.score.upsert({
          where: {
            chainId_leagueAddress_walletAddress_entryIndex_groupId: {
              chainId,
              leagueAddress: e.leagueAddress,
              walletAddress: e.walletAddress,
              entryIndex: e.entryIndex,
              groupId,
            },
          },
          create: {
            chainId,
            leagueAddress: e.leagueAddress,
            walletAddress: e.walletAddress,
            entryIndex: e.entryIndex,
            groupId,
            points: score.points,
            perfectBonus: score.perfectBonus,
          },
          update: {
            points: score.points,
            perfectBonus: score.perfectBonus,
            calculatedAt: new Date(),
          },
        });
      }

      // Recompute leaderboard rows for all leagues in this chain (simple + safe; optimize later if needed).
      const leagueAddresses = Array.from(new Set(entries.map((e) => e.leagueAddress)));
      for (const leagueAddress of leagueAddresses) {
        const leagueEntries = entries.filter((e) => e.leagueAddress === leagueAddress);
        if (leagueEntries.length === 0) continue;

        const totals = await Promise.all(
          leagueEntries.map(async (e) => {
            const sum = await prisma.score.aggregate({
              where: {
                chainId,
                leagueAddress,
                walletAddress: e.walletAddress,
                entryIndex: e.entryIndex,
              },
              _sum: { points: true },
            });
            return { ...e, totalPoints: Number(sum._sum.points ?? 0) };
          }),
        );

        totals.sort((a, b) => b.totalPoints - a.totalPoints || a.walletAddress.localeCompare(b.walletAddress) || a.entryIndex - b.entryIndex);

        for (let i = 0; i < totals.length; i++) {
          const t = totals[i]!;
          const newRank = i + 1;
          const existing = await prisma.leaderboardRow.findUnique({
            where: {
              chainId_leagueAddress_walletAddress_entryIndex: {
                chainId,
                leagueAddress,
                walletAddress: t.walletAddress,
                entryIndex: t.entryIndex,
              },
            },
            select: { rank: true },
          });

          await prisma.leaderboardRow.upsert({
            where: {
              chainId_leagueAddress_walletAddress_entryIndex: {
                chainId,
                leagueAddress,
                walletAddress: t.walletAddress,
                entryIndex: t.entryIndex,
              },
            },
            create: {
              chainId,
              leagueAddress,
              walletAddress: t.walletAddress,
              entryIndex: t.entryIndex,
              totalPoints: t.totalPoints,
              rank: newRank,
              prevRank: existing?.rank ?? null,
            },
            update: {
              totalPoints: t.totalPoints,
              rank: newRank,
              prevRank: existing?.rank ?? null,
            },
          });
        }
      }

      // Best-effort: update per-league freshness timestamp.
      await prisma.league
        .updateMany({
          where: { chainId, contractAddress: { not: null } },
          data: { lastCalculatedAt: new Date() },
        })
        .catch(() => undefined);
    }

    await prisma.indexerState.update({
      where: { chainId },
      data: { lastProcessedBlock: latest },
    });
  }
}

if (process.argv[1] && process.argv[1].includes("resultsPostedListener")) {
  await runResultsPostedIndexerOnce();
}

