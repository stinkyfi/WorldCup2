# Story 9.1: Token Whitelist Request Submission

Status: review

## Story

As a user,  
I want to submit a token for platform whitelist consideration by paying an on-chain fee,  
so that the token can become available for use as a league entry currency.

## Acceptance Criteria

1. **Given** an authenticated user navigates to the token whitelist page  
   **When** they fill in the submission form (token address, chain) and submit  
   **Then** the on-chain fee ($100 USDC equivalent, platform-configured) is transferred, `WhitelistRegistry` records the request, and a `WhitelistRequested(token, chain, requester)` event is emitted.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.1]

2. **Given** the fee transaction confirms  
   **When** the UI receives confirmation  
   **Then** the user sees a success message and their request appears in the public pending queue.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.1]

3. **Given** a token address is submitted that is already whitelisted  
   **When** the form is validated  
   **Then** an inline error is shown before any transaction is initiated: "This token is already whitelisted on this chain".  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.1]

4. **Given** the fee payment is verified on-chain  
   **When** the request enters the queue  
   **Then** no off-chain payment or off-chain verification is possible — the request only exists if the on-chain fee tx succeeded.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.1]

## Tasks / Subtasks

- [x] Task 1: Contracts: request + fee config (AC: #1, #4)
  - [x] Add request fee config (token + amount) and `requestWhitelist(token)` that transfers ERC-20 fee via `transferFrom`.
  - [x] Persist request on-chain and emit `WhitelistRequested`.
  - [x] Add Hardhat tests for request flow.

- [x] Task 2: Frontend: whitelist request page + validation (AC: #1, #2, #3)
  - [x] Add `/whitelist` page with form (chain + token address).
  - [x] Validate against backend `/tokens/whitelisted` list for chain before tx.
  - [x] Submit `requestWhitelist` tx; show success state + tx link.

- [x] Task 3: Quality gates
  - [x] `contracts` tests + lint
  - [x] `frontend` tests + lint

## Dev Notes

- Current `contracts/contracts/WhitelistRegistry.sol` only supports admin approve/remove; Story 9.1 requires extending it with request mechanics + fee.
- Frontend already knows canonical USDC addresses per chain in `frontend/src/lib/createLeagueEnv.ts` (can be used as default fee token).

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Completion Notes List

- Extended `WhitelistRegistry` with ERC-20 fee configuration + `requestWhitelist` requests list and `WhitelistRequested` event.
- Added a new `/whitelist` page to submit requests, including inline “already whitelisted” validation via existing backend whitelisted token list.
- Added env wiring (`VITE_WHITELIST_REGISTRY_*`) to configure registry addresses per chain.

### File List

- `contracts/contracts/WhitelistRegistry.sol`
- `contracts/test/WhitelistRegistry.test.ts`
- `frontend/src/pages/TokenWhitelistPage.tsx`
- `frontend/src/lib/whitelistRegistryAbi.ts`
- `frontend/src/lib/createLeagueEnv.ts`
- `frontend/src/AppRoutes.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/.env.example`

