# Story 4.7: Multi-entry support

Status: done

## Story

As a player,
I want to submit multiple entries to the same league (with same or different predictions),
So that I can participate with multiple tickets.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.7._

## Acceptance criteria coverage

- **FR21 — Multi-entry per league**:
  - Prediction storage supports multiple **entry slots** per league per wallet (`entryId`).
  - Entry flow can select which `entryId` payload to enter with, and uses its commitment hash for `League.enter`.

## Implementation notes

- **Prediction storage**
  - Upgraded to `PredictionPayloadV2` (adds `entryId` + `walletAddress`) and stores multiple entries in localStorage under:
    - `dd:prediction:v2:<leagueAddress>:<walletAddress>`
  - Added best-effort migration from the old single-entry v1 key.
- **Routing**
  - `LeaguePredictPage` accepts `?entryId=...` (optional). If absent, it creates a new `entryId`.
  - After “Submit predictions”, it links to entry as:
    - `/league/:address/enter?entryId=<id>`
  - `LeagueEntryPage` reads `entryId` and loads the correct payload for the connected wallet.
- **UX**
  - Entry success panel includes “Add another entry” which routes back to predictions to create another slot.

## Files changed / added

- **Modified**
  - `frontend/src/lib/predictionCommitment.ts`
  - `frontend/src/pages/LeaguePredictPage.tsx`
  - `frontend/src/pages/LeagueEntryPage.tsx`
- **Added**
  - `_bmad-output/implementation-artifacts/4-7-multi-entry-support.md`

## Test plan

- `frontend`: `npm run lint && npm test && npm run build`

