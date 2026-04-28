## Story 6.1: Indexer — Score Calculation Engine

### Summary
Introduces the first indexer component: a `ResultsPosted` listener that replays on-chain events, scores all stored entries for the resolved group, and writes per-entry per-group rows into Postgres.

### Database
- **New tables**
  - `entries`: stores prediction payload preimages (needed to compute scores off-chain).
  - `scores`: per entry per group points (+ perfect bonus flag).
  - `indexer_state`: per-chain cursor (`last_processed_block`) for crash-safe replay.
- **New field**
  - `leagues.last_calculated_at`: freshness timestamp for leaderboard reads.

### Backend API (entry payload capture)
Because the chain only stores commitment hashes, the backend needs the prediction preimage to score later. A minimal API is added to store it:
- `POST /api/v1/entries`
  - Upserts an entry payload keyed by `(chainId, leagueAddress, walletAddress, entryIndex)`
  - Validates the provided commitment matches `keccak256(stableJson(payload))`
- `GET /api/v1/entries/by-league?chainId=...&leagueAddress=...` (debug helper)

Files:
- `backend/src/lib/predictionCommitment.ts`
- `backend/src/routes/v1/entries.ts`
- `backend/src/routes/v1/index.ts`

### Indexer (ResultsPosted → scores)
- **Script**: `backend/src/indexer/resultsPostedListener.ts`
- **Behavior**
  - Reads `ORACLE_CHAIN_IDS`, `RPC_URL_<chainId>`, `ORACLE_CONTROLLER_<chainId>`
  - Loads `indexer_state.last_processed_block` per chain
  - Replays `OracleController.ResultsPosted` logs from `(last_processed_block + 1)` to `latest`
  - For each log:
    - Scores each stored entry for that chain for the given `groupId`
      - \(1\) point per correct position
      - \(+1\) bonus when all 4 positions match
    - Upserts `scores` keyed by `(chainId, leagueAddress, walletAddress, entryIndex, groupId)`
    - Updates `indexer_state.last_processed_block`

Scoring implementation:
- `backend/src/indexer/scoring.ts` uses the same deterministic team-key→address mapping (`wc2:${teamKey}`) as the oracle cron.

### Tests
- Added unit coverage for scoring:
  - `backend/test/scoring.test.ts`

### Notes / Follow-ups
- The story mentions `ResultsOverridden`; the contract currently only exposes `ResultsPosted`. When `ResultsOverridden` is implemented, we’ll add a parallel listener path that recomputes the affected group scores.

