# Story 5.5 — Oracle grace period extension

Status: **done**  
Date: 2026-04-28

## Summary

Extended the admin oracle screen to support grace period deadline extensions on-chain by calling `OracleController.extendGracePeriod(groupId, additionalSeconds)` and to display the current `expectedDeadline` and whether results are posted for the selected group.

## Acceptance criteria coverage

- **Admin can extend grace period**
  - UI action calls `extendGracePeriod(groupId, additionalSeconds)` from the connected wallet.
  - Requires the wallet to be the `OracleController` owner (contract-enforced).
- **Shows deadline + status**
  - Reads `expectedDeadline(groupId)` and `hasResultsPosted(groupId)` on-chain and displays them on the admin oracle page.

## Implementation notes

### Frontend

- `frontend/src/lib/oracleControllerAbi.ts`
  - Added:
    - `expectedDeadline(uint8) view returns (uint256)`
    - `extendGracePeriod(uint8,uint256)`
    - `GracePeriodExtended` event

- `frontend/src/pages/AdminOraclePage.tsx`
  - Added:
    - On-chain reads: `expectedDeadline`, `hasResultsPosted`
    - “Grace period” card with an input for additional seconds and an “Extend grace” button
    - Tx receipt handling + error messaging

## Test plan

- `frontend`: `npm run lint && npm run test && npm run build`
- `backend`: unchanged for this story; existing checks continue to pass.

## Files changed

- `frontend/src/lib/oracleControllerAbi.ts`
- `frontend/src/pages/AdminOraclePage.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

