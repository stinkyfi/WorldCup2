# Story 3.3: Minimum player threshold & refund

Status: done

## Story

As a player,
I want to automatically receive a full refund if a league's minimum player threshold is not met at lock time,
So that I am never trapped in an underpopulated league with no chance of a fair competition.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3._

## Acceptance criteria coverage

- **FR16 — Trigger refunding**: `checkThreshold()` transitions `League` to `Refunding` if `totalEntries < minThreshold` after lock.
- **Refund claim**: `claimRefund()` returns full entry fees to entrants, records claim, emits `RefundClaimed`.
- **UX-DR13**: League detail page shows a prominent refunding banner and a “Claim refund” CTA for eligible connected entrants.
- **Creator fee non-refund**: Only entry fees are refunded; creator creation fee is not refunded (creation fee is paid to dev wallet at create time).
- **Double claim**: Second `claimRefund()` attempt reverts `AlreadyClaimed`.

## Implementation notes

- **Contracts**
  - `contracts/contracts/League.sol`
    - `claimRefund()` now reverts `AlreadyClaimed` when the wallet has already claimed a refund (and `NoRefundDue` when wallet has no entries).
  - `checkThreshold()`/refund logic already existed; tests were updated to match the `AlreadyClaimed` behavior.
- **Frontend**
  - `frontend/src/pages/LeagueDetailPage.tsx` reads league state on-chain and renders:
    - **Refunding banner** when `state == Refunding`
    - **Claim refund** button only when an on-chain simulation of `claimRefund()` succeeds for the connected wallet
    - **Check threshold** button when `state == Active`, `minThreshold > 0`, `totalEntries < minThreshold`, and chain time is past lock.
  - Uses `useBlock()` timestamp (chain time) rather than local `Date.now()` for purity and correctness.
- **ABI**
  - Added minimal `leagueAbi` for `state/lockTime/minThreshold/totalEntries/entryFee` plus `checkThreshold`/`claimRefund`.

## Files changed / added

- **Modified**
  - `contracts/contracts/League.sol`
  - `contracts/test/League.test.ts`
  - `frontend/src/pages/LeagueDetailPage.tsx`
- **Added**
  - `frontend/src/lib/leagueAbi.ts`

## Test plan

- `contracts`: `npm test`
- `frontend`: `npm run lint && npm test && npm run build`

