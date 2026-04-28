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
 * Sort rule (Story 6.4):
 * - Higher totalPoints first
 * - Then smaller tiebreaker distance first
 * - If still tied (same score + same distance), entries are considered fully tied (stable order by wallet+index)
 */
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

