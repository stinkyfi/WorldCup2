import type { Address } from "viem";
import { getAddress } from "viem";
import { computeFeeBreakdown } from "../lib/leagueFees.js";
import { splitEqualPrize } from "./tiebreaker.js";

export type LeaderboardPayoutRow = {
  walletAddress: string;
  rank: number;
};

export type PayoutLeaf = {
  claimant: Address;
  amountWei: bigint;
  claimType: 0 | 1;
};

/**
 * Aggregated Merkle leaves for a league: player prizes (claimType 0) and fees (claimType 1).
 * Prize pool is split evenly across distinct competition ranks ≤ `prizeRankLimit`, then evenly
 * within ties; dust (FR63) rolls into the dev fee leaf.
 */
export function buildLeaguePayoutLeaves(params: {
  prizeRankLimit: number;
  leaderboardRows: LeaderboardPayoutRow[];
  entryFeeWei: bigint;
  entryCount: number;
  creatorFeeBps: number;
  devFeeBps: number;
  creatorAddress: Address;
  devWalletAddress: Address;
}): PayoutLeaf[] {
  const {
    prizeRankLimit,
    leaderboardRows,
    entryFeeWei,
    entryCount,
    creatorFeeBps,
    devFeeBps,
    creatorAddress,
    devWalletAddress,
  } = params;

  if (entryCount <= 0) return [];

  const breakdown = computeFeeBreakdown({
    entryFeeWei,
    creatorFeeBps,
    devFeeBps,
  });

  const prizePoolWei = BigInt(breakdown.prizePoolAmountWei) * BigInt(entryCount);
  const creatorWei = BigInt(breakdown.creatorFeeAmountWei) * BigInt(entryCount);
  let devWei = BigInt(breakdown.devFeeAmountWei) * BigInt(entryCount);

  const prizeScoped = leaderboardRows.filter((r) => r.rank >= 1 && r.rank <= prizeRankLimit);
  const ranksDistinct = [...new Set(prizeScoped.map((r) => r.rank))].sort((a, b) => a - b);

  const prizeByWallet = new Map<string, bigint>();

  if (ranksDistinct.length === 0) {
    devWei += prizePoolWei;
  } else {
    const sliceWei = prizePoolWei / BigInt(ranksDistinct.length);
    devWei += prizePoolWei - sliceWei * BigInt(ranksDistinct.length);

    for (const rank of ranksDistinct) {
      const rowsAtRank = prizeScoped.filter((r) => r.rank === rank);
      const { eachWei, dustWei } = splitEqualPrize({
        totalPrizeWei: sliceWei,
        tiedCount: rowsAtRank.length,
      });
      devWei += dustWei;
      for (const row of rowsAtRank) {
        const k = row.walletAddress.toLowerCase();
        prizeByWallet.set(k, (prizeByWallet.get(k) ?? 0n) + eachWei);
      }
    }
  }

  const leaves: PayoutLeaf[] = [];
  for (const [w, amt] of prizeByWallet) {
    if (amt > 0n) {
      leaves.push({
        claimant: getAddress(w as `0x${string}`),
        amountWei: amt,
        claimType: 0,
      });
    }
  }

  const feeByWallet = new Map<string, bigint>();
  if (creatorWei > 0n) {
    feeByWallet.set(creatorAddress.toLowerCase(), creatorWei);
  }
  if (devWei > 0n) {
    const k = devWalletAddress.toLowerCase();
    feeByWallet.set(k, (feeByWallet.get(k) ?? 0n) + devWei);
  }
  for (const [addrLower, amt] of feeByWallet) {
    if (amt > 0n) {
      leaves.push({
        claimant: getAddress(addrLower as `0x${string}`),
        amountWei: amt,
        claimType: 1,
      });
    }
  }

  leaves.sort((a, b) => {
    const ca = a.claimant.toLowerCase().localeCompare(b.claimant.toLowerCase());
    if (ca !== 0) return ca;
    if (a.claimType !== b.claimType) return a.claimType - b.claimType;
    return a.amountWei === b.amountWei ? 0 : a.amountWei < b.amountWei ? -1 : 1;
  });

  return leaves;
}
