# Story 4.6: Polymarket odds widget

Status: done

## Story

As a player,
I want to see market-consensus win probabilities alongside the prediction form,
So that I can compare my picks to the market.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.6._

## Acceptance criteria coverage

- **FR22 — Odds widget + timestamp + staleness warning**:
  - Widget displays a **data-as-of timestamp**.
  - Shows a **stale** badge when cache is older than 24h (or server marks response stale).
  - If odds are unavailable, the widget **hides gracefully** and the prediction form remains functional.
- **NFR4 — Cache updates once per 24 hours**:
  - Backend serves an in-memory cached snapshot with a 24h TTL.

## Implementation notes

- **Backend**
  - Added `GET /api/v1/polymarket/odds` (`backend/src/routes/v1/polymarket.ts`)
    - In-memory cache with 24h TTL
    - Returns `{ asOf, ttlSeconds, data }`
    - If upstream fetch fails and cache exists, returns stale cached response marked `stale: true`
    - Uses optional env `POLYMARKET_ODDS_URL` to proxy real data; otherwise returns an empty payload
  - Registered route in `backend/src/routes/v1/index.ts`
- **Frontend**
  - Added `frontend/src/components/PolymarketOddsWidget.tsx`
    - Uses React Query to fetch `/api/v1/polymarket/odds`
    - Hides on error (no blocking UX)
    - Shows timestamp + `Live`/`Stale` badge
  - Added `frontend/src/lib/polymarketOdds.ts` fetch helper
  - Integrated widget into `frontend/src/pages/LeaguePredictPage.tsx` (above the group UI)

## Files changed / added

- **Modified**
  - `backend/src/routes/v1/index.ts`
  - `frontend/src/pages/LeaguePredictPage.tsx`
- **Added**
  - `backend/src/routes/v1/polymarket.ts`
  - `frontend/src/lib/polymarketOdds.ts`
  - `frontend/src/components/PolymarketOddsWidget.tsx`
  - `_bmad-output/implementation-artifacts/4-6-polymarket-odds-widget.md`

## Test plan

- `backend`: `npm run build && npm test`
- `frontend`: `npm run lint && npm test && npm run build`

