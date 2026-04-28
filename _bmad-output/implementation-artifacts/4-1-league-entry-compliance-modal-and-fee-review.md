# Story 4.1: League entry — compliance modal & fee review

Status: done

## Story

As a player,
I want to acknowledge compliance once per league and review fees before entering,
So that I understand the costs and eligibility before signing transactions.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1._

## Acceptance criteria coverage

- **UX-DR4 — Compliance modal**:
  - Entry flow is gated behind a required acknowledgment step (checkbox + confirm).
  - Acknowledgment is stored server-side by `walletAddress + leagueId + timestamp` and only required once per league.
- **UX-DR6 / Fee review**:
  - Entry page shows a clear fee breakdown (prize pool / creator fee / dev fee amounts per entry) before any entry transaction.
- **UX-DR5 — Browse without wallet, gate at enter**:
  - Public league detail remains accessible without wallet/sign-in.
  - Enter CTA routes to an SIWE-gated entry page.

## Implementation notes

- **Backend**
  - Added Prisma model `ComplianceAcknowledgement`.
  - Added migration `20260428160000_compliance_acknowledgements`.
  - Added endpoints in `backend/src/routes/v1/leagues.ts`:
    - `GET /api/v1/leagues/by-address/:address/compliance` → `{ acknowledged, acknowledgedAt }` for the signed-in wallet
    - `POST /api/v1/leagues/by-address/:address/compliance` → upserts an acknowledgment for the signed-in wallet
- **Frontend**
  - Added route `"/league/:address/enter"` guarded by `RequireSiwe`.
  - Added `frontend/src/pages/LeagueEntryPage.tsx`:
    - Fetches league details + compliance status
    - Shows acknowledgment gate if not yet acknowledged
    - Renders fee review card after acknowledgment (entry tx comes in Story 4.2)
  - Updated `frontend/src/pages/LeagueDetailPage.tsx` “Enter League” CTA to navigate to the entry route.

## Files changed / added

- **Modified**
  - `backend/prisma/schema.prisma`
  - `backend/src/routes/v1/leagues.ts`
  - `frontend/src/AppRoutes.tsx`
  - `frontend/src/pages/LeagueDetailPage.tsx`
- **Added**
  - `backend/prisma/migrations/20260428160000_compliance_acknowledgements/migration.sql`
  - `frontend/src/lib/leagueCompliance.ts`
  - `frontend/src/pages/LeagueEntryPage.tsx`
  - `_bmad-output/implementation-artifacts/4-1-league-entry-compliance-modal-and-fee-review.md`

## Test plan

- `backend`: `docker compose up -d postgres && npx prisma migrate deploy && npm test`
- `frontend`: `npm run lint && npm test && npm run build`

## Known dev issue (not reliably usable in browser)

In local dev, some users cannot open the entry flow; the UI shows **“Could not load compliance status.”** and Retry does not recover.

- **Observed console error**: browser CORS blocks requests to a public RPC host (example: `eth.merkle.io`) during preflight.
- **Why this blocks the entry screen**: the entry page performs an on-chain read of ERC-20 `allowance()` during initial render to decide whether it needs an `approve()` step. If the configured RPC is not CORS-enabled, that read fails and the page surfaces a generic “Could not load compliance status.” message.
- **Status**: needs a proper dev-safe transport strategy (e.g. browser-safe public RPCs per chain, or a backend RPC proxy) and improved UI error attribution (separate “API compliance status” vs “RPC allowance read” failures).

