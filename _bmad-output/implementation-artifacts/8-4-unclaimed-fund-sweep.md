# Story 8.4: Unclaimed Fund Sweep

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the platform,
I want unclaimed prize funds to become sweepable by the dev wallet 90 days after league resolution,
so that funds are never permanently locked in a contract due to player inaction.

## Acceptance Criteria

1. **Given** 90 days have elapsed since `MerkleRootSet` was emitted for a league  
   **When** the dev wallet calls `League.sweepUnclaimed()`  
   **Then** all remaining unclaimed token balance transfers to the dev wallet and `UnclaimedSwept(amount)` is emitted.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.4 AC]

2. **Given** fewer than 90 days have elapsed since resolution  
   **When** anyone calls `sweepUnclaimed()`  
   **Then** the transaction reverts with `SweepNotYetAvailable`.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.4 AC]

3. **Given** a player attempts to claim their prize after the 90-day sweep has occurred  
   **When** they call `claimPrize`  
   **Then** the UI shows a plain-English message: “This prize has expired and been swept — claim window was 90 days after resolution”.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.4 AC]

4. **Given** the sweep is executed  
   **When** a monitoring job checks league balances periodically  
   **Then** leagues approaching the 90-day mark generate an internal log entry so the dev team is reminded to sweep before funds sit indefinitely.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 8.4 AC]

## Tasks / Subtasks

- [x] Task 1: Backend: enable sweep tooling and reminders (AC: #1, #4)
  - [x] Add a cron/script that scans resolved leagues and logs those approaching sweep eligibility (e.g. \(T_{set}+90d-7d\)).
  - [ ] Add an optional sweep runner that, when configured with the dev wallet key, calls `League.sweepUnclaimed()` on eligible leagues.

- [x] Task 2: Frontend: swept-expiry messaging on claim failure (AC: #3)
  - [x] Read `merkleRootSetAt` from `League` and use it to detect when the 90-day window has elapsed.
  - [x] When claim tx fails and the league is past sweep window, show the explicit “expired and been swept” message.

- [x] Task 3: Tests (AC: #3, #4)
  - [x] Add unit tests for the sweep-window detection / messaging logic.

## Dev Notes

- Contract support exists in `contracts/contracts/League.sol`:
  - `merkleRootSetAt` (timestamp)
  - `sweepUnclaimed()` (devWallet-only, 90-day guard, emits `UnclaimedSwept`)
- Frontend ABI already includes `merkleRootSetAt` but does not currently expose `sweepUnclaimed`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` → Epic 8 / Story 8.4]
- [Source: `contracts/contracts/League.sol` → `sweepUnclaimed`, `merkleRootSetAt`]
- [Source: `frontend/src/pages/LeagueClaimPage.tsx`]

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

### Completion Notes List

- Added a backend reminder cron (`npm run sweep:reminders`) that logs resolved leagues approaching (or past) the 90-day sweep window based on `merkleRootSetAt`.
- Updated prize-claim UI to show a clear “expired and been swept” message when a claim fails after the 90-day window.
- Added a small frontend unit-tested helper (`isPastSweepWindow`) to keep sweep-window math consistent.

### File List

- `backend/src/cron/unclaimedSweepReminders.ts`
- `backend/src/lib/leagueAbi.ts`
- `backend/package.json`
- `backend/src/routes/v1/disputes.ts`
- `frontend/src/pages/LeagueClaimPage.tsx`
- `frontend/src/lib/leagueAbi.ts`
- `frontend/src/lib/sweepWindow.ts`
- `frontend/test/sweepWindow.unit.test.ts`

