# Story 2.4: League browse page — list, filters & sort

Status: done

## Story

As a visitor,
I want to browse all public leagues with filtering and sorting controls,
So that I can quickly find leagues that match my preferred chain, token, and fee range.

## Acceptance criteria

1. **Given** a visitor navigates to `/browse` **When** the page renders **Then** public leagues are listed as `LeagueCard` components in a responsive card grid, each showing league name, chain, entry token, fee, pool size, entry count, and time to lock (FR6).

2. **Given** leagues exist with admin-flagged or paid promotion **When** the browse page renders **Then** a featured row appears at the top above the general grid (FR9).

3. **Given** a visitor uses the filter controls **When** they filter by chain, entry token, or fee range **Then** the league list updates to show only matching leagues; filters are composable (FR7).

4. **Given** a visitor uses the sort controls **When** they sort by date created, total pool value, or entry count **Then** the league list reorders accordingly (FR8).

5. **Given** a visitor applies filters that return zero results **When** the list renders **Then** a plain-English empty state is shown with a suggestion to broaden filters (UX-DR13).

6. **Given** the browse page data is sourced from the indexer **When** the page loads **Then** it uses the backend indexer API only (no direct wallet RPC reads for the list) (NFR3, NFR18).

## Dev notes

- **Indexer in this phase:** Indexed league rows live in Postgres (`leagues`). `GET /api/v1/leagues/browse` is the public read API; the indexer job will upsert these fields in a later epic.
- **Featured:** `featured === true` **or** `promotedUntil > now()`. Featured cards are returned in `data.featured` and excluded from `data.leagues` to avoid duplicates.
- **Query params:** `chainId`, `entryToken` (symbol substring match, or full `0x` address match), `minFeeWei` / `maxFeeWei` (decimal digit strings, wei), `sort` (`createdAt` | `poolWei` | `entryCount`), `order` (`asc` | `desc`). Invalid fee strings → 422.
- **Deploy:** run `npx prisma migrate deploy` (includes `20260430120000_league_browse_index_fields`).

## Tasks / subtasks

- [x] Extend `League` Prisma model + migration (browse fields, featured, promotion end)
- [x] Add `leagueBrowse` helpers (where builder, spotlight split, sort, BigInt-safe DTO)
- [x] Implement `GET /api/v1/leagues/browse`; align `GET/POST /leagues` responses with DTO
- [x] Backend tests: unit (`leagueBrowse.unit.test.ts`), DB (`leagues.browse.db.test.ts`), validation for bad fee query
- [x] Frontend: `BrowsePage`, `LeagueCard`, `fetchLeagueBrowse`, URL-synced filters, loading / error / empty UX
- [x] Vitest for `leagueDisplay` helpers

## Dev agent record

### Implementation plan

- Single HTTP request per filter/sort change via React Query; filter state in URL search params for shareable browse links.
- Token display uses `viem` `formatUnits` with a small stablecoin heuristic (6 vs 18 decimals).

### Completion notes

- Replaced `BrowsePlaceholderPage` with `BrowsePage`.
- `POST /api/v1/leagues` still creates minimal rows; new columns use DB/schema defaults plus explicit `lockAt` (+30d) on create.
- **Closed 2026-05-01:** Code review outcome was approve with follow-ups (pagination at scale, clearer empty catalog copy, optional `minFeeWei`/`maxFeeWei` ordering validation). Accepted for this story; treat follow-ups as future hardening unless prioritized earlier.

## Senior developer review (AI)

- **Outcome:** Approve with follow-ups (see code review session).
- **Action items (deferred):** Browse `findMany` unbounded — add pagination/cursor before very large catalogs; distinguish “no leagues yet” vs “filters too tight” in empty state; consider max digit length on fee query params; optional `minFeeWei` ≤ `maxFeeWei` validation.

### Debug log

- (empty)

## File list

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260430120000_league_browse_index_fields/migration.sql`
- `backend/src/lib/leagueBrowse.ts`
- `backend/src/routes/v1/leagues.ts`
- `backend/test/leagueBrowse.unit.test.ts`
- `backend/test/leagues.browse.db.test.ts`
- `backend/test/leagues.validation.test.ts`
- `backend/.env.example`
- `frontend/src/AppRoutes.tsx`
- `frontend/src/components/LeagueCard.tsx`
- `frontend/src/lib/leagueBrowse.ts`
- `frontend/src/lib/leagueDisplay.ts`
- `frontend/src/lib/leagueDisplay.test.ts`
- `frontend/src/pages/BrowsePage.tsx`
- (removed) `frontend/src/pages/BrowsePlaceholderPage.tsx`

## Change log

- **2026-04-30:** Implemented Story 2.4 (browse API, UI, tests).
- **2026-05-01:** Marked story **done**; sprint status updated after sign-off (review follow-ups noted above, not blocking).
