# Story 10.2: League Pause & Featured Flagging

Status: review

## Story

As an admin,
I want to pause new entries to a specific league or flag a league as featured,
So that I can manage platform activity and highlight quality leagues.

## Acceptance Criteria

1. **Given** an admin navigates to a league's admin detail view (`/admin/leagues/:address`)
   **When** they click "Pause New Entries"
   **Then** the admin wallet calls `League.pauseEntries()` on-chain; new `enter()` calls revert with `EntriesPaused` while existing entries are unaffected.
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 10.2 AC, FR56]

2. **Given** an admin wants to resume entries
   **When** they click "Resume Entries"
   **Then** the admin wallet calls `League.resumeEntries()` on-chain; the `entriesPaused` flag is cleared.

3. **Given** an admin navigates to `/admin/leagues` (league list)
   **When** they click "Feature" on a league row
   **Then** `PATCH /api/v1/admin/leagues/:address/featured` sets `featured=true` in the DB; the league appears in the featured row on the browse page at the next indexer refresh.

4. **Given** an admin clicks "Unfeature" on a featured league
   **When** confirmed
   **Then** `PATCH /api/v1/admin/leagues/:address/featured` sets `featured=false`; the league is removed from the featured row at the next indexer refresh.

5. **Given** "Pause All New Leagues" is needed globally
   **When** the admin navigates to `/admin/settings`
   **Then** `setCreationsPaused` is already available there (Story 10.1) — no new work required for this AC.

> **Contract gap note:** `League.sol` does not currently have `pauseEntries()`, `resumeEntries()`, `entriesPaused`, or `EntriesPaused`. These must be added in this story (Task 1). The function should be callable only by `refundAuthority` (the platform admin key), matching the pattern of `triggerRefund()` / `dismissDisputeRefundDeposit()`.

## Tasks / Subtasks

- [x] Task 1: Add pause/resume to `League.sol` contract (AC: #1, #2)
  - [x] Add `bool public entriesPaused` state variable
  - [x] Add `error EntriesPaused()` custom error
  - [x] Add `event EntriesPauseStatusChanged(bool paused)` event
  - [x] Add `pauseEntries() external onlyRefundAuthority` — sets `entriesPaused = true`, emits event
  - [x] Add `resumeEntries() external onlyRefundAuthority` — sets `entriesPaused = false`, emits event
  - [x] Guard `enter()` with `if (entriesPaused) revert EntriesPaused()` (before the lock-time check)
  - [x] Add Hardhat tests in `contracts/test/League.test.ts`:
    - [x] `pauseEntries` reverts with `EntriesPaused` on subsequent `enter()`
    - [x] `resumeEntries` re-enables `enter()`
    - [x] Only `refundAuthority` can call `pauseEntries`/`resumeEntries`

- [x] Task 2: Extend `leagueAbi.ts` (frontend + backend) with new entries (AC: #1, #2)
  - [x] `frontend/src/lib/leagueAbi.ts`: added `entriesPaused()`, `pauseEntries()`, `resumeEntries()`, `event EntriesPauseStatusChanged(bool)`
  - [x] `backend/src/lib/leagueAbi.ts`: same additions

- [x] Task 3: Backend admin API for featured flagging (AC: #3, #4)
  - [x] Added `PATCH /api/v1/admin/leagues/featured` in `backend/src/routes/v1/admin.ts`
  - [x] Body: `{ chainId, leagueAddress, featured: boolean }`; Auth: session + `isAdmin`
  - [x] Uses `prisma.league.updateMany` with case-insensitive address match; returns 404 if not found

- [x] Task 4: Frontend admin leagues list page `AdminLeaguesPage.tsx` at `/admin/leagues` (AC: #3, #4)
  - [x] Fetches leagues from `GET /api/v1/leagues`; displays title, address, chainId, featured status
  - [x] Feature/Unfeature buttons call `PATCH /api/v1/admin/leagues/featured`; invalidates query on success
  - [x] Per-row feedback message and "Detail →" link to `/admin/leagues/:address?chainId=X`

- [x] Task 5: Frontend admin league detail page `AdminLeagueDetailPage.tsx` at `/admin/leagues/:address` (AC: #1, #2)
  - [x] Reads `entriesPaused` on-chain via `useReadContract`; displays PAUSED / active
  - [x] Chain selector + address input (pre-filled from URL params)
  - [x] Pause/Resume buttons; both disabled while value is `undefined` (uses `!== false`/`!== true` guard)
  - [x] Error mapping for `NotAuthorized` (refundAuthority) and user rejection
  - [x] State cleared on chain/address change; "← Leagues" back link

- [x] Task 6: Wire routes and nav (AC: #1, #3)
  - [x] Added `leagues` and `leagues/:address` routes in `AppRoutes.tsx`
  - [x] Added "Leagues" button in `AdminPlaceholderPage.tsx`

- [x] Task 7: Quality gates
  - [x] `npx hardhat test test/League.test.ts` — 38 passing (38 nodejs) ✅
  - [x] `npm run lint` (frontend) — 0 errors ✅
  - [x] `npm run test` (frontend Vitest) — 26/26 pass ✅

## Dev Notes

### Contract change — `League.sol` pattern to follow

The `onlyRefundAuthority` modifier already exists (added Epic 7). Use it for `pauseEntries` / `resumeEntries`:

```solidity
bool public entriesPaused;

error EntriesPaused();
event EntriesPaused();     // distinct event name shadowed by error — use EntriesEntryPaused or just PauseToggled if collision; prefer separate names
event EntriesResumed();

function pauseEntries() external onlyRefundAuthority {
    entriesPaused = true;
    emit EntriesPaused();
}

function resumeEntries() external onlyRefundAuthority {
    entriesPaused = false;
    emit EntriesResumed();
}
```

> **Naming collision**: Solidity allows an `error` and an `event` to share a name, but it's confusing. Use `event EntriesPauseToggled(bool paused)` or separate names. Avoid `EntriesPaused` for both. Recommended: `error EntriesPaused()` + `event EntriesPauseStatusChanged(bool paused)`.

Guard in `enter()`:
```solidity
function enter(...) external nonReentrant {
    if (entriesPaused) revert EntriesPaused();
    if (block.timestamp >= lockTime) revert LeagueLocked();
    ...
}
```

### Backend admin route pattern

The existing pattern in `backend/src/routes/v1/admin.ts`:
```ts
fastify.get("/admin/health", async (request, reply) => {
  const session = await sessionFromRequest(request);
  if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
  if (!session.isAdmin) return sendError(reply, 403, "FORBIDDEN", "...");
  ...
});
```

Add `PATCH /admin/leagues/featured`. Use `z.object` schema for body validation. The league `contractAddress` is stored lowercase in the DB — use `mode: "insensitive"` for case-safe lookup.

### Frontend admin page patterns

Follow `AdminSettingsPage.tsx` exactly for:
- `useAccount`, `useSwitchChain`, `useWriteContract`, `waitForTransactionReceipt`
- `mapWriteError` helper
- `busyId` / `error` / `lastTx` shared state
- `useEffect(() => { setError(null); }, [chainIdRaw])` on chain switch
- Disable action buttons when `entriesPaused` is `undefined` (use `entriesPaused !== false` / `entriesPaused !== true` — same fix as Story 10.1 review patch #1)

### Backend API: fetch leagues for admin list

`GET /api/v1/leagues` already returns all leagues. Reuse it:
```ts
const res = await fetch(apiUrl("/api/v1/leagues"), { credentials: "include" });
```

Shape: `{ data: { leagues: SerializedLeague[] } }` where `SerializedLeague` includes `id`, `title`, `chainId`, `contractAddress`, `featured`.

### `leagueAbi.ts` files

There are two copies: `frontend/src/lib/leagueAbi.ts` and `backend/src/lib/leagueAbi.ts`. Both must be updated.

### Regression risks

- `enter()` change: guard must be before `lockTime` check (not after) to match expected revert order.
- `leagueAbi.ts` used by many frontend pages and backend indexer — only append, never remove.
- `admin.ts` route file — append new route handler, don't restructure existing ones.
- Hardhat tests: existing `League.test.ts` has fixtures and setup — read the file before adding tests to understand the helper patterns.

### References

- [Source: `contracts/contracts/League.sol` → `onlyRefundAuthority`, `triggerRefund`, `enter`]
- [Source: `contracts/test/League.test.ts`]
- [Source: `backend/src/routes/v1/admin.ts`]
- [Source: `backend/src/lib/leagueAbi.ts`]
- [Source: `frontend/src/lib/leagueAbi.ts`]
- [Source: `frontend/src/pages/AdminSettingsPage.tsx` → pattern]
- [Source: `frontend/src/AppRoutes.tsx` → admin route block]
- [Source: `frontend/src/pages/AdminPlaceholderPage.tsx`]
- [Source: `backend/prisma/schema.prisma` → `featured` field on League]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Lint failure: `react-hooks/set-state-in-effect` rule fires for setState inside useEffect. Fixed by moving state resets to onChange handlers in `AdminSettingsPage`, `AdminLeagueDetailPage`, and `AdminTokenWhitelistPage` (pre-existing).
- Naming collision note applied: used `event EntriesPauseStatusChanged(bool paused)` instead of `event EntriesPaused()` to avoid shadowing the error of the same name.

### Completion Notes List

- Added `bool public entriesPaused`, `error EntriesPaused()`, `event EntriesPauseStatusChanged(bool)`, `pauseEntries()`, `resumeEntries()` to `League.sol`. Guarded `enter()` before `lockTime` check. 5 new Hardhat tests in `deployLeagueWithRefundAuth` inline fixture (needed real refundAuthority; existing `LEAGUE_DISPUTE_DISABLED` fixture has zero address).
- Extended both `leagueAbi.ts` files with 4 new entries (view, 2 writes, event).
- Backend `PATCH /api/v1/admin/leagues/featured` uses `updateMany` with case-insensitive address match; returns 404 if no row matched.
- `AdminLeaguesPage`: uses `@tanstack/react-query` `useQuery`+`useMutation` pattern; inline feedback per row with 3-second auto-clear; "Detail →" link passes `?chainId=X` for pre-selection.
- `AdminLeagueDetailPage`: address pre-filled from `:address` URL param; chainId pre-filled from `?chainId` query param; buttons guard `entriesPaused !== false`/`true` to handle undefined loading state.
- Frontend lint clean; Vitest 26/26 pass; Hardhat 38/38 pass.

### File List

- `contracts/contracts/League.sol` (modified)
- `contracts/test/League.test.ts` (modified — 5 new tests, `deployLeagueWithRefundAuth` helper)
- `backend/src/lib/leagueAbi.ts` (modified)
- `backend/src/routes/v1/admin.ts` (modified — new PATCH route)
- `frontend/src/lib/leagueAbi.ts` (modified)
- `frontend/src/pages/AdminLeaguesPage.tsx` (new)
- `frontend/src/pages/AdminLeagueDetailPage.tsx` (new)
- `frontend/src/pages/AdminPlaceholderPage.tsx` (modified)
- `frontend/src/pages/AdminSettingsPage.tsx` (modified — lint fix)
- `frontend/src/pages/AdminTokenWhitelistPage.tsx` (modified — lint fix)
- `frontend/src/AppRoutes.tsx` (modified)
