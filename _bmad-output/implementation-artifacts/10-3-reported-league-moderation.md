# Story 10.3: Reported League Moderation

Status: review

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

- [x] Task 1: DB schema — add `LeagueReport` model + `warnedAt` on `League` (AC: #1–#6)
  - [x] Added `LeagueReport` model to `backend/prisma/schema.prisma` with unique constraint `[chainId, leagueAddress, reporterWallet]`
  - [x] Added `warnedAt DateTime?` to the `League` model
  - [x] Migration `20260508024726_add_league_reports` applied successfully

- [x] Task 2: Backend — player report endpoint (AC: #1)
  - [x] `POST /api/v1/leagues/:address/report` added to `leagues.ts`; requires SIWE session; 201 on success, 409 on duplicate, 404 if league not found

- [x] Task 3: Backend — admin reports API (AC: #2–#6)
  - [x] `GET /api/v1/admin/reports?status=open` — enriched with league title, sorted by createdAt DESC
  - [x] `PATCH /api/v1/admin/reports/:reportId` — maps action to status; `warn` also sets `league.warnedAt`

- [x] Task 4: Frontend — "Report League" button + modal on `LeagueDetailPage.tsx` (AC: #1)
  - [x] Inline report section at bottom of page; checks `useSiweSession` authStatus; reason select + textarea; 409 → "already reported" message; success state inline

- [x] Task 5: Frontend — `AdminReportsPage.tsx` at `/admin/reports` (AC: #2–#6)
  - [x] Query + mutation via @tanstack/react-query; cards per report; Warn/Dismiss are backend-only; Pause/Refund do on-chain tx first then PATCH; mapWriteError; empty state

- [x] Task 6: Wire route, nav (AC: #2)
  - [x] `/admin/reports` route added in `AppRoutes.tsx`
  - [x] "Reports" button added in `AdminPlaceholderPage.tsx`

- [x] Task 7: Quality gates
  - [x] Prisma migration applied successfully ✅
  - [x] `npm run lint` — 0 errors ✅
  - [x] Vitest 26/26 pass ✅

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

Claude Sonnet 4.6

### Debug Log References

None — clean implementation with no significant debugging required.

### Completion Notes List

- `LeagueReport` model added with unique constraint on `[chainId, leagueAddress, reporterWallet]`; catches Prisma `P2002` to return 409. `warnedAt` nullable field added to `League`.
- Backend `POST /leagues/:address/report`: SIWE session required for `reporterWallet`; 404 if league not found; `leagueAddress` stored lowercased for consistency.
- Backend `GET /admin/reports`: enriches each row with league title via `findFirst` (best-effort, null if not indexed); defaults to `status=open`.
- Backend `PATCH /admin/reports/:reportId`: action→status map; `warn` also sets `league.warnedAt`; on-chain tx not done server-side (client handles chain interaction).
- `LeagueDetailPage`: used `useSiweSession` (same as `LeagueDisputePanel`) for auth check; inline section below dispute panel; 409 caught with specific "already reported" message; `leagueAddr` + `leagueChainId` used directly.
- `AdminReportsPage`: on-chain actions (pauseEntries, triggerRefund) fire first, then PATCH backend on receipt; `activeId` tracks which report is busy; per-row explorer tx link on success.
- Frontend lint 0 errors; Vitest 26/26.

### File List

- `backend/prisma/schema.prisma` (modified)
- `backend/prisma/migrations/20260508024726_add_league_reports/migration.sql` (new)
- `backend/src/routes/v1/leagues.ts` (modified)
- `backend/src/routes/v1/admin.ts` (modified)
- `frontend/src/pages/LeagueDetailPage.tsx` (modified)
- `frontend/src/pages/AdminReportsPage.tsx` (new)
- `frontend/src/AppRoutes.tsx` (modified)
- `frontend/src/pages/AdminPlaceholderPage.tsx` (modified)
