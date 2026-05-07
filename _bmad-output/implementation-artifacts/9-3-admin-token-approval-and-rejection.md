# Story 9.3: Admin Token Approval & Rejection

Status: done

## Story

As an admin,  
I want to approve or reject pending whitelist requests with automatic fee refund on rejection,  
so that only safe, suitable tokens are available for league creation.

## Acceptance Criteria

1. **Given** an admin views a pending whitelist request  
   **When** they inspect the token  
   **Then** the system has run auto-detection for fee-on-transfer and rebase token patterns and displays a warning flag if detected.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.3]

2. **Given** an admin approves a request  
   **When** they confirm the approval  
   **Then** the admin wallet calls on-chain approval for that request; the token becomes whitelisted on that chain and `TokenApproved` is emitted.  
   (Per-chain contract: `approveRequest(requestId)` — equivalent to PRD `approveToken` on the correct chain.)  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.3]

3. **Given** an admin rejects a request  
   **When** they confirm the rejection  
   **Then** the admin wallet calls the reject function on-chain; the submission fee is refunded (exact escrow) to the requester and `TokenRejected` is emitted.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.3]

4. **Given** an admin rejects a request when the fee token is fee-on-transfer  
   **When** the refund is processed  
   **Then** the contract refunds the exact balance received at request time so accounting stays consistent and the tx does not revert on balance mismatch.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.3]

## Tasks / Subtasks

- [x] Task 1: Contracts — escrow, `approveRequest`, `rejectRequest`, `TokenRejected`
- [x] Task 2: Backend — admin-gated bytecode surface-risk endpoint (FR53 heuristics)
- [x] Task 3: Frontend — `/admin/token-whitelist` with risk hints + approve/reject txs
- [x] Task 4: Tests + lint (contracts, backend, frontend)

## Review checklist — 2026-05-07

Re-verified against `WhitelistRegistry.sol`, `/api/v1/admin/token-surface-risk`, `AdminTokenWhitelistPage`, bytecode helper tests.

| AC | Result | Evidence |
|---|--------|----------|
| 1 Fee-on-transfer / rebase hints | Done | `/admin/token-whitelist`: `analyzeBytecodeHex`, warnings + `feeOnTransferLikely` / `rebaseLikely`; admin session required. |
| 2 Approve request | Done | Owner calls `approveRequest`; `TokenApproved`; pending cleared. |
| 3 Reject + refund | Done | `rejectRequest`; `feeEscrowed` refunded; `TokenRejected`. |
| 4 FoT refund amount | Done | Balance-delta escrow on submit; contract test rejects without revert; FoT ERC20 harness in tests. |

Additional hardening in the registry (same rollout as 9.2 contract work): **`approveToken`** reverts **`TokenHasPendingWhitelistRequest`** if a queued request exists (owner uses `approveRequest`).

Contracts: Hardhat whitelist tests — **pass**. Backend: `npm run test:unit` incl. bytecode — **pass** (full `npm test` needs Postgres). Frontend: Vitest — **pass**.

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Completion Notes List

- Whitelist requests now store `feeEscrowed` (balance delta on submit) for FoT-safe refunds on reject.
- Admin UI calls `GET /api/v1/admin/token-surface-risk` (SIWE + `isAdmin`) for bytecode heuristics; on-chain actions require the registry **owner** wallet (typically platform deployer), which may differ from app “admin” — operators should use the owner key for approve/reject txs.
- Off-chain `whitelisted_tokens` DB is unchanged; syncing on-chain approvals into the API list is a separate operational/indexer concern.

### File List

- `contracts/contracts/WhitelistRegistry.sol`
- `contracts/test/WhitelistRegistry.test.ts`
- `backend/src/lib/tokenBytecodeSurface.ts`
- `backend/src/routes/v1/admin.ts`
- `backend/test/tokenBytecodeSurface.unit.test.ts`
- `frontend/src/lib/whitelistRegistryAbi.ts`
- `frontend/src/lib/fetchTokenSurfaceRisk.ts`
- `frontend/src/pages/AdminTokenWhitelistPage.tsx`
- `frontend/src/AppRoutes.tsx`
- `frontend/src/pages/AdminPlaceholderPage.tsx`
