## Story 6.4: Tiebreaker Split Logic

### Summary
Leaderboard recomputation in **`resultsPostedListener`** now optionally applies **tiebreaker distance** (predicted vs actual total group-stage goals) when **`GROUP_STAGE_ACTUAL_TOTAL_GOALS`** is set, assigns **1224-style competition ranks** so fully tied rows share a rank, and exposes **`tied`** on **`GET /api/v1/leaderboard`** with a **“Tied”** badge on **`LeagueLeaderboardPage`**.

### Indexer
- **`assignCompetitionRanks`** (`backend/src/indexer/tiebreaker.ts`): maps ordered `{ totalPoints, distance }[]` → ranks with ties sharing placement.
- **`rankEntriesWithTiebreaker`** unchanged except docs — still sorts by score then distance.
- **`resultsPostedListener`**: loads **`tiebreakerTotalGoals`** from **`entries`**; if env actual-goals present, ranks via tiebreaker + competition ranks; else keeps dense **1…N** ordering by score + wallet/index (tiebreaker inactive).

### Env
- **`GROUP_STAGE_ACTUAL_TOTAL_GOALS`**: optional integer; documented in **`backend/.env.example`**.

### API / UI
- Leaderboard rows include **`tied: boolean`** when more than one row shares the same **`rank`**.
- Tooltip explains linkage to **`GROUP_STAGE_ACTUAL_TOTAL_GOALS`**.

### Tests
- **`backend/test/tiebreaker.test.ts`**: **`assignCompetitionRanks`** 1224 example.

### Follow-ups
- Persist actual total goals per tournament/league when oracle/API supplies them (avoid global env).
- Epic 8 Merkle builder should reuse **`splitEqualPrize`** for wei splits among tied payout slots.
