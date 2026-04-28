# Story 4.3: Prediction form — desktop drag-and-drop

Status: done

## Story

As a player,
I want to rank teams 1–4 for each World Cup group using drag-and-drop on desktop,
So that making predictions is fast and intuitive.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.3._

## Acceptance criteria coverage

- **UX-DR1 — Desktop drag-and-drop**:
  - Implemented a desktop-first DnD UI using `@dnd-kit` for ordering teams within each group.
  - Mobile explicitly shows a “ships later” notice (Story 4.4).
- **UX-DR2 — Progress indicator always visible**:
  - Added `PredictionProgressBar` that stays sticky and shows \(X/12\) completion plus tiebreaker checkmark when filled.

## Implementation notes

- **Dependencies**
  - Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Data**
  - Added placeholder `WORLD_CUP_GROUPS` in `frontend/src/lib/worldCupGroups.ts` (A–L, 4 teams each) to unblock UX; will be replaced by real tournament team data later.
- **UI**
  - Added `frontend/src/pages/LeaguePredictPage.tsx` at route `"/league/:address/predict"` (SIWE-gated).
  - Each group renders a sortable vertical list with positions 1–4.
  - Added tiebreaker input (submit remains disabled until Story 4.5 wires commitment + on-chain submission).
  - After successful entry (Story 4.2), `LeagueEntryPage` offers a “Make predictions” button to navigate to the prediction page.

## Files changed / added

- **Modified**
  - `frontend/src/AppRoutes.tsx`
  - `frontend/src/pages/LeagueEntryPage.tsx`
- **Added**
  - `frontend/src/lib/worldCupGroups.ts`
  - `frontend/src/components/PredictionProgressBar.tsx`
  - `frontend/src/pages/LeaguePredictPage.tsx`
  - `_bmad-output/implementation-artifacts/4-3-prediction-form-desktop-drag-and-drop.md`

## Test plan

- `frontend`: `npm run lint && npm test && npm run build`

