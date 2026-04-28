# Story 5.4 — Telegram failure alerts

Status: **done**  
Date: 2026-04-28

## Summary

Added a backend monitoring runner that checks each chain/group for overdue oracle posting and sends an alert via Telegram (bot API) or a generic webhook. Alert send failures are logged to a new `alert_errors` table and never crash the monitor.

## Acceptance criteria coverage

- **Detect missing results after expected deadline**
  - Reads `OracleController.expectedDeadline(groupId)` and `hasResultsPosted(groupId)` for groups 0–11.
  - When `now > expectedDeadline` and results are missing, an alert is sent.
- **Send Telegram alert**
  - Supports `TELEGRAM_WEBHOOK_URL` **or** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
- **Failures are logged and do not crash monitor**
  - Any alert send failure is recorded in `alert_errors`.
  - The runner continues checking remaining groups/chains.

## Implementation notes

### Backend

- `backend/src/cron/telegramAlerts.ts`
  - One-shot runnable intended to be invoked by an external scheduler.
  - Uses `ORACLE_CHAIN_IDS`, `ORACLE_CONTROLLER_<CHAIN_ID>`, and `RPC_URL_<CHAIN_ID>` to discover deployments.
  - Skips groups with `expectedDeadline == 0` (unset).

- `backend/src/lib/oracleControllerAbi.ts`
  - Added `expectedDeadline(uint8)` to ABI for monitoring reads.

### Database

- `backend/prisma/schema.prisma`
  - Added `AlertError` model → `alert_errors` table.
  - Migration created via `prisma migrate dev`.

### Scripts / env docs

- `backend/package.json`
  - Added `alerts:telegram`.
- `backend/.env.example`
  - Documented Telegram/webhook env vars.

## Test plan

- `backend`: `npm run lint && npm run test && npm run build`
- `db`: `npx prisma migrate dev`

## Files changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*_alert_errors/migration.sql`
- `backend/src/lib/oracleControllerAbi.ts`
- `backend/src/cron/telegramAlerts.ts`
- `backend/package.json`
- `backend/.env.example`

