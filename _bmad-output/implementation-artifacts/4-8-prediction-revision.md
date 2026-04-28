# Story 4.8 — Prediction revision

Status: **done**  
Date: 2026-04-28

## Summary

Implemented prediction revision for an existing entry slot before lock time, respecting each league’s on-chain `revisionPolicy` and `revisionFee`.

## Acceptance criteria coverage

- **Revisions are gated by policy**
  - Reads `revisionPolicy` and `revisionFee` from the league contract.
  - If `revisionPolicy == Locked`, revisions are disabled and the on-chain call reverts with `RevisionsLocked`.
- **Revisions are gated by lock time**
  - Contract reverts with `LeagueLocked` when called at/after `lockTime`.
- **Paid revisions charge the fee**
  - When `revisionPolicy == Paid`, `revise()` charges `revisionFee` (in entry token smallest units) using `safeTransferFrom`.
- **Revision updates the on-chain commitment**
  - `revise(entryIndex, newCommitmentHash)` updates the stored commitment for that entry index.

## Implementation notes

### Contracts

- `contracts/contracts/League.sol`
  - Stores per-wallet commitments as an array, aligned with each wallet’s entry index.
  - On `enter(commitmentHash)`:
    - pushes the commitment into storage for the sender
    - emits the existing `EntrySubmitted` event
  - Adds:
    - `revise(uint256 entryIndex, bytes32 newCommitmentHash)`
    - `walletEntryCount(address wallet)` (view)
    - `commitmentOf(address wallet, uint256 entryIndex)` (view)
    - `EntryRevised(player, entryIndex, commitmentHash, feePaid)` event
    - custom errors `RevisionsLocked()` and `InvalidEntryIndex()`

### Frontend

- `frontend/src/lib/leagueAbi.ts`
  - Extended minimal ABI with:
    - `revisionPolicy()`, `revisionFee()`
    - `walletEntryCount(address)`, `commitmentOf(address,uint256)`
    - `revise(uint256,bytes32)` and `EntryRevised` event
- `frontend/src/lib/predictionCommitment.ts`
  - Extended stored entry metadata to optionally include `entryIndex` (on-chain index).
  - Preserves `entryIndex` when re-saving predictions for the same `entryId`.
  - Added helpers:
    - `setEntryIndexInStorage(...)`
    - `getEntryIndexFromStorage(...)`
- `frontend/src/pages/LeagueEntryPage.tsx`
  - Reads `walletEntryCount` before `enter()` and stores `entryIndex = walletEntryCountBefore` after success.
- `frontend/src/pages/LeaguePredictPage.tsx`
  - Adds an “Update on-chain (revise)” action after submitting predictions:
    - Requires an `entryIndex` for the current `entryId` (i.e. the user has already entered with that slot)
    - For paid revisions: performs ERC-20 `approve(revisionFee)` if needed
    - Calls `League.revise(entryIndex, newCommitmentHash)`

## Test plan

- **Contracts**: `npm test` in `contracts/` passes.
- **Frontend**: `npm run lint`, `npm run test`, `npm run build` in `frontend/` passes.

## Files changed

- `contracts/contracts/League.sol`
- `frontend/src/lib/leagueAbi.ts`
- `frontend/src/lib/predictionCommitment.ts`
- `frontend/src/pages/LeagueEntryPage.tsx`
- `frontend/src/pages/LeaguePredictPage.tsx`

