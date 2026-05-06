# Story 8.1: Indexer — Merkle Tree Build & Root Posting

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the platform,
I want the indexer to build a Merkle tree of all payout amounts and post the root on-chain after the dispute window cleanly closes,
so that all claimants can independently verify and claim their allocation without trusting any central party.

## Acceptance Criteria

1. **Given** the 24-hour dispute window has expired with no open disputes (or all disputes are resolved)  
   **When** the indexer detects this condition  
   **Then** it builds a Merkle tree using `merkletreejs` with leaves of `(address, amount)` for all winners, the creator (3% fee), and the dev wallet (2% fee), computes the root, and calls `League.setMerkleRoot(bytes32 root)` on-chain.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → “Story 8.1: Indexer — Merkle Tree Build & Root Posting”]

2. **Given** the Merkle root is posted on-chain  
   **When** `MerkleRootSet(root)` is emitted  
   **Then** the league transitions to `Resolved` state and the indexer stores all leaf data (address, amount, proof) in the `merkle_claims` Postgres table keyed by `(chain_id, league_address, claimant_address, claim_type)`.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.1 AC]  
   [Source: `backend/prisma/schema.prisma` → `model MerkleClaim`]

3. **Given** two or more entries are tied (equal score and tiebreaker distance)  
   **When** the Merkle tree is built  
   **Then** the prize pool portion for those positions is split equally; any indivisible remainder (dust) goes to the dev wallet leaf.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.1 AC]  
   [Source: `backend/src/indexer/buildLeaguePayoutLeaves.ts` → dust handling]

4. **Given** the indexer is the only system that calls `setMerkleRoot`  
   **When** any other address (including admin) attempts to call `setMerkleRoot` directly  
   **Then** the contract reverts — root posting is exclusively the indexer's role.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.1 AC]  
   [Source: `contracts/contracts/League.sol` → `setMerkleRoot` checks `msg.sender == devWallet`]

5. **Given** a dispute override has changed group results  
   **When** the dispute window closes after the override  
   **Then** the indexer rebuilds the Merkle tree from the recalculated scores before posting the root.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.1 AC]

## Tasks / Subtasks

- [x] Task 1: Confirm current Merkle root posting flow matches AC gates (AC: #1, #4)
  - [x] Read `backend/src/indexer/merklePoster.ts` end-to-end and map its current gate conditions to the ACs.
  - [x] Ensure the “only indexer posts root” invariant is enforced by contract + indexer behavior (dev wallet key usage) and documented in Dev Notes.

- [x] Task 2: Add “no open disputes” / “all disputes settled” gating before posting root (AC: #1, #5)
  - [x] Implement on-chain dispute check for each league before posting root:
    - [x] Use `League.disputeCount()` and `League.disputeAt(i)` to detect any `settled == false`.
    - [x] If any open disputes exist, skip posting root for that league (leave clear log line).
  - [x] Ensure the check is compatible with “disputes disabled” case (i.e. deposit token zero / no disputes) without blocking.

- [x] Task 3: Ensure leaf materialization and DB persistence fully match `MerkleClaim` schema (AC: #2)
  - [x] Verify the `merkle_claims` write path stores:
    - [x] `claimant_address` lowercased
    - [x] `amount_wei` as bigint
    - [x] `claim_type` values aligned with `League.sol` (0=prize, 1=fee)
    - [x] `proof_json` as JSON array of hashes
    - [x] `leaf_hex`, `merkle_root_hex`, `tx_hash`
  - [x] Verify uniqueness behavior matches Prisma constraint (`@@unique([chainId, leagueAddress, claimantAddress, claimType])`).

- [x] Task 4: Tests for dispute gating + persistence (AC: #1, #2, #4, #5)
  - [x] Add unit/integration tests covering:
    - [x] league skipped when an unsettled dispute exists
    - [x] league allowed when all disputes are settled
    - [x] persisted `merkle_claims` rows match expected count and keys
  - [x] Extend/align with existing Merkle and payout tests:
    - [x] `backend/test/buildLeaguePayoutLeaves.unit.test.ts`
    - [x] `backend/test/merkleOz.unit.test.ts`

## Dev Notes

- **Existing implementation baseline**:
  - `backend/src/indexer/merklePoster.ts`: posts root via `setMerkleRoot` and writes `merkle_claims`.
  - `backend/src/indexer/buildLeaguePayoutLeaves.ts`: constructs leaves, splits ties, rolls dust into dev fee leaf (FR63).
  - `contracts/contracts/League.sol`: `setMerkleRoot` restricted to `devWallet`, emits `MerkleRootSet`, sets `state = Resolved`.
  - `backend/prisma/schema.prisma`: `MerkleClaim` model and uniqueness constraints; migration exists at `backend/prisma/migrations/20260428235217_merkle_claims/migration.sql`.

- **Important guardrails**:
  - Indexer MUST NOT post root until dispute window is closed and there are no unresolved disputes (or disputes are disabled for the league).
  - Do not add new third-party dependencies without approval.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` → Epic 8 / Story 8.1]
- [Source: `_bmad-output/planning-artifacts/architecture.md` → Indexer responsibilities; Merkle tree + root posting]
- [Source: `backend/src/indexer/merklePoster.ts`]
- [Source: `backend/src/indexer/buildLeaguePayoutLeaves.ts`]
- [Source: `contracts/contracts/League.sol` → `setMerkleRoot`, disputes]
- [Source: `backend/prisma/schema.prisma` → `model MerkleClaim`]

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

### Completion Notes List

 - Added an explicit “unsettled disputes” gate to `backend/src/indexer/merklePoster.ts` before posting `setMerkleRoot`, using `League.disputeCount()` / `League.disputeAt()` and skipping when disputes are disabled.
 - Added a focused unit test suite for dispute gating in `backend/test/merklePoster.disputes.unit.test.ts`.
 - Full backend test suite requires local Postgres on `localhost:5433`. `docker compose up -d` failed because Docker Engine was not available on this machine.

### File List

- backend/src/indexer/merklePoster.ts
- backend/test/merklePoster.disputes.unit.test.ts
- _bmad-output/implementation-artifacts/8-1-indexer-merkle-tree-build-and-root-posting.md
