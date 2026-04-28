# Story 4.4: Prediction form — mobile paginated input

Status: done

## Story

As a player on mobile,
I want to complete predictions with a paginated group-by-group flow using dropdown selectors,
So that I can make predictions comfortably without drag-and-drop.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.4._

## Acceptance criteria coverage

- **UX-DR1 — Mobile uses forced pagination + dropdowns**:
  - Mobile view shows one group at a time (A–L) with **4 position selectors**.
  - Navigation via Back/Next.
- **UX-DR2 — Progress indicator always visible**:
  - `PredictionProgressBar` remains sticky and reflects completion across both desktop and mobile inputs.

## Implementation notes

- Implemented mobile UI inside `frontend/src/pages/LeaguePredictPage.tsx`:
  - `lg:hidden` mobile card for the current group (step 1–12).
  - Each selector swaps values if a team is chosen twice to preserve uniqueness.
  - Desktop DnD remains unchanged and is rendered only on `lg+`.

## Files changed / added

- **Modified**
  - `frontend/src/pages/LeaguePredictPage.tsx`
- **Added**
  - `_bmad-output/implementation-artifacts/4-4-prediction-form-mobile-paginated-input.md`

## Test plan

- `frontend`: `npm run lint && npm test && npm run build`

