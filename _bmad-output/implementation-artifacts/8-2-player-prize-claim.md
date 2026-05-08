# Story 8.2: Player Prize Claim

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a winning player,
I want to claim my prize by submitting a Merkle proof through the app,
so that I receive my winnings trustlessly without needing admin approval.

## Acceptance Criteria

1. **Given** a league has resolved and the Merkle root is posted  
   **When** a winning player navigates to the league's claim page  
   **Then** a `<ClaimPanel>` is shown with their claimable amount in the league token, an estimated USD value, and a "Claim Prize" button.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.2 AC]

2. **Given** the player clicks "Claim Prize"  
   **When** the transaction is prepared  
   **Then** the backend provides the player's Merkle proof from `merkle_claims`; the frontend calls `League.claimPrize(amount, proof)` from the player's wallet.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.2 AC]  
   [Source: `backend/src/routes/v1/merkleClaim.ts`]

3. **Given** the claim transaction is confirmed  
   **When** the UI receives confirmation  
   **Then** the player sees a success state with the claimed amount, a shareable claim card, and the claim is marked used in the contract — no double-claim is possible.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.2 AC]

4. **Given** a player attempts to claim twice with the same proof  
   **When** the second call is made  
   **Then** the contract reverts with `AlreadyClaimed` and the UI shows a plain-English error.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.2 AC]

5. **Given** a player is not in the winners list (no Merkle leaf)  
   **When** they navigate to the claim page  
   **Then** a message "You did not finish in a prize position" is shown — no claim CTA is displayed.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.2 AC]

## Tasks / Subtasks

- [x] Task 1: Verify claim page wiring and UX states (AC: #1, #5)
  - [x] Confirm claim route exists and is reachable via router: `frontend/src/pages/LeagueClaimPage.tsx` (`frontend/src/AppRoutes.tsx`)
  - [x] Confirm `ClaimPanel` renders with amount + USD approx when eligible: `frontend/src/components/ClaimPanel.tsx`
  - [x] Confirm ineligible state shows “You did not finish in a prize position.” with no claim button.
  - [x] Confirm unresolved state messaging when Merkle root is zero (`merkleRoot == 0x00..00`).

- [x] Task 2: Verify backend Merkle proof fetch behavior (AC: #2, #5)
  - [x] Confirm `GET /api/v1/merkle-claim/prize` returns:
    - [x] `eligible: false` + `reason: "NO_PRIZE_LEAF"` when no row exists
    - [x] `eligible: true` with `amountWei`, `proof`, and token metadata when row exists
  - [x] Ensure stored proof JSON validation is enforced (`0x` + 32 bytes per entry).

- [x] Task 3: Verify on-chain claim invocation and error mapping (AC: #2, #4)
  - [x] Confirm claim tx uses `League.claimPrize(amountWei, proof)` with correct `chainId` and waits for receipt.
  - [x] Confirm revert parsing maps `AlreadyClaimed` and `InvalidProof` to plain-English UI strings.

- [x] Task 4: Add/extend tests (AC: #2, #5)
  - [x] Backend: merkle claim route tests cover eligible + ineligible states (`backend/test/merkleClaim.route.db.test.ts`).
  - [x] Frontend (if test harness exists): `npm test` (Vitest) passes; no additional claim-specific render tests added in this pass.

## Dev Notes

- **Existing implementation baseline (already present in repo)**:
  - Backend route: `backend/src/routes/v1/merkleClaim.ts` (reads `merkle_claims` and returns `{ eligible, amountWei, proof, ... }`).
  - Frontend fetch wrapper: `frontend/src/lib/merklePrizeClaim.ts`.
  - Claim page: `frontend/src/pages/LeagueClaimPage.tsx` (reads `merkleRoot`, fetches claim data, writes `claimPrize`, renders `<ClaimPanel>`).
  - UI panel: `frontend/src/components/ClaimPanel.tsx` (shows claimable state + success/share state).

- **Dependencies / constraints**:
  - No new dependencies without approval.
  - Contract guarantees no double-claim via `AlreadyClaimed` revert (claim leaf reuse).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` → Epic 8 / Story 8.2]
- [Source: `backend/src/routes/v1/merkleClaim.ts`]
- [Source: `frontend/src/pages/LeagueClaimPage.tsx`]
- [Source: `frontend/src/components/ClaimPanel.tsx`]
- [Source: `frontend/src/lib/merklePrizeClaim.ts`]

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

### Completion Notes List

- Verified Story 8.2 is implemented end-to-end:
  - Frontend route `/league/:address/claim` exists and renders `LeagueClaimPage` under `RequireSiwe`.
  - Backend `GET /api/v1/merkle-claim/prize` reads `merkle_claims` and returns eligible/ineligible responses.
  - Claim transaction calls `League.claimPrize(amountWei, proof)` and maps key revert reasons to plain-English UI messages.
- Tests:
  - `backend npm test` ✅
  - `frontend npm test` ✅ (Vitest)
  - `frontend npm run lint` ❌ (pre-existing lint errors outside this story’s scope)

### File List

- _bmad-output/implementation-artifacts/8-2-player-prize-claim.md

## Review checklist — 2026-05-07

| AC | Result | Evidence |
|---|--------|----------|
| 1 ClaimPanel shown with amount + USD | Done | `LeagueClaimPage` → `ClaimPanel` renders amount when `eligible: true`. |
| 2 Backend provides proof | Done | `GET /api/v1/merkle-claim/prize` returns `amountWei` + `proof`; frontend calls `claimPrize`. |
| 3 Success state + no double-claim | Done | Contract `AlreadyClaimed` revert; UI maps to plain-English. |
| 4 AlreadyClaimed plain-English | Done | `claimErrorMessage` maps `AlreadyClaimed` and `InvalidProof`. |
| 5 No leaf → message shown | Done | `eligible: false` renders "You did not finish in a prize position." |

Verification pass (no code delta). Code review patch: removed unnecessary `BigInt(x as unknown as bigint)` double-cast for `merkleRootSetAt`. Frontend Vitest — pass.
