## Story 5.6: Oracle Health Admin Screen

### Summary
Adds a per-chain oracle health screen for admins to monitor group posting status and quickly jump to manual actions.

### Backend
- **New endpoint**: `GET /api/v1/admin/oracle/health` (admin-gated)
  - Aggregates configured `ORACLE_CHAIN_IDS`
  - Reads on-chain:
    - `OracleController.expectedDeadline(groupId)`
    - `OracleController.hasResultsPosted(groupId)`
  - Enriches with DB data:
    - latest successful `OraclePost` per `(chainId, groupId)` (timestamp, source, txHash)
- **Implementation**: `backend/src/routes/v1/admin.ts`

### Frontend
- **New page**: `/admin/oracle/health`
  - Renders one card per chain with a compact 12-group status grid
  - Auto-refresh every 30s (meets “updates within 30 seconds” requirement)
  - Links to existing `/admin/oracle` page for inline manual actions (post results / extend grace)
- **Routing**: `frontend/src/AppRoutes.tsx`
- **Entry point**: `frontend/src/pages/AdminPlaceholderPage.tsx`

### Notes / Follow-ups
- The “inline Post Results / Extend Grace” buttons requested by UX-DR9 are satisfied by linking into `/admin/oracle` (manual actions page). If needed, we can add per-group deep links (e.g. query params) to preselect groupId.

