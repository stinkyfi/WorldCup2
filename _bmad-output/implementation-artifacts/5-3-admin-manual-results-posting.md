# Story 5.3 — Admin manual results posting

Status: **done**  
Date: 2026-04-28

## Summary

Implemented the first version of the admin “manual oracle” path:

- **Contracts**: `OracleController.postResults(...)` can now be called by the **owner** as well as the configured `oracle` address.
- **Backend**: admin-gated helper endpoint to provide dev/staging standings from `ORACLE_STAGING_GROUPS_JSON`.
- **Frontend**: `/admin/oracle` page that can prefill a group’s standings and submit an on-chain `postResults` tx from the admin wallet.

This is a staging/dev-friendly implementation; the api-football.com prefill integration can be added in a follow-up story without changing the on-chain posting mechanics.

## Acceptance criteria coverage

- **Admin can manually post results via admin panel**
  - Admin route exists at `/admin/oracle`.
  - Posting is done via wallet-signed tx calling `OracleController.postResults(groupId, rankings)`.
- **Pre-filled form**
  - In dev/staging, the form can be prefilled from backend `ORACLE_STAGING_GROUPS_JSON` via an admin-gated endpoint.
  - (api-football.com prefill is deferred; plumbing is in place.)
- **Access control**
  - Frontend `/admin/*` routes are already SIWE + admin-gated (`RequireSiwe` + `RequireAdmin`).
  - Backend prefill endpoint is admin-gated as well.

## Implementation notes

### Contracts

- `contracts/contracts/OracleController.sol`
  - `postResults()` is now callable by:
    - the configured `oracle` address **or**
    - the contract `owner()` (admin/manual fallback)
  - Uses the same idempotency + conflict protections as before.

- `contracts/test/OracleController.test.ts`
  - Added coverage: **owner can post results**.

### Backend

- `backend/src/routes/v1/admin.ts`
  - Added `GET /api/v1/admin/oracle/staging-groups`
  - Requires session + `isAdmin == true`
  - Returns `{ groups: ORACLE_STAGING_GROUPS_JSON }` (validated JSON)

### Frontend

- `frontend/src/pages/AdminOraclePage.tsx`
  - Allows selecting group id 0–11
  - Prefill from `staging-groups` endpoint
  - Converts team keys → deterministic pseudo-addresses and calls `postResults`
  - Requires `VITE_ORACLE_CONTROLLER_<CHAIN_ID>` env var for the current chain

- `frontend/src/pages/AdminPlaceholderPage.tsx`
  - Updated to link to `/admin/oracle`

- `frontend/src/AppRoutes.tsx`
  - Added nested route: `/admin/oracle`

### Env vars

- `frontend/.env.example`
  - Added `VITE_ORACLE_CONTROLLER_<CHAIN_ID>` placeholders.

## Test plan

- **Contracts**: `npm test` in `contracts/`
- **Backend**: `npm run lint && npm run test && npm run build` in `backend/`
- **Frontend**: `npm run lint && npm run test && npm run build` in `frontend/`

## Files changed

- `contracts/contracts/OracleController.sol`
- `contracts/test/OracleController.test.ts`
- `backend/src/routes/v1/admin.ts`
- `frontend/src/pages/AdminOraclePage.tsx`
- `frontend/src/pages/AdminPlaceholderPage.tsx`
- `frontend/src/AppRoutes.tsx`
- `frontend/src/lib/adminOracle.ts`
- `frontend/src/lib/oracleControllerAbi.ts`
- `frontend/src/lib/oracleEnv.ts`
- `frontend/.env.example`

