# Story 2.7: "Get a Wallet" helper

Status: done

## Story

As a visitor with no wallet,
I want to see chain-appropriate guidance for setting up an EVM wallet,
So that I can get started on the platform without leaving the app or needing prior crypto knowledge.

## Acceptance criteria

1. **Given** a visitor clicks "Enter League" or "Create League" with no wallet detected **When** the RainbowKit modal opens **Then** a "Get a Wallet" section is displayed with links to MetaMask and Coinbase Wallet setup guides appropriate for EVM chains (FR2, UX-DR5).

2. **Given** a visitor has no wallet extension installed **When** they view the wallet modal **Then** browser-appropriate options are shown (e.g. mobile deep-links on mobile, extension install links on desktop).

3. **Given** a visitor is browsing leagues **When** no wallet is connected **Then** no wallet prompt is shown unprompted — the helper only appears on user-initiated gated actions (UX-DR5).

## Tasks / subtasks

- [x] Add `RainbowKitProvider` `appInfo.disclaimer` with **Get a Wallet** copy + MetaMask / Coinbase setup links (RainbowKit `Text` + `Link`).
- [x] Centralize URL selection in `getWalletInstallGuideUrls` (mobile vs desktop UA); unit tests.
- [x] Wire disclaimer in `SiweAuthProviders`; no new auto-open modals on browse-only routes.
- [x] Frontend lint, test, build green; sprint `2-7-get-a-wallet-helper` → `done`; Epic 2 complete.

## Dev notes

- RainbowKit renders `appInfo.disclaimer` inside the connect modal (intro / compact learn panel / mobile connect step). It does **not** open the modal by itself.
- Same modal is used for header **Connect** — disclaimer appears there too; acceptable and still user-initiated.

## Dev agent record

### Completion notes

- Implemented `GetWalletDisclaimer` + `walletGuideLinks.ts`; registered via `appInfo` on `RainbowKitProvider`.
- Product sign-off: story closed **done**; `epic-2` set **done** in sprint-status (all Epic 2 stories delivered).

### Debug log

- (empty)

## File list

- `frontend/src/components/GetWalletDisclaimer.tsx`
- `frontend/src/components/SiweAuthProviders.tsx`
- `frontend/src/lib/walletGuideLinks.ts`
- `frontend/src/lib/walletGuideLinks.test.ts`

## Change log

- **2026-04-27:** Story 2.7 implemented; ready for review.
- **2026-04-27:** Accepted by stakeholder; Status **done**; Epic 2 marked **done** in sprint tracking.
