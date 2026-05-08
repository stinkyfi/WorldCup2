# Story 10.1: Global Platform Parameter Management

Status: ready-for-dev

## Story

As an admin,
I want to update global platform parameters from the admin panel,
So that I can tune fees, limits, and policies across the platform without a contract redeployment.

## Acceptance Criteria

1. **Given** an admin navigates to `/admin/settings`
   **When** the settings panel renders
   **Then** current values are shown for: dev fee (bps), creator fee cap (bps), minimum entry amount (wei), creation fee (wei), creations-paused flag, dispute deposit token, dispute deposit amount (wei), and refund authority address — all read on-chain from `LeagueFactory` for the currently selected chain.
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 10.1 FR55]

2. **Given** an admin edits `devFeeBps`, `creatorFeeCap`, or `minEntryAmount` and clicks "Update global params"
   **When** the transaction confirms
   **Then** the admin wallet calls `LeagueFactory.setGlobalParams(devFeeBps_, creatorFeeCap_, minEntryAmount_)`; `GlobalParamsUpdated` is emitted; the on-chain reads refresh.
   [Source: `LeagueFactory.sol::setGlobalParams`]

3. **Given** an admin edits the creation fee and clicks "Update creation fee"
   **When** the transaction confirms
   **Then** `LeagueFactory.setCreationFee(fee_)` is called; `CreationFeeUpdated` is emitted.

4. **Given** an admin toggles the "Pause all new leagues" switch and confirms
   **When** the transaction confirms
   **Then** `LeagueFactory.setCreationsPaused(bool)` is called; `CreationsPausedUpdated` is emitted; the UI reflects the new flag.

5. **Given** an admin updates dispute config (token, amount, refundAuthority) and clicks "Update dispute config"
   **When** the transaction confirms
   **Then** `LeagueFactory.setDisputeConfig(token_, amount_, refundAuthority_)` is called; `DisputeConfigUpdated` is emitted.

6. **Given** any parameter update is confirmed
   **When** a new league is created after the update
   **Then** the new league uses the updated params; all previously created leagues retain the params baked in at creation (existing behaviour, no story work required — just document in UX notes).

> **Scope note:** "Free league toggle" (FR55) and per-group "oracle grace period" have no backing in `LeagueFactory`. The free-league concept is not implemented in the contract (`entryFee == 0` always reverts). Per-group grace-period extension is already on `/admin/oracle`. This story does not implement those two sub-items; the displayed params reflect what the contract actually exposes.

## Tasks / Subtasks

- [ ] Task 1: Extend `leagueFactoryAbi.ts` with admin read + write entries (AC: all)
  - [ ] Add view getters: `devFeeBps`, `creatorFeeCap`, `minEntryAmount`, `creationFee`, `creationsPaused`, `disputeDepositToken`, `disputeDepositAmount`, `refundAuthority`
  - [ ] Add write functions: `setGlobalParams`, `setCreationFee`, `setCreationsPaused`, `setDisputeConfig`
  - [ ] Add events: `GlobalParamsUpdated`, `CreationsPausedUpdated`, `CreationFeeUpdated`, `DisputeConfigUpdated`

- [ ] Task 2: Build `AdminSettingsPage.tsx` at route `/admin/settings` (AC: #1–#5)
  - [ ] Chain selector (Base / Ethereum / Sonic — same `CreateLeagueChainId` pattern as `AdminTokenWhitelistPage`)
  - [ ] Section A — "Global fee params" card: display current `devFeeBps`, `creatorFeeCap`, `minEntryAmount`; edit fields; "Update global params" button → `setGlobalParams`
  - [ ] Section B — "Creation fee" card: display `creationFee` (wei); edit field; "Update creation fee" button → `setCreationFee`
  - [ ] Section C — "League creation" card: display `creationsPaused` boolean; toggle button → `setCreationsPaused`
  - [ ] Section D — "Dispute config" card: display `disputeDepositToken`, `disputeDepositAmount`, `refundAuthority`; edit fields; "Update dispute config" button → `setDisputeConfig`
  - [ ] All sections: display last tx hash / explorer link on success; plain-English error mapping for common reverts (`OwnableUnauthorizedAccount`, user rejected)
  - [ ] `refreshBusy` pattern: single Refresh button at top that refetches all reads

- [ ] Task 3: Wire route and nav (AC: #1)
  - [ ] Add `<Route path="settings" element={<AdminSettingsPage />} />` inside the `/admin/*` block in `AppRoutes.tsx`
  - [ ] Add "Platform settings" button to `AdminPlaceholderPage.tsx` linking to `/admin/settings`

- [ ] Task 4: Quality gates
  - [ ] `npm run lint` (frontend) — zero new errors
  - [ ] `npm run test` (frontend Vitest) — all pass

## Dev Notes

### Contract functions (all `onlyOwner`)

```solidity
// LeagueFactory.sol
function setGlobalParams(uint256 devFeeBps_, uint256 creatorFeeCap_, uint256 minEntryAmount_) external onlyOwner
function setCreationFee(uint256 fee_) external onlyOwner
function setCreationsPaused(bool paused_) external onlyOwner
function setDisputeConfig(address token_, uint256 amount_, address refundAuthority_) external onlyOwner
```

All are `onlyOwner` (OZ v5 `Ownable`). The SIWE admin role does NOT grant these — the **factory owner** key must sign.

### Current `leagueFactoryAbi.ts`

```ts
// Only has: creationFee(), createLeague(...), LeagueCreated — must extend.
export const leagueFactoryAbi = parseAbi([
  "function creationFee() view returns (uint256)",
  "function createLeague(...) payable returns (address league)",
  "event LeagueCreated(address indexed league, address indexed creator)",
]);
```

Do NOT remove the existing entries — append to them.

### Factory address resolution

```ts
import { leagueFactoryAddress } from "@/lib/createLeagueEnv";
// leagueFactoryAddress(chainId) → Address | undefined
// Returns undefined when VITE_LEAGUE_FACTORY_{chainId} env var is not set.
```

### Admin page patterns to follow exactly

- **Chain selector**: `useState<CreateLeagueChainId>(8453)` + select — identical to `AdminTokenWhitelistPage.tsx`.
- **Reads**: `useReadContract({ address: factory, abi: leagueFactoryAbi, functionName: "...", chainId, query: { enabled: Boolean(factory) } })` — one hook per field (or batch with `usePublicClient` if preferred).
- **Writes**: `useWriteContract` + `switchChainAsync` + `waitForTransactionReceipt(wagmiConfig, ...)`.
- **Busy state**: single `busyId: string | null` or per-section `busy` booleans.
- **Error / tx display**: same `error` string + `lastTx: { hash, url }` pattern as `AdminTokenWhitelistPage.tsx`.
- **UI components**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button` from `@/components/ui/*`. Min-height buttons: `className="min-h-11"`.
- **Explorer URL helper**: copy `txExplorerUrl(chainId, txHash)` pattern from `AdminTokenWhitelistPage.tsx`.

### Input handling for numeric fields

Parse bigint inputs carefully — use `BigInt(trimmed)` inside try/catch; validate before enabling send. Display bps values as human-readable ("%") in labels but pass raw bigint to contract.

### Regression risks

- `leagueFactoryAbi.ts` is also imported by `CreateLeagueWizardPage.tsx` (uses `createLeague` and `LeagueCreated`). Do not change or remove those entries.
- `AdminPlaceholderPage.tsx` links to existing routes — only add, do not reorder.
- `AppRoutes.tsx` admin block — add `settings` route inside the existing `Routes` block, do not restructure.

### No backend changes required

All reads and writes are direct on-chain via wagmi/viem. No Prisma, no API routes needed for this story.

### References

- [Source: `contracts/contracts/LeagueFactory.sol` → all owner functions and events]
- [Source: `frontend/src/lib/leagueFactoryAbi.ts`]
- [Source: `frontend/src/lib/createLeagueEnv.ts` → `leagueFactoryAddress`]
- [Source: `frontend/src/pages/AdminTokenWhitelistPage.tsx` → chain selector + tx pattern]
- [Source: `frontend/src/pages/AdminOraclePage.tsx` → Card layout + write pattern]
- [Source: `frontend/src/pages/AdminPlaceholderPage.tsx`]
- [Source: `frontend/src/AppRoutes.tsx` → admin route block]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `frontend/src/lib/leagueFactoryAbi.ts`
- `frontend/src/pages/AdminSettingsPage.tsx` (new)
- `frontend/src/pages/AdminPlaceholderPage.tsx`
- `frontend/src/AppRoutes.tsx`
