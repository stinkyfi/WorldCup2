# Story 4.5: Prediction form — tiebreaker, progress indicator & submission

Status: done

## Story

As a player,
I must submit a tiebreaker and complete all 12 group rankings before submission,
So that partial prediction entries are impossible and the commitment is deterministic.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.5._

## Acceptance criteria coverage

- **FR19 — Tiebreaker required (1–1000)**:
  - Prediction page validates the tiebreaker input and reflects completion in the progress bar.
- **FR20 / UX-DR2 — Progress always visible + submission gated**:
  - `PredictionProgressBar` stays sticky and shows `X / 12 groups + tiebreaker ✓`.
  - Submit is disabled until all 12 groups are marked complete and tiebreaker is valid.
- **FR17 / NFR6 — Commitment hash on-chain**:
  - Commitment hash is computed deterministically from the full prediction payload and used in `League.enter(commitmentHash)`.

## Implementation notes

- Added `frontend/src/lib/predictionCommitment.ts`:
  - Canonical stable JSON encoding + `keccak256` commitment.
  - Persists the prediction payload to `localStorage` keyed by league address.
- Updated `frontend/src/pages/LeaguePredictPage.tsx`:
  - Tracks which groups the user has explicitly set (`confirmedGroups`) for real progress tracking.
  - Saves payload to storage and shows the resulting commitment hash when “Submit predictions” is clicked.
  - Provides a CTA to continue to the entry page.
- Updated `frontend/src/pages/LeagueEntryPage.tsx`:
  - Requires a stored prediction payload before enabling entry.
  - Uses the stored payload’s deterministic commitment hash instead of a placeholder.

## Files changed / added

- **Modified**
  - `frontend/src/pages/LeaguePredictPage.tsx`
  - `frontend/src/pages/LeagueEntryPage.tsx`
- **Added**
  - `frontend/src/lib/predictionCommitment.ts`
  - `_bmad-output/implementation-artifacts/4-5-prediction-form-tiebreaker-progress-indicator-and-submission.md`

## Test plan

- `frontend`: `npm run lint && npm test && npm run build`

