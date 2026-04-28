---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
---

# DegenDraft - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DegenDraft, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A visitor can connect an EVM wallet via RainbowKit (MetaMask, Rainbow, Coinbase Wallet, WalletConnect)
FR2: A visitor can view chain-appropriate wallet setup guidance (MetaMask/Coinbase for EVM) when no wallet is detected
FR3: The system displays ENS, Basename, or SNS display names and avatars where available, falling back to truncated wallet address
FR4: An Admin can verify their admin status by signing a message after wallet connection
FR5: The system re-verifies admin status when a user switches chains
FR6: A visitor can browse all public leagues without connecting a wallet
FR7: A visitor can filter leagues by chain, entry token, and entry fee range
FR8: A visitor can sort leagues by date created, total pool value, and entry count
FR9: A visitor can see a featured leagues row at the top of the browse page (admin-flagged or paid promotion)
FR10: A visitor can view a league detail page showing entry fee, prize pool, entries count, fee breakdown, time to lock, and creator description
FR11: The system generates Open Graph rich metadata for every league share link
FR12: A Creator can create a league by specifying chain, entry token (from whitelisted tokens on that chain), flat entry fee, max total entries, max entries per wallet, and optionally a minimum player threshold
FR13: A Creator can configure prediction revision policy: locked (no changes), free revisions, or paid revisions (revision fees added to the prize pool)
FR14: The system warns a Creator that all league settings are immutable after creation and requires explicit acknowledgment
FR15: A Creator can pay a league promotion fee (on-chain, $20 USDC/day default) to feature their league
FR16: The system refunds all entrants if a minimum player threshold is not met at lock time; creation fee is non-refundable
FR17: A Player can enter a league by paying the entry fee in the league's token and submitting a commitment hash of their predictions
FR18: A Player can rank all 12 World Cup groups (A–L), assigning positions 1–4 to each team using drag-and-drop on desktop and dropdown selectors on mobile
FR19: A Player must submit a tiebreaker (total goals predicted across all group stage matches, 1–1000) as part of their entry
FR20: The system prevents submission until all 12 groups are ranked and the tiebreaker is filled (progress indicator always visible)
FR21: A Player can submit multiple entries to the same league with the same or different predictions
FR22: The system displays Polymarket market-consensus win probabilities per group alongside the prediction form, with a data-as-of timestamp and staleness warning if cache exceeds 24 hours
FR23: A Player must acknowledge a compliance modal (jurisdiction self-certification) once per league entry; acknowledgment is stored with wallet address, league ID, and timestamp
FR24: A Player can revise predictions (if the league allows revisions) before the lock time; revision fees are added to the prize pool
FR25: A Player can view a real-time leaderboard for any league they have entered, showing rank, score, and entries count
FR26: A Player can view their current score breakdown (points per group, tiebreaker) updating as group stage matches complete
FR27: A Creator can view all player predictions after the league locks and matches begin
FR28: A Creator can view their league's entry count, pool value, referral conversion count, and league status at all times via their dashboard
FR29: A Creator can copy a unique referral link for sharing on Discord, Telegram, and X
FR30: The system posts group stage results on-chain automatically via a cron-triggered oracle after all group matches complete
FR31: A redundant cron on an independent server can post results idempotently if the primary cron fails
FR32: An Admin can manually post results via the admin panel (pre-filled from api-football.com) if both cron servers fail
FR33: The system alerts admins via Telegram/webhook if results are not posted by the expected deadline
FR34: An Admin can extend the oracle grace period to prevent a league from becoming permanently frozen
FR35: A Player can file a dispute during the 24-hour dispute window by paying a $50 USDC flat deposit and specifying the disputed group(s) with a description
FR36: A Creator can file a dispute for free during the dispute window
FR37: An Admin can view all filed disputes with the oracle-posted result and the disputant's claim side-by-side
FR38: An Admin can override results for specific disputed groups only, triggering indexer recalculation of all scores
FR39: An Admin can dismiss a dispute and confiscate the deposit (malicious/spam)
FR40: An Admin can trigger a full refund for all entrants if a dispute is irresolvable
FR41: The system refunds the dispute deposit to the disputant if the dispute is ruled valid
FR42: The indexer calculates all player scores off-chain (1pt per correct group position, +1 bonus per perfect group, tiebreaker recorded) and builds a Merkle tree of payouts after the dispute window closes
FR43: The indexer posts the Merkle payout root on-chain after the dispute window expires cleanly or admin resolves
FR44: A winner can claim their prize by submitting a Merkle proof via the app
FR45: A Creator can claim their 3% creator fee by submitting a Merkle proof via the app
FR46: The dev wallet can claim the 2% dev fee by submitting a Merkle proof (claimable across multiple leagues)
FR47: Unclaimed funds become claimable by the dev wallet 90 days after league resolution
FR48: A Player can view their full prediction history and score breakdown after a league resolves
FR49: Any user can submit a token whitelist request by paying $100 USDC equivalent on-chain, specifying token address and chain
FR50: Any user can upvote or downvote pending whitelist requests in a public queue
FR51: An Admin can approve a whitelist request, making the token available for league creation on that chain
FR52: An Admin can reject a whitelist request; the system automatically refunds the fee minus gas
FR53: The system auto-detects and flags fee-on-transfer and rebase tokens during admin whitelist review
FR54: An Admin can de-whitelist a token; existing leagues using that token run to completion unless admin triggers a refund
FR55: An Admin can set global platform parameters: creator fee %, dev fee %, minimum entry amount, and free league toggle (changes apply to new leagues only)
FR56: An Admin can pause creation of new leagues globally or pause an existing league from accepting new entries
FR57: An Admin can view reported leagues and take action: warn creator, pause league, close + refund, or dismiss report
FR58: An Admin can flag any league as featured at no cost
FR59: An Admin can view oracle health status per chain (results posted / past deadline) and trigger manual posting or grace extension
FR60: A Player can report a league; report is queued for admin review
FR61: A visitor can view live platform statistics (total value locked, active leagues, total player count) on the landing page, sourced from the indexer
FR62: The system displays a FIFA-inspired but legally independent visual identity using public-domain country flags
FR63: When two or more entries share identical score and tiebreaker distance after the dispute window closes, the prize pool is split equally among them; any indivisible remainder (dust) transfers to the dev wallet
FR64 (nice-to-have): The Polymarket odds widget displays a deep-link to the corresponding Polymarket market alongside each group's probability display
FR65 (nice-to-have): A visitor with no wallet can create a Coinbase Smart Wallet inline on the league entry page without leaving the app

### NonFunctional Requirements

NFR1: Leaderboard data refreshes within 30 seconds of a match result being indexed — players see rank changes in near real-time
NFR2: Prediction form loads (including Polymarket odds widget) within 3 seconds on a standard broadband connection
NFR3: League detail and browse pages load within 2 seconds; indexer powers all queries — no direct on-chain RPC calls for UI rendering
NFR4: The Polymarket odds cache updates once per 24 hours; stale data is displayed with a visible timestamp — no page blocked on API response
NFR5: Oracle cron posts results within 1 hour of final group stage match completion; 3-tier fallback ensures posting within 24 hours in all failure scenarios
NFR6: All prediction data is stored with a commitment hash (keccak256) on-chain — raw predictions cannot be read or tampered with prior to the lock
NFR7: All API endpoints and database writes use parameterised queries — no SQL/NoSQL injection surface
NFR8: All string inputs (league names, descriptions, dispute notes) are sanitised before DB write
NFR9: Admin wallet actions (postResults, overrideResults, token approval) require on-chain signature — no server-side private key used
NFR10: HTTPS enforced on all frontend and API endpoints; no sensitive data in URL parameters
NFR11: Compliance signature storage contains only wallet address, league ID, and timestamp — no PII
NFR12: Token whitelist fee payment verified on-chain before request enters the queue — no off-chain payment forgery possible
NFR13: Zero permanently frozen leagues — the 3-tier oracle fallback and admin manual posting ensure every league can always reach Resolved or Refunded state
NFR14: Smart contract payout functions are protected with ReentrancyGuard and checks-effects-interactions pattern — no re-entrancy exploit path
NFR15: The indexer is the only system that writes the Merkle root to the contract — no manual or admin path to override payout distribution without a dispute override flow
NFR16: All EVM contract deployments pass Slither static analysis with no high-severity findings before mainnet
NFR17: The indexer and Postgres DB are designed to handle all three EVM chains simultaneously from a single instance; horizontal scaling is possible if entry volume exceeds projections
NFR18: The browse/leaderboard/stats UI is served from the indexed DB — no RPC bottleneck at scale regardless of on-chain activity
NFR19: Mobile prediction form uses forced pagination and dropdown selectors — drag-and-drop is desktop-only; all core flows are usable on mobile browsers without native app installation
NFR20: All form inputs, modals, and CTAs meet WCAG 2.1 AA contrast and keyboard navigation standards
NFR21: api-football.com v3 is the canonical results source for the oracle and disputes; the app must gracefully handle API downtime (cached data served, admin alerted)
NFR22: Polymarket API failure results in the odds widget hiding gracefully — prediction form remains fully functional without it
NFR23: All ERC-20 token operations handle arbitrary decimal configurations — no hardcoded decimal assumptions; tested explicitly for USSD (Sonic) non-standard decimals

### Additional Requirements

- **Project scaffold:** Three sub-projects — `contracts/` (Hardhat), `backend/` (TypeScript Node.js), `frontend/` (Vite + React + RainbowKit). Epic 1 Story 1 must be repo and tooling setup.
- **Smart contracts first:** `contracts/` is the highest-risk sub-project. Contract development and full test coverage must precede backend and frontend integration work.
- **Hardhat deploy scripts:** One per chain (Base, Ethereum, Sonic) — developer runs manually. Deployer keys in `.env.*` files never committed.
- **Slither static analysis:** Must pass on all contracts before mainnet deployment (NFR16). CI step in `contracts/`.
- **Mock oracle:** `setResultsForTesting()` function on OracleController — staging-only, gated by deploy-time flag. Required for end-to-end staging runs.
- **Prisma migrations:** Single `backend/prisma/schema.prisma` is source of truth for all chains + all domains. Migrations committed to repo.
- **SIWE authentication:** Both player/creator and admin auth use Sign-in-with-Ethereum. Admin additionally verified against Postgres whitelist.
- **Event-driven leaderboard:** Indexer writes scores to Postgres only on `ResultsPosted` on-chain event — no fixed polling interval.
- **API envelope:** All responses use `{ data, meta }` success / `{ error, code }` error format.
- **On-chain/off-chain boundary:** API routes are read-only on score/leaderboard tables. Only indexer writes scores. Only `merkleBuilder.ts` posts Merkle root to contract.
- **Self-hosted infrastructure:** Postgres in Docker container (IT-managed). Backend via PM2/systemd. Frontend static build via Nginx.
- **Multi-chain isolation:** Base, Ethereum, Sonic each have independent contract deployments. Single indexer + Postgres handles all three chains.
- **Fee immutability:** Creator + dev fee % locked at league creation time — enforced in contract and respected by indexer.
- **Token decimal agnosticism:** All ERC-20 operations generic — no hardcoded decimals. USSD (Sonic) non-standard decimals explicitly tested.

### UX Design Requirements

Extracted from `ux-design-specification.md` (status: complete, all 14 steps).

UX-DR1: Prediction form — desktop uses drag-and-drop (@dnd-kit) in a 2-column × 6-row group grid; mobile uses forced pagination (one group per screen) with 4 position dropdown selectors per group. DnD is `lg`+ only — never used on touch devices.
UX-DR2: Progress indicator (`<PredictionProgressBar>`) always visible on prediction form showing "X / 12 groups + tiebreaker ✓". Submit button disabled until 12/12 + tiebreaker filled — shown disabled with explanatory label, never hidden.
UX-DR3: Polymarket odds widget (`<PolymarketOddsWidget>`) displays win probability % per team alongside the active prediction group, with data-as-of timestamp and staleness warning if >24h. Hides gracefully on API failure — prediction form remains fully functional without it.
UX-DR4: Compliance modal (`<ComplianceModal>`) shown once per league entry (tracked by wallet address + league ID). Must be acknowledged with explicit checkbox + confirm before prediction form is accessible. Cannot be dismissed without confirmation.
UX-DR5: "Get a Wallet" helper shown when no wallet detected — chain-appropriate links (MetaMask/Coinbase for EVM). Browsing always available without wallet connection — gate deferred to "Enter League" / "Create League" actions only.
UX-DR6: League detail page shows `<FeeBreakdown>` (prize pool / creator fee % / dev fee % / exact token amount) before any transaction is signed. Never behind a tooltip-only pattern.
UX-DR7: Leaderboard (`<LeaderboardTable>`) shows rank delta (▲N / ▼N / —) prominently alongside absolute rank. `lastUpdatedAt` timestamp always visible. Score breakdown expandable per row. Updates triggered by oracle event — not polling.
UX-DR8: League creation is a multi-step wizard (chain → token → fee/limits → revision policy → promotion → review). Immutability warning with explicit acknowledgment checkbox required on review screen before creation tx.
UX-DR9: Admin oracle health screen (`<OracleHealthCard>`) shows per-chain status (green/red), last posted time, expected deadline, manual post form pre-filled from api-football.com, and grace extension button. One card per deployed chain.
UX-DR10: Creator dashboard (`<CreatorDashboard>`) includes referral/share link with one-click copy for Discord, Telegram, X. Shareable entry card generated at entry confirmation and claim success.
UX-DR11: All CTAs, modals, form inputs, and interactive elements meet WCAG 2.1 AA contrast and keyboard navigation. `prefers-reduced-motion` respected for all animations. Mobile touch targets ≥ 44×44px.
UX-DR12: Design direction: Broadcast shell (top-nav, no sidebar). Dark navy palette (#0A0E1A bg, #131929 surface). Inter + JetBrains Mono typography. shadcn/ui component library on Tailwind CSS.
UX-DR13: Every tx failure shows a plain-English error + retry CTA. No raw error codes or empty states. Every milestone (entry confirmed, rank change, payout claimed) has a distinct completion state with shareable artefact.

### FR Coverage Map

| FR Range | Epic |
|---|---|
| FR1–FR11 | Epic 2: Wallet, Auth & Public Browse |
| FR12–FR16 | Epic 3: League Creation & Creator Dashboard |
| FR17–FR24 | Epic 4: Player Entry & Predictions |
| FR25–FR27 | Epic 6: Leaderboard, Scoring & Score Breakdown |
| FR28–FR29 | Epic 3: League Creation & Creator Dashboard |
| FR30–FR34 | Epic 5: Oracle & Results Posting |
| FR35–FR41 | Epic 7: Disputes |
| FR42 | Epic 6: Leaderboard, Scoring & Score Breakdown |
| FR43–FR47 | Epic 8: Merkle Payout & Claims |
| FR48 | Epic 6: Leaderboard, Scoring & Score Breakdown |
| FR49–FR54 | Epic 9: Token Whitelist |
| FR55–FR58 | Epic 10: Admin Controls & Platform Management |
| FR59 | Epic 5: Oracle & Results Posting |
| FR60 | Epic 10: Admin Controls & Platform Management |
| FR61–FR62 | Epic 2: Wallet, Auth & Public Browse |
| FR63 | Epic 6: Leaderboard, Scoring & Score Breakdown |
| FR64–FR65 | Epic 11: Nice-to-Have Features |

**All 65 FRs covered. All 13 UX-DRs assigned across epics.**

## Epic List

### Epic 1: Project Scaffold & Smart Contract Suite

All three sub-repos initialised from architecture-specified starter templates (contracts: Hardhat TS, backend: Fastify TS, frontend: `npm create rainbowkit@latest`). Full smart contract suite written (`LeagueFactory.sol`, `League.sol`, `OracleController.sol`, `WhitelistRegistry.sol`), unit-tested to >90% coverage, Slither static analysis pass, deployed to staging on all 3 chains (Base, Ethereum mainnet, Sonic). Mock oracle for local/staging testing. Deploy scripts per chain. CI/CD scaffolded (GitHub Actions: lint, test, deploy). Tailwind CSS + shadcn/ui configured with Broadcast design tokens.

**FRs covered:** Foundational — enables all subsequent FRs
**UX-DRs:** UX-DR12 (design system + Broadcast shell scaffolded)

---

### Epic 2: Wallet, Auth & Public Browse

A visitor can browse all public leagues without a wallet. Players and creators can connect a wallet via RainbowKit and authenticate via SIWE. Admin wallet verification against Postgres whitelist. Landing page with live platform stats bar. League detail page with full fee breakdown. OG share meta tags per league. "Get a Wallet" helper for unconnected visitors.

**FRs covered:** FR1–FR11, FR61, FR62
**UX-DRs:** UX-DR5, UX-DR6, UX-DR11, UX-DR12, UX-DR13

---

### Epic 3: League Creation & Creator Dashboard

A creator can create a league via a multi-step wizard (chain → token → fee/limits → revision policy → promotion → review → on-chain tx). Immutability acknowledgment checkbox required on review screen. Optional paid promotion fee. Creator dashboard shows pool size, entries, live status, referral/share link with one-click copy.

**FRs covered:** FR12–FR16, FR28–FR29
**UX-DRs:** UX-DR8, UX-DR10, UX-DR11, UX-DR13

---

### Epic 4: Player Entry & Predictions

A player can enter a league (compliance modal, fee breakdown review, entry tx), complete the full prediction form (12 groups drag-and-drop on desktop / paginated dropdowns on mobile + tiebreaker), submit predictions on-chain, and revise predictions up to the revision deadline (locked / free / paid per league config). Multi-entry per wallet where allowed. Polymarket odds widget alongside active group. Progress indicator always visible.

**FRs covered:** FR17–FR24
**UX-DRs:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR11, UX-DR13

---

### Epic 5: Oracle & Results Posting

Primary cron automatically posts group stage results from api-football.com on schedule. Redundant cron monitors and catches missed posts. Admin can manually post results from a pre-filled form. Telegram alerts on cron failures or grace period expiry. Admin can extend oracle grace periods per group. Admin oracle health screen shows per-chain status (green/red), last post time, next expected deadline.

**FRs covered:** FR30–FR34, FR59
**UX-DRs:** UX-DR9, UX-DR11

---

### Epic 6: Leaderboard, Scoring & Score Breakdown

Indexer calculates and updates scores after each oracle post. Players view a live leaderboard with absolute rank and rank delta (▲N / ▼N / —). Score breakdown expandable per player per group. Tiebreaker split logic applied. Full prediction history visible after tournament resolution. `lastUpdatedAt` timestamp always shown. Updates are event-triggered, not polled.

**FRs covered:** FR25–FR27, FR42, FR48, FR63
**UX-DRs:** UX-DR7, UX-DR11

---

### Epic 7: Disputes

Players can file a dispute (with configurable $50 USDC deposit) within the 24h dispute window after results are posted. Creators can file for free. Admins review disputes in an admin panel, can override specific group results on-chain, confiscate deposits from bad-faith filers, or trigger a full league refund. Valid disputes have their deposit returned automatically.

**FRs covered:** FR35–FR41
**UX-DRs:** UX-DR11, UX-DR13

---

### Epic 8: Merkle Payout & Claims

After the dispute window closes, the indexer builds a Merkle tree of all winner shares, creator fees, and dev fees. Indexer posts the Merkle root on-chain. Players claim prizes via Merkle proof pull model. Creator and dev wallet claim their respective fees independently. Unclaimed funds expire to dev wallet after 90 days. Shareable claim card generated on successful claim.

**FRs covered:** FR43–FR47
**UX-DRs:** UX-DR10, UX-DR11, UX-DR13

---

### Epic 9: Token Whitelist

Users can submit a token whitelist request (on-chain fee). Pending requests visible in a public queue with upvote/downvote. Platform auto-detects fee-on-transfer tokens and rebase tokens and warns accordingly. Admins approve or reject requests; rejections trigger automatic fee refund. Admins can de-whitelist previously approved tokens.

**FRs covered:** FR49–FR54
**UX-DRs:** UX-DR11, UX-DR13

---

### Epic 10: Admin Controls & Platform Management

Admins can set and update global platform parameters (dev fee %, creator fee cap, min entry fee, free league toggle, oracle grace period, dispute deposit amount). Admins can pause leagues, flag leagues as featured, and action user-reported leagues (hide/reinstate).

**FRs covered:** FR55–FR58, FR60
**UX-DRs:** UX-DR11

---

### Epic 11: Nice-to-Have Features

Polymarket deep-link per prediction market (full market page, not just odds widget — FR64). Coinbase Smart Wallet inline creation at the entry prompt for users with no wallet (FR65).

**FRs covered:** FR64–FR65
**UX-DRs:** UX-DR3 (deep-link extension), UX-DR5 (Coinbase Smart Wallet)

---

## Epic 1: Project Scaffold & Smart Contract Suite

All three sub-repos initialised from architecture-specified starter templates. Full smart contract suite written (`LeagueFactory.sol`, `League.sol`, `OracleController.sol`, `WhitelistRegistry.sol`), unit-tested to >90% coverage, Slither static analysis pass, deployed to staging on all 3 chains (Base, Ethereum, Sonic). Mock oracle for local/staging testing. Deploy scripts per chain. CI/CD scaffolded. Design system configured.

### Story 1.1: Hardhat Contracts Repo — Init & Config

As a developer,
I want a fully configured Hardhat TypeScript project in `contracts/`,
So that smart contract development, testing, and deployment can begin immediately with consistent tooling.

**Acceptance Criteria:**

**Given** no `contracts/` directory exists
**When** I run the repo initialisation script
**Then** `contracts/` is created with Hardhat TypeScript config, `hardhat.config.ts` targeting Base, Ethereum, and Sonic testnets, OpenZeppelin and viem installed, `.env.example` with all required keys documented, and `npm test` runs with 0 errors on an empty test suite
**And** `.env.*` files are in `.gitignore` and no private keys are committed

**Given** a developer checks out the repo fresh
**When** they run `npm install` in `contracts/`
**Then** all dependencies install without errors and `npx hardhat compile` succeeds with no contracts present

---

### Story 1.2: WhitelistRegistry.sol

As a platform admin,
I want a `WhitelistRegistry` contract that maintains the canonical list of approved ERC-20 tokens on this chain,
So that league creators can only select tokens that have passed platform vetting.

**Acceptance Criteria:**

**Given** the contract is deployed by the owner address
**When** the owner calls `approveToken(address token)`
**Then** `isWhitelisted(token)` returns `true` and a `TokenApproved` event is emitted

**Given** a whitelisted token
**When** the owner calls `removeToken(address token)`
**Then** `isWhitelisted(token)` returns `false` and a `TokenRemoved` event is emitted

**Given** a non-owner address
**When** they call `approveToken` or `removeToken`
**Then** the transaction reverts with `OwnableUnauthorizedAccount`

**Given** the contract is deployed
**When** `getWhitelistedTokens()` is called
**Then** it returns all currently whitelisted token addresses on this chain

> **Deployment:** One `WhitelistRegistry` is deployed per supported chain (Base, Sonic, Ethereum). Each contract is chain-unaware — it simply manages a set of approved token addresses for the chain it lives on. The app connects to the correct chain and calls the correct contract address.

---

### Story 1.3: OracleController.sol

As a platform oracle,
I want an `OracleController` contract that manages authorised result posters, group result storage, and grace period logic,
So that group stage results can be posted on-chain by authorised crons or admin and subsequently consumed by `League.sol`.

**Acceptance Criteria:**

**Given** the contract is deployed with an authorised oracle address
**When** the oracle calls `postResults(uint8 groupId, address[4] rankings)` after match completion
**Then** the results are stored, a `ResultsPosted(groupId, rankings)` event is emitted, and `getResults(groupId)` returns the correct rankings

**Given** results already posted for a group
**When** the oracle calls `postResults` again for the same group
**Then** the transaction is idempotent — it succeeds if data matches, reverts with `ResultsAlreadyPosted` if data conflicts

**Given** the contract is deployed with `stagingMode = true`
**When** a developer calls `setResultsForTesting(uint8 groupId, address[4] rankings)`
**Then** results are set without oracle auth check (staging-only mock)

**Given** `stagingMode = false` (production deploy)
**When** anyone calls `setResultsForTesting`
**Then** the transaction reverts

**Given** a configured grace period has passed without results posted
**When** an admin calls `extendGracePeriod(uint8 groupId, uint256 additionalSeconds)`
**Then** the deadline extends and a `GracePeriodExtended` event is emitted

**Given** a non-authorised address
**When** they call `postResults`
**Then** the transaction reverts with `UnauthorisedOracle`

---

### Story 1.4: LeagueFactory.sol

As a creator,
I want a `LeagueFactory` contract that deploys new `League` instances with validated parameters,
So that every league on the platform has trusted, auditable creation provenance.

**Acceptance Criteria:**

**Given** a caller provides valid parameters (whitelisted token, fee > 0, valid revision policy enum, valid chain)
**When** they call `createLeague(LeagueParams params)` with the creation fee
**Then** a new `League` contract is deployed, registered in `leagues[]`, a `LeagueCreated(address league, address creator)` event is emitted, and the creation fee is transferred to the dev wallet

**Given** a caller provides a non-whitelisted token address
**When** they call `createLeague`
**Then** the transaction reverts with `TokenNotWhitelisted`

**Given** `creationsPaused = true`
**When** any caller calls `createLeague`
**Then** the transaction reverts with `CreationsPaused`

**Given** the owner calls `setGlobalParams(uint256 devFee, uint256 creatorFeeCap, uint256 minEntry)`
**When** the params are valid
**Then** the new params apply to all subsequently created leagues (existing leagues unaffected)

**Given** `getLeagues(uint256 offset, uint256 limit)` is called
**When** leagues exist
**Then** it returns a paginated array of deployed league addresses

---

### Story 1.5: League.sol

As a player,
I want a `League` contract that manages the full lifecycle of a single league (entry, lock, results, dispute window, payout),
So that all financial operations and state transitions are trustlessly enforced on-chain.

**Acceptance Criteria:**

**Given** a player calls `enter(bytes32 commitmentHash)` before lock time with correct fee in whitelisted token
**When** max entries not yet reached
**Then** their entry is recorded, fee transferred to contract, `EntrySubmitted(address player, bytes32 hash)` emitted

**Given** lock time has passed
**When** any address calls `enter`
**Then** the transaction reverts with `LeagueLocked`

**Given** the minimum player threshold is set and lock time passes with insufficient entries
**When** the contract detects underpopulation (via `checkThreshold()` callable by anyone after lock)
**Then** league transitions to `Refunding` state and all entrants can call `claimRefund()`

**Given** the league is in `Active` state and the oracle has posted all 12 group results
**When** the indexer calls `setMerkleRoot(bytes32 root)` after the dispute window closes
**Then** the root is stored, league transitions to `Resolved`, `MerkleRootSet(root)` is emitted

**Given** a winner calls `claimPrize(uint256 amount, bytes32[] proof)`
**When** the proof is valid against the stored Merkle root
**Then** the amount is transferred, the claim is marked used, `PrizeClaimed(address, amount)` emitted

**Given** a valid claim is submitted
**When** a second identical claim is submitted with the same proof
**Then** the transaction reverts with `AlreadyClaimed`

**Given** 90 days have elapsed since `MerkleRootSet` and unclaimed funds remain
**When** the dev wallet calls `sweepUnclaimed()`
**Then** all remaining funds transfer to devWallet and `UnclaimedSwept(amount)` is emitted

**Given** the contract has `ReentrancyGuard` applied to `claimPrize`, `claimRefund`, and `claimFee`
**When** a re-entrancy attack is attempted via a malicious ERC-20 callback
**Then** the second call reverts due to `ReentrancyGuard`

---

### Story 1.6: Contract Test Suite & Slither

As a developer,
I want a comprehensive test suite covering all contracts with >90% line and branch coverage and a clean Slither pass,
So that the contract suite is verifiably secure before staging deployment.

**Acceptance Criteria:**

**Given** all four contracts are implemented (Stories 1.2–1.5)
**When** `npm test` is run in `contracts/`
**Then** all tests pass and coverage report shows ≥90% line coverage and ≥85% branch coverage for each contract

**Given** edge-case scenarios
**When** tests are written for boundary conditions (zero fees, max entries, exact lock time boundary, dust remainder in split payouts, fee-on-transfer token detection)
**Then** all edge-case tests pass

**Given** all contracts are compiled
**When** `npx slither .` is run
**Then** no high-severity findings are reported; any medium findings are documented with a written justification in `slither-notes.md`

**Given** a malicious contract attempts re-entrancy on `League.claimPrize`
**When** the attack test runs
**Then** the test confirms the second call reverts and funds are not double-spent

---

### Story 1.7: Multi-chain Deploy Scripts

As a developer,
I want Hardhat deploy scripts for Base, Ethereum, and Sonic testnets and mainnets,
So that contracts can be deployed consistently to any supported chain by running a single command with the correct `.env` loaded.

**Acceptance Criteria:**

**Given** correct keys in `.env.base`, `.env.ethereum`, `.env.sonic`
**When** `npx hardhat run scripts/deploy.ts --network base-testnet` is run
**Then** `WhitelistRegistry`, `OracleController`, `LeagueFactory` are deployed in dependency order, addresses printed and written to `deployments/base-testnet.json`

**Given** a deployment is complete
**When** `deployments/<network>.json` is read
**Then** it contains contract name, address, deployer, block number, and timestamp for each deployed contract

**Given** a deploy is attempted with a missing env key
**When** the script runs
**Then** it exits with a clear error message identifying the missing key before any transaction is broadcast

**Given** a testnet deployment exists
**When** `scripts/verify.ts --network base-testnet` is run
**Then** contracts are verified on the chain's block explorer via the Hardhat verify plugin

---

### Story 1.8: Backend Repo — Init & Config

As a developer,
I want a fully configured Fastify TypeScript backend in `backend/` with Prisma ORM, PostgreSQL in Docker, and the base project structure,
So that API and indexer development can begin with consistent tooling and a working local database.

**Acceptance Criteria:**

**Given** no `backend/` directory exists
**When** the repo initialisation is run
**Then** `backend/` is created with Fastify TypeScript, Prisma ORM, `backend/prisma/schema.prisma` as source-of-truth, `docker-compose.yml` starting a Postgres container, and `npm run dev` starts the server on port 3001 with no errors

**Given** `docker-compose up -d` has been run
**When** `npx prisma migrate dev` is run
**Then** migrations apply cleanly and `npx prisma studio` can connect to the running DB

**Given** any API route returns a response
**When** the response is inspected
**Then** success responses use `{ data, meta }` envelope and error responses use `{ error, code }` envelope (NFR additional requirement)

**Given** a string input is submitted to any write endpoint
**When** it contains SQL injection payload (e.g. `' OR 1=1 --`)
**Then** the input is sanitised/parameterised and no DB error or data leak occurs (NFR7, NFR8)

---

### Story 1.9: Frontend Repo — Init & Design System

As a developer,
I want a Vite + React + TypeScript frontend bootstrapped via `npm create rainbowkit@latest` with Tailwind CSS, shadcn/ui, and the Broadcast design tokens configured,
So that all UI development starts from the correct design foundation with working wallet connection out of the box.

**Acceptance Criteria:**

**Given** no `frontend/` directory exists
**When** the project is initialised
**Then** `frontend/` is created via `npm create rainbowkit@latest`, Tailwind CSS configured with design tokens (`#0A0E1A` background, `#131929` surface, `#3B82F6` primary, Inter + JetBrains Mono fonts), shadcn/ui initialised with Radix primitives, and `npm run dev` serves the app on port 5173 with the RainbowKit connect button functional on Base testnet

**Given** the app loads
**When** a developer inspects the layout
**Then** the Broadcast top-nav shell (`<AppShell>`) renders: logo left, navigation links centre (Browse / My Leagues / Create), chain badge + wallet button right — matching UX-DR12

**Given** a user visits on a mobile viewport (< 1024px)
**When** the nav is inspected
**Then** navigation collapses to a hamburger menu and all tap targets are ≥ 44×44px (UX-DR11)

**Given** the design system is configured
**When** `npx shadcn-ui add button card input` is run
**Then** components render with Broadcast dark navy tokens applied, passing WCAG 2.1 AA contrast (UX-DR11)

---

### Story 1.10: GitHub Actions CI/CD

As a developer,
I want GitHub Actions workflows for lint, test, and staging deploy across all three sub-repos,
So that every push is automatically validated and staging deployments are triggered on merge to `main`.

**Acceptance Criteria:**

**Given** a pull request is opened against `main`
**When** the CI workflow runs
**Then** it installs dependencies, runs `npm run lint` and `npm test` for `contracts/`, `backend/`, and `frontend/` — PR is blocked if any step fails

**Given** a push to `main`
**When** the contracts CI step runs
**Then** `npx slither .` runs in `contracts/` and the workflow fails if high-severity findings are present

**Given** a push to `main`
**When** the deploy workflow runs
**Then** deploy scripts run for Base testnet, Ethereum testnet, and Sonic testnet using secrets from the GitHub Actions environment; deployed addresses are committed back to `deployments/`

**Given** any workflow step
**When** a secret key or private key would appear in logs
**Then** GitHub secrets masking ensures it is redacted from workflow output

---

## Epic 2: Wallet, Auth & Public Browse

A visitor can browse all public leagues without a wallet. Players and creators can connect a wallet via RainbowKit and authenticate via SIWE. Admin wallet verification against Postgres whitelist. Landing page with live platform stats bar. League detail page with full fee breakdown. OG share meta tags per league. "Get a Wallet" helper for unconnected visitors.

### Story 2.1: Landing Page & Platform Stats

As a visitor,
I want a landing page that shows live platform statistics and navigates me to browse leagues,
So that I can immediately understand the platform's activity and start exploring without needing a wallet.

**Acceptance Criteria:**

**Given** a visitor navigates to the root URL
**When** the page loads
**Then** the Broadcast `<AppShell>` top-nav renders (logo, Browse, My Leagues, Create links, chain badge + wallet button) and the landing page body displays a hero stats bar with Total Value Locked, Active Leagues, and Total Player Count sourced from the indexer API (FR61)

**Given** the indexer has data
**When** the stats bar renders
**Then** all three stats values are populated within 2 seconds (NFR3); a loading skeleton is shown while fetching

**Given** a visitor is on desktop (≥1024px) or mobile (<1024px)
**When** the page renders
**Then** layout is responsive, top-nav collapses to hamburger on mobile, all touch targets ≥ 44×44px (UX-DR11)

**Given** no wallet is connected
**When** a visitor views the landing page
**Then** Browse, stats, and all public content are fully accessible — no wallet prompt is shown unprompted (UX-DR5)

---

### Story 2.2: Wallet Connect & SIWE Auth

As a player or creator,
I want to connect my EVM wallet via RainbowKit and authenticate with Sign-In-with-Ethereum,
So that I can access gated actions (entering leagues, creating leagues) with a trustless, non-custodial login.

**Acceptance Criteria:**

**Given** a visitor clicks the wallet button in the top-nav
**When** RainbowKit modal opens
**Then** MetaMask, Rainbow, Coinbase Wallet, and WalletConnect options are displayed (FR1)

**Given** a user connects a wallet
**When** SIWE is triggered
**Then** a sign message prompt appears; on signing, an HTTP-only session cookie is set server-side and the user is considered authenticated

**Given** a user is authenticated
**When** the system resolves their display name
**Then** ENS (Ethereum), Basename (Base), or SNS (Sonic) name and avatar are shown if available, falling back to truncated address (FR3)

**Given** a user is authenticated
**When** they navigate to My Leagues or Create
**Then** they are permitted entry to those pages without re-prompting

**Given** an authenticated user disconnects their wallet
**When** disconnect is confirmed
**Then** the session cookie is cleared and all gated content reverts to visitor state

**Given** a failed SIWE signing (user rejects)
**When** the rejection occurs
**Then** the wallet remains connected but the user is not authenticated; a plain-English inline error explains they must sign to continue (UX-DR13)

---

### Story 2.3: Admin Auth & Chain Switch Re-verification

As an admin,
I want to authenticate my wallet via SIWE and have my admin status verified against the server-side whitelist,
So that admin-only actions are protected and re-verified whenever I switch chains.

**Acceptance Criteria:**

**Given** an admin connects their wallet and completes SIWE
**When** the backend receives the session
**Then** it checks the wallet address against the `admins` table in Postgres; if present, the session is flagged `isAdmin: true` (FR4)

**Given** `isAdmin: true` is set
**When** the user navigates to any `/admin/*` route
**Then** the route is accessible and admin UI elements (manual oracle post, dispute panel, etc.) are rendered

**Given** a non-admin wallet completes SIWE
**When** they attempt to access `/admin/*`
**Then** they are redirected to the home page with a plain-English "Access denied" message (UX-DR13)

**Given** an admin is authenticated
**When** they switch chains in their wallet
**Then** the system re-verifies admin status against the Postgres whitelist for the new chain context; if wallet is no longer valid for that chain, admin access is revoked for the session (FR5)

**Given** an admin switches to a chain where they are not whitelisted
**When** they attempt an admin action
**Then** the action is blocked with a plain-English explanation (UX-DR13)

---

### Story 2.4: League Browse Page — List, Filters & Sort

As a visitor,
I want to browse all public leagues with filtering and sorting controls,
So that I can quickly find leagues that match my preferred chain, token, and fee range.

**Acceptance Criteria:**

**Given** a visitor navigates to `/browse`
**When** the page renders
**Then** all public leagues are listed as `<LeagueCard>` components in an editorial card grid, each showing league name, chain, entry token, fee, pool size, entry count, and time to lock (FR6)

**Given** leagues exist with admin-flagged or paid promotion
**When** the browse page renders
**Then** a featured leagues row appears at the top above the general grid (FR9)

**Given** a visitor uses the filter controls
**When** they filter by chain, entry token, or fee range
**Then** the league list updates to show only matching leagues; filters are composable (FR7)

**Given** a visitor uses the sort controls
**When** they sort by date created, total pool value, or entry count
**Then** the league list reorders accordingly (FR8)

**Given** a visitor applies filters that return zero results
**When** the list renders
**Then** a plain-English empty state is shown with a suggestion to broaden filters — no raw error (UX-DR13)

**Given** the browse page data is sourced from the indexer
**When** the page loads
**Then** it renders within 2 seconds with no direct RPC calls to the blockchain (NFR3, NFR18)

---

### Story 2.5: League Detail Page & Fee Breakdown

As a visitor,
I want a league detail page that shows all key information including a full fee breakdown,
So that I can make an informed decision about entering before connecting my wallet or signing a transaction.

**Acceptance Criteria:**

**Given** a visitor navigates to `/league/:address`
**When** the page renders
**Then** it displays league name, creator address (with display name if available), chain, entry token, entry fee, prize pool, entries count (current / max), time to lock, creator description, and revision policy (FR10)

**Given** a league detail page loads
**When** the fee breakdown section renders
**Then** it shows prize pool %, creator fee %, dev fee %, and the exact token amount per component given the current entry fee — never hidden behind a tooltip only (FR10, UX-DR6)

**Given** a user visits the league detail page
**When** they are not yet connected
**Then** all detail information is visible; the "Enter League" CTA is displayed but clicking it triggers wallet connect flow (UX-DR5)

**Given** a league is featured
**When** the detail page renders
**Then** a featured badge is displayed on the league header

**Given** a league detail page loads
**When** page load time is measured
**Then** it loads within 2 seconds sourced from the indexer (NFR3)

---

### Story 2.6: OG Share Meta Tags

As a creator,
I want league share links to render rich Open Graph previews when shared on Discord, Telegram, or X,
So that my league gets maximum visibility from social sharing.

**Acceptance Criteria:**

**Given** a league exists at `/league/:address`
**When** a link scraper (Discord, Telegram, Twitter bot) fetches the URL
**Then** the response includes `og:title` (league name), `og:description` (entry fee, pool size, chain), `og:image` (platform branded card), and `og:url` with the canonical league URL (FR11)

**Given** the page is server-side rendered or uses a meta tag SSR approach
**When** a bot fetches the league detail URL
**Then** meta tags are present in the initial HTML response — not injected only by client-side JS

**Given** an invalid or non-existent league address is requested
**When** the URL is fetched
**Then** generic platform OG tags are returned rather than an error page with no meta tags

---

### Story 2.7: "Get a Wallet" Helper

As a visitor with no wallet,
I want to see chain-appropriate guidance for setting up an EVM wallet,
So that I can get started on the platform without leaving the app or needing prior crypto knowledge.

**Acceptance Criteria:**

**Given** a visitor clicks "Enter League" or "Create League" with no wallet detected
**When** the RainbowKit modal opens
**Then** a "Get a Wallet" section is displayed with links to MetaMask and Coinbase Wallet setup guides appropriate for EVM chains (FR2, UX-DR5)

**Given** a visitor has no wallet extension installed
**When** they view the wallet modal
**Then** browser-appropriate options are shown (e.g. mobile deep-links on mobile, extension install links on desktop)

**Given** a visitor is browsing leagues
**When** no wallet is connected
**Then** no wallet prompt is shown unprompted — the helper only appears on user-initiated gated actions (UX-DR5)

---

## Epic 3: League Creation & Creator Dashboard

A creator can create a league via a multi-step wizard (chain → token → fee/limits → revision policy → promotion → review → on-chain tx). Immutability acknowledgment checkbox required on review screen. Optional paid promotion fee. Creator dashboard shows pool size, entries, live status, referral/share link with one-click copy.

### Story 3.1: League Creation Wizard — Chain, Token & Fee/Limits

As a creator,
I want to configure the financial parameters of my league through the first three wizard steps,
So that I can define what chain, token, and entry constraints will govern my league.

**Acceptance Criteria:**

**Given** an authenticated user clicks "Create League"
**When** the wizard opens
**Then** Step 1 displays a chain selector with Base, Ethereum, and Sonic as options; the selection is required before advancing (UX-DR8)

**Given** a chain is selected in Step 1
**When** the user advances to Step 2
**Then** Step 2 displays only tokens whitelisted on that chain (fetched from the indexer); the user must select one before advancing (FR12)

**Given** a chain and token are selected
**When** the user advances to Step 3
**Then** Step 3 displays fields for: flat entry fee (in selected token), max total entries (required), max entries per wallet (required), and optional minimum player threshold; all fields validate that values are positive integers or valid token amounts before advancing (FR12)

**Given** the user enters an entry fee below the platform minimum
**When** they attempt to advance from Step 3
**Then** an inline validation error appears with the minimum allowed value — the step cannot be advanced (NFR, additional requirements)

**Given** the user navigates back from any step
**When** they return to a previous step
**Then** all previously entered values are preserved

---

### Story 3.2: League Creation Wizard — Revision Policy, Promotion, Review & On-chain TX

As a creator,
I want to complete the final wizard steps, acknowledge that my settings are immutable, and submit my league on-chain,
So that my league is created trustlessly with the exact parameters I configured.

**Acceptance Criteria:**

**Given** Steps 1–3 are complete
**When** the user reaches Step 4 (Revision Policy)
**Then** three options are presented: Locked (no changes), Free Revisions (free), Paid Revisions (fee amount input required); selection is required before advancing (FR13)

**Given** Step 4 is complete
**When** the user advances to Step 5 (Promotion)
**Then** Step 5 displays the optional promotion fee (default $20 USDC/day), a duration selector in days, and a total cost preview in USD and the selected token; user may skip promotion entirely (FR15)

**Given** Steps 1–5 are complete
**When** the user reaches Step 6 (Review)
**Then** a full read-only summary of all configured parameters is displayed alongside an immutability warning panel and an acknowledgment checkbox: "I understand these settings cannot be changed after creation" — the Create button is disabled until the checkbox is checked (FR14, UX-DR8)

**Given** the acknowledgment checkbox is checked
**When** the user clicks "Create League"
**Then** a `createLeague` transaction is sent to `LeagueFactory` on the selected chain with all parameters encoded; a pending state with a plain-English description is shown while the tx is in-flight (UX-DR13)

**Given** the transaction is confirmed on-chain
**When** the UI receives the confirmation
**Then** the user is redirected to their new league detail page and a success toast is shown with a shareable link (UX-DR13)

**Given** the transaction fails or is rejected by the user
**When** the failure is detected
**Then** a plain-English error is shown with a Retry CTA — the user is not kicked out of the wizard (UX-DR13)

**Given** a paid promotion fee was configured in Step 5
**When** the creation tx is prepared
**Then** the promotion fee USDC transfer is bundled or sequenced immediately after league creation; the fee breakdown shows both amounts before signing (UX-DR6)

---

### Story 3.3: Minimum Player Threshold & Refund

As a player,
I want to automatically receive a full refund if a league's minimum player threshold is not met at lock time,
So that I am never trapped in an underpopulated league with no chance of a fair competition.

**Acceptance Criteria:**

**Given** a league was created with a minimum player threshold
**When** lock time passes and the entry count is below the threshold
**Then** `checkThreshold()` on `League.sol` can be called by anyone, transitioning the league to `Refunding` state and emitting `LeagueRefunding` (FR16)

**Given** the league is in `Refunding` state
**When** an entrant calls `claimRefund()`
**Then** their full entry fee is returned in the original token, the claim is recorded, and `RefundClaimed(address, amount)` is emitted

**Given** the league is in `Refunding` state
**When** a user visits the league detail page
**Then** a prominent banner explains the league did not meet its minimum threshold, and a "Claim Refund" CTA is shown to connected entrants (UX-DR13)

**Given** the creation fee paid by the creator
**When** a threshold refund is triggered
**Then** the creation fee is NOT refunded to the creator — only entry fees are returned to players (FR16)

**Given** an entrant has already claimed their refund
**When** they attempt `claimRefund()` again
**Then** the transaction reverts with `AlreadyClaimed`

---

### Story 3.4: Creator Dashboard

As a creator,
I want a dashboard for my league showing live stats and a referral link I can copy and share,
So that I can monitor my league's performance and drive entries through social sharing.

**Acceptance Criteria:**

**Given** an authenticated creator navigates to their league's creator view
**When** the dashboard renders
**Then** it displays: entry count (current / max), prize pool value in the entry token and estimated USD, league status (Pending / Active / Locked / Resolved / Refunding), and time to lock (FR28)

**Given** a creator views the dashboard
**When** they view the referral section
**Then** a unique referral link for the league is displayed with three one-click copy buttons labelled Discord, Telegram, and X — each copies a platform-appropriate share message with the link embedded (FR29, UX-DR10)

**Given** the creator clicks a copy button
**When** the copy succeeds
**Then** the button label changes to "Copied!" for 2 seconds before reverting — confirming the action without a modal (UX-DR13)

**Given** the creator is not the owner of a league
**When** they attempt to access that league's creator dashboard URL
**Then** they are redirected to the public league detail page

**Given** new entries arrive while the creator has the dashboard open
**When** the entry count updates
**Then** the dashboard reflects the new count within 30 seconds (aligned with NFR1 indexer refresh rate)

---

## Epic 4: Player Entry & Predictions

A player can enter a league (compliance modal, fee breakdown review, entry tx), complete the full prediction form (12 groups drag-and-drop on desktop / paginated dropdowns on mobile + tiebreaker), submit predictions on-chain, and revise predictions up to the revision deadline. Multi-entry per wallet where allowed. Polymarket odds widget alongside active group. Progress indicator always visible.

### Story 4.1: League Entry — Compliance Modal & Fee Review

As a player,
I want to review the full fee breakdown and acknowledge a compliance statement before committing to joining a league,
So that I understand exactly what I am paying and have self-certified my eligibility before any on-chain action.

**Acceptance Criteria:**

**Given** an authenticated player clicks "Enter League" on a league detail page
**When** the entry flow begins
**Then** the `<FeeBreakdown>` component renders showing: entry fee amount in the league token, prize pool %, creator fee %, dev fee %, and the exact token amount per component — this is shown before any transaction is requested (UX-DR6)

**Given** the fee breakdown is displayed
**When** the player proceeds
**Then** the `<ComplianceModal>` opens with jurisdiction self-certification text, an explicit checkbox ("I confirm I am eligible to participate in this competition in my jurisdiction"), and a Confirm button — the Confirm button is disabled until the checkbox is checked (FR23, UX-DR4)

**Given** this wallet address + league ID combination has previously acknowledged compliance
**When** the player enters the same league again (multi-entry)
**Then** the compliance modal is shown again — acknowledgment is required once per entry, not once per wallet (FR23, UX-DR4)

**Given** the player dismisses the compliance modal without confirming
**When** they are returned to the league detail page
**Then** no entry transaction is initiated and no acknowledgment is recorded

**Given** the compliance acknowledgment is confirmed
**When** it is stored
**Then** the backend records wallet address, league ID, and timestamp — no PII is stored (NFR11)

---

### Story 4.2: League Entry — On-chain Entry Transaction

As a player,
I want to submit my entry on-chain with a commitment hash of my predictions after acknowledging compliance,
So that my intent to participate is recorded trustlessly before my full predictions are revealed.

**Acceptance Criteria:**

**Given** a player has acknowledged compliance
**When** the entry transaction is prepared
**Then** `keccak256(predictions + salt)` is computed client-side as the commitment hash and the `enter(bytes32 commitmentHash)` call is prepared targeting `League.sol` on the correct chain (FR17, NFR6)

**Given** the transaction is submitted
**When** it is in-flight
**Then** a pending state with a plain-English description ("Submitting your entry to the league...") is displayed and the player cannot accidentally re-submit (UX-DR13)

**Given** the transaction is confirmed on-chain
**When** the UI receives confirmation
**Then** the player is redirected to the prediction form for this entry and a success toast is shown; the commitment hash and salt are stored in the backend for later reveal (FR17, UX-DR13)

**Given** the transaction fails (insufficient allowance, max entries reached, league locked)
**When** the failure is detected
**Then** a plain-English error specific to the failure reason is shown with a Retry CTA (UX-DR13)

**Given** the league's max entries per wallet is 1
**When** a player who already has an entry attempts to enter again
**Then** the "Enter League" CTA is replaced with a "You have already entered" message — no tx is initiated

---

### Story 4.3: Prediction Form — Desktop Drag-and-Drop

As a player on desktop,
I want to rank each World Cup group's teams by dragging them into positions 1–4 in a 2-column × 6-row grid,
So that I can efficiently set all 12 group predictions in a single spatial interaction.

**Acceptance Criteria:**

**Given** a player on a viewport ≥1024px has an active entry
**When** the prediction form loads
**Then** a 2-column × 6-row grid of group cards renders, each containing 4 team slots; all 48 teams are shown as draggable chips in their unranked default state (FR18, UX-DR1)

**Given** a player drags a team chip into a position slot
**When** the drop is completed
**Then** the team is placed in that position, any previously occupying team is displaced back to the unranked area, and the group card updates to reflect the new order without a page reload (FR18, UX-DR1)

**Given** a group has all 4 positions filled
**When** the player inspects the group card
**Then** the group card shows a visual "complete" indicator (e.g. green border or checkmark) (UX-DR2)

**Given** the player is on a touch device (viewport <1024px)
**When** they attempt to use the prediction form
**Then** the drag-and-drop interface is not rendered — the mobile paginated form (Story 4.4) is shown instead (UX-DR1, NFR19)

---

### Story 4.4: Prediction Form — Mobile Paginated Input

As a player on mobile,
I want to rank each World Cup group one at a time using dropdown selectors,
So that I can complete all 12 group predictions on a small screen without drag-and-drop.

**Acceptance Criteria:**

**Given** a player on a viewport <1024px has an active entry
**When** the prediction form loads
**Then** one group is shown per screen with 4 labelled dropdown selectors (1st, 2nd, 3rd, 4th place), each showing the 4 teams of that group as options (FR18, UX-DR1, NFR19)

**Given** a player selects a team in one position
**When** the same team is selected in another position
**Then** the previous selection for that team is cleared and an inline warning ("A team can only appear in one position") is shown (FR18)

**Given** all 4 positions in a group are filled
**When** the player taps "Next Group"
**Then** the next group's page slides in and the progress indicator updates (UX-DR1, UX-DR2)

**Given** the player taps "Previous Group"
**When** navigating back
**Then** the previous group's selections are preserved exactly as left (UX-DR1)

**Given** a player completes all 12 groups on mobile
**When** they reach the final screen
**Then** the tiebreaker input and submit button are shown on that final screen (UX-DR1)

---

### Story 4.5: Prediction Form — Tiebreaker, Progress Indicator & Submission

As a player,
I want a visible progress indicator tracking my group completions and a tiebreaker input, with the submit button gated until everything is filled,
So that I know exactly what's left to complete and cannot accidentally submit an incomplete entry.

**Acceptance Criteria:**

**Given** the prediction form is open
**When** any number of groups are complete
**Then** `<PredictionProgressBar>` always shows "X / 12 groups + tiebreaker ✓/✗" updating in real time — it is never hidden (FR20, UX-DR2)

**Given** the player has completed all 12 groups
**When** they reach the tiebreaker field
**Then** a numeric input accepts an integer from 1 to 1000 representing total goals in all group stage matches; label and helper text explain what is being predicted (FR19)

**Given** the player has completed all 12 groups and entered a tiebreaker
**When** the submit button state is evaluated
**Then** the submit button becomes active; if either condition is unmet, the button remains disabled with an explanatory label ("Complete all groups and tiebreaker to submit") — never hidden (FR20, UX-DR2)

**Given** the player clicks Submit
**When** the submission transaction is prepared
**Then** the backend reveals the commitment pre-image (salt + encoded predictions) and calls `submitPredictions` on `League.sol`; a pending state is shown (FR17)

**Given** the submission is confirmed on-chain
**When** the UI receives confirmation
**Then** the player is shown a success state with a shareable entry confirmation card and the predictions are marked as submitted in the backend (UX-DR13, UX-DR10)

---

### Story 4.6: Polymarket Odds Widget

As a player filling in their predictions,
I want to see market-consensus win probabilities for the teams in the group I am actively predicting,
So that I can make an informed prediction without leaving the app.

**Acceptance Criteria:**

**Given** a player has the prediction form open
**When** they are interacting with a group card (desktop) or viewing a group page (mobile)
**Then** `<PolymarketOddsWidget>` displays alongside that group showing win probability % per team, a "Data as of [timestamp]" label, and a staleness warning if the cache is >24 hours old (FR22, UX-DR3)

**Given** the Polymarket API is unavailable or the cache has no data
**When** the widget would normally render
**Then** the widget area is hidden gracefully — the prediction form remains fully functional with no error state shown to the player (FR22, NFR22, UX-DR3)

**Given** odds data is available
**When** the cache was last updated within 24 hours
**Then** no staleness warning is shown; if >24 hours, the warning "Odds data may be outdated" is displayed alongside the timestamp (FR22, NFR4)

---

### Story 4.7: Multi-Entry Support

As a player,
I want to enter the same league multiple times (up to the per-wallet max) with the same or different predictions,
So that I can increase my chances or experiment with different strategies.

**Acceptance Criteria:**

**Given** a league allows more than 1 entry per wallet
**When** a player who already has one entry views the league detail page
**Then** an "Enter Again" CTA is shown alongside their existing entry count if they are below the per-wallet maximum (FR21)

**Given** a player submits a second entry
**When** the entry tx is confirmed
**Then** a separate commitment hash is created and stored for the new entry; both entries are independently trackable by the player (FR21)

**Given** a player has reached the per-wallet maximum entries
**When** they view the league detail page
**Then** the "Enter" CTA is replaced with "Maximum entries reached" and no entry transaction can be initiated (FR21)

**Given** a player has multiple entries in a league
**When** they view the leaderboard
**Then** each entry appears as a separate row with its own rank and score (FR25)

---

### Story 4.8: Prediction Revision

As a player,
I want to revise my predictions before lock time if the league allows revisions,
So that I can correct mistakes or update my strategy based on new information.

**Acceptance Criteria:**

**Given** a league has revision policy "Free Revisions" or "Paid Revisions"
**When** a player navigates to their submitted entry before lock time
**Then** a "Revise Predictions" button is shown alongside their current predictions (FR24)

**Given** a player submits a revision
**When** the revision tx is confirmed (with revision fee transfer for paid revision leagues)
**Then** the new predictions overwrite the previous ones on-chain; `PredictionsRevised(address, entryId)` is emitted and the backend updates the stored pre-image (FR24)

**Given** a "Paid Revisions" league
**When** a player initiates a revision
**Then** the revision fee amount is shown clearly in a fee breakdown before the transaction is signed; the fee is transferred to the prize pool on confirmation (FR24, UX-DR6)

**Given** a league has revision policy "Locked"
**When** a player views their entry
**Then** no revision option is shown and the predictions are displayed as read-only (FR24)

**Given** lock time has passed
**When** a player attempts to revise regardless of revision policy
**Then** the revision CTA is removed from the UI and any direct contract call reverts with `LeagueLocked`

---

## Epic 5: Oracle & Results Posting

Primary cron automatically posts group stage results from api-football.com on schedule. Redundant cron monitors and catches missed posts. Admin can manually post results from a pre-filled form. Telegram alerts on cron failures or grace period expiry. Admin can extend oracle grace periods per group. Admin oracle health screen shows per-chain status, last post time, next expected deadline.

### Story 5.1: Primary Oracle Cron

As the platform,
I want a primary cron job that automatically fetches group stage results from api-football.com and posts them on-chain after each group's matches complete,
So that league scoring begins without manual intervention.

**Acceptance Criteria:**

**Given** the World Cup group stage is in progress
**When** a group's final match completes and the cron fires
**Then** the cron fetches results from api-football.com v3, maps the 4-team group ranking, calls `OracleController.postResults(groupId, rankings)` on each deployed chain, and logs a success entry to the `oracle_posts` Postgres table (FR30)

**Given** the cron fires and api-football.com returns a non-200 response or incomplete data
**When** the error is detected
**Then** the cron logs the failure to the `oracle_errors` table, does not post partial results, and relies on NFR5's 3-tier fallback (FR30, NFR5, NFR21)

**Given** results for a group have already been posted (idempotency)
**When** the cron fires again for the same group
**Then** `OracleController.postResults` receives the same data and the call succeeds idempotently — no duplicate event is emitted (FR31)

**Given** the cron is configured per environment
**When** the `STAGING_MODE=true` env var is set
**Then** the cron calls `setResultsForTesting()` on the mock oracle instead of the real api-football.com endpoint

---

### Story 5.2: Redundant Oracle Cron

As the platform,
I want a redundant oracle cron running on an independent server that detects and fills any missed group result posts from the primary cron,
So that a single server failure does not leave any league permanently unresolved.

**Acceptance Criteria:**

**Given** the redundant cron fires after the primary cron's expected posting window
**When** it checks `OracleController.getResults(groupId)` for each group whose match time has passed
**Then** if results are missing on-chain, the redundant cron fetches from api-football.com and posts them idempotently (FR31)

**Given** the primary cron has already posted results for a group
**When** the redundant cron checks that group
**Then** it detects results already exist and skips posting — no duplicate write or gas spend (FR31)

**Given** the redundant cron is deployed on a separate server/process
**When** the primary cron server goes down entirely
**Then** the redundant cron continues operating independently, ensuring results are posted within the NFR5 24-hour window (NFR5, NFR13)

**Given** the redundant cron posts results
**When** the post is confirmed
**Then** the event is logged to `oracle_posts` with `source: 'redundant'` for audit purposes

---

### Story 5.3: Admin Manual Results Posting

As an admin,
I want to manually post group stage results via the admin panel if both cron servers fail,
So that no league is ever permanently frozen due to oracle infrastructure failure.

**Acceptance Criteria:**

**Given** an admin navigates to the oracle admin screen for a chain
**When** a group's results have not been posted and the grace deadline is approaching
**Then** a "Post Results" form is shown pre-filled with data from api-football.com for that group (FR32, UX-DR9)

**Given** the pre-filled form is shown
**When** the admin reviews and submits
**Then** `OracleController.postResults(groupId, rankings)` is called from the admin's wallet (on-chain signature required — no server-side private key) (FR32, NFR9)

**Given** the admin submits the manual post transaction
**When** it is confirmed on-chain
**Then** a success confirmation is shown and the oracle health card for that group updates to green (FR32, UX-DR9, UX-DR13)

**Given** a non-admin user
**When** they attempt to access the manual posting form
**Then** the route is protected and they are redirected with an access denied message

---

### Story 5.4: Telegram Failure Alerts

As an admin,
I want to receive a Telegram alert when group results are not posted by the expected deadline,
So that I can intervene manually before a league becomes frozen.

**Acceptance Criteria:**

**Given** a group's expected result posting deadline passes
**When** the monitoring service checks `OracleController.getResults(groupId)` and finds no result
**Then** a Telegram message is sent to the configured admin channel containing: group ID, chain, expected deadline, and a direct link to the admin oracle panel (FR33)

**Given** results are eventually posted (by redundant cron or admin)
**When** the monitoring service next checks
**Then** no further alert is sent for that group — alerts are not repeated once resolved

**Given** the Telegram webhook is misconfigured or unreachable
**When** the alert would be sent
**Then** the failure is logged to the `alert_errors` table and does not crash the monitoring service

**Given** the alert configuration
**When** a new chain is added to `deployments/`
**Then** the monitoring service reads deployed chain configs dynamically — no hardcoded chain list in the alert code

---

### Story 5.5: Oracle Grace Period Extension

As an admin,
I want to extend the oracle grace period for a group on a specific chain,
So that a league is not frozen while I investigate a results dispute or infrastructure issue.

**Acceptance Criteria:**

**Given** an admin navigates to the oracle health screen for a chain
**When** a group is past its deadline but results are not yet posted
**Then** an "Extend Grace Period" button is shown for that group with a duration input (in hours) (FR34, UX-DR9)

**Given** the admin enters a duration and confirms
**When** the extension transaction is signed by the admin wallet
**Then** `OracleController.extendGracePeriod(groupId, additionalSeconds)` is called on-chain, a `GracePeriodExtended` event is emitted, and the health card deadline updates (FR34, NFR9)

**Given** a grace extension is confirmed
**When** the oracle health screen refreshes
**Then** the new deadline is shown and the group's status changes from "Past Deadline" to "Extended — deadline: [new time]" (UX-DR9)

---

### Story 5.6: Oracle Health Admin Screen

As an admin,
I want a per-chain oracle health screen that shows the posting status of every group,
So that I can monitor the full oracle pipeline and act immediately when any group falls behind.

**Acceptance Criteria:**

**Given** an admin navigates to `/admin/oracle`
**When** the page renders
**Then** one `<OracleHealthCard>` is shown per deployed chain (Base, Ethereum, Sonic), each displaying: chain name, last posted group, last post timestamp, next expected deadline, and a green/red status indicator per group (FR59, UX-DR9)

**Given** all 12 groups for a chain have posted results
**When** the health card renders
**Then** all group rows show green status and a checkmark with the posted timestamp

**Given** a group is past its expected deadline without a result
**When** the health card renders
**Then** that group row shows red status, minutes past deadline, and inline "Post Results" and "Extend Grace" action buttons (FR59, UX-DR9)

**Given** the admin is viewing the oracle health screen
**When** a result is posted on-chain (by any source)
**Then** the relevant group row updates to green within 30 seconds without a full page reload (NFR1)

**Given** a non-admin user
**When** they attempt to access `/admin/oracle`
**Then** they are redirected with an access denied message (NFR9)

---

## Epic 6: Leaderboard, Scoring & Score Breakdown

Indexer calculates and updates scores after each oracle post. Players view a live leaderboard with absolute rank and rank delta (▲/▼). Score breakdown expandable per player per group. Tiebreaker split logic applied. Full prediction history visible after tournament resolution. `lastUpdatedAt` always shown. Updates event-triggered, not polled.

### Story 6.1: Indexer — Score Calculation Engine

As the platform,
I want the indexer to calculate all player scores after each `ResultsPosted` on-chain event and write them to Postgres,
So that leaderboard and score data is always consistent with the latest oracle results without polling the blockchain.

**Acceptance Criteria:**

**Given** `OracleController` emits a `ResultsPosted(groupId, rankings)` event on any supported chain
**When** the indexer listener receives the event
**Then** it fetches all entries for leagues on that chain, calculates each player's score for the resolved group (1pt per correct position, +1 bonus for a perfect group), stores results in the `scores` table keyed by `(league_id, entry_id, group_id)`, and updates a `last_calculated_at` timestamp (FR42)

**Given** a group result is overridden by admin dispute resolution
**When** a `ResultsOverridden(groupId, newRankings)` event is emitted
**Then** the indexer recalculates all affected scores and updates the `scores` table accordingly (FR38, FR42)

**Given** the indexer processes a `ResultsPosted` event
**When** the calculation completes
**Then** all affected league leaderboard rows in Postgres are updated within 30 seconds of the event (NFR1)

**Given** the indexer crashes and restarts
**When** it reconnects to the chain
**Then** it replays missed events from the last processed block number stored in the `indexer_state` table — no scores are permanently missed (NFR13)

**Given** two or more entries share identical total score and identical tiebreaker distance after all groups resolve
**When** the Merkle tree is built
**Then** the prize pool is split equally among tied entries; any indivisible remainder (dust) is allocated to the dev wallet (FR63)

---

### Story 6.2: Leaderboard Page — Rank & Rank Delta

As a player,
I want to view a live leaderboard for any league I have entered, showing my rank, score, and how my rank has changed since the last oracle update,
So that I can track my standing competitively in near real-time.

**Acceptance Criteria:**

**Given** a player navigates to a league's leaderboard
**When** the page renders
**Then** `<LeaderboardTable>` displays all entries ordered by score descending, each row showing: rank, player display name (ENS/Basename/SNS or truncated address), total score, and rank delta (▲N / ▼N / —) (FR25, UX-DR7)

**Given** a `ResultsPosted` event has been processed by the indexer
**When** the leaderboard data is freshened
**Then** rank delta reflects the change in rank relative to the previous oracle update — not the initial rank (UX-DR7)

**Given** the leaderboard is being viewed
**When** the data was last updated
**Then** a `lastUpdatedAt` timestamp ("Updated X minutes ago") is always visible on the leaderboard header (UX-DR7)

**Given** a new `ResultsPosted` event is processed while a player has the leaderboard open
**When** the indexer writes updated scores
**Then** the leaderboard refreshes without a full page reload within 30 seconds (NFR1, UX-DR7)

**Given** the leaderboard data is sourced from the indexer Postgres
**When** the page loads
**Then** it renders within 2 seconds with no direct on-chain RPC calls (NFR3, NFR18)

---

### Story 6.3: Score Breakdown Per Player

As a player,
I want to expand my leaderboard row to see a per-group score breakdown,
So that I understand exactly which groups I got right or wrong and why my total score is what it is.

**Acceptance Criteria:**

**Given** a player views the leaderboard
**When** they click or tap their own row (or any row)
**Then** an expandable panel opens showing: each of the 12 groups with their predicted ranking vs. the actual ranking, points earned per group (0–5), whether the perfect group bonus was awarded, and the tiebreaker value submitted (FR26, UX-DR7)

**Given** a group has not yet resolved (results not yet posted)
**When** the breakdown renders for that group
**Then** the predicted ranking is shown but the actual ranking and score columns display "Pending" — no empty or broken state (UX-DR13)

**Given** a player has multiple entries in the same league
**When** they view the leaderboard
**Then** each entry has its own expandable breakdown row, independently showing that entry's predictions and scores (FR26)

---

### Story 6.4: Tiebreaker Split Logic

As a player,
I want tied entries to receive an equal share of the prize pool when both total score and tiebreaker distance are identical,
So that ties are resolved fairly and transparently without admin intervention.

**Acceptance Criteria:**

**Given** two or more entries share the same total score
**When** the tiebreaker is evaluated
**Then** the entry whose tiebreaker prediction is closest to the actual total goals in group stage matches is ranked higher; in the event of an exact tie (same distance), the entries are considered fully tied (FR63)

**Given** a fully tied set of entries
**When** the Merkle tree payout is built
**Then** the portion of the prize pool allocated to those positions is divided equally among all tied entries; any wei-level indivisible remainder goes to the dev wallet (FR63)

**Given** a league resolves with a tie
**When** affected players view the leaderboard
**Then** tied entries display identical ranks with a "Tied" badge and a tooltip explaining the equal split (FR63, UX-DR13)

---

### Story 6.5: Creator View — All Predictions After Lock

As a creator,
I want to see all player predictions for my league once it locks and matches begin,
So that I can transparently share prediction data with my community.

**Acceptance Criteria:**

**Given** a league's lock time has passed
**When** the creator navigates to their creator dashboard
**Then** a "View All Predictions" section is available showing each entry's full group rankings (revealed from commitment hash preimage stored by the backend) and tiebreaker value (FR27)

**Given** the lock time has NOT yet passed
**When** the creator views the dashboard
**Then** no predictions are shown — only entry count and pool value are visible (FR27)

**Given** the creator views the predictions table
**When** they inspect an entry
**Then** the entry shows the submitting wallet's display name, all 12 group rankings, tiebreaker, and entry timestamp

---

### Story 6.6: Full Prediction History Post-Resolution

As a player,
I want to view my complete prediction history and final score breakdown for a resolved league,
So that I can review my performance, share results, and learn for future competitions.

**Acceptance Criteria:**

**Given** a league has fully resolved (Merkle root posted, dispute window closed)
**When** a player navigates to that league's entry page for their entry
**Then** their full prediction history is shown: each group with their predicted ranking, the actual ranking, points earned, and the final tiebreaker comparison (FR48)

**Given** the player finished in a prize-winning position
**When** the post-resolution view renders
**Then** a "Claim Prize" CTA is shown alongside the score breakdown (links to Epic 8 claim flow)

**Given** the player views their post-resolution history
**When** they want to share their result
**Then** a "Share Result" button generates a shareable card showing their rank, score, and league name (UX-DR10, UX-DR13)

---

## Epic 7: Disputes

Players can file a dispute (with configurable $50 USDC deposit) within the 24h dispute window after results are posted. Creators can file for free. Admins review disputes in an admin panel, can override specific group results on-chain, confiscate deposits from bad-faith filers, or trigger a full league refund. Valid disputes have their deposit returned automatically.

### Story 7.1: Player & Creator Dispute Filing

As a player or creator,
I want to file a dispute about posted group results within the 24-hour dispute window,
So that incorrect oracle results can be formally challenged and reviewed before payouts are locked.

**Acceptance Criteria:**

**Given** a group result has been posted and the 24-hour dispute window is open
**When** a player navigates to the league's dispute section
**Then** a "File Dispute" form is shown listing all posted groups; the player must select the disputed group(s) and provide a text description of their claim (FR35)

**Given** a player submits a dispute
**When** the dispute transaction is prepared
**Then** a $50 USDC (flat, platform-configured) deposit is required; the fee breakdown is shown before signing and the deposit is transferred to the contract on confirmation (FR35, UX-DR6)

**Given** a creator files a dispute for their own league
**When** the dispute is submitted
**Then** no deposit is required — the form omits the deposit payment step and the dispute is filed at zero cost (FR36)

**Given** the dispute window has closed (24h elapsed since result posting)
**When** a user attempts to access the dispute form
**Then** the form is not shown; a plain-English message explains the window has closed (FR35, UX-DR13)

**Given** a dispute is successfully filed
**When** the transaction confirms
**Then** `DisputeFiled(address disputant, uint8 groupId, bool isCreator)` is emitted, the dispute is visible in the admin panel, and the filer sees a confirmation with the dispute reference (FR35, UX-DR13)

**Given** an authenticated user has no entry in the league
**When** they attempt to file a dispute
**Then** the file dispute CTA is not shown — only entrants and the league creator can file

---

### Story 7.2: Admin Dispute Review Panel

As an admin,
I want to review all filed disputes with oracle-posted results and disputant claims presented side-by-side,
So that I can make an informed decision on each dispute efficiently.

**Acceptance Criteria:**

**Given** an admin navigates to `/admin/disputes`
**When** the panel renders
**Then** all open disputes are listed with: league address, chain, disputed group ID, disputant wallet, deposit amount (or "Creator — no deposit"), dispute description, oracle-posted ranking for that group, and the api-football.com fetched ranking for comparison (FR37)

**Given** the admin selects a dispute
**When** the detail view opens
**Then** the oracle-posted ranking and the api-football.com authoritative result are shown side-by-side for the disputed group(s), along with all other disputes filed on the same group in the same league (FR37)

**Given** there are no open disputes
**When** the admin views the panel
**Then** an empty state is shown ("No open disputes") — no blank or broken layout (UX-DR13)

**Given** a non-admin user
**When** they attempt to access `/admin/disputes`
**Then** they are redirected with an access denied message

---

### Story 7.3: Admin Dispute Resolution Actions

As an admin,
I want to resolve disputes by overriding group results, dismissing bad-faith disputes, confiscating deposits, or triggering full league refunds,
So that every dispute reaches a fair, final outcome and the platform is protected from abuse.

**Acceptance Criteria:**

**Given** an admin reviews a valid dispute
**When** they choose "Override Results" for a group
**Then** they can input the corrected 4-team ranking; on confirmation the admin wallet calls `OracleController.overrideResults(groupId, correctedRankings)` on-chain, a `ResultsOverridden` event is emitted, the indexer recalculates all scores, and the dispute deposit is refunded to the disputant (FR38, FR41, NFR9)

**Given** an admin reviews a bad-faith or spam dispute
**When** they choose "Dismiss & Confiscate"
**Then** the admin wallet calls the confiscate function on-chain; the deposit is transferred to the dev wallet, the dispute is marked dismissed, and the disputant sees a status update (FR39)

**Given** an admin determines a dispute is irresolvable (e.g. data source conflict, fraudulent oracle)
**When** they choose "Full Refund"
**Then** the admin wallet calls `League.triggerRefund()` on-chain; the league transitions to `Refunding` state, all entrants can claim refunds, and all open dispute deposits are returned (FR40)

**Given** a group result has been overridden
**When** the indexer processes the `ResultsOverridden` event
**Then** all player scores for all entries in all leagues on that chain that included that group are recalculated and the leaderboard updates (FR38)

**Given** an admin dismisses a dispute without confiscating
**When** the dismiss action is taken
**Then** the deposit is returned to the disputant and the dispute is marked closed without a penalty (edge case — goodwill dismissal)

---

## Epic 8: Merkle Payout & Claims

After the dispute window closes, the indexer builds a Merkle tree of all winner shares, creator fees, and dev fees. Posts root on-chain. Players claim prizes via Merkle proof pull model. Creator and dev wallet claim their respective fees independently. Unclaimed funds expire to dev wallet after 90 days. Shareable claim card generated on successful claim.

### Story 8.1: Indexer — Merkle Tree Build & Root Posting

As the platform,
I want the indexer to build a Merkle tree of all payout amounts and post the root on-chain after the dispute window cleanly closes,
So that all claimants can independently verify and claim their allocation without trusting any central party.

**Acceptance Criteria:**

**Given** the 24-hour dispute window has expired with no open disputes (or all disputes are resolved)
**When** the indexer detects this condition
**Then** it builds a Merkle tree using `merkletreejs` with leaves of `(address, amount)` for all winners, the creator (3% fee), and the dev wallet (2% fee), computes the root, and calls `League.setMerkleRoot(bytes32 root)` on-chain (FR42, FR43, NFR15)

**Given** the Merkle root is posted on-chain
**When** `MerkleRootSet(root)` is emitted
**Then** the league transitions to `Resolved` state and the indexer stores all leaf data (address, amount, proof) in the `merkle_claims` Postgres table keyed by `(league_id, address)` (FR43)

**Given** two or more entries are tied (equal score and tiebreaker distance)
**When** the Merkle tree is built
**Then** the prize pool portion for those positions is split equally; any indivisible wei remainder goes to the dev wallet leaf (FR63)

**Given** the indexer is the only system that calls `setMerkleRoot`
**When** any other address (including admin) attempts to call `setMerkleRoot` directly
**Then** the contract reverts — root posting is exclusively the indexer's role (NFR15)

**Given** a dispute override has changed group results
**When** the dispute window closes after the override
**Then** the indexer rebuilds the Merkle tree from the recalculated scores before posting the root

---

### Story 8.2: Player Prize Claim

As a winning player,
I want to claim my prize by submitting a Merkle proof through the app,
So that I receive my winnings trustlessly without needing admin approval.

**Acceptance Criteria:**

**Given** a league has resolved and the Merkle root is posted
**When** a winning player navigates to the league's claim page
**Then** a `<ClaimPanel>` is shown with their claimable amount in the league token, an estimated USD value, and a "Claim Prize" button (FR44, UX-DR13)

**Given** the player clicks "Claim Prize"
**When** the transaction is prepared
**Then** the backend provides the player's Merkle proof from `merkle_claims`; the frontend calls `League.claimPrize(amount, proof)` from the player's wallet (FR44)

**Given** the claim transaction is confirmed
**When** the UI receives confirmation
**Then** the player sees a success state with the claimed amount, a shareable claim card (UX-DR10), and the claim is marked used in the contract — no double-claim is possible (FR44, NFR14)

**Given** a player attempts to claim twice with the same proof
**When** the second call is made
**Then** the contract reverts with `AlreadyClaimed` and the UI shows a plain-English error (UX-DR13)

**Given** a player is not in the winners list (no Merkle leaf)
**When** they navigate to the claim page
**Then** a message "You did not finish in a prize position" is shown — no claim CTA is displayed (UX-DR13)

---

### Story 8.3: Creator & Dev Fee Claim

As a creator or dev wallet operator,
I want to claim my fee allocation via Merkle proof,
So that my portion of the prize pool is accessible without manual distribution from a central party.

**Acceptance Criteria:**

**Given** a league has resolved and the Merkle root is posted
**When** the creator navigates to their creator dashboard for that league
**Then** a claim section shows their claimable 3% fee amount and a "Claim Fee" button (FR45)

**Given** the creator clicks "Claim Fee"
**When** the transaction confirms
**Then** `League.claimFee(amount, proof)` transfers the creator fee to their wallet and the claim is marked used (FR45, NFR14)

**Given** the dev wallet operator submits a claim across multiple resolved leagues
**When** `claimFee` is called per league
**Then** each league's dev fee is independently claimable — no batching required by the contract (FR46)

**Given** a creator fee or dev fee claim is confirmed
**When** the confirmation is received
**Then** a success message is shown; for creators, the dashboard updates to show "Fee claimed" status (FR45, FR46, UX-DR13)

**Given** `ReentrancyGuard` is applied to `claimFee`
**When** a re-entrancy attack is attempted via a malicious ERC-20 receive hook
**Then** the second call reverts — funds are not double-spent (NFR14)

---

### Story 8.4: Unclaimed Fund Sweep

As the platform,
I want unclaimed prize funds to become sweepable by the dev wallet 90 days after league resolution,
So that funds are never permanently locked in a contract due to player inaction.

**Acceptance Criteria:**

**Given** 90 days have elapsed since `MerkleRootSet` was emitted for a league
**When** the dev wallet calls `League.sweepUnclaimed()`
**Then** all remaining unclaimed token balance transfers to the dev wallet and `UnclaimedSwept(amount)` is emitted (FR47)

**Given** fewer than 90 days have elapsed since resolution
**When** anyone calls `sweepUnclaimed()`
**Then** the transaction reverts with `SweepNotYetAvailable`

**Given** a player attempts to claim their prize after the 90-day sweep has occurred
**When** they call `claimPrize`
**Then** the contract has no balance to pay; the UI shows a plain-English message "This prize has expired and been swept — claim window was 90 days after resolution" (FR47, UX-DR13)

**Given** the sweep is executed
**When** a monitoring job checks league balances periodically
**Then** leagues approaching the 90-day mark generate an internal log entry so the dev team is reminded to sweep before funds sit indefinitely

---

## Epic 9: Token Whitelist

Users can submit a token whitelist request (on-chain fee). Pending requests visible in a public queue with upvote/downvote. Platform auto-detects fee-on-transfer tokens and rebase tokens. Admins approve or reject requests; rejections trigger automatic fee refund. Admins can de-whitelist previously approved tokens.

### Story 9.1: Token Whitelist Request Submission

As a user,
I want to submit a token for platform whitelist consideration by paying an on-chain fee,
So that the token can become available for use as a league entry currency.

**Acceptance Criteria:**

**Given** an authenticated user navigates to the token whitelist page
**When** they fill in the submission form (token address, chain) and submit
**Then** the on-chain fee ($100 USDC equivalent, platform-configured) is transferred, `WhitelistRegistry` records the request, and a `WhitelistRequested(token, chain, requester)` event is emitted (FR49)

**Given** the fee transaction confirms
**When** the UI receives confirmation
**Then** the user sees a success message and their request appears in the public pending queue (FR49, UX-DR13)

**Given** a token address is submitted that is already whitelisted
**When** the form is validated
**Then** an inline error is shown before any transaction is initiated: "This token is already whitelisted on this chain"

**Given** the fee payment is verified on-chain
**When** the request enters the queue
**Then** no off-chain payment or off-chain verification is possible — the request only exists if the on-chain fee tx succeeded (NFR12)

---

### Story 9.2: Public Whitelist Queue & Voting

As a user,
I want to browse pending whitelist requests and upvote or downvote them,
So that the community can signal which tokens are most wanted and admins can prioritise review.

**Acceptance Criteria:**

**Given** a visitor navigates to the token whitelist page
**When** the pending queue renders
**Then** all pending whitelist requests are shown with: token address, chain, requester wallet, submission date, current upvote count, downvote count, and status (Pending / Approved / Rejected) (FR50)

**Given** an authenticated user views a pending request
**When** they click Upvote or Downvote
**Then** their vote is recorded (one vote per wallet per request); the vote count updates immediately (FR50)

**Given** a user has already voted on a request
**When** they view the same request again
**Then** their vote is highlighted and they cannot vote again — the vote buttons are disabled (FR50)

**Given** a visitor (no wallet)
**When** they view the queue
**Then** vote counts are visible but vote buttons are not shown — voting requires authentication (UX-DR5)

---

### Story 9.3: Admin Token Approval & Rejection

As an admin,
I want to approve or reject pending whitelist requests with automatic fee refund on rejection,
So that only safe, suitable tokens are available for league creation.

**Acceptance Criteria:**

**Given** an admin views a pending whitelist request
**When** they inspect the token
**Then** the system has run auto-detection for fee-on-transfer and rebase token patterns and displays a warning flag if detected (FR53)

**Given** an admin approves a request
**When** they confirm the approval
**Then** the admin wallet calls `WhitelistRegistry.approveToken(address, chainId)` on-chain; the token becomes available for league creation on that chain and a `TokenApproved` event is emitted (FR51, NFR9)

**Given** an admin rejects a request
**When** they confirm the rejection
**Then** the admin wallet calls the reject function on-chain; the submission fee minus gas is automatically refunded to the requester's wallet and a `TokenRejected` event is emitted (FR52)

**Given** an admin rejects a request with a fee-on-transfer token
**When** the refund is processed
**Then** the system accounts for the transfer fee — the requester receives the correct net amount and no contract reverts due to balance mismatch (FR53, NFR23)

---

### Story 9.4: Admin Token De-whitelisting

As an admin,
I want to remove a previously approved token from the whitelist,
So that problematic tokens can be prevented from being used in new leagues without affecting existing ones.

**Acceptance Criteria:**

**Given** an admin navigates to the whitelist management view
**When** they select an approved token and choose "De-whitelist"
**Then** the admin wallet calls `WhitelistRegistry.removeToken(address, chainId)` on-chain; the token is no longer selectable for new league creation (FR54)

**Given** a token is de-whitelisted
**When** leagues that were already created using that token are checked
**Then** they continue to operate normally to completion — de-whitelisting only prevents new league creation (FR54)

**Given** a de-whitelisted token is included in `getWhitelistedTokens(chainId)`
**When** the response is inspected
**Then** the de-whitelisted token is absent from the list

---

## Epic 10: Admin Controls & Platform Management

Admins can set and update global platform parameters (fees, min entry, free league toggle, oracle grace period). Admins can pause leagues, flag featured leagues, and action user-reported leagues (hide/reinstate).

### Story 10.1: Global Platform Parameter Management

As an admin,
I want to update global platform parameters from the admin panel,
So that I can tune fees, limits, and policies across the platform without a contract redeployment.

**Acceptance Criteria:**

**Given** an admin navigates to `/admin/settings`
**When** the settings panel renders
**Then** current values are shown for: dev fee %, creator fee cap %, minimum entry amount, free league toggle (on/off), oracle grace period (hours), and dispute deposit amount (FR55)

**Given** an admin updates any parameter and confirms
**When** the update transaction signs
**Then** the admin wallet calls `LeagueFactory.setGlobalParams(...)` on-chain; the new values are stored and a `GlobalParamsUpdated` event is emitted (FR55, NFR9)

**Given** new global params are set
**When** a new league is created after the update
**Then** the new league uses the updated params; all previously created leagues retain the params locked at their creation time (FR55)

**Given** an admin toggles the free league option on
**When** a creator creates a league with zero entry fee
**Then** the creation is permitted; when toggled off, zero-fee league creation reverts

---

### Story 10.2: League Pause & Featured Flagging

As an admin,
I want to pause new entries to a league or flag a league as featured,
So that I can manage platform activity and highlight quality leagues.

**Acceptance Criteria:**

**Given** an admin navigates to a league's admin detail view
**When** they click "Pause New Entries"
**Then** the admin wallet calls `League.pauseEntries()` on-chain; new `enter()` calls revert with `EntriesPaused` while existing entries are unaffected (FR56)

**Given** an admin pauses league creation globally
**When** they toggle "Pause All New Leagues" in settings
**Then** `LeagueFactory.setCreationsPaused(true)` is called on-chain; all `createLeague` calls revert until unpaused (FR56)

**Given** an admin flags a league as featured at no cost
**When** they click "Feature This League" on a league admin view
**Then** the league is added to the featured row on the browse page at the next indexer refresh; no on-chain fee is required (FR58)

**Given** an admin removes the featured flag
**When** they click "Unfeature"
**Then** the league is removed from the featured row at the next indexer refresh

---

### Story 10.3: Reported League Moderation

As an admin,
I want to review player-reported leagues and action them appropriately,
So that the platform is protected from scam, harmful, or policy-violating leagues.

**Acceptance Criteria:**

**Given** a player navigates to a public league detail page
**When** they click "Report League"
**Then** a short report form appears with a reason selector (Scam / Inappropriate / Other) and optional description; submission stores the report in Postgres for admin review (FR60)

**Given** an admin navigates to `/admin/reports`
**When** the panel renders
**Then** all pending report queues are listed with: league address, chain, report reason, reporting wallet, and report timestamp (FR57)

**Given** an admin selects a report and chooses "Warn Creator"
**When** the action is taken
**Then** a warning flag is attached to the league in the DB; the creator's wallet is noted as warned (FR57)

**Given** an admin chooses "Pause League"
**When** confirmed
**Then** `League.pauseEntries()` is called on-chain and the report is marked actioned (FR57)

**Given** an admin chooses "Close & Refund"
**When** confirmed
**Then** `League.triggerRefund()` is called on-chain, league transitions to Refunding, all entrants can claim refunds, and the report is closed (FR57)

**Given** an admin dismisses a report
**When** confirmed
**Then** the report is marked dismissed with no action taken and removed from the open queue (FR57)

---

## Epic 11: Nice-to-Have Features

Polymarket deep-link per prediction market (full market page, not just odds widget — FR64). Coinbase Smart Wallet inline creation at the entry prompt for users with no wallet (FR65).

### Story 11.1: Polymarket Deep-Link Per Group

As a player,
I want the Polymarket odds widget to include a direct link to the corresponding Polymarket market page for each group,
So that I can explore full market depth and trading history without searching Polymarket separately.

**Acceptance Criteria:**

**Given** the Polymarket odds widget is rendering for a group
**When** a Polymarket market URL is available for that group
**Then** a "View on Polymarket →" link is shown beneath the probabilities, opening in a new tab (FR64, UX-DR3)

**Given** no Polymarket market URL is mapped for a group
**When** the widget renders
**Then** the deep-link is omitted gracefully — the probability display is unaffected (UX-DR3)

**Given** the Polymarket API is unavailable
**When** the widget would render
**Then** neither the odds nor the deep-link is shown — the prediction form remains fully functional (NFR22)

---

### Story 11.2: Coinbase Smart Wallet Inline Creation

As a visitor with no wallet,
I want to create a Coinbase Smart Wallet inline on the league entry page without leaving the app,
So that I can enter a league in a single session without needing a pre-installed browser extension.

**Acceptance Criteria:**

**Given** a visitor with no wallet detected clicks "Enter League"
**When** RainbowKit's "Get a Wallet" flow is triggered
**Then** a Coinbase Smart Wallet creation option is presented inline within the modal (not a redirect to an external page) (FR65, UX-DR5)

**Given** the user completes Coinbase Smart Wallet creation inline
**When** creation succeeds
**Then** the wallet is connected, SIWE auth is triggered automatically, and the entry flow continues from where the user left off — no page reload (FR65)

**Given** the inline wallet creation fails or is abandoned
**When** the failure is detected
**Then** the user is returned to the "Get a Wallet" options screen with a plain-English message (UX-DR13)
