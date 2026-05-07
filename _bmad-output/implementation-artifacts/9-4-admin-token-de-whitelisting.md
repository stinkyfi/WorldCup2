# Story 9.4: Admin Token De-whitelisting

Status: review

<!-- Ultimate context compiled for dev-story; validate optional: validate-create-story -->

## Story

As an admin,  
I want to remove a previously approved token from the whitelist,  
So that problematic tokens can be prevented from being used in new leagues without affecting existing ones.

## Acceptance Criteria

1. **Given** an admin navigates to the whitelist management view  
   **When** they select an approved token and choose “De-whitelist”  
   **Then** the admin wallet calls `WhitelistRegistry.removeToken(address)` **on that chain’s registry deployment** (`chainId` is the currently selected chain in UI, not an extra Solidity argument — one registry contract per chain; match existing approve/reject pattern).  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.4 FR54]

2. **Given** a token is de-whitelisted  
   **When** leagues that were already created using that token are checked  
   **Then** they continue to operate normally to completion — de-whitelisting only prevents **new** league creation that gates on whitelist (unchanged semantics from Story 1.2 / Epic 9).  
   [Source: `epics.md` → Story 9.4]

3. **Given** a de-whitelisted token is checked against **`getWhitelistedTokens()` on the registry for that chain**  
   **When** the return value is inspected  
   **Then** that token address is **absent**.  
   [Source: `epics.md` → Story 9.4]

4. **Given** UX safety expectations  
   **When** initiating de-whitelist  
   **Then** require explicit confirmation (e.g. destructive-confirm modal or labeled second step); show clear consequence text (“won’t appear for new leagues” / “cannot undo without re-approve flow”).  

## Tasks / Subtasks

- [x] Task 1: ABI + typed reads/writes for admin flow (AC: #1–#3)  
  - [x] Extend `whitelistRegistryAbi` with at least **`removeToken(address)`** and **`getWhitelistedTokens() view returns (address[])`**.  
      *Note:* `removeToken`, `approveToken`, and `TokenRemoved`/`TokenApproved` already exist **on-contract** (`contracts/contracts/WhitelistRegistry.sol`); ABI was trimmed to story 9.1–9.3 surfaces only — restore what the admin UI needs.*  
  - [x] Optionally add `event TokenRemoved(address indexed token)` to ABI if the UI parses logs (nice-to-have).  
  - [x] Added `approveToken`, `TokenApproved`, `TokenRemoved` to ABI for parity with explorer/event tooling.

- [x] Task 2: Admin UI section — list + de-whitelist (AC: #1–#4)  
  - [x] On `frontend/src/pages/AdminTokenWhitelistPage.tsx`, after the pending-requests block add **“Approved tokens on this chain”** (or similar): load addresses via **`getWhitelistedTokens**` filtered through `whitelistRegistryAddress(chainId)` + `publicClient`.  
  - [x] For each address: show monospace address row + **De-whitelist** (secondary/destructive).  
  - [x] Confirmation step before **`writeContractAsync({ functionName: "removeToken", args: [token] })`**, same **`switchChainAsync` + `waitForTransactionReceipt`** pattern as approve/reject.  
  - [x] Successful tx: **`lastTx`** + refetch whitelist list (+ optional refetch overlap with `/tokens` API caches if TanStack caches used elsewhere — do not widen scope unless needed).  

- [x] Task 3: Behaviour & regressions guardrails  
  - [x] **Owner vs app admin:** Preserve Story 9.3 reality — txs must succeed with **deployer/registry owner wallet** connected; copy can mirror approve/reject (no false promise that SIWE-admin alone suffices if `msg.sender != owner`).  
  - [x] Preserve existing pending-request cards, bytecode hints, approve/reject; do not regress routing (`AppRoutes.tsx` unchanged unless you add anchors only).  

- [x] Task 4: Contracts + frontend quality gates  
  - [x] `contracts`: existing `WhitelistRegistry` tests already cover **`removeToken`** — add coverage **only** if gaps appear (e.g. **double-remove** UX message).  
  - [x] **`npm run lint`** for touched stacks; **`npm run test`** in `contracts` whitelist file; **`npm run test`** in `frontend`.  

## Change Log

- 2026-05-07: Implemented admin de-whitelist UI + ABI; Vitest ABI guardrail; Epic 9.4 marked **review**.

---

## Developer context (critical)

### What already exists (do not re-implement blindly)

| Area | Existing behaviour |
|------|---------------------|
| On-chain **`removeToken(address)` onlyOwner**, **`getWhitelistedTokens()`**, **`TokenRemoved`** | Implemented in **`WhitelistRegistry.sol`** (see **`removeToken` ~L193**) — multi-chain handled by switching chain + RPC in UI like Story 9.3. |
| Contract tests **`removeToken`**, **`getWhitelistedTokens`**, **`TokenNotWhitelisted`** | **`contracts/test/WhitelistRegistry.test.ts`** `describe("removeToken")`, `describe("getWhitelistedTokens")` — regression baseline. |
| Admin shell + pending queue + bytecode risk API | **`AdminTokenWhitelistPage.tsx`**, **`fetchTokenSurfaceRisk.ts`**, **`backend/src/routes/v1/admin.ts`** — extend page only unless you deliberately add APIs (not needed for ERC). |
| **`whitelistRegistryAbi`** | Extended in 9.4 with **`removeToken`**, **`getWhitelistedTokens`**, **`approveToken`**, **`TokenApproved`**, **`TokenRemoved`**. |

### Contract / PRD wording alignment

Epics prose sometimes mentions **`removeToken(address, chainId)`**. Actual deployment model is **one `WhitelistRegistry` per chain**, no **`chainId` parameter** — **wagmi `chainId` + registry address map** wins. Align UI with Stories 9.2–9.3.

### Off-chain whitelist API vs on-chain canonical

Story 9.3 notes: **`GET /api/v1/tokens/whitelisted`** is Postgres-backed indices; syncing on-chain removals into DB may lag without an indexer/job.  

**Verification for AC #3:** use **RPC `readContract`** on **`getWhitelistedTokens`** (or pairwise **`isWhitelisted`**) immediately after **`removeToken` succeeds** — that is authoritative for “absent from on-chain whitelist.” Mention product gap in Completion Notes only if prod API still lists removed token until sync.

### Regression risks

- Removing ABI lines or refactoring **`AdminTokenWhitelistPage`** must not break **approveRequest / rejectRequest / risk**.  
- **Do not call `removeToken` on arbitrary addresses** derived from unchecked input — addresses must come solely from **`getWhitelistedTokens()`** reads for listing (no free-text attacker-driven calls).  

---

### Technical requirements

- Stack: Existing React + wagmi viem TanStack Query patterns on admin page (`usePublicClient`, `useWriteContract`, `useSwitchChain`).  
- Envelope: On-chain txs only — no envelope API for **`removeToken`**. Session cookie still irrelevant to chain tx signer.  

### Testing requirements

- Minimum: whitelist Hardhat **`WhitelistRegistry`** suite still green (`npx hardhat test test/WhitelistRegistry.test.ts`).  
- Frontend Vitest run green for repo (`npm run test` in `frontend`).  
- Smoke: Manual path — Connect owner wallet → select chain → approve token (or fixture) → see in whitelist list → de-whitelist → **`getWhitelistedTokens`** no longer includes it.  

### Previous story intelligence (9.3)

- **Bytecode risk** prefetch pattern + **`busyId`** string keys — reuse concurrency style for whitelist section busy state (**`busyId`** like **`d-${normAddr}` or global single-spend** consistent with approve/reject).  
- **`refresh()`** bundles refetches — extend to include new whitelist **`useQuery`** refetch helper.  

### Git intelligence summary

Recent focus: **`150114b`** delivered Epic **9.2–9.3** (`WhitelistRegistry` queue/votes/admin approvals, bytecode API, **`AdminTokenWhitelistPage`**). Extension should be incremental on same page + ABI slice.  

### Project context reference

No `project-context.md` found in-repo; rely on **`architecture.md` WhitelistRegistry** “one deployment per chain” (`_bmad-output/planning-artifacts/architecture.md`).  

---

## References

| Doc | Sections |
|-----|----------|
| `planning-artifacts/epics.md` | **Epic 9 → Story 9.4** (FR54, existing-league caveat, `getWhitelistedTokens`). |
| `contracts/contracts/WhitelistRegistry.sol` | `removeToken`, `getWhitelistedTokens`, Ownable. |
| `frontend/src/pages/AdminTokenWhitelistPage.tsx` | Approve/reject/risk UX patterns — extend. |

---

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor agent)

### Debug Log References

### Completion Notes List

- Extended `whitelistRegistryAbi` with `getWhitelistedTokens`, `removeToken`, `approveToken`, and whitelist events (`TokenApproved`, `TokenRemoved`) plus existing story surfaces.
- `AdminTokenWhitelistPage`: TanStack **`approvedQuery`** backed by **`getWhitelistedTokens`**, sorted list, **two-step confirmation** banner, **`removeToken` tx**, **`BusyId`** `d-{addr}`, **`refresh`** refetches queue/risk/approved; chain switch clears **`confirmRemove`**.
- Indexed API catalog drift called out inline (on-chain reads are authoritative for this screen).
- **Quality:** `npx hardhat test test/WhitelistRegistry.test.ts` (**27 passing**); `frontend` **`npm run test`** (**26 passing** incl. **`whitelistRegistryAbi.test.ts`**); `frontend` **`npm run lint`** clean.

### File List

- `frontend/src/lib/whitelistRegistryAbi.ts`
- `frontend/src/lib/whitelistRegistryAbi.test.ts` (new)
- `frontend/src/pages/AdminTokenWhitelistPage.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-4-admin-token-de-whitelisting.md` (this file)
