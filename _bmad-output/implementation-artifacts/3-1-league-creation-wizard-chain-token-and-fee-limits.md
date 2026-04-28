# Story 3.1: League creation wizard — chain, token & fee/limits

Status: done

## Story

As a creator,
I want to configure the financial parameters of my league through the first three wizard steps,
So that I can define what chain, token, and entry constraints will govern my league.

_Source: `epics.md` — Epic 3, Story 3.1._

## Acceptance criteria

1. **Given** an authenticated user clicks "Create League" **When** the wizard opens **Then** Step 1 displays a chain selector with Base, Ethereum, and Sonic as options; the selection is required before advancing (UX-DR8).

2. **Given** a chain is selected in Step 1 **When** the user advances to Step 2 **Then** Step 2 displays only tokens whitelisted on that chain (fetched from the indexer); the user must select one before advancing (FR12).

3. **Given** a chain and token are selected **When** the user advances to Step 3 **Then** Step 3 displays fields for: flat entry fee (in selected token), max total entries (required), max entries per wallet (required), and optional minimum player threshold; all fields validate that values are positive integers or valid token amounts before advancing (FR12).

4. **Given** the user enters an entry fee below the platform minimum **When** they attempt to advance from Step 3 **Then** an inline validation error appears with the minimum allowed value — the step cannot be advanced (NFR, additional requirements).

5. **Given** the user navigates back from any step **When** they return to a previous step **Then** all previously entered values are preserved.

## Scope boundaries

- **This story:** wizard shell for steps 1–3 only; persist draft state in client until 3.2 completes on-chain flow.
- **Story 3.2:** revision policy, promotion, review, immutability acknowledgment, `createLeague` tx — out of scope here.

## Indexer / API contract (Story 3.1)

- **`GET /api/v1/tokens/whitelisted?chainId=`** — `chainId` must be **8453** (Base), **1** (Ethereum), or **146** (Sonic) mainnet.
- Response envelope: `{ data: { chainId, tokens: [{ address, symbol, decimals, minEntryWei }] }, meta } }`.
- `minEntryWei` per token = **0.01 whole token** in smallest units: `10^(decimals−2)` for `decimals > 2`, else `1` (see `platformMinEntryWeiForDecimals`).
- Token rows live in Postgres **`whitelisted_tokens`** (seeded migration); this is the app/indexer view to gate the wizard until a live indexer sync exists.

## Tasks / Subtasks

- [x] Spike or spec: token list API per chain vs `epics.md` AC (documented above).
- [x] Frontend: wizard route/layout, stepper, steps 1–3 UI + validation.
- [x] Frontend: integrate chain list (Base, Ethereum, Sonic) and token fetch.
- [x] Backend: `GET` whitelisted tokens by `chainId`.
- [x] Wire platform minimum entry fee (per-token smallest-units rule).
- [x] Tests: `platformMinEntryWei` unit test; `tokens.whitelist` DB route test; frontend `createWizardFee` vitest.

## Dev Agent Record

### Implementation plan

- Add `WhitelistedToken` Prisma model + migration seeding USDC/WETH (Base, Ethereum) and USDC/wS (Sonic) at canonical mainnet addresses.
- Expose read API under `/api/v1/tokens/whitelisted` with strict chain allowlist.
- Replace SIWE-gated `/create` placeholder with `CreateLeagueWizardPage`: steps 1–3, React Query for tokens, `viem` `parseUnits` / `formatUnits` for fee validation and minimum messaging.

### Completion notes

- **`Validate draft`** on step 3 runs all validations and shows success panel; no on-chain tx (Story 3.2).
- Changing chain on step 1 clears token selection so step 2 cannot show a token from another chain.
- Run **`npx prisma migrate deploy`** (or `migrate dev`) so `whitelisted_tokens` exists before relying on the endpoint.

## File List

- `backend/prisma/schema.prisma` — `WhitelistedToken` model
- `backend/prisma/migrations/20260502121500_whitelisted_tokens/migration.sql`
- `backend/src/lib/platformMinEntryWei.ts`
- `backend/src/routes/v1/tokens.ts`
- `backend/src/routes/v1/index.ts`
- `backend/test/platformMinEntryWei.test.ts`
- `backend/test/tokens.whitelist.db.test.ts`
- `frontend/src/lib/createLeagueChains.ts`
- `frontend/src/lib/fetchWhitelistedTokens.ts`
- `frontend/src/lib/createWizardFee.ts`
- `frontend/src/lib/createWizardFee.test.ts`
- `frontend/src/lib/leagueBrowse.ts` — `CHAIN_LABELS` for Sonic + Base mainnet
- `frontend/src/pages/CreateLeagueWizardPage.tsx`
- `frontend/src/AppRoutes.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `3-1` → **done**

## Change log

- **2026-04-27:** Story file created; Epic 3 marked in-progress; sprint `3-1` → `ready-for-dev`.
- **2026-04-27:** Implemented wizard steps 1–3, API + migration, tests; story and sprint **done**.
