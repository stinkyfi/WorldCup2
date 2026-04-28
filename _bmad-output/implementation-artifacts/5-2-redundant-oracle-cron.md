# Story 5.2 — Redundant oracle cron

Status: **done**  
Date: 2026-04-28

## Summary

Added a redundant “backup” oracle cron runner intended to run on an independent scheduler/host. It uses the same on-chain posting + Postgres logging logic as the primary cron, but records `oracle_posts.source = 'redundant'` for auditability.

## Acceptance criteria coverage

- **Skips groups already posted (no duplicate gas spend)**
  - Uses `OracleController.hasResultsPosted(groupId)` and only posts when missing.
- **Independent process**
  - Separate runnable: `npm run oracle:redundant`
  - Designed to be deployed/scheduled separately from the primary.
- **Audit logs identify redundant source**
  - `oracle_posts` now includes a `source` field: `primary | redundant | manual`
  - Redundant runner logs `source='redundant'`.

## Implementation notes

### Database

- `OraclePost` now includes `source` (default `primary`) stored in Postgres as `oracle_posts.source`.

### Backend cron runners

- `backend/src/cron/primaryOracle.ts`
  - Refactored to export `runOracleCron({ source })` so multiple entrypoints can reuse the exact logic.
- `backend/src/cron/redundantOracle.ts`
  - Calls `runOracleCron({ source: 'redundant' })`

### Scripts

- `backend/package.json`
  - Added `oracle:redundant`.

## Test plan

- `backend`: `npm run lint && npm test && npm run build`
- `db`: `npx prisma migrate reset` (dev) applies migrations cleanly, including the `source` column.

## Files changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*_oracle_posts_source/migration.sql`
- `backend/src/cron/primaryOracle.ts`
- `backend/src/cron/redundantOracle.ts`
- `backend/package.json`
- `backend/.env.example`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

