# Story 2.5: League detail page & fee breakdown

Status: done

## Story

As a visitor,
I want a league detail page that shows all key information including a full fee breakdown,
So that I can make an informed decision about entering before connecting my wallet or signing a transaction.

## Acceptance criteria

1. **Given** a visitor navigates to `/league/:address` **When** the page renders **Then** it displays league name, creator address (with display name if available), chain, entry token, entry fee, prize pool, entries count (current / max), time to lock, creator description, and revision policy (FR10).

2. **Given** a league detail page loads **When** the fee breakdown section renders **Then** it shows prize pool %, creator fee %, dev fee %, and the exact token amount per component given the current entry fee — never hidden behind a tooltip only (FR10, UX-DR6).

3. **Given** a user visits the league detail page **When** they are not yet connected **Then** all detail information is visible; the "Enter League" CTA is displayed but clicking it triggers wallet connect flow (UX-DR5).

4. **Given** a league is featured **When** the detail page renders **Then** a featured badge is displayed on the league header.

5. **Given** a league detail page loads **When** page load time is measured **Then** it loads within 2 seconds sourced from the indexer (NFR3).

## Tasks / subtasks

- [x] Backend: extend indexed `leagues` row to include creator + policy + fee bps required for fee breakdown
- [x] Backend: `GET /api/v1/leagues/by-address/:address` returns league detail + fee breakdown amounts (BigInt-safe strings)
- [x] Frontend: add `/league/:address` route + `LeagueDetailPage` with public content and wallet-connect CTA
- [x] Tests: backend DB test for detail endpoint; frontend lint/test/build green
- [x] Update story Status → `done`, and set sprint-status `2-5-...` → `done`

## Dev notes

- Detail data is indexer-backed in Postgres (`leagues`); no direct RPC reads for the page.
- Fee breakdown uses basis points on the indexed row (dev + creator); when their sum exceeds 10000 bps, both are scaled proportionally so wei splits always sum to one entry fee (see `computeFeeBreakdown`).

## Dev agent record

### Completion notes

- `League` indexed row extended with creator + revision policy + fee bps + token decimals for fee breakdown.
- New API: `GET /api/v1/leagues/by-address/:address` for indexer-backed detail.
- New SPA route: `/league/:address` shows public details, featured badge, and visible fee breakdown amounts.
- `Enter League` CTA opens wallet connect when not connected (entry flow comes later).
- **Follow-ups (deferred):** unique league contract address in DB; format amounts with `entryTokenDecimals` on the detail page; nicer 404 / connected CTA than `window.alert`; L2 display names for creator when resolvers exist.

### Debug log

- (empty)

## File list

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260501130000_league_detail_fields/migration.sql`
- `backend/src/lib/leagueFees.ts`
- `backend/src/routes/v1/leagues.ts`
- `backend/test/leagues.detail.db.test.ts`
- `backend/test/leagueFees.unit.test.ts`
- `backend/test/leagues.browse.db.test.ts` (test isolation tweak)
- `frontend/src/AppRoutes.tsx`
- `frontend/src/components/LeagueCard.tsx`
- `frontend/src/lib/leagueDetail.ts`
- `frontend/src/pages/LeagueDetailPage.tsx`

## Change log

- **2026-05-01:** Started Story 2.5.
- **2026-05-01:** Implemented API + UI + tests; ready for review.
- **2026-04-27:** Code review fix — proportional scaling when dev+creator bps exceed 10000; unit tests; story closed. Deferred follow-ups captured in Dev notes.

