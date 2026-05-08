# Story 10.3: Reported League Moderation

Status: ready-for-dev

## Story

As an admin,
I want to review player-reported leagues and action them appropriately,
So that the platform is protected from scam, harmful, or policy-violating leagues.

## Acceptance Criteria

1. **Given** a player navigates to a public league detail page
   **When** they click "Report League"
   **Then** a short report form appears with a reason selector (Scam / Inappropriate / Other) and optional description; submission calls `POST /api/v1/leagues/:address/report` and stores the report in Postgres for admin review (FR60)

2. **Given** an admin navigates to `/admin/reports`
   **When** the panel renders
   **Then** all open reports are listed with: league address, chain, report reason, reporting wallet, and report timestamp (FR57)

3. **Given** an admin selects a report and chooses "Warn Creator"
   **When** the action is taken
   **Then** `PATCH /api/v1/admin/reports/:reportId` with `action: "warn"` sets report status to `warned` and attaches a `warnedAt` timestamp to the league DB row (FR57)

4. **Given** an admin chooses "Pause League"
   **When** confirmed
   **Then** `League.pauseEntries()` is called on-chain by the connected refundAuthority wallet, and the report is marked `paused` via `PATCH /api/v1/admin/reports/:reportId` with `action: "pause"` (FR57)

5. **Given** an admin chooses "Close & Refund"
   **When** confirmed
   **Then** `League.triggerRefund()` is called on-chain and the report is marked `refunded` via `PATCH /api/v1/admin/reports/:reportId` with `action: "refund"` (FR57)

6. **Given** an admin dismisses a report
   **When** confirmed
   **Then** `PATCH /api/v1/admin/reports/:reportId` with `action: "dismiss"` marks the report as `dismissed`; it no longer appears in the open queue (FR57)

## Tasks / Subtasks

- [ ] Task 1: DB schema — add `LeagueReport` model + `warnedAt` on `League` (AC: #1–#6)
  - [ ] Add `LeagueReport` model to `backend/prisma/schema.prisma`:
    - `id` (cuid), `chainId` (Int), `leagueAddress` (String), `reporterWallet` (String), `reason` (String — "Scam"|"Inappropriate"|"Other"), `description` (String?), `status` (String @default("open") — "open"|"warned"|"paused"|"refunded"|"dismissed"), `createdAt` (DateTime @default(now)), `updatedAt` (DateTime @updatedAt)
    - Index on `[chainId, leagueAddress]` and `[status]`
  - [ ] Add `warnedAt DateTime? @map("warned_at")` to the `League` model
  - [ ] Run `npx prisma migrate dev --name add_league_reports` to create migration

- [ ] Task 2: Backend — player report endpoint (AC: #1)
  - [ ] Add `POST /api/v1/leagues/:address/report` in `backend/src/routes/v1/leagues.ts`
    - Requires SIWE auth session (get `reporterWallet = session.address`)
    - Body schema: `{ chainId: number, reason: "Scam"|"Inappropriate"|"Other", description?: string }`
    - Validate `reason` is one of the three allowed values
    - `description` max 500 chars
    - Look up league by `chainId + contractAddress` — return 404 if not found
    - `prisma.leagueReport.create(...)` — return 201 `sendSuccess(reply, { id })`
    - Return 409 if same wallet already reported the same league (unique constraint or check)

- [ ] Task 3: Backend — admin reports API (AC: #2–#6)
  - [ ] Add `GET /api/v1/admin/reports` in `backend/src/routes/v1/admin.ts`
    - Auth: session + `isAdmin`
    - Query param: `status` (default `"open"`, or `"all"`)
    - Returns: reports list with league title (join via leagueAddress+chainId lookup), sorted by `createdAt DESC`
  - [ ] Add `PATCH /api/v1/admin/reports/:reportId` in `backend/src/routes/v1/admin.ts`
    - Auth: session + `isAdmin`
    - Body schema: `{ action: "warn"|"pause"|"refund"|"dismiss" }`
    - Map action → status update in `LeagueReport`
    - For `"warn"`: also set `league.warnedAt = new Date()` via `prisma.league.updateMany({ where: { chainId, contractAddress: { equals: leagueAddress, mode: "insensitive" } }, data: { warnedAt: new Date() } })`
    - For `"pause"` and `"refund"`: update status only in DB — the on-chain tx is performed client-side by admin frontend (separate from the PATCH)
    - Returns: `sendSuccess(reply, { status: newStatus })`

- [ ] Task 4: Frontend — "Report League" button + modal on `LeagueDetailPage.tsx` (AC: #1)
  - [ ] Add a "Report League" `<Button variant="secondary">` just above the "Back to browse" button at the bottom of the page (after `<LeagueDisputePanel>`)
  - [ ] Clicking opens an inline modal/dialog with:
    - Reason `<select>`: Scam / Inappropriate / Other
    - Optional `<textarea>` description (max 500 chars)
    - "Submit Report" button (disabled when submitting)
    - "Cancel" button
  - [ ] Requires SIWE session — if not signed in, show "Sign in to report" message instead
  - [ ] On success: close modal, show a brief "Report submitted — we'll review it." toast/message
  - [ ] On error: show error inside modal
  - [ ] `leagueChainId` and `league.contractAddress` are already available in scope for the POST body

- [ ] Task 5: Frontend — `AdminReportsPage.tsx` at `/admin/reports` (AC: #2–#6)
  - [ ] Fetch `GET /api/v1/admin/reports` via `@tanstack/react-query`
  - [ ] Chain selector (same pattern as `AdminSettingsPage`, `AdminLeaguesPage`)
  - [ ] List open reports in cards: league address, chain, reason, reporter wallet (truncated), timestamp
  - [ ] Per-report action buttons: "Warn Creator", "Pause League", "Close & Refund", "Dismiss"
  - [ ] "Warn Creator" and "Dismiss" are purely backend PATCH calls (no on-chain tx) — use `fetch` mutation
  - [ ] "Pause League" and "Close & Refund": first call `League.pauseEntries()` / `League.triggerRefund()` on-chain via `useWriteContract`, wait for receipt, THEN PATCH report status
  - [ ] For on-chain actions: require connected wallet + chain switch; show "Confirming…" during tx
  - [ ] Error mapping: `NotAuthorized` → "Need refundAuthority wallet connected"; user rejection → "Transaction rejected."
  - [ ] On success: invalidate query, show inline success message
  - [ ] Empty state: "No open reports."

- [ ] Task 6: Wire route, nav, and report count badge (AC: #2)
  - [ ] Add `<Route path="reports" element={<AdminReportsPage />} />` inside `/admin/*` block in `AppRoutes.tsx`
  - [ ] Add "Reports" button to `AdminPlaceholderPage.tsx` linking to `/admin/reports`

- [ ] Task 7: Quality gates
  - [ ] `npx prisma migrate dev --name add_league_reports` succeeds
  - [ ] `npm run lint` (frontend) — zero errors
  - [ ] `npm run test` (frontend Vitest) — all pass

## Dev Notes

### DB Schema Changes

Add to `backend/prisma/schema.prisma`:

```prisma
/// Story 10.3 — player-submitted league reports, queued for admin review (FR57, FR60).
model LeagueReport {
  id             String    @id @default(cuid())
  chainId        Int       @map("chain_id")
  leagueAddress  String    @map("league_address")
  reporterWallet String    @map("reporter_wallet")
  reason         String    // "Scam" | "Inappropriate" | "Other"
  description    String?
  status         String    @default("open") @map("status") // open | warned | paused | refunded | dismissed
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([chainId, leagueAddress], map: "idx_league_reports_chain_league")
  @@index([status], map: "idx_league_reports_status")
  @@map("league_reports")
}
```

Also add to `League` model (below `promotedUntil`):
```prisma
  warnedAt          DateTime? @map("warned_at")
```

> **Migration command**: `npx prisma migrate dev --name add_league_reports` (run from `backend/` directory)

### Backend patterns to follow

**Auth helper** (already in `admin.ts`):
```ts
const session = await sessionFromRequest(request);
if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
if (!session.isAdmin) return sendError(reply, 403, "FORBIDDEN", "...");
```

**For player report endpoint** in `leagues.ts` — the SIWE session gives `session.address` as the wallet. The `POST /api/v1/leagues/:address/report` route can check session for auth; if no session, return 401. The body needs `chainId` and `reason`.

**Avoiding double reports** — add a unique constraint to `LeagueReport` on `[chainId, leagueAddress, reporterWallet]` via Prisma schema, OR do a findFirst check before create. The DB constraint approach is cleaner:
```prisma
@@unique([chainId, leagueAddress, reporterWallet], map: "uniq_report_chain_league_wallet")
```
Then catch Prisma `P2002` (unique constraint violation) and return 409.

**Admin reports response shape:**
```ts
{
  id, chainId, leagueAddress, reporterWallet,
  reason, description, status, createdAt,
  leagueTitle: string | null  // fetched via findFirst on League by chainId+contractAddress
}
```

**PATCH admin report** — only update status fields in DB. The on-chain tx for `pause`/`refund` is done client-side by the admin frontend — the backend PATCH just records what action was taken. This keeps the backend stateless w.r.t. chain state.

### Frontend patterns to follow

**Report modal in `LeagueDetailPage.tsx`**: Keep it inline (no separate component file needed — use a local boolean `showReportModal` state). The form only needs:
- `useState` for `reason`, `description`, `submitting`, `submitted`, `reportError`
- No wagmi — pure `fetch` to the backend API
- Session check: the page already uses `useAccount()` — additionally check if there's a SIWE session via the existing auth query (look at how `LeagueDisputePanel` handles auth; the dispute panel uses `useSiweSession` or checks `session.isAdmin`)

**Finding SIWE session**: look at `LeagueDisputePanel.tsx` or `LeagueEntryPage.tsx` to see how they check for signed-in status.

**AdminReportsPage patterns**: Follow `AdminLeagueDetailPage.tsx` exactly:
- `useReadContract` is NOT needed here (no on-chain reads for display — just backend data)
- `useWriteContract` + `waitForTransactionReceipt` for on-chain actions only
- `@tanstack/react-query` `useQuery` + `useMutation` for backend calls
- Chain selector + address derived from the report row
- `useSwitchChain` before on-chain action
- `mapWriteError` from `AdminSettingsPage` pattern

**The on-chain flow for "Pause League" / "Close & Refund"**: The admin panel already has the league address and chainId from the report. The flow is:
1. Admin clicks "Pause League"
2. Frontend calls `useWriteContract` with `League.pauseEntries()` + waits for receipt
3. On success, frontend calls `PATCH /api/v1/admin/reports/:reportId { action: "pause" }`
4. Invalidate query

**`leagueAbi.ts`** already has `pauseEntries()` and `triggerRefund()` — no ABI changes needed.

### Key files to read before implementing

- `backend/src/routes/v1/leagues.ts` — where to add the `POST /leagues/:address/report` route (look at existing `GET /leagues/:address/entries` for the pattern of looking up by `contractAddress`)
- `backend/src/routes/v1/admin.ts` — where to add admin report routes
- `frontend/src/pages/LeagueDetailPage.tsx` — where to add the Report button (bottom of page, above "Back to browse")
- `frontend/src/components/LeagueDisputePanel.tsx` — how the dispute panel checks SIWE session (to replicate for the report form auth check)
- `frontend/src/pages/AdminLeagueDetailPage.tsx` — exact pattern for on-chain write in admin panel
- `frontend/src/pages/AdminLeaguesPage.tsx` — exact pattern for mutation + query invalidation

### Existing `leagueAbi.ts` — no changes needed

`frontend/src/lib/leagueAbi.ts` already includes:
- `function pauseEntries()` ✓
- `function triggerRefund()` ✓

### Regression risks

- `LeagueDetailPage.tsx`: Adding the Report button is additive — only risk is layout. Place it between `<LeagueDisputePanel>` and the "Back to browse" button.
- `leagues.ts`: Adding a new `POST` route to an existing route file — append only, do not restructure existing routes.
- `admin.ts`: Same — append new routes without touching existing handlers.
- `schema.prisma`: Adding a new model and a nullable field to `League` — both are backwards-compatible (nullable field, new table). The migration will NOT affect existing rows since `warnedAt` defaults to `null`.

### Dispute panel auth pattern (for Report form)

Looking at `LeagueDisputePanel.tsx`, it likely reads `useAccount` from wagmi and checks if the user is connected. For the report form, the requirement is that the player be SIWE signed in (so we have `session.address` for `reporterWallet`). Check `frontend/src/lib/siweSession.ts` or similar for how the frontend knows if the user has a valid SIWE session.

If there's a `useSiweSession` hook or similar, use it. Otherwise, the route requires session and will return 401 — the frontend can show the 401 response as a "Sign in first" message.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` → Story 10.3 ACs, FR57, FR60]
- [Source: `backend/prisma/schema.prisma` → Dispute model as pattern for LeagueReport]
- [Source: `backend/src/routes/v1/admin.ts` → admin auth pattern, PATCH featured pattern]
- [Source: `backend/src/routes/v1/leagues.ts` → player route patterns]
- [Source: `frontend/src/pages/AdminLeagueDetailPage.tsx` → on-chain write pattern]
- [Source: `frontend/src/pages/AdminLeaguesPage.tsx` → mutation + invalidation pattern]
- [Source: `frontend/src/pages/LeagueDetailPage.tsx` → page structure, where to add Report button]
- [Source: `frontend/src/lib/leagueAbi.ts` → pauseEntries, triggerRefund already present]
- [Source: `frontend/src/pages/AdminSettingsPage.tsx` → mapWriteError, chain selector]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `backend/prisma/schema.prisma` (modified)
- `backend/prisma/migrations/` (new migration)
- `backend/src/routes/v1/leagues.ts` (modified — new report POST route)
- `backend/src/routes/v1/admin.ts` (modified — GET reports + PATCH report)
- `frontend/src/pages/LeagueDetailPage.tsx` (modified — Report button + modal)
- `frontend/src/pages/AdminReportsPage.tsx` (new)
- `frontend/src/AppRoutes.tsx` (modified)
- `frontend/src/pages/AdminPlaceholderPage.tsx` (modified)
