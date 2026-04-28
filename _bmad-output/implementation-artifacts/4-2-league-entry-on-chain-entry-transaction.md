# Story 4.2: League entry — on-chain entry transaction

Status: done

## Story

As a player,
I want to enter a league by paying the entry fee on-chain and submitting a commitment hash,
So that my participation is provable and my predictions remain private until reveal.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2._

## Acceptance criteria coverage

- **FR17 — Player can enter a league**:
  - Entry page performs ERC-20 `approve()` (if needed) and calls `League.enter(commitmentHash)`.
  - UI waits for transaction receipts and reports clear success/failure states.
- **NFR6 — Commitments stored on-chain**:
  - Entry submits a `bytes32` commitment hash to the `League` contract (emits `EntrySubmitted`).
- **UX-DR13 — Plain-English failures + retry**:
  - Common revert reasons (locked/full/per-wallet cap) are mapped to friendly messages.

## Implementation notes

- **Contracts**
  - Uses existing `League.enter(bytes32 commitmentHash)` which transfers `entryFee` via `safeTransferFrom` and emits `EntrySubmitted`.
- **Frontend**
  - Updated `frontend/src/lib/leagueAbi.ts` to include:
    - `enter(bytes32)`
    - `EntrySubmitted` event (for future indexing / UX)
  - Added minimal `erc20Abi` for `allowance()` + `approve()`.
  - Enhanced `frontend/src/pages/LeagueEntryPage.tsx`:
    - Reads `allowance(owner, league)` and determines whether approval is required.
    - Switches chain to the league’s chain before sending transactions.
    - Sends `approve(league, entryFee)` when allowance is insufficient, then calls `enter(commitmentHash)`.
    - Waits for receipts for both transactions via `waitForTransactionReceipt`.
    - Generates a placeholder commitment hash for now (will be replaced by real prediction commitment in later stories).

## Files changed / added

- **Modified**
  - `frontend/src/lib/leagueAbi.ts`
  - `frontend/src/pages/LeagueEntryPage.tsx`
- **Added**
  - `frontend/src/lib/erc20Abi.ts`
  - `_bmad-output/implementation-artifacts/4-2-league-entry-on-chain-entry-transaction.md`

## Test plan

- `contracts`: `npm test`
- `frontend`: `npm run lint && npm test && npm run build`

## Known dev issue (CORS/RPC)

Some default/public RPC endpoints are **not CORS-enabled for browser usage**. When wagmi/viem attempts to perform JSON-RPC calls directly from `http://localhost:5173`, the browser may block the request with a CORS error (example host observed: `eth.merkle.io`), preventing the entry page from loading its on-chain prerequisite reads (ERC-20 allowance).

- **Mitigation direction**: ensure all chains used in the app have explicit, browser-safe RPC URLs in wagmi config (or proxy JSON-RPC via backend in dev).
- **UX follow-up**: distinguish “compliance API status fetch failed” vs “RPC allowance fetch failed” so the user sees the real root cause.

