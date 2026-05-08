# Story 10.2: League Pause & Featured Flagging

Status: ready-for-dev

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

- [ ] Task 1: Add pause/resume to `League.sol` contract (AC: #1, #2)
  - [ ] Add `bool public entriesPaused` state variable
  - [ ] Add `error EntriesPaused()` custom error
  - [ ] Add `event EntriesPaused()` and `event EntriesResumed()` events
  - [ ] Add `pauseEntries() external onlyRefundAuthority` — sets `entriesPaused = true`, emits `EntriesPaused`
  - [ ] Add `resumeEntries() external onlyRefundAuthority` — sets `entriesPaused = false`, emits `EntriesResumed`
  - [ ] Guard `enter()` with `if (entriesPaused) revert EntriesPaused()` (before the lock-time check)
  - [ ] Add Hardhat tests in `contracts/test/League.test.ts`:
    - [ ] `pauseEntries` reverts with `EntriesPaused` on subsequent `enter()`
    - [ ] `resumeEntries` re-enables `enter()`
    - [ ] Only `refundAuthority` can call `pauseEntries`/`resumeEntries`

- [ ] Task 2: Extend `leagueAbi.ts` (frontend + backend) with new entries (AC: #1, #2)
  - [ ] `frontend/src/lib/leagueAbi.ts`: add `entriesPaused() view returns (bool)`, `pauseEntries()`, `resumeEntries()`, `event EntriesPaused()`, `event EntriesResumed()`
  - [ ] `backend/src/lib/leagueAbi.ts`: same additions

- [ ] Task 3: Backend admin API for featured flagging (AC: #3, #4)
  - [ ] Add `PATCH /api/v1/admin/featured` (or `PATCH /api/v1/admin/leagues/featured`) in `backend/src/routes/v1/admin.ts`
    - Body: `{ chainId, leagueAddress, featured: boolean }`
    - Auth: session + `isAdmin`
    - Action: `prisma.league.updateMany({ where: { chainId, contractAddress: { equals: leagueAddress, mode: "insensitive" } }, data: { featured } })`
    - Returns: `sendSuccess(reply, { featured })`
  - [ ] Add unit test (or DB test) covering: toggles featured, rejects non-admin

- [ ] Task 4: Frontend admin leagues list page `AdminLeaguesPage.tsx` at `/admin/leagues` (AC: #3, #4)
  - [ ] Fetch leagues from `GET /api/v1/leagues` (existing endpoint, returns all leagues)
  - [ ] Display a table: league title, address, chainId, featured status
  - [ ] "Feature" / "Unfeature" button per row — calls `PATCH /api/v1/admin/leagues/featured`
  - [ ] On success, refetch list and show last action feedback
  - [ ] "View detail" link per row → `/admin/leagues/:address`

- [ ] Task 5: Frontend admin league detail page `AdminLeagueDetailPage.tsx` at `/admin/leagues/:address` (AC: #1, #2)
  - [ ] Read `entriesPaused` on-chain via `useReadContract`; display current status
  - [ ] Chain selector (Base / Ethereum / Sonic) — same pattern as `AdminSettingsPage`
  - [ ] "Pause New Entries" button → calls `pauseEntries()` via `writeContractAsync`; wait for receipt; refresh read
  - [ ] "Resume Entries" button → calls `resumeEntries()` similarly
  - [ ] Both buttons disabled when `entriesPaused` is undefined (loading) — same pattern as Story 10.1 review fix
  - [ ] Error mapping: `OwnableUnauthorizedAccount` → clarify refundAuthority key needed; `user rejected`
  - [ ] "Back to leagues" link → `/admin/leagues`

- [ ] Task 6: Wire routes and nav (AC: #1, #3)
  - [ ] Add `<Route path="leagues" element={<AdminLeaguesPage />} />` and `<Route path="leagues/:address" element={<AdminLeagueDetailPage />} />` inside `/admin/*` block in `AppRoutes.tsx`
  - [ ] Add "Leagues" button to `AdminPlaceholderPage.tsx` linking to `/admin/leagues`

- [ ] Task 7: Quality gates
  - [ ] `npx hardhat test test/League.test.ts` — pass
  - [ ] `npm run lint` (frontend) — zero new errors
  - [ ] `npm run test` (frontend Vitest) — all pass

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

### Debug Log References

### Completion Notes List

### File List

- `contracts/contracts/League.sol`
- `contracts/test/League.test.ts`
- `backend/src/lib/leagueAbi.ts`
- `backend/src/routes/v1/admin.ts`
- `frontend/src/lib/leagueAbi.ts`
- `frontend/src/pages/AdminLeaguesPage.tsx` (new)
- `frontend/src/pages/AdminLeagueDetailPage.tsx` (new)
- `frontend/src/pages/AdminPlaceholderPage.tsx`
- `frontend/src/AppRoutes.tsx`
