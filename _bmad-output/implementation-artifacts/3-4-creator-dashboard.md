# Story 3.4: Creator dashboard

Status: done

## Story

As a creator, I want a dashboard for my league so I can see key stats and quickly share a referral link.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.4._

## Acceptance criteria coverage

- **FR28 — Creator dashboard stats**:
  - Creator-only endpoint returns league stats (entries, pool, token, lock time).
  - UI shows **entry count** and **pool value** and refreshes every 30 seconds.
- **FR29 — Referral link + copy templates**:
  - Dashboard renders a **unique referral link** and provides **one-click copy** buttons for:
    - link only
    - Discord text
    - Telegram text
    - X text
- **Creator-only access**:
  - Backend enforces creator-only access based on SIWE session wallet address and `League.creatorAddress`.
  - Non-creators are redirected back to the public league detail page.

## Implementation notes

- **Backend**
  - Added `GET /api/v1/leagues/by-address/:address/creator` in `backend/src/routes/v1/leagues.ts`.
    - Requires a valid SIWE session cookie.
    - Verifies `league.creatorAddress` matches `session.address` (case-insensitive).
    - Returns the same `league` shape used by the public detail endpoint (minus fee breakdown), suitable for a creator dashboard.
- **Frontend**
  - Added creator dashboard page `frontend/src/pages/LeagueCreatorDashboardPage.tsx`.
  - Added route `"/league/:address/creator"` in `frontend/src/AppRoutes.tsx` guarded by `RequireSiwe`.
  - Added fetch client `frontend/src/lib/leagueCreatorDashboard.ts` using `credentials: "include"` to send the SIWE cookie.
  - Auto-refresh via React Query `refetchInterval: 30_000`.
  - Referral link uses `?ref=<walletAddress>` as a stable, creator-unique query parameter for later tracking/indexing.

## Files changed / added

- **Modified**
  - `backend/src/routes/v1/leagues.ts`
  - `frontend/src/AppRoutes.tsx`
- **Added**
  - `frontend/src/lib/leagueCreatorDashboard.ts`
  - `frontend/src/pages/LeagueCreatorDashboardPage.tsx`
  - `_bmad-output/implementation-artifacts/3-4-creator-dashboard.md`

## Test plan

- `backend`: `docker compose up -d postgres && npx prisma migrate deploy && npm test`
- `frontend`: `npm run lint && npm test && npm run build`

