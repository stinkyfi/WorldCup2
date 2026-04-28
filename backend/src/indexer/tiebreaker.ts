export type RankedEntryKey = {
  walletAddress: string;
  entryIndex: number;
};

export type RankedEntry = RankedEntryKey & {
  totalPoints: number;
  tiebreakerTotalGoals: number;
};

export function tiebreakerDistance(params: { predictedTotalGoals: number; actualTotalGoals: number }): number {
  const { predictedTotalGoals, actualTotalGoals } = params;
  return Math.abs(predictedTotalGoals - actualTotalGoals);
}

/**
 * Assign competition ranks ("1224" style): ties share rank; next rank skips occupied slots.
 * Requires entries sorted strongest-first (same order as rankEntriesWithTiebreaker output).
 * Story 6.4 — FR63: identical score + identical tiebreaker distance ⇒ same displayed rank.
 */
export function assignCompetitionRanks(
  ordered: ReadonlyArray<{ totalPoints: number; distance: number }>,
): number[] {
  if (ordered.length === 0) return [];
  const ranks: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    if (i === 0) ranks.push(1);
    else {
      const prev = ordered[i - 1]!;
      const cur = ordered[i]!;
      if (cur.totalPoints === prev.totalPoints && cur.distance === prev.distance) ranks.push(ranks[i - 1]!);
      else ranks.push(i + 1);
    }
  }
  return ranks;
}

/** Sort strongest-first: points desc, tiebreaker distance asc, then wallet/index for deterministic order. */
export function rankEntriesWithTiebreaker(params: {
  entries: RankedEntry[];
  actualTotalGoals: number;
}): Array<RankedEntry & { distance: number }> {
  const withDistance = params.entries.map((e) => ({
    ...e,
    distance: tiebreakerDistance({ predictedTotalGoals: e.tiebreakerTotalGoals, actualTotalGoals: params.actualTotalGoals }),
  }));

  withDistance.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.distance !== b.distance) return a.distance - b.distance;
    const aw = a.walletAddress.toLowerCase();
    const bw = b.walletAddress.toLowerCase();
    if (aw !== bw) return aw.localeCompare(bw);
    return a.entryIndex - b.entryIndex;
  });

  return withDistance;
}

/**
 * Split prize among entries that are fully tied (same score + same tiebreaker distance).
 * Returns per-entry payouts and a `dustWei` remainder that should be allocated to dev wallet (FR63).
 */
export function splitEqualPrize(params: {
  totalPrizeWei: bigint;
  tiedCount: number;
}): { eachWei: bigint; dustWei: bigint } {
  if (params.tiedCount <= 0) return { eachWei: 0n, dustWei: params.totalPrizeWei };
  const eachWei = params.totalPrizeWei / BigInt(params.tiedCount);
  const dustWei = params.totalPrizeWei - eachWei * BigInt(params.tiedCount);
  return { eachWei, dustWei };
}

