# Story 8.3: Creator & Dev Fee Claim

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or dev wallet operator,
I want to claim my fee allocation via Merkle proof,
so that my portion of the prize pool is accessible without manual distribution from a central party.

## Acceptance Criteria

1. **Given** a league has resolved and the Merkle root is posted  
   **When** the creator navigates to their creator dashboard for that league  
   **Then** a claim section shows their claimable 3% fee amount and a "Claim Fee" button.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.3 AC]

2. **Given** the creator clicks "Claim Fee"  
   **When** the transaction confirms  
   **Then** `League.claimFee(amount, proof)` transfers the creator fee to their wallet and the claim is marked used.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.3 AC]

3. **Given** the dev wallet operator submits a claim across multiple resolved leagues  
   **When** `claimFee` is called per league  
   **Then** each league's dev fee is independently claimable — no batching required by the contract.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.3 AC]

4. **Given** a creator fee or dev fee claim is confirmed  
   **When** the confirmation is received  
   **Then** a success message is shown; for creators, the dashboard updates to show "Fee claimed" status.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.3 AC]

5. **Given** `ReentrancyGuard` is applied to `claimFee`  
   **When** a re-entrancy attack is attempted via a malicious ERC-20 receive hook  
   **Then** the second call reverts — funds are not double-spent.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.3 AC]

## Tasks / Subtasks

- [x] Task 1: Backend: expose fee Merkle leaf + proof for creator/dev (AC: #1, #2, #3)
  - [x] Add `GET /api/v1/merkle-claim/fee` analogous to prize route, but keyed by `claimType: 1`.
  - [x] Ensure response includes token symbol/decimals and league title (match prize response shape where possible).
  - [x] Ensure `NO_FEE_LEAF` (or equivalent) response for non-eligible wallets.

- [x] Task 2: Frontend: creator dashboard fee claim UI (AC: #1, #4)
  - [x] Add a fee claim section to `frontend/src/pages/LeagueCreatorDashboardPage.tsx` (or the existing creator dashboard component) that:
    - [x] checks `merkleRoot` is posted
    - [x] fetches the fee leaf/proof
    - [x] calls `League.claimFee(amountWei, proof)` via wagmi
    - [x] shows “Fee claimed” after success

- [ ] Task 3: Frontend: dev wallet fee claim UI or tooling (AC: #3, #4)
  - [ ] Decide on UI surface:
    - [ ] Option A: admin/dev-only page to claim per league
    - [ ] Option B: CLI/scripted workflow that iterates resolved leagues
  - [ ] Implement the chosen surface without batching requirements.

- [x] Task 4: Tests (AC: #1, #2)
  - [x] Backend DB test similar to `backend/test/merkleClaim.route.db.test.ts` for fee claim endpoint.

## Dev Notes

- `claimType` mapping must match `contracts/contracts/League.sol`:
  - `claimPrize` uses `claimType = 0`
  - `claimFee` uses `claimType = 1`
- `merkle_claims` table already supports `claim_type` and uniqueness per `(chainId, leagueAddress, claimantAddress, claimType)`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` → Epic 8 / Story 8.3]
- [Source: `contracts/contracts/League.sol` → `claimFee`]
- [Source: `backend/prisma/schema.prisma` → `model MerkleClaim`]
- [Source: `backend/src/routes/v1/merkleClaim.ts` (prize baseline)]

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

### Completion Notes List

 - Backend: added `GET /api/v1/merkle-claim/fee` (claimType=1) in `backend/src/routes/v1/merkleClaim.ts`.
 - Backend: added DB-backed tests in `backend/test/merkleFeeClaim.route.db.test.ts` and ensured tests don’t race with prize-claim tests by using unique addresses.
 - Frontend: added Creator fee claim section to `frontend/src/pages/LeagueCreatorDashboardPage.tsx`, including `claimFee` tx flow and basic error mapping.
 - Frontend: added `frontend/src/lib/merkleFeeClaim.ts` fetch wrapper.
 - Validations: `backend npm test` ✅, `frontend npm test` ✅, `frontend npm run lint` ✅.

### File List

 - backend/src/routes/v1/merkleClaim.ts
 - backend/test/merkleFeeClaim.route.db.test.ts
 - frontend/src/lib/merkleFeeClaim.ts
 - frontend/src/pages/LeagueCreatorDashboardPage.tsx
 - _bmad-output/implementation-artifacts/8-3-creator-and-dev-fee-claim.md

## Review checklist — 2026-05-07

| AC | Result | Evidence |
|---|--------|----------|
| 1 Fee claim section on creator dashboard | Done | `LeagueCreatorDashboardPage` fee claim card; shown after Merkle root is posted. |
| 2 `claimFee` tx confirms, marked used | Done | `writeContractAsync(claimFee)`; `AlreadyClaimed` maps to plain-English. |
| 3 Dev fee independently claimable | Done | Per-league `claimType=1` leaf; no batching. |
| 4 Success message shown | Done | `feeSuccess` state renders tx hash after confirmation. |

Code review patch: `feeQuery.refetch` (stable ref) used in `useCallback` deps instead of full `feeQuery` object. Task 3 (dev wallet UI) intentionally deferred. Backend + frontend tests — pass.

