# Implementation Readiness Assessment Report

**Date:** 2026-04-26
**Project:** WorldCup2
**Assessor:** BMad Implementation Readiness Skill

---

## Document Inventory

| Document | Status | File |
|---|---|---|
| PRD | ✅ Found | `_bmad-output/planning-artifacts/prd.md` |
| Architecture | ⚠️ Not found | — |
| Epics & Stories | ⚠️ Not found | — |
| UX Design | ⚠️ Not found | — |

---

## PRD Analysis

### Functional Requirements (65 total)

**1. Authentication & Identity (FR1–FR5)**
- FR1: EVM wallet connection via RainbowKit
- FR2: Chain-appropriate wallet setup guidance for users with no wallet
- FR3: ENS / Basename / SNS display names + avatars, truncated wallet fallback
- FR4: Admin status verified by signed message after wallet connection
- FR5: Admin status re-verified on chain switch

**2. League Discovery & Browsing (FR6–FR11)**
- FR6: Browse all public leagues without wallet connection
- FR7: Filter leagues by chain, entry token, entry fee range
- FR8: Sort leagues by date created, pool value, entry count
- FR9: Featured leagues row (admin-flagged or paid promotion)
- FR10: League detail page — entry fee, prize pool, entries, fee breakdown, time to lock, description
- FR11: Open Graph rich metadata for every league share link

**3. League Creation (FR12–FR16)**
- FR12: Create league with chain, entry token, fee, max entries, max per wallet, optional minimum threshold
- FR13: Configure revision policy — locked / free / paid (fees added to prize pool)
- FR14: Immutability warning + explicit acknowledgment before creation
- FR15: Pay league promotion fee on-chain ($20 USDC/day default) to feature league
- FR16: Refund all entrants if minimum threshold not met at lock; creation fee non-refundable

**4. Prediction Entry (FR17–FR24)**
- FR17: Enter league — pay entry fee, submit commitment hash of predictions
- FR18: Rank all 12 groups (A–L) with drag-and-drop (desktop) / dropdown (mobile)
- FR19: Mandatory tiebreaker — total goals (1–1000) submitted with entry
- FR20: Submission blocked until all 12 groups ranked + tiebreaker filled; progress indicator always visible
- FR21: Multiple entries per league, same or different predictions
- FR22: Polymarket odds widget alongside prediction form — data-as-of timestamp + staleness warning if >24h
- FR23: Compliance modal — once per entry, stored with wallet, leagueId, timestamp
- FR24: Revise predictions before lock (if league allows); revision fees added to prize pool

**5. Live Tournament Experience (FR25–FR29)**
- FR25: Real-time leaderboard — rank, score, entry count per league
- FR26: Score breakdown — points per group + tiebreaker, updates live
- FR27: Creator can view all player predictions after league locks and matches begin
- FR28: Creator dashboard — entries, pool value, referral conversions, status, at all times
- FR29: Creator can copy a unique referral link

**6. Oracle & Results (FR30–FR34)**
- FR30: Auto-post group results on-chain via cron after all group matches complete
- FR31: Redundant cron on independent server — idempotent fallback
- FR32: Admin manual results post via admin panel (pre-filled from api-football.com) if both crons fail
- FR33: Telegram/webhook alert if results not posted by expected deadline
- FR34: Admin can extend oracle grace period to prevent frozen league

**7. Dispute Resolution (FR35–FR41)**
- FR35: Player files dispute — $50 USDC flat deposit, specify disputed groups, description, during 24h window
- FR36: Creator files dispute for free during dispute window
- FR37: Admin views all disputes — oracle result vs. disputant claim side-by-side
- FR38: Admin overrides results for specific disputed groups only; triggers indexer recalculation
- FR39: Admin dismisses dispute and confiscates deposit (malicious/spam)
- FR40: Admin triggers full refund for all entrants if dispute irresolvable
- FR41: Dispute deposit refunded to disputant if ruled valid

**8. Payout & Resolution (FR42–FR48 + FR63)**
- FR42: Indexer calculates scores off-chain, builds Merkle payout tree after dispute window closes
- FR43: Indexer posts Merkle payout root on-chain after clean window or admin resolution
- FR44: Winner claims prize via Merkle proof
- FR45: Creator claims 3% fee via Merkle proof
- FR46: Dev wallet claims 2% fee via Merkle proof (claimable across multiple leagues)
- FR47: Unclaimed funds claimable by dev wallet 90 days post-resolution
- FR48: Player can view full prediction history + score breakdown after resolution
- FR63: Exact tie on score + tiebreaker distance → equal split; dust to dev wallet

**9. Token Whitelist (FR49–FR54)**
- FR49: Any user submits whitelist request — $100 USDC on-chain, token address, chain
- FR50: Any user can upvote/downvote pending whitelist requests
- FR51: Admin approves whitelist request — token available for league creation
- FR52: Admin rejects — automatic fee refund minus gas
- FR53: System auto-detects fee-on-transfer / rebase tokens during review
- FR54: Admin can de-whitelist token; existing leagues run to completion

**10. Admin Platform Management (FR55–FR60)**
- FR55: Admin sets global params — creator fee %, dev fee %, minimum entry, free league toggle (new leagues only)
- FR56: Admin pauses new league creation globally or pauses existing league from accepting entries
- FR57: Admin views reported leagues and takes action — warn / pause / close+refund / dismiss
- FR58: Admin flags any league as featured at no cost
- FR59: Admin views oracle health per chain — triggers manual post or grace extension
- FR60: Player can report a league; report queued for admin review

**11. Landing Page & Platform Stats (FR61–FR62)**
- FR61: Live platform stats on landing page — TVL, active leagues, total player count — from indexer
- FR62: FIFA-inspired legal-independent visual identity using public-domain country flags

**Nice-to-Have FRs**
- FR64 *(nice-to-have)*: Polymarket deep-link to corresponding market in odds widget
- FR65 *(nice-to-have)*: Coinbase Smart Wallet embedded onboarding inline on league entry page

**Total FRs: 65 (63 core + 2 nice-to-have)**

---

### Non-Functional Requirements (23 total)

**Performance (NFR1–NFR5)**
- NFR1: Leaderboard refreshes within 30s of match result indexed
- NFR2: Prediction form (including Polymarket widget) loads within 3s on standard broadband
- NFR3: League detail + browse pages load within 2s; indexer powers all queries — no RPC calls for UI
- NFR4: Polymarket odds cache updates once per 24h; stale data displayed with timestamp, page never blocked
- NFR5: Oracle cron posts results within 1h of final group stage match; 3-tier fallback within 24h in all scenarios

**Security (NFR6–NFR12)**
- NFR6: Commitment hash (keccak256) on-chain — raw predictions unreadable prior to lock
- NFR7: All API endpoints and DB writes use parameterised queries — zero SQL/NoSQL injection surface
- NFR8: All string inputs sanitised before DB write
- NFR9: Admin actions require on-chain signature — no server-side private key
- NFR10: HTTPS on all endpoints; no sensitive data in URL parameters
- NFR11: Compliance storage — wallet address, leagueId, timestamp only — no PII
- NFR12: Token whitelist fee payment verified on-chain before request enters queue

**Reliability (NFR13–NFR16)**
- NFR13: Zero permanently frozen leagues — 3-tier oracle fallback guarantees every league reaches Resolved or Refunded
- NFR14: ReentrancyGuard + checks-effects-interactions on all payout functions
- NFR15: Only indexer writes Merkle root — no admin path to override payout distribution outside dispute flow
- NFR16: All EVM contracts pass Slither with no high-severity findings before mainnet

**Scalability (NFR17–NFR18)**
- NFR17: Indexer + Postgres handles all three EVM chains from single instance; horizontal scale possible
- NFR18: Browse/leaderboard/stats served from indexed DB — no RPC bottleneck at scale

**Accessibility (NFR19–NFR20)**
- NFR19: Mobile prediction form uses forced pagination + dropdowns; all core flows usable on mobile browser
- NFR20: All forms, modals, CTAs meet WCAG 2.1 AA contrast and keyboard navigation

**Integration (NFR21–NFR23)**
- NFR21: api-football.com downtime handled gracefully — cached data served, admin alerted
- NFR22: Polymarket API failure — widget hides gracefully, prediction form fully functional without it
- NFR23: All ERC-20 operations handle arbitrary decimal configurations; USSD non-standard decimals explicitly tested

---

### Additional Requirements & Constraints

- **Hard deadline:** World Cup 2026 group stage kick-off (~June 11, 2026)
- **Chain isolation:** Base, Ethereum, Sonic (EVM only at MVP); Solana deferred post-MVP
- **No formal audit:** Budget constraint. Mitigation: Slither + AI-assisted audit + human review + comprehensive test suite
- **No KYC/AML at launch:** Pseudonymous wallet-based identity only
- **Fee immutability:** Creator + dev fee % locked at league creation; changes apply only to new leagues
- **Architecture redeployability:** Euro 2028 must be achievable with config change only — no contract rewrite
- **Bonding curve deferred:** v1.1 feature, not MVP
- **Indexer:** Custom Node.js, single Postgres DB, self-hosted

---

### PRD Completeness Assessment

The PRD is **well-formed and thorough** for a greenfield blockchain product. Observations:

- ✅ All 11 functional capability areas have numbered, traceable FRs
- ✅ NFRs cover all expected quality domains with measurable targets where applicable
- ✅ State machine documented with transitions and permitted actions per state
- ✅ Oracle fallback tiers explicitly numbered and described
- ✅ Token whitelist mechanics, fee immutability, and payout model are precise
- ⚠️ FR18 specifies drag-and-drop (desktop) / dropdown (mobile) but the prediction form pagination behaviour (forced on mobile, toggle on desktop) is described in the MVP list and user journey rather than as a standalone FR — minor traceability gap
- ⚠️ The "Gut vs. Market" nice-to-have (post-lock stat comparing player picks to Polymarket consensus) is in the MVP nice-to-have list but has no FR number — consider FR66 if you want formal traceability

---

## Epic Coverage Validation

**Epics document: NOT FOUND**

No epics or stories document exists. This is expected at this stage of the workflow — the PRD was just completed.

### FR Coverage Matrix

| FR Range | Capability Area | Epic Coverage | Status |
|---|---|---|---|
| FR1–FR5 | Authentication & Identity | No epics yet | ❌ Not covered |
| FR6–FR11 | League Discovery & Browsing | No epics yet | ❌ Not covered |
| FR12–FR16 | League Creation | No epics yet | ❌ Not covered |
| FR17–FR24 | Prediction Entry | No epics yet | ❌ Not covered |
| FR25–FR29 | Live Tournament Experience | No epics yet | ❌ Not covered |
| FR30–FR34 | Oracle & Results | No epics yet | ❌ Not covered |
| FR35–FR41 | Dispute Resolution | No epics yet | ❌ Not covered |
| FR42–FR48, FR63 | Payout & Resolution | No epics yet | ❌ Not covered |
| FR49–FR54 | Token Whitelist | No epics yet | ❌ Not covered |
| FR55–FR60 | Admin Platform Management | No epics yet | ❌ Not covered |
| FR61–FR62 | Landing Page & Stats | No epics yet | ❌ Not covered |
| FR64–FR65 | Nice-to-Have | No epics yet | ⚪ Not required |

**Coverage: 0 / 63 core FRs — epics not yet created (expected)**

---

## UX Alignment Assessment

### UX Document Status

**Not found.** No UX specification document exists at this stage.

### Assessment

The PRD **heavily implies a rich UI** — the product is a consumer-facing web application with:
- Drag-and-drop prediction form (desktop) + forced pagination (mobile)
- Real-time leaderboard
- Polymarket odds widget
- League creation wizard (3-step)
- Creator / player / admin dashboards
- Bonding curve preview chart (creator wizard)
- Oracle health dashboard (admin)

The brainstorming session identified **23 screens/components** in detail (Role Playing phase). These are described in User Journeys in the PRD but are not formalised as UX specifications.

### Warnings

| Severity | Warning |
|---|---|
| ⚠️ Major | No UX design document — user journeys in PRD describe flows but do not specify wireframes, component hierarchy, responsive breakpoints, or interaction states |
| ⚠️ Major | No architecture document — blockchain/web3 requirements are detailed in PRD but contract interfaces, indexer API contracts, and frontend↔indexer data models are not defined |
| ℹ️ Info | Brainstorming session (23 screens) can serve as input for UX design workflow |

---

## Epic Quality Review

**Epics document: NOT FOUND**

No epics exist to validate. Review will be possible after `bmad-create-epics-and-stories` workflow completes.

**Pre-emptive observations to inform epic creation:**

- This is a **greenfield** project. Epic 1 Story 1 should be "Set up initial project from starter template / repo scaffold"
- **Smart contract epics** should be framed around user outcomes (e.g. "Players can enter leagues and have funds held in contract") not technical milestones (e.g. "Deploy LeagueFactory contract")
- The state machine (Open → Locked → ResultsPending → DisputeWindow → Resolved/Refunded) is a natural epic boundary — each state transition is a delivery milestone with user value
- The **indexer** is a technical dependency but delivers user value via leaderboard/scoring. Frame as "Players can view live standings" — not "Build Node.js indexer"
- Dispute resolution and payout are separate flows and should likely be separate epics, not stories within a resolution epic
- **Hard deadline (June 11, 2026)** means the epic sequence must be sprint-mapped against the deadline immediately after creation

---

## Summary and Recommendations

### Overall Readiness Status

**🟡 NEEDS WORK — PRD is complete; downstream artifacts required before implementation**

---

### Critical Issues Requiring Action Before Implementation

| Priority | Item | Action Required |
|---|---|---|
| 🔴 Critical | No Architecture document | Run `bmad-create-architecture` — contracts, indexer API contract, frontend↔backend data models must be defined before dev starts |
| 🔴 Critical | No Epics & Stories document | Run `bmad-create-epics-and-stories` — 63 FRs have no implementation path |
| 🟠 Major | No UX design document | Run `bmad-create-ux-design` — 23 screens identified in brainstorming with no wireframes or interaction specs |
| 🟡 Minor | FR18 pagination behaviour not captured as standalone FR | Consider extracting mobile pagination and desktop toggle as explicit FRs, or confirm FR18 + MVP scope list is sufficient |
| 🟡 Minor | "Gut vs. Market" nice-to-have has no FR number | Add FR66 if traceability into epics is desired |

---

### Recommended Next Steps (in order)

1. **`bmad-create-architecture`** — Define technical architecture: contract interfaces, indexer event schema, API contracts, data models, deployment strategy. This is the highest-risk item; architecture decisions will constrain epic scope.
2. **`bmad-create-ux-design`** — Define 23 screens from brainstorming as wireframes and interaction specs. Can run in parallel with architecture.
3. **`bmad-create-epics-and-stories`** — Break all 63 FRs into user-value epics and independently-completable stories. Sprint-map against June 11 deadline immediately.
4. **`bmad-sprint-planning`** — Slot epics into sprints with the hard deadline as the forcing function.
5. **Re-run `bmad-check-implementation-readiness`** — After epics are created, re-run this check to validate FR coverage and epic quality before dev begins.

---

### Final Note

This assessment identified **5 items** across **3 categories**. The PRD is production-quality. The two critical gaps (architecture, epics) are expected at this stage and are the natural next deliverables. Address architecture first — it will inform epic sizing and story ACs for the smart contract and indexer layers.

**Report generated:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-26.md`
