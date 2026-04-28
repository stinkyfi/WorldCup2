# Story 2.1: Landing page & platform stats

Status: done

## Story

As a visitor,
I want a landing page that shows live platform statistics and navigates me to browse leagues,
So that I can immediately understand the platform's activity and start exploring without needing a wallet.

## Acceptance Criteria

1. **Given** a visitor opens the root URL **When** the page loads **Then** the Broadcast `<AppShell>` renders (logo, Browse, My Leagues, Create, chain + wallet) and the body shows a **hero stats bar** with **Total Value Locked**, **Active Leagues**, and **Total Player Count** sourced from the **indexer API** (FR61).

2. **Given** the API returns data **When** the stats bar renders **Then** all three values appear within **2 seconds** (NFR3); while loading, a **skeleton** (or equivalent) is shown.

3. **Given** desktop (≥1024px) or mobile (&lt;1024px) **When** the page renders **Then** layout is responsive, nav matches existing mobile hamburger behaviour, touch targets stay **≥ 44×44px** (UX-DR11).

4. **Given** no wallet is connected **When** the visitor uses the landing page **Then** Browse, stats, and public content are fully usable — **no unprompted wallet modal** (UX-DR5).

## Scope boundaries

- **This story:** public landing + stats consumption + navigation affordances toward Browse (link target may be `/browse` placeholder until Story 2.4 wires the list page).
- **Story 2.2:** SIWE session, gated My Leagues / Create — do not block landing on auth.
- **Indexer:** Full chain listeners are later work; for 2.1 the **backend** may expose aggregated stats from Postgres (`GET /api/v1/...`) with real or **seeded/demo** queries until indexer backfills — document choice in Dev Agent Record.

## Technical guidance

_(Original planning notes retained in git history; implementation summary below.)_

## Tasks / Subtasks

- [x] Backend: `GET /api/v1/stats` + Prisma-backed aggregates + test (skips without `DATABASE_URL`)
- [x] Backend: CORS already permissive (`origin: true`); Vite dev proxy for `/api`
- [x] Frontend: router + `LandingPage` + `HeroStats` (skeleton + Query)
- [x] Frontend: placeholder routes `/browse`, `/create`, `/my-leagues`; nav uses `NavLink` / `Link`
- [x] `frontend/.env.example`: `VITE_API_BASE_URL` documented
- [x] `frontend/README.md` — dev + API note

## Dev Notes

- **TVL / players:** `totalValueLockedWei` is `"0"` and `totalPlayerCount` is `0` until indexer persists entries and locked value; **`activeLeagues`** = `prisma.league.count()` (indexed league rows).
- **Dev:** `npm run dev` in `frontend` proxies `/api` → `http://127.0.0.1:3001`; run backend on **3001** for live stats.
- **Tests:** `backend/test/stats.routes.test.ts` requires `DATABASE_URL` (same pattern as other DB integration tests).

## Dev Agent Record

### Implementation Plan

- `GET /api/v1/stats` returns `{ data: { totalValueLockedWei, activeLeagues, totalPlayerCount }, meta: { lastUpdatedAt } }`.
- React Router + `BrowserRouter`; `AppShell` wraps routed content; landing at `/`.

### Completion Notes

- Frontend: `npm run lint`, `npm run build`, `npm test` pass (5 tests).
- Backend: `npm run lint`, `npm run build`, `npm test` pass.

## File List

- `backend/src/routes/v1/stats.ts`
- `backend/src/routes/v1/index.ts`
- `backend/test/stats.routes.test.ts`
- `frontend/package.json`, `frontend/package-lock.json`
- `frontend/vite.config.ts` (dev proxy `/api`)
- `frontend/src/main.tsx`
- `frontend/src/AppRoutes.tsx`
- `frontend/src/lib/apiBase.ts`
- `frontend/src/lib/platformStats.ts`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/HeroStats.tsx`
- `frontend/src/components/HeroStats.test.tsx`
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/pages/BrowsePlaceholderPage.tsx`
- `frontend/src/pages/CreatePlaceholderPage.tsx`
- `frontend/src/pages/MyLeaguesPlaceholderPage.tsx`
- `frontend/src/AppShell.test.tsx`
- `frontend/src/vite-env.d.ts`
- `frontend/.env.example`
- `frontend/README.md`
- _(removed)_ `frontend/src/App.tsx`

## Change Log

- **2026-04-28:** Story 2.1 implemented — `/api/v1/stats`, landing + HeroStats + React Router + placeholders + Vite `/api` proxy + tests; sprint `done`.
