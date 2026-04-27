---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
releaseMode: phased
inputDocuments: ['_bmad-output/planning-artifacts/brainstorming/brainstorming-session-2026-04-26-1739.md']
workflowType: 'prd'
classification:
  projectType: blockchain_web3
  domain: fantasy_sports_gaming
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - WorldCup2

**Author:** Stinky
**Date:** 2026-04-26

## Executive Summary

WorldCup2 is an on-chain group stage prediction platform for FIFA World Cup 2026. Users rank the 12 World Cup groups (A–L), each containing 4 teams, before the tournament locks. A total goals tiebreaker resolves ties. Prize pools are held entirely in smart contracts — no custodian, no admin access to funds — and settle automatically after the 24-hour dispute window clears.

The platform targets three audiences: **crypto-native players** seeking a novel World Cup engagement beyond binary outcome bets; **league creators** who currently run prediction pools via group chats and want a trustless, self-managing alternative with automatic payouts; and **crypto projects** using the World Cup as a community engagement vehicle by running leagues denominated in their own whitelisted token.

Chains supported at launch: Base, Ethereum, and Sonic. Pools are chain-isolated; each chain operates independent EVM contracts.

### What Makes This Special

The office prediction pool format — rank the groups, closest total-goals tiebreaker wins — is universally understood and requires no onboarding explanation. WorldCup2 takes that format and replaces the group-chat trust model with smart contract enforcement: predictions are on-chain, funds are locked in contract, payouts are triggered by a verifiable oracle sourced from api-football.com, and all fee rates are immutably locked at league creation.

The three-sided model is the core business insight. Players get a familiar game. Creators get a zero-overhead viral league with referral tracking and optional bonding curve pricing. Crypto projects get a structured World Cup engagement campaign — entering the $100 token whitelist queue puts their token in front of active crypto users with a concrete in-group use case.

Polymarket odds integration (24-hour cached, probability display) is a direct differentiator: no other group-stage fantasy product surfaces market-consensus predictions alongside the ranking interface.

## Project Classification

- **Project Type:** Blockchain / Web3 — multi-chain smart contracts, wallet-based auth, on-chain fund custody, custom oracle
- **Domain:** Fantasy Sports / Crypto Gaming
- **Complexity:** High — EVM + Solana in parallel, custom per-chain oracle with 3-tier fallback, off-chain scoring with on-chain settlement, dispute resolution system, token whitelist mechanics
- **Project Context:** Greenfield

## Success Criteria

### User Success

- **Player:** Payout lands in wallet within the dispute window resolution period without any manual intervention required. The end state — "I predicted, I won, funds arrived" — is fully automated.
- **Creator:** League reaches minimum player threshold (where set), creator fee is automatically disbursed on resolution, and referral link drives measurable entry conversions. A creator who runs a league with 20+ entries and earns an on-chain creator fee is a success data point.
- **Crypto Project:** Token is whitelisted and actively used as the entry denomination in at least one live league during the World Cup window.

### Business Success

| Metric | Target | Notes |
|--------|--------|-------|
| Total entries across all chains | 1,000+ entries | Primary growth signal |
| Leagues created | 40+ leagues | Validates creator adoption |
| Lead chains | Base + Sonic | Expect majority of volume here |
| Token whitelist requests | 5+ projects | B2B engagement signal |

### Technical Success

- **Zero permanently frozen leagues** — no prize pool is stuck in contract due to oracle failure, admin inaction, or smart contract bug. This is a hard line; any frozen league is a reputational failure for a new product category.
- **Zero admin-triggered full refunds** — refunds indicate irresolvable disputes or system failure. Target is clean resolution on every league.
- **All EVM contracts pass Slither static analysis** with no high-severity findings before mainnet; no formal third-party audit in MVP — mitigation is Slither + AI-assisted review + comprehensive test suite.
- **Oracle uptime:** Primary cron posts results within 1 hour of final group stage match. 3-tier fallback ensures results post within 24 hours in all failure scenarios.

### Measurable Outcomes

- Platform is live on Base, Solana, Ethereum, and Sonic before World Cup 2026 group stage kick-off
- At least one league on each supported chain resolves cleanly end-to-end
- Architecture can be redeployed for UEFA Euro 2028 (6 groups × 4 teams, same format) with configuration change only — no contract rewrite

## Product Scope

### MVP — World Cup 2026

Full platform: prediction entry, on-chain fund custody, oracle, dispute resolution, payout. All 4 chains. Admin panel, creator dashboard, player dashboard. Polymarket odds widget. Token whitelist queue. Compliance modal. League sharing + referral links.

### Growth Features (Post-MVP)

- Knockout bracket prediction (Round of 16 onward) as league extension
- Soulbound NFT winner trophies
- Creator reputation score / "Verified League" badge
- Share card generator (auto-generated rank image for social)
- Base App mini-app integration
- Paid league promotion analytics dashboard

### Vision — Future Tournaments

- UEFA Euro 2028 redeploy (6 groups, parameterized config)
- Copa América, World Cup 2030
- Bracket / knockout prediction as a standalone product
- Creator reputation cross-tournament carry

## User Journeys

### Journey 1: The Player — "Carlos Wins His First On-Chain Pool"

**Persona:** Carlos, 28. Crypto-native, active on Base and Solana. Plays Polymarket regularly. Has done a WhatsApp World Cup prediction pool every four years but always has a mate who "forgets" to pay out.

**Opening Scene:** Carlos sees a link dropped in his Telegram group — "I set up a World Cup pool, pay 10 USDC, winner takes all, smart contract handles the payout." He's heard that before but the smart contract part catches him. He clicks.

**Rising Action:** He lands directly on the league page. Pool is already at 340 USDC with 34 entries. He can see the fee split, the prize pool, the bonding curve warning that entry #35 costs slightly more. He connects his wallet via RainbowKit, signs the compliance modal, and opens the prediction form. The Polymarket odds widget is right there next to each group — Brazil 68%, Argentina 21%. He drags teams around, fills in his tiebreaker (247 total goals), reviews his picks, pays. Confirmation: "You're in."

**Climax:** Group stage is running. Carlos opens the leaderboard every morning. After matchday 2 he's sitting 3rd. Group F results come in and he watches his rank tick from 3rd to 2nd in real time. The creator posts the leaderboard screenshot in Telegram — Carlos's name is visible. He shares his own rank card.

**Resolution:** Tournament ends. Results post on-chain. 24-hour dispute window passes cleanly. Carlos triggers the payout — one transaction, 680 USDC lands in his wallet. No chasing anyone, no "I'll send it Sunday." He's already asking the creator to set up a knockout bracket round.

**Requirements revealed:** League detail page, RainbowKit + Solana wallet-adapter, compliance modal, prediction form with Polymarket widget, real-time leaderboard, rank share card, payout trigger flow.

---

### Journey 2: The Player — Edge Case — "Maria Files a Dispute"

**Persona:** Maria, 34. Experienced DeFi user. Entered a 500-entry league. Group B results post on-chain and the standings look wrong — she's certain Morocco finished second, not third.

**Opening Scene:** Dispute window opens. Maria checks api-football.com herself and confirms the oracle posted incorrect standings for Group B.

**Rising Action:** She clicks [File Dispute] on the league page, selects Group B, writes a clear description with her source, and confirms the $50 USDC flat deposit. The UI shows: "Deposit refunded if dispute is ruled valid." She signs the transaction.

**Climax:** Admin reviews within the 24-hour window. Side-by-side view confirms Maria's claim. Admin calls `overrideResults(groupB)` with the correct standings. Indexer recalculates all scores. New winner is surfaced — it's still not Maria, but the results are now correct.

**Resolution:** Dispute deposit refunded. League resolves cleanly. Maria didn't win, but she trusts the result. She screenshots the dispute resolution and posts it in Telegram as evidence the system works. That post drives three new entries into the creator's next league.

**Requirements revealed:** Dispute filing flow, $50 USDC flat deposit, dispute queue in admin panel, override results (scoped to disputed groups), deposit refund on valid dispute, post-resolution score reveal.

---

### Journey 3: The Creator — "Dev Haus Runs Their Community World Cup League"

**Persona:** Dev Haus, a mid-size Solana DeFi project with 8,000 Discord members. Their community manager, Priya, is looking for a World Cup engagement campaign. Their token ($HAUS) is already on Solana.

**Opening Scene:** Priya hears about WorldCup2 through a crypto Twitter thread. She visits the site, checks the token whitelist page. $HAUS isn't listed. She submits a whitelist request — pays $100 USDC equivalent, adds token address, chain (Solana), and a brief description. Community upvotes the request in the public queue within hours.

**Rising Action:** Admin approves within 48 hours. Priya connects wallet, clicks "Create a League," selects Solana, selects $HAUS as the entry token, sets entry fee at 50 $HAUS, max 200 entries, bonding curve off, minimum threshold of 30 players. She reviews the immutability warning, pays the creation fee, signs. League is live.

She drops the referral link in Discord: "WorldCup2 prediction pool — 50 $HAUS entry, winner takes the pot, smart contract pays out automatically. Rank the groups, tiebreaker is total goals." Within 6 hours, 47 entries. Her referral conversions counter is climbing.

**Climax:** League locks 24h before kick-off. Priya posts the leaderboard weekly in Discord. The community is engaged — members tagging each other, debating Group G predictions. Token activity spikes.

**Resolution:** Tournament ends. Priya (as creator) triggers the payout transaction alongside the winner. Creator fee lands in her wallet — 3% of the total $HAUS pool. She screenshots the creator dashboard stats (entries: 147, pool value, creator cut earned) and posts it as a case study in the project's newsletter. Already planning the Euros 2028 edition.

**Requirements revealed:** Token whitelist request + public upvote queue, admin approval flow, creator league wizard (chain + token selection, bonding curve toggle, minimum threshold), referral link with conversion tracking, creator dashboard, creator-triggered payout, $HAUS decimal handling.

---

### Journey 4: The Admin — "The Oracle Didn't Post — Sam Handles It"

**Persona:** Sam, one of two platform admins. Experienced onchain dev. Gets a Telegram alert at 2am: "⚠️ Oracle results deadline passed — Group Stage Chain: Solana — resultsPostedAt: null."

**Opening Scene:** Sam opens the Admin Panel on mobile. Oracle Health screen shows a red indicator for Solana. Primary cron failed, redundant cron also failed (infrastructure outage on the hosting provider).

**Rising Action:** Sam clicks [Manually Post Results]. The app pre-fetches standings from api-football.com and populates the 12-group form. Sam reviews each group — all look correct. Signs `postResults(groupStandings[12])` from his wallet. Results post on-chain at 2:17am.

**Climax:** Dispute window starts from the `resultsPostedAt` timestamp. Indexer picks up the `ResultsPosted` event, calculates all scores, surfaces winners per league. Sam sees the Review & Resolve panel populate with clean results. No disputes filed.

**Resolution:** 24 hours later the window clears. Sam clicks [Resolve All Clean Leagues] — batch payout transactions execute. He checks the Oracle Health dashboard the next morning: all chains green. Posts in the admin group chat: "All resolved. Zero disputes."

**Requirements revealed:** Oracle health dashboard, Telegram/webhook alert system, manual post results form (pre-filled from api-football.com), `postResults()` contract call from admin panel, Review & Resolve panel, batch resolution.

---

### Journey 5: The New Crypto User — "First Wallet, First League"

**Persona:** Jamie, 26. Football fanatic, zero crypto experience. His mate (Carlos from Journey 1) drops the league link in their group chat.

**Opening Scene:** Jamie clicks the link. Lands on the league page. "Connect Wallet" button. He has no wallet.

**Rising Action:** A helper prompt appears: "New to crypto? Get a wallet to enter." Links to MetaMask (EVM) or Phantom (Solana) setup guides depending on the league's chain. Jamie follows the MetaMask guide, sets up his wallet, funds it with USDC via the MetaMask onramp. Returns to the league page, connects, signs the compliance modal, submits his predictions.

**Resolution:** Jamie is in. He has no idea how the smart contract works and doesn't need to. He just knows he paid, he picked his teams, and when the tournament ends, the payout is automatic. The "Get a Wallet" helper was the only extra step between him and playing.

**Requirements revealed:** "Get a Wallet" helper on wallet connect modal, chain-appropriate wallet links (MetaMask/RainbowKit for EVM, Phantom for Solana), fiat onramp link (MetaMask/Coinbase), minimal friction between wallet setup and first entry.

---

### Journey Requirements Summary

| Capability | Driven By |
|---|---|
| RainbowKit (EVM) + Solana wallet-adapter (Phantom) — dual wallet strategy | All journeys |
| League detail page with pool stats, fee breakdown, bonding curve notice | Journey 1 |
| Polymarket odds widget in prediction form | Journey 1 |
| Real-time leaderboard + rank share card | Journey 1 |
| Payout trigger (winner or creator) | Journey 1, 3 |
| Dispute filing flow + $50 USDC flat deposit | Journey 2 |
| Admin dispute queue + scoped group override | Journey 2, 4 |
| Token whitelist request + public upvote queue | Journey 3 |
| Creator wizard with all league config options | Journey 3 |
| Referral link + conversion tracking in creator dashboard | Journey 3 |
| Oracle health dashboard + Telegram/webhook alerts | Journey 4 |
| Manual results post form (pre-filled from api-football.com) | Journey 4 |
| Review & Resolve panel (per-league winner surfacing) | Journey 4 |
| "Get a Wallet" helper with chain-appropriate wallet links + fiat onramp | Journey 5 |

## Domain-Specific Requirements

### Compliance & Regulatory

- **Self-certification model:** Users acknowledge legal responsibility for compliance in their jurisdiction via a modal signed once per league entry. Stored in DB with wallet address, league ID, and timestamp.
- **No geoblocking at launch.** If regulatory pressure requires it post-launch, IP-based geoblocking is added as a follow-on. Platform is designed so this can be layered in without contract changes.
- **Dispute deposit framing:** The $50 USDC flat deposit for dispute filing is a "review and processing fee," not a penalty clause. Legal review recommended before launch if scale warrants it.
- **No KYC / AML requirements at launch.** Platform operates on wallet-based pseudonymous identity. If regulatory environment shifts, KYC integration is a future consideration.

### Smart Contract Security

- **No formal third-party audit at v1** — budget constraint. Mitigation stack:
  - AI-assisted deep code audit across all contracts (EVM + Solana)
  - Comprehensive test suite: unit tests, integration tests, edge cases (overflow, re-entrancy, dust amounts, whale entries, bonding curve limits)
  - Slither static analysis on all EVM contracts before deployment
  - Human dev team review of all audit findings before mainnet
- **Required contract-level protections:**
  - `ReentrancyGuard` on all payout and refund functions
  - Checks-effects-interactions pattern enforced
  - Integer overflow protection on bonding curve (hard cap on curve multiplier, tested at 10,000 entries)
  - On-chain fee cap: combined creator + dev fee cannot exceed a hardcoded maximum (e.g. 20%) — contract-enforced, not just UI validation
  - Fee-on-transfer / rebase token auto-detection + admin warning in whitelist review
- **Test league with emulated oracle:** A mock oracle contract (or `setResultsForTesting()` function on the oracle) must be implemented to allow end-to-end staging league runs with arbitrary injected group results — independent of real World Cup data. Enables full dispute, scoring, and resolution flow testing before mainnet.

### Identity & Privacy

- **No PII collected or stored.** Platform is crypto-native — wallet addresses are the primary identifier.
- **On-chain identity integration (display layer only):**
  - ENS resolution for `.eth` names (Ethereum / Base)
  - Basename resolution for `.base` names (Base)
  - Solana Name Service (SNS) resolution for `.sol` names (Solana)
  - Avatar resolution from ENS/Basename/SNS profiles where available
  - Fallback: truncated wallet address (`0x1234...abcd`)
- **Compliance signatures** stored as: wallet address + league ID + timestamp. No name, email, or IP address stored.
- **Off-chain data (Postgres):** League names, descriptions, referral metadata. No user-identifiable data beyond wallet address.

### Technical Constraints

- **Multi-chain isolation:** EVM chains (Base, Ethereum, Sonic) share contract architecture but are deployed independently. Solana contracts are a separate Rust/Anchor implementation. No cross-chain state sharing.
- **Dual wallet-connection strategy:** RainbowKit for EVM chains; Solana wallet-adapter (Phantom, Backpack) for Solana. Single UI handles both, with chain detection driving which adapter is active.
- **Token decimal handling:** All EVM (ERC-20) and Solana (SPL) token decimals handled generically — no hardcoded decimal assumptions. USSD non-standard decimals explicitly tested.
- **api-football.com dependency:** Canonical data source for oracle and dispute resolution. Rate limits and API availability must be monitored. Caching layer required for Polymarket odds (24-hour TTL with staleness display).

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Three-sided market with token engagement-as-a-service:** Crypto projects pay to whitelist their token and run World Cup community leagues denominated in that token. No other fantasy or prediction product offers this B2B channel. Token utility is created through a sporting event — a novel tokenomics application.

- **Polymarket odds surfaced at prediction time:** Group stage prediction products exist; Polymarket exists. Nobody has put market-consensus odds directly inside the prediction form UX. The "Gut vs. Market" moment — seeing Brazil at 68% right as you're deciding where to rank them — is a first-class differentiator.

- **Bonding curve entry pricing for a prediction pool:** DeFi bonding curve mechanics (linear or exponential price progression per entry) applied to a prediction league entry fee. Rewards early entrants and builds prize pool momentum. Novel application of a DeFi primitive outside its usual financial instrument context.

- **Trustless prediction pool with immutable creation-time fee lock:** The specific combination of on-chain fund custody + immutable fee rates at creation + off-chain scoring + on-chain settlement via oracle + flat-fee dispute mechanism is a distinct pattern not replicated by existing prediction market or fantasy platforms.

### Competitive Landscape

- **Prediction markets** (Polymarket, Augur): Binary or multi-outcome single-event bets. Do not support group ranking format, multi-entry leagues, or creator-driven pool mechanics.
- **Centralized fantasy sports** (DraftKings, FanDuel): Require KYC, custody funds centrally, no crypto-native token support, no creator-run leagues.
- **On-chain fantasy** (existing attempts): Typically single-chain, USDC-only, no bonding curve, no Polymarket integration, no B2B token whitelist mechanic.
- **WhatsApp/group chat pools**: Trusted human admin required, no automatic payout, no trustless settlement, easy to default on.

**Execution + timing is the primary moat for World Cup 2026.** The novel tokenomics (B2B whitelist + community leagues) and Polymarket integration are defensible differentiators if the platform establishes brand trust this cycle.

### Validation Approach

- **Bonding curve UX:** Validated via interactive preview chart shown to creator at setup — no entry without creator understanding the curve. Tested at 10,000 entries in staging.
- **Polymarket integration:** Validated via data-as-of timestamp always visible; staleness warning if cache is >24h old. Players make their own decision on the data freshness.
- **Token whitelist B2B channel:** Validated by tracking whitelist requests and leagues-per-whitelisted-token post-launch. If projects whitelist but don't create leagues, the mechanic needs re-examination.

### Risk Mitigation

- **Bonding curve overflow:** Hard cap on curve multiplier enforced on-chain; tested at extreme entry counts in staging.
- **Polymarket API unavailability:** Graceful degradation — widget hides if data unavailable, prediction form still fully functional without it.
- **B2B channel underperformance:** Token whitelist fee ($100 USDC) is a revenue line regardless of whether projects create leagues; not a risk to core product.
- **Competitor copies the format:** Moat is time-to-market for World Cup 2026 + contract security track record + creator community built during the tournament.

## Blockchain / Web3 Specific Requirements

### Chain Specifications

**MVP — EVM chains only:**

| Chain | Role | Notes |
|-------|------|-------|
| Base | Primary — high volume, low gas | Coinbase distribution lever; Coinbase Wallet prioritised in RainbowKit |
| Sonic | Primary — high volume, low gas | Early-mover advantage; USSD + wS whitelisted by default |
| Ethereum | High-value leagues | Higher gas; gas-optimised contract makes entry ~$2–5 at 10 gwei |

**Post-MVP (future):**
- Solana (Rust/Anchor) — separate codebase, requires Solana-experienced dev. Not in MVP scope.

**Cross-chain:** Chain-isolated. No cross-chain state sharing, no cross-chain identity linking.

### Wallet Support

- **RainbowKit** for all EVM chains (MetaMask, Rainbow, Coinbase Wallet, WalletConnect)
- **Coinbase Wallet** prioritised in the wallet list for Base chain — native distribution
- **No Solana wallet-adapter at MVP** (deferred with Solana)
- Chain switch in-app triggers re-verification of admin status

### Smart Contract Architecture

**Gas optimisation strategy — minimal on-chain storage:**

- **Commitment hash model:** Contract stores `keccak256(predictions + tiebreaker + salt)` per entry address, not raw predictions. Full predictions stored in Postgres. Hash is the tamper-proof audit proof — preimage revealed on-chain only if disputed.
- **Event-driven audit trail:** `EntrySubmitted(address, bytes32 commitment, uint256 amount)` emitted per entry. Indexer reconstructs all state from events. Avoids expensive `SSTORE` operations for full prediction data.
- **Merkle tree payout distribution:** Indexer calculates winners off-chain → builds Merkle tree of `(address, amount)` pairs → posts only the Merkle root on-chain post-dispute-window. Each party claims independently via `claim(proof, amount)`.

**Contract responsibilities (narrow by design):**
1. Accept entry fees + store commitment hash + emit entry event
2. Store oracle results (compact — 12 groups × 4 positions, fits ~2 storage slots)
3. Store payout Merkle root after dispute window
4. Verify Merkle proofs + execute ERC-20 transfers on claim
5. Handle refund states (threshold not met, admin-triggered)

**Contract does NOT do:**
- Score calculation (indexer)
- Winner determination (indexer)
- Prediction storage (Postgres + commitment hash)

### League Contract State Machine

```
Open → Locked → ResultsPending → DisputeWindow → Resolved
                                               ↘ Refunded
Open → Cancelled (admin pre-lock only)
```

| State | Trigger | Permitted Actions |
|-------|---------|-------------------|
| `Open` | League created | Accept entries, accept revision fees |
| `Locked` | 24h before first group match (oracle-driven) | No new entries |
| `ResultsPending` | All group matches complete | Oracle posts results |
| `DisputeWindow` | `resultsPostedAt` set on-chain, 24h duration | File disputes, admin override |
| `Resolved` | Dispute window expires clean or admin resolves | Claims open — winner, creator, dev pull independently |
| `Refunded` | Threshold not met at lock, or admin-triggered | Full entry refunds claimable by all entrants |
| `Cancelled` | Admin action pre-lock | Full entry refunds claimable by all entrants |

### Payout Model — Pull (Merkle Claim)

- **No push payouts.** Each party claims independently:
  - Winner: `claim(proof, prizeAmount)`
  - Creator: `claim(proof, creatorFee)` — 3% of pool
  - Dev: `claim(proof, devFee)` — 2% of pool (claimable across multiple leagues in aggregate)
- **Unclaimed funds expiry:** Funds unclaimed 90 days post-resolution become claimable by the dev wallet. Enforced by contract; expiry timestamp set at `Resolved` transition.
- **Dispute deposit (flat $50 USDC equivalent):** Held in contract during dispute window. Returned to disputant if ruled valid; transferred to dev wallet if ruled malicious/spam.

### Security Requirements

- `ReentrancyGuard` on all claim, refund, and fee-collection functions
- Checks-effects-interactions pattern on all state-mutating functions
- On-chain fee cap: combined creator + dev fee cannot exceed 20% — contract-enforced
- Integer overflow protection on bonding curve multiplier — hard cap, tested at 10,000 entries
- Fee-on-transfer / rebase token detected at whitelist review; results in admin warning flag
- Slither static analysis run on all contracts pre-deployment
- Mock oracle (`setResultsForTesting()`) for staging end-to-end test runs

### Token Whitelist — Default Tokens

| Chain | Default Whitelisted Tokens |
|-------|---------------------------|
| Base | USDC, WETH, WBTC |
| Ethereum | USDC, WETH, WBTC |
| Sonic | USDC, USSD, WETH, WBTC, wS |

- Per-chain whitelist — same token on different chains requires separate requests
- Whitelist request fee: $100 USDC equivalent — paid on-chain, refunded (minus gas) on rejection
- Auto-detect fee-on-transfer / rebase tokens during admin review
- Public upvote queue; admin approval/rejection only
- Admin can whitelist at no fee (goodwill / launch partners)
- De-whitelisting: admin can de-list at any time; existing leagues run to completion unless severity warrants admin-triggered refund

### Oracle Architecture

- One oracle contract per EVM chain
- Results source: api-football.com v3 (canonical ground truth)
- **3-tier fallback:**
  1. Primary cron server auto-posts after final group stage match
  2. Redundant cron on independent server (idempotent — safe to call twice)
  3. Admin manually calls `postResults()` from admin panel (pre-filled from api-football.com)
- `expectedResultsDeadline` stored at league creation; monitoring alerts admin group (Telegram/webhook) if `resultsPostedAt` is null past deadline
- Dispute window starts from `resultsPostedAt` timestamp — safe for all fallback scenarios

### Indexer

- Custom Node.js indexer listening to all EVM chain contracts
- Single Postgres DB — unified data layer for all chains + stats
- Triggers: `EntrySubmitted`, `ResultsPosted`, `DisputeFiled`, `LeagueResolved` events
- Responsibilities: reconstruct entries from events, score all predictions, determine winner/tiebreaker, build Merkle tree, post root to contract
- Powers all browse/search/leaderboard/stats UI without on-chain enumeration

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach:** Experience MVP — ship the complete prediction pool experience end-to-end. Every core user flow (player entry → live scoring → dispute → claim) must work cleanly on day one. No feature is worth shipping if it risks a frozen league or a failed payout.

**Resource Requirements:** Small team. EVM-focused Solidity devs, Node.js/Postgres backend, React frontend. No Solana expertise required at MVP.

**Hard deadline:** World Cup 2026 group stage kick-off (~June 11, 2026).

### MVP Feature Set — World Cup 2026 Launch

**Core User Journeys Supported:** All five (Player happy path, Player dispute, Creator + token whitelist, Admin oracle fallback, New crypto user onboarding)

**Must-Have Capabilities:**
- EVM smart contracts (Base, Ethereum, Sonic) — commitment hash model, Merkle payout, full state machine
- League creation wizard — flat entry fee, free/locked revision options (revision fees add to prize pool), min threshold, max entries, max per wallet
- Token whitelist queue — public upvote, admin approve/reject, auto-detect fee-on-transfer/rebase flags
- Default tokens: USDC + WETH + WBTC (all chains), USSD + wS (Sonic)
- Oracle — 3-tier fallback, cron + manual admin post, Telegram/webhook alert
- Dispute flow — $50 USDC flat deposit, 24h window, admin scoped override, deposit refund on valid dispute
- Merkle payout — pull model, 90-day unclaimed expiry to dev wallet
- Admin panel — platform settings, token whitelist queue, league moderation, dispute management, oracle health, promotions management
- Creator dashboard — entries, pool value, referral link + conversion tracking, league status timeline
- Player dashboard — active/past leagues, live rank, score breakdown
- Live leaderboard — real-time updates per league
- Prediction form — 12 groups, drag-and-drop (desktop), dropdown fallback (mobile, forced pagination), tiebreaker field, progress indicator
- Polymarket odds widget — 24h cached, data-as-of timestamp, staleness warning
- Compliance modal — once per entry, stored wallet + leagueId + timestamp
- League promotion — on-chain payment ($20 USDC/day default), featured row, random rotation
- ENS / Basename / SNS display names + avatars, truncated wallet fallback
- RainbowKit with Coinbase Wallet prioritised on Base
- "Get a Wallet" helper — chain-appropriate links (MetaMask/Coinbase for EVM)
- Landing page — live stats (TVL, active leagues, player count), "Join a League" + "Create a League" CTAs
- Browse leagues — filter/sort/featured row, no wallet required
- Open Graph rich metadata for league share links
- Mock oracle (`setResultsForTesting()`) for staging end-to-end test runs
- Slither static analysis + comprehensive test suite before mainnet

**Nice-to-Have (ship if time allows):**
- Share card generator (auto-generated rank image for social)
- "Gut vs. Market" stat post-lock (player picks vs. Polymarket consensus)
- Polymarket deep-link in odds widget ("Believe in this team? Bet on Polymarket →") — potential affiliate revenue
- Coinbase Smart Wallet embedded onboarding — reduces drop-off for users with no existing wallet

### Post-MVP Features — v1.1

- **Bonding curve entry pricing** — linear/exponential, creator-configurable, interactive preview chart
- Soulbound NFT winner trophies
- Creator reputation score / "Verified League" badge
- Base App mini-app integration
- Paid promotion analytics dashboard
- Knockout bracket prediction (Round of 16)

### Post-World Cup — Future

- Solana (Rust/Anchor) port — requires Solana-experienced dev
- UEFA Euro 2028 redeploy — parameterised group/team config, no contract rewrite
- Copa América, World Cup 2030
- Creator reputation cross-tournament carry

### Risk Mitigation Strategy

**Technical:** Commitment hash + Merkle payout reduces contract surface area dramatically. Mock oracle enables full staging run before mainnet. Slither + AI audit replaces formal audit. Biggest risk is Ethereum gas behaviour at scale — mitigated by architecture design.

**Market:** Hard deadline (World Cup kick-off) is a forcing function. If behind schedule, drop share card generator and "Gut vs. Market" before touching any core flow.

**Resource:** Three EVM deployments from one Solidity codebase — no Solana risk in this release. If team shrinks further, Ethereum mainnet can be delayed to post-launch; Base + Sonic alone cover the low-gas use case.

## Functional Requirements

### 1. Authentication & Identity

- **FR1:** A visitor can connect an EVM wallet via RainbowKit (MetaMask, Rainbow, Coinbase Wallet, WalletConnect)
- **FR2:** A visitor can view chain-appropriate wallet setup guidance (MetaMask/Coinbase for EVM) when no wallet is detected
- **FR3:** The system displays ENS, Basename, or SNS display names and avatars where available, falling back to truncated wallet address
- **FR4:** An Admin can verify their admin status by signing a message after wallet connection
- **FR5:** The system re-verifies admin status when a user switches chains

### 2. League Discovery & Browsing

- **FR6:** A visitor can browse all public leagues without connecting a wallet
- **FR7:** A visitor can filter leagues by chain, entry token, and entry fee range
- **FR8:** A visitor can sort leagues by date created, total pool value, and entry count
- **FR9:** A visitor can see a featured leagues row at the top of the browse page (admin-flagged or paid promotion)
- **FR10:** A visitor can view a league detail page showing entry fee, prize pool, entries count, fee breakdown, time to lock, and creator description
- **FR11:** The system generates Open Graph rich metadata for every league share link

### 3. League Creation

- **FR12:** A Creator can create a league by specifying chain, entry token (from whitelisted tokens on that chain), flat entry fee, max total entries, max entries per wallet, and optionally a minimum player threshold
- **FR13:** A Creator can configure prediction revision policy: locked (no changes), free revisions, or paid revisions (revision fees added to the prize pool)
- **FR14:** The system warns a Creator that all league settings are immutable after creation and requires explicit acknowledgment
- **FR15:** A Creator can pay a league promotion fee (on-chain, $20 USDC/day default) to feature their league
- **FR16:** The system refunds all entrants if a minimum player threshold is not met at lock time; creation fee is non-refundable

### 4. Prediction Entry

- **FR17:** A Player can enter a league by paying the entry fee in the league's token and submitting a commitment hash of their predictions
- **FR18:** A Player can rank all 12 World Cup groups (A–L), assigning positions 1–4 to each team using drag-and-drop on desktop and dropdown selectors on mobile
- **FR19:** A Player must submit a tiebreaker (total goals predicted across all group stage matches, 1–1000) as part of their entry
- **FR20:** The system prevents submission until all 12 groups are ranked and the tiebreaker is filled (progress indicator always visible)
- **FR21:** A Player can submit multiple entries to the same league with the same or different predictions
- **FR22:** The system displays Polymarket market-consensus win probabilities per group alongside the prediction form, with a data-as-of timestamp and staleness warning if cache exceeds 24 hours
- **FR23:** A Player must acknowledge a compliance modal (jurisdiction self-certification) once per league entry; acknowledgment is stored with wallet address, league ID, and timestamp
- **FR24:** A Player can revise predictions (if the league allows revisions) before the lock time; revision fees are added to the prize pool

### 5. Live Tournament Experience

- **FR25:** A Player can view a real-time leaderboard for any league they have entered, showing rank, score, and entries count
- **FR26:** A Player can view their current score breakdown (points per group, tiebreaker) updating as group stage matches complete
- **FR27:** A Creator can view all player predictions after the league locks and matches begin
- **FR28:** A Creator can view their league's entry count, pool value, referral conversion count, and league status at all times via their dashboard
- **FR29:** A Creator can copy a unique referral link for sharing on Discord, Telegram, and X

### 6. Oracle & Results

- **FR30:** The system posts group stage results on-chain automatically via a cron-triggered oracle after all group matches complete
- **FR31:** A redundant cron on an independent server can post results idempotently if the primary cron fails
- **FR32:** An Admin can manually post results via the admin panel (pre-filled from api-football.com) if both cron servers fail
- **FR33:** The system alerts admins via Telegram/webhook if results are not posted by the expected deadline
- **FR34:** An Admin can extend the oracle grace period to prevent a league from becoming permanently frozen

### 7. Dispute Resolution

- **FR35:** A Player can file a dispute during the 24-hour dispute window by paying a $50 USDC flat deposit and specifying the disputed group(s) with a description
- **FR36:** A Creator can file a dispute for free during the dispute window
- **FR37:** An Admin can view all filed disputes with the oracle-posted result and the disputant's claim side-by-side
- **FR38:** An Admin can override results for specific disputed groups only, triggering indexer recalculation of all scores
- **FR39:** An Admin can dismiss a dispute and confiscate the deposit (malicious/spam)
- **FR40:** An Admin can trigger a full refund for all entrants if a dispute is irresolvable
- **FR41:** The system refunds the dispute deposit to the disputant if the dispute is ruled valid

### 8. Payout & Resolution

- **FR42:** The indexer calculates all player scores off-chain (1pt per correct group position, +1 bonus per perfect group, tiebreaker recorded) and builds a Merkle tree of payouts after the dispute window closes
- **FR43:** The indexer posts the Merkle payout root on-chain after the dispute window expires cleanly or admin resolves
- **FR44:** A winner can claim their prize by submitting a Merkle proof via the app
- **FR45:** A Creator can claim their 3% creator fee by submitting a Merkle proof via the app
- **FR46:** The dev wallet can claim the 2% dev fee by submitting a Merkle proof (claimable across multiple leagues)
- **FR47:** Unclaimed funds become claimable by the dev wallet 90 days after league resolution
- **FR48:** A Player can view their full prediction history and score breakdown after a league resolves
- **FR63:** When two or more entries share identical score and tiebreaker distance after the dispute window closes, the prize pool is split equally among them; any indivisible remainder (dust) transfers to the dev wallet
- **FR64 *(nice-to-have)*:** The Polymarket odds widget displays a deep-link to the corresponding Polymarket market alongside each group's probability display, allowing players to place a Polymarket bet without leaving the app context
- **FR65 *(nice-to-have)*:** A visitor with no wallet can create a Coinbase Smart Wallet inline on the league entry page without leaving the app, using Coinbase Smart Wallet embedded onboarding; on completion the wallet is auto-connected and the entry flow resumes

### 9. Token Whitelist

- **FR49:** Any user can submit a token whitelist request by paying $100 USDC equivalent on-chain, specifying token address and chain
- **FR50:** Any user can upvote or downvote pending whitelist requests in a public queue
- **FR51:** An Admin can approve a whitelist request, making the token available for league creation on that chain
- **FR52:** An Admin can reject a whitelist request; the system automatically refunds the fee minus gas
- **FR53:** The system auto-detects and flags fee-on-transfer and rebase tokens during admin whitelist review
- **FR54:** An Admin can de-whitelist a token; existing leagues using that token run to completion unless admin triggers a refund

### 10. Admin Platform Management

- **FR55:** An Admin can set global platform parameters: creator fee %, dev fee %, minimum entry amount, and free league toggle (changes apply to new leagues only)
- **FR56:** An Admin can pause creation of new leagues globally or pause an existing league from accepting new entries
- **FR57:** An Admin can view reported leagues and take action: warn creator, pause league, close + refund, or dismiss report
- **FR58:** An Admin can flag any league as featured at no cost
- **FR59:** An Admin can view oracle health status per chain (results posted / past deadline) and trigger manual posting or grace extension
- **FR60:** A Player can report a league; report is queued for admin review

### 11. Landing Page & Platform Stats

- **FR61:** A visitor can view live platform statistics (total value locked, active leagues, total player count) on the landing page, sourced from the indexer
- **FR62:** The system displays a FIFA-inspired but legally independent visual identity using public-domain country flags

## Non-Functional Requirements

### Performance

- **NFR1:** Leaderboard data refreshes within 30 seconds of a match result being indexed — players see rank changes in near real-time
- **NFR2:** Prediction form loads (including Polymarket odds widget) within 3 seconds on a standard broadband connection
- **NFR3:** League detail and browse pages load within 2 seconds; indexer powers all queries — no direct on-chain RPC calls for UI rendering
- **NFR4:** The Polymarket odds cache updates once per 24 hours; stale data is displayed with a visible timestamp — no page blocked on API response
- **NFR5:** Oracle cron posts results within 1 hour of final group stage match completion; 3-tier fallback ensures posting within 24 hours in all failure scenarios

### Security

- **NFR6:** All prediction data is stored with a commitment hash (`keccak256`) on-chain — raw predictions cannot be read or tampered with prior to the lock
- **NFR7:** All API endpoints and database writes use parameterised queries — no SQL/NoSQL injection surface
- **NFR8:** All string inputs (league names, descriptions, dispute notes) are sanitised before DB write
- **NFR9:** Admin wallet actions (postResults, overrideResults, token approval) require on-chain signature — no server-side private key used
- **NFR10:** HTTPS enforced on all frontend and API endpoints; no sensitive data in URL parameters
- **NFR11:** Compliance signature storage contains only wallet address, league ID, and timestamp — no PII
- **NFR12:** Token whitelist fee payment verified on-chain before request enters the queue — no off-chain payment forgery possible

### Reliability

- **NFR13:** Zero permanently frozen leagues — the 3-tier oracle fallback and admin manual posting ensure every league can always reach `Resolved` or `Refunded` state
- **NFR14:** Smart contract payout functions are protected with `ReentrancyGuard` and checks-effects-interactions pattern — no re-entrancy exploit path
- **NFR15:** The indexer is the only system that writes the Merkle root to the contract — no manual or admin path to override payout distribution without a dispute override flow
- **NFR16:** All EVM contract deployments pass Slither static analysis with no high-severity findings before mainnet

### Scalability

- **NFR17:** The indexer and Postgres DB are designed to handle all three EVM chains simultaneously from a single instance; horizontal scaling is possible if entry volume exceeds projections
- **NFR18:** The browse/leaderboard/stats UI is served from the indexed DB — no RPC bottleneck at scale regardless of on-chain activity

### Accessibility

- **NFR19:** Mobile prediction form uses forced pagination and dropdown selectors — drag-and-drop is desktop-only; all core flows are usable on mobile browsers without native app installation
- **NFR20:** All form inputs, modals, and CTAs meet WCAG 2.1 AA contrast and keyboard navigation standards

### Integration

- **NFR21:** api-football.com v3 is the canonical results source for the oracle and disputes; the app must gracefully handle API downtime (cached data served, admin alerted)
- **NFR22:** Polymarket API failure results in the odds widget hiding gracefully — prediction form remains fully functional without it
- **NFR23:** All ERC-20 token operations handle arbitrary decimal configurations — no hardcoded decimal assumptions; tested explicitly for USSD (Sonic) non-standard decimals
