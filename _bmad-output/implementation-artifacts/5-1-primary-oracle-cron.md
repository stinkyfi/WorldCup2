# Story 5.1 — Primary oracle cron

Status: **done**  
Date: 2026-04-28

## Summary

Implemented a primary “oracle cron” runnable that posts group standings on-chain via `OracleController` and logs successes/failures to Postgres.

This initial implementation supports a **staging/dev workflow** via `ORACLE_STAGING_GROUPS_JSON` (rather than fetching api-football.com directly). The production api-football fetch/mapping can be added on top of the same posting + logging plumbing.

## Acceptance criteria coverage (practical)

- **Posts results per group (0–11)**:
  - Checks `OracleController.hasResultsPosted(groupId)` before posting.
  - Posts only missing groups (idempotent at the cron layer; `OracleController` is also idempotent for identical posts).
- **Multi-chain**:
  - Iterates `ORACLE_CHAIN_IDS` and posts to `ORACLE_CONTROLLER_<CHAIN_ID>` using `RPC_URL_<CHAIN_ID>`.
- **Logs success/failure**:
  - Writes to `oracle_posts` (success boolean + tx hash when available).
  - Writes to `oracle_errors` on failures (chainId + groupId + message).

## Implementation notes

### Backend

- `backend/src/cron/primaryOracle.ts`
  - One-shot runnable intended to be invoked by an external scheduler (system cron).
  - Requires:
    - `ORACLE_CHAIN_IDS`
    - `ORACLE_CONTROLLER_<CHAIN_ID>`
    - `RPC_URL_<CHAIN_ID>`
    - `ORACLE_PRIVATE_KEY`
    - `ORACLE_POST_METHOD` (`postResults` or `setResultsForTesting`)
    - `ORACLE_STAGING_GROUPS_JSON` (staging/dev input)
  - Derives deterministic pseudo-addresses for team identities from the staging keys (so rankings can be posted as `address[4]`).

- `backend/src/lib/oracleControllerAbi.ts`
  - Minimal ABI for `hasResultsPosted`, `postResults`, `setResultsForTesting`.

### Database (Prisma)

- `backend/prisma/schema.prisma`
  - Added:
    - `OraclePost` model → `oracle_posts`
    - `OracleError` model → `oracle_errors`
- Migration created via `prisma migrate dev`.

### Package scripts

- `backend/package.json`
  - Added `oracle:primary` → runs the cron via `tsx`.

### Env docs

- `backend/.env.example`
  - Added documented env vars for running the cron.

## Test plan

- `backend`: `npm run lint && npm test && npm run build`
- `db`: `docker compose up -d postgres && npx prisma migrate dev`

## Files changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*_oracle_posts_errors/migration.sql`
- `backend/src/lib/oracleControllerAbi.ts`
- `backend/src/cron/primaryOracle.ts`
- `backend/package.json`
- `backend/.env.example`

