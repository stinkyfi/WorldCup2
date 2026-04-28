import test from "node:test";
import assert from "node:assert/strict";
import {
  assignCompetitionRanks,
  rankEntriesWithTiebreaker,
  splitEqualPrize,
} from "../src/indexer/tiebreaker.js";

test("rankEntriesWithTiebreaker: points desc then distance asc", () => {
  const ranked = rankEntriesWithTiebreaker({
    actualTotalGoals: 20,
    entries: [
      { walletAddress: "0xbbb", entryIndex: 0, totalPoints: 10, tiebreakerTotalGoals: 25 }, // dist 5
      { walletAddress: "0xaaa", entryIndex: 0, totalPoints: 11, tiebreakerTotalGoals: 50 }, // dist 30
      { walletAddress: "0xccc", entryIndex: 0, totalPoints: 10, tiebreakerTotalGoals: 22 }, // dist 2
    ],
  });

  assert.equal(ranked[0]?.walletAddress, "0xaaa"); // higher points
  assert.equal(ranked[1]?.walletAddress, "0xccc"); // same points, smaller distance
  assert.equal(ranked[2]?.walletAddress, "0xbbb");
});

test("assignCompetitionRanks: 1224 placement", () => {
  const ranks = assignCompetitionRanks([
    { totalPoints: 11, distance: 1 },
    { totalPoints: 10, distance: 2 },
    { totalPoints: 10, distance: 2 },
    { totalPoints: 10, distance: 9 },
  ]);
  assert.deepEqual(ranks, [1, 2, 2, 4]);
});

test("splitEqualPrize: dust remainder returned", () => {
  const s = splitEqualPrize({ totalPrizeWei: 10n, tiedCount: 3 });
  assert.equal(s.eachWei, 3n);
  assert.equal(s.dustWei, 1n);
});

