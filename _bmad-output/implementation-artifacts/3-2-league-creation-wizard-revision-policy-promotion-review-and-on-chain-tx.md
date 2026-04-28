# Story 3.2: League Creation Wizard — Revision Policy, Promotion, Review & On-chain TX

Status: done

## Story

As a creator,
I want to complete the final wizard steps, acknowledge that my settings are immutable, and submit my league on-chain,
So that my league is created trustlessly with the exact parameters I configured.

_Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.2._

## Acceptance criteria

1. **Step 4 — Revision Policy (FR13)**: Presents Locked / Free / Paid. Paid requires a fee input before advancing.
2. **Step 5 — Promotion (FR15)**: Optional paid promotion at **$20 USDC/day**, duration in days, total preview in **USD and selected token**; can be skipped.
3. **Step 6 — Review (FR14, UX-DR8)**: Read-only summary + immutability warning + required acknowledgment checkbox before Create.
4. **On-chain createLeague (UX-DR13)**: Sends `createLeague` to `LeagueFactory` on selected chain, shows pending phase text.
5. **Success flow (UX-DR13)**: On confirmation, navigate to league detail with a success message including a shareable link.
6. **Failure flow (UX-DR13)**: Plain-English error + Retry without leaving wizard.
7. **Promotion sequencing (UX-DR6)**: If enabled, USDC transfer is sequenced immediately after create (second signature), and both amounts are shown before signing.

## Implementation notes

- **Wizard steps 4–6** live in `frontend/src/pages/CreateLeagueWizardPage.tsx`.
  - Step 4 stores the chosen revision mode as a `uint8` enum for the factory call (`locked=0`, `free=1`, `paid=2`) and requires a fee input when `paid` is selected.
  - Step 4 also encodes `revisionFee` on-chain when `revisionPolicy == paid` (in entry token smallest units).
  - Step 5 computes promotion total in USDC (6 decimals) using `PROMOTION_USDC_PER_DAY` from `frontend/src/lib/createLeagueEnv.ts`. Preview shows the USDC total and an “in entry token” preview when the entry token is also USDC; otherwise shows “Pricing unavailable”.
  - Step 6 reads `creationFee()` from the selected chain’s `LeagueFactory` and shows a fee breakdown (creation fee + optional promotion) plus an immutability acknowledgment gate.
- **On-chain submission** is handled by `frontend/src/lib/useCreateLeagueSubmit.ts`:
  - Sends `createLeague(params)` with `value=creationFeeWei`.
  - Waits for receipt, parses `LeagueCreated` logs for the new league address.
  - If promotion is enabled, sends an ERC-20 `transfer()` in USDC to `VITE_PROMOTION_RECIPIENT` immediately after creation.
- **Contracts**
  - `contracts/contracts/League.sol`: `LeagueParams` includes `revisionFee` and `League` stores it as an immutable.
  - `contracts/contracts/LeagueFactory.sol`: validates `(revisionPolicy == Paid) ⇒ revisionFee > 0` and `(revisionPolicy != Paid) ⇒ revisionFee == 0`.
- **Success redirect + shareable link**: Wizard navigates to `/league/:address?created=1`. The league detail page shows a success banner with a copyable share link.

## Environment variables

- `frontend/.env.example`
  - `VITE_LEAGUE_FACTORY_8453`, `VITE_LEAGUE_FACTORY_1`, `VITE_LEAGUE_FACTORY_146`
  - `VITE_PROMOTION_RECIPIENT` (optional; required when promotion enabled)
- `backend/.env.example`
  - `SIWE_ALLOWED_CHAIN_IDS` should include mainnets when testing wizard on those chains.

## Files changed / added

- **Modified**
  - `frontend/src/pages/CreateLeagueWizardPage.tsx`
  - `frontend/src/pages/LeagueDetailPage.tsx`
  - `frontend/src/wagmi.ts`
  - `frontend/.env.example`
  - `backend/.env.example`
- **Added**
  - `frontend/src/lib/leagueFactoryAbi.ts`
  - `frontend/src/lib/createLeagueEnv.ts`
  - `frontend/src/lib/useCreateLeagueSubmit.ts`
  - `frontend/src/lib/promotionPreview.ts`
  - `frontend/src/lib/promotionPreview.test.ts`

## Test plan

- `frontend`: `npm run lint && npm test && npm run build`
- `backend`: `npm run build && npm test`

