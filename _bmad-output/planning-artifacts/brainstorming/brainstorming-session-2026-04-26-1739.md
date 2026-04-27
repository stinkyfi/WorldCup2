---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'Web3 World Cup Fantasy App â€” Group Stage Predictions with Multi-Chain Support'
session_goals: 'Brainstorm and produce full product documentation covering features, UX flows, gamification, smart contract architecture, multi-chain support (Solana/Base/Ethereum/Sonic), role-based access (Admin/Creator/Player), business model, and landing page design'
selected_approach: 'AI-Recommended Techniques'
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session â€” Web3 World Cup Fantasy App

**Facilitator:** Stinky
**Date:** 2026-04-26

---

## Session Overview

**Topic:** A Web3 fantasy sports app for the FIFA World Cup group stage predictions
- 12 groups (Aâ€“L), 4 teams per group, 48 teams, 104 matches
- Players rank teams within each group and buy entries
- Polymarket odds integration to assist predictions
- Multi-chain: Solana, Base, Ethereum, Sonic
- Roles: Admin (whitelisted wallet), Creator (league creator), Player (predictor)
- Business model: creator fees, dev cut, token whitelist requests

**Goals:**
- Generate comprehensive feature/UX ideas
- Identify all open design decisions and edge cases
- Define business model mechanics
- Create foundation for full product documentation

**Approach:** AI-Recommended Technique Sequence

**Phases:**
1. Question Storming (Deep)
2. Six Thinking Hats (Structured)
3. Role Playing (Collaborative)
4. Reverse Brainstorming (Creative)

---

## Phase 1: Question Storming

*Goal: Surface every unresolved design question before generating solutions*

---

### Round 1 â€” Q&A Log

**Domain: Smart Contract & On-Chain Mechanics**

**[Q1] When does the prediction window lock?**
â†’ 24 hours before the first match kicks off. Oracle-driven for all other lifecycle events. Goal is max decentralization.

**[Q2] Cancellation / dispute mechanism?**
â†’ 24-hour dispute window after group stages end. If no dispute â†’ resolve normally. If dispute filed â†’ 48-hour admin review window (can include group discussion). Admins either resolve OR refund all. Cancellation/refund mechanism exists in contract.

**[Q3] Scoring system?**
â†’ 1 point per correct position in a group. Bonus: +1 point for a perfect group (all 4 teams in exact order). Max points per group = 5 (4 positions + 1 bonus). 12 groups Ã— 5 = 60 max total points.

**[Q4] Who settles results / calls oracle?**
â†’ Open to suggestions. (Captured as open design decision â€” see Round 2.)

**[Q5] Multi-chain contract architecture?**
â†’ Independent contracts per chain. When users switch chain, they interact with that chain's contracts. Pools are chain-isolated.

**[Q6] Creator / dev fee split?**
â†’ 3% Creator / 2% Dev. Admins can change rates. Rate changes only apply to NEW leagues. Existing leagues are permanently locked to their creation-time rate.

**[Q7] Denied token whitelist â†’ refund?**
â†’ App triggers refund transaction automatically on admin rejection. Refund = full amount minus gas.

**[Q8] Token whitelist request fee?**
â†’ $100 USD equivalent. Deters spam without blocking legitimate small projects.

**[Q9] Free leagues?**
â†’ Allowed. Admins can set a global minimum entry amount (0, 0.1, 10, etc.) to throttle free leagues if needed. Free leagues with entry limit of 1 are acknowledged as easily gameable with fresh wallets â€” accepted since free = no monetary reward, so it doesn't matter.

**[Q10] Rebase / fee-on-transfer tokens?**
â†’ App auto-detects and warns admins during whitelist review. Admins decide case-by-case. Creators and players also warned if such a token is used in a league.

**[Q11] Admin identity across chains?**
â†’ Admin wallets can differ per chain. Each connection event requires re-verification. Chain-switch also triggers re-verification.

**[Q12] Admin wallet security?**
â†’ Ideally a multi-sig. Not a top concern given the small admin team.

**[Q13] Pause controls?**
â†’ Admins can: (a) pause creation of new leagues globally, (b) pause existing leagues from accepting new entries. Both are reversible. Not match-level pause.

**[Q14] Fee change protection for existing leagues?**
â†’ Confirmed: fee % changes only affect newly created leagues. Existing leagues are immutably locked at creation-time rates.

**Domain: Creator Experience**

**[Q15] Can creators edit league settings post-creation?**
â†’ No. Immutable after creation to protect players.

**[Q16] League discoverability?**
â†’ Shareable link with rich metadata (Open Graph) for Discord, Telegram, X, etc. On-platform discovery to be explored.

**[Q17] Minimum player threshold?**
â†’ Creator can optionally pay an extra fee at creation to set a minimum player threshold. If threshold not met by close â†’ full refund to all entrants. No creator refund on creation fee. 1-entry leagues: that entry gets refunded.

**[Q18] Late entry / bonding curve?**
â†’ No late-entry fee tiers. Optional bonding curve: entry price rises with each new entry, incentivizing early participants. Creator opt-in at creation time.

**Domain: Player Experience & UX**

**[Q19] Mobile drag-and-drop?**
â†’ Desktop: drag-and-drop ranking. Mobile fallback: numbered dropdown selectors if DnD UX is poor.

**[Q20] Prediction revisions?**
â†’ Creator-configurable. Options: locked (no changes), free revisions, or paid revisions (fee split between dev and creator). Set at league creation time.

**[Q21] Multiple entries â€” same or different predictions?**
â†’ Player's choice. They can submit the same or different prediction sets across multiple entries.

**[Q22] Winner notification?**
â†’ No push/email for now. Winners claim rewards manually on the app after the dispute window clears and the league resolves.

**Domain: Polymarket Integration**

**[Q23] API availability / caching?**
â†’ Fetch once per 24 hours and cache. Show data-as-of timestamp always. If update fails, display stale data with a visible staleness warning.

**[Q24] Odds display format?**
â†’ Probabilities (%) preferred. Polymarket default format as fallback.

**[Q25] Legal / regulatory disclosure?**
â†’ Compliance modal users must sign/acknowledge: they are responsible for compliance with their local laws. Once signed, stored (on-chain or in local state).

---

### Round 2 â€” Q&A Log

**Domain: Oracle Design**

**[Q26] Oracle approach?**
â†’ Build a custom oracle. Data source: api-football.com (v3). Oracle posts results on-chain for the 24-hour review period. Players, creators, and admins can dispute within that window.

**[Q27] Ground truth source for disputes?**
â†’ api-football.com (v3) is the canonical source.

**[Q28] Where do funds sit during dispute window?**
â†’ Locked in contract. No withdrawals allowed during dispute. On resolution: pay out normally (or with admin-corrected results). If unresolvable: full refund to all.

**[Q29] Dispute filing cost?**
â†’ Players: 10% of league payout to file. Creators and Admins: free. Fee is refunded if dispute is ruled good-faith. Admins can confiscate the fee if dispute is ruled malicious/delay-tactic.

**[Q30] Prize distribution?**
â†’ Winner-takes-all. Tiebreaker: predict total goals scored across all group stage matches. Closest wins. Still tied â†’ split equally. Remaining dust â†’ dev wallet.

**[Q31] Tie resolution?**
â†’ Same as Q30. Total goals tiebreaker â†’ closest wins â†’ equal split if still tied.

**[Q32] Bonding curve structure?**
â†’ Creator chooses linear or exponential at creation (dropdown). The price difference (spread) between entries feeds into the overall prize pool. Creator and dev fees are % of total pool, so both benefit from a larger pool.

**[Q33] Fund custody?**
â†’ All funds held in the smart contract. No external custodian. Contract enforces all rules.

**[Q34] Whitelist fee token?**
â†’ Paid only in whitelisted tokens. USDC whitelisted on every chain by default. On Sonic: also whitelist USSD.

**[Q35] Whitelist scope?**
â†’ Chain-specific. Same token on different chains requires separate whitelist requests. Projects on multiple chains can request multi-chain whitelisting through admins. Admins can whitelist tokens for free (no fee for admin-initiated whitelisting).

**[Q36] Public whitelist queue?**
â†’ Public queue visible to all. Community can upvote/downvote to help admins prioritize. Only admins can approve or reject.

**[Q37] De-whitelisting?**
â†’ Admins can de-whitelist at any time. For existing leagues using the de-listed token: admins can either let them run to completion or close them and refund, depending on the severity of the reason.

**[Q38] Indexer choice?**
â†’ Use a lightweight self-hosted indexer (e.g., ponder.sh or equivalent). Goal: near-zero cost to operate. Powers browse/search/stats UI without on-chain enumeration.

**[Q39] On-chain vs. off-chain data?**
â†’ On-chain: entry fees, token used, max entries, per-address limits, fee rates, whitelisting. Off-chain (DB): league names, descriptions, metadata â€” strings that serve no compliance purpose.

**[Q40] League discovery & promotion?**
â†’ Default sort options: date created, token, total value. Admin-flagged "featured" leagues appear at top. Paid promotion: configurable fee (~$20 USDC/day default) to boost a league to top of list. Fee goes to dev revenue.

**[Q41] Landing page primary CTA?**
â†’ "Join a League" is primary. Also emphasize "Create a League." Explore dynamic routing by audience.

**[Q42] Live stats on landing page?**
â†’ Yes. Data pulled from indexed DB (not live contract calls). Show: total value locked, active leagues, player count, etc.

**[Q43] Visual identity?**
â†’ Custom, FIFA-inspired but legally independent. Use country flags (public domain). No FIFA licensed marks.

**[Q44] Compliance modal frequency?**
â†’ Once per league entry. Signed and stored.

**[Q45] Geoblocking?**
â†’ Start with user self-certification modal only. Expand to geoblocking if legally required later.

**[Q46] League reporting?**
â†’ Yes, players can report a league. Admins review.

---

### Round 3 â€” Q&A Log

**[Q47] Oracle per chain?**
â†’ One oracle contract per chain.

**[Q48] What triggers oracle?**
â†’ Cron job on a self-hosted server. Team hosts and maintains.

**[Q49] Admin result override?**
â†’ Any admin can call `overrideResults()` on the contract directly. No timelock.

**[Q50] On-chain data scope?**
â†’ User entries stored on-chain for audit purposes. Scoring calculations done off-chain by the indexer. Winners determined off-chain, then fed back to contract to resolve. Minimizes gas, especially on Ethereum.

**[Q51] Dispute deposit mechanics?**
â†’ Keep 10% of pool as dispute deposit. Admins can close/dismiss spam disputes and keep the fee. Still an open design tension: 10% of a large pool is severe. Flagged for further refinement. Mitigation: admins can summarily close obvious spam.

**[Q52] League state machine?**
â†’ Leagues lock 24h before first group stage match. No entries after lock. After all matches complete and results calculated, dispute window opens. No entries or changes during dispute window.

**[Q53] Multiple disputes per league?**
â†’ One dispute per player address. Admins can close individual disputes or select one to action. Admins can refund everyone if there is too much contention.

**[Q54] Dispute fee source if refunded?**
â†’ Comes from prize pool. Creator and dev fees are only disbursed on successful resolution. In refund scenarios everyone gets their entry back.

**[Q55] Tiebreaker submission?**
â†’ Mandatory. Submitted on the same form as group rankings, before the lock.

**[Q56] Goals tiebreaker range?**
â†’ 1â€“1000. This covers the realistic range and protects edge cases.

**[Q57] Cancelled/walkover match goals in tiebreaker?**
â†’ Can be disputed by players. If resolution is too controversial, admins can trigger full refund.

**[Q58] Bonding curve creator UX?**
â†’ Creator sets base entry price. App shows an interactive chart previewing how entry price progresses with linear vs. exponential curve chosen. Educates creator before committing.

**[Q59] Bonding curve max price cap?**
â†’ No USD cap enforced. Price displayed in entry token (ETH shown in ETH, etc.). App educates creator via chart. If they set an absurd curve, no one enters â€” their problem.

**[Q60] Indexer for all chains?**
â†’ Build a custom Node.js indexer that listens to all supported chain contracts and writes into a single Postgres DB. One unified data layer for all chains and stats.

**[Q61] Backend stack?**
â†’ Node.js + Postgres. Self-hosted.

**[Q62] Compliance signature storage?**
â†’ Stored in DB with wallet address + league ID + timestamp.

**[Q63] Promotion payment?**
â†’ On-chain â€” direct transaction to dev wallet or contract feature. "Top of list" = "Featured" row, not absolute position #1.

**[Q64] Multiple promoted leagues on same day?**
â†’ Random rotation among all paying featured leagues.

**[Q65] League reporting actions?**
â†’ Admins can: warn creator, pause league (no new entries), close + refund, or dismiss report.

**[Q66] USSD decimals?**
â†’ USSD may use non-standard decimals. Ensure the app and contracts handle all ERC-20/SPL decimal configurations generically.

---

### Round 4 â€” Q&A Log

**[Q67] Dispute deposit?**
â†’ Option B: Flat $50 USDC equivalent, regardless of pool size.

**[Q68] Platform longevity?**
â†’ Reusable architecture. Launch focused on World Cup 2026, but design modularly for future tournaments (Euro, Copa America, World Cup 2030). Group structure config (12 groups, 4 teams) should not be hardcoded â€” parameterized in contracts. Post-group-stage bracket prediction is a natural future expansion.

**[Q69] Platform after World Cup ends?**
â†’ Leave live. Expand to round-of-16 / knockout bracket if the group stage product is successful. Can take down if needed.

**[Q70] Cross-chain identity?**
â†’ Wallets are separate per chain. No cross-chain identity linking. Simplifies dev.

**[Q71] Leaderboard?**
â†’ Per-league leaderboard, updated in real time as group stage matches are played.

**[Q72] Creator dashboard stats?**
â†’ Entry count, pool value, predictions submitted, dispute status, potential payout at current pool value, marketing/referral links (quick copy for Discord, Telegram, X).

**[Q73] Creator visibility into player predictions?**
â†’ Creators see total entry count only. Individual predictions hidden until the league locks and games begin â€” then predictions are visible.

**[Q74] Player live scoring?**
â†’ Players see their current score and standing in real time as matches play out.

**[Q75] Historical predictions?**
â†’ Players can view their full past predictions after a league resolves.

**[Q76] Platform target?**
â†’ Web app (mobile-responsive). No native iOS/Android. Explore Base App support (Base's mini app ecosystem).

**[Q77] Creator referral link?**
â†’ Yes. Each Creator gets a unique referral/invite link. Tracks how many players joined via that link. Displayed in Creator dashboard.

---


## Phase 1: Summary � All Open Design Decisions Captured

**Total questions answered: 77**

### Key Decisions Locked ?
- Lock time: 24h before first match
- Scoring: 1pt/correct position + 1pt bonus for perfect group = 60 max points
- Tiebreaker: total goals (1�1000), mandatory, submitted at entry
- Prize: winner-takes-all, tiebreaker ? closest ? split ? dust to dev
- Fees: 3% creator / 2% dev, locked at league creation, changeable for future leagues only
- Oracle: custom per-chain, cron-fed from api-football.com � 3-tier fault tolerance:
  - Tier 1: Primary cron server auto-posts results after last match
  - Tier 2: Redundant cron on second independent server (idempotent, same logic)
  - Tier 3: Any admin can manually call `postResults()` or `overrideResults()` from admin panel
  - Contract stores `expectedResultsDeadline` at league creation; if `resultsPostedAt` is zero past deadline, any admin (or public keeper) can trigger a grace extension � prevents permanently frozen leagues
  - Monitoring: heartbeat + on-chain deadline check alerts admin group chat (Telegram/Discord webhook)
- Dispute window starts at `resultsPostedAt` timestamp (not match-end) � safe for all fallback scenarios
- Off-chain scoring, on-chain settlement via `overrideResults()` or normal resolution
- Dispute: 24h window, $50 USDC flat deposit, refundable if good faith
- Funds: locked in contract, no withdrawal during dispute
- Token whitelist: chain-specific, $100 USDC fee, public vote queue, admin approval
- Indexer: custom Node.js indexer ? single Postgres DB for all chains
- Backend: Node.js + Postgres, self-hosted
- Compliance modal: signed once per entry, stored in DB with timestamp
- Promotion: on-chain payment, featured row, random rotation between paid slots
- Architecture: modular, tournament-agnostic in design, World Cup 2026 first
- Payout trigger: winner OR creator can trigger the single payout tx (pays winner, creator, dev simultaneously)
- Prediction form UX: desktop = all 12 groups scrollable (pagination toggle available); mobile = forced pagination

### Open / Flexible ??
- Base App integration (explore)
- Post-group-stage bracket prediction (future expansion)
- Geoblocking (add if legally required)
- Strike system for repeat-offender Creators (not yet defined)

---

## Phase 2: Six Thinking Hats

### ?? WHITE HAT � Facts & Data

- FIFA World Cup 2026: 48 teams, 12 groups, 104 matches (~June 11�July 2, 2026)
- World Cup 2022 global TV audience: 1.5B+
- Fantasy sports market: $30B+ globally; Web3 fantasy <1% � massive white space
- Polymarket had $500M+ in World Cup 2022 volume
- EVM chains (Base, Ethereum, Sonic) share tooling; Solana requires entirely separate Rust/Anchor contracts
- USDC natively deployed on all 4 target chains
- api-football.com provides real-time match data, standings, and live scores
- Base App (Coinbase's mini app platform) could provide immediate distribution to Coinbase's user base
- Crypto users strongly prefer bundled transactions over multiple signing steps
- Mobile is 60�70% of web traffic; drag-and-drop UX on mobile is notoriously poor
- 3% creator + 2% dev = 5% total rake on all pools

### ?? RED HAT � Emotions & Psychology

- **Player at purchase:** Dopamine hit from dragging teams, filling in the bracket � sports fan pattern
- **Player during tournament:** Live leaderboard creates intense engagement; watching rank change in real time
- **Player on reward claim:** Manual claim days later risks abandonment � "I forgot I won"
- **Creator:** Pride of ownership, anxiety about threshold not being met, satisfaction from referral conversions
- **First-time visitor:** 5 seconds to answer "Is this legit? Is it fun? Can I trust this?" � flags + live stats + multi-chain logos answer all three
- **Fear factors:** contract hack, admin rug, confusing scoring. Dispute mechanism + locked fees at creation directly address rug fears

### ?? YELLOW HAT � Upside Potential

- Creator viral loop is the core growth engine � motivated creators = organic player acquisition
- Base App integration could be a breakout moment with 100M+ Coinbase users
- Polymarket odds widget is a killer differentiator � no other fantasy product shows this
- Modular architecture: 2028 Euros could launch in a week, not months
- Sonic chain is underserved � near-zero Web3 sports products, early mover advantage
- USSD on Sonic positions platform as an ecosystem partner, potential protocol-level promotion

### ?? BLACK HAT � Risks & Critical Flaws

- **Oracle single point of failure** ? mitigated with 3-tier fallback + grace extension + monitoring
- **api-football.com data errors** ? cross-reference during dispute resolution; dispute window catches bad data
- **Solana is architecturally alien** ? 2�3x more dev time; risk of delaying EVM quality if parallelized poorly
- **Fee-on-transfer / rebase token exploits** ? auto-detect + admin warning + staging environment testing
- **Regulatory risk** ? self-certification modal is first line; geoblocking as expansion option
- **Whale domination** ? multiple entries per address gives whales statistical edge in winner-takes-all; acceptable trade-off
- **Unclaimed rewards** ? manual claim required; need a contract-level expiry policy for unclaimed prizes

### ?? GREEN HAT � Creative Ideas

- **"Gut vs. Market" stat:** Show each player how contrarian their picks were vs. Polymarket consensus after lock
- **Soulbound NFT trophies:** Mint to league winners � proof-of-win, shareable, drives return for next tournament
- **Creator reputation score:** Track history (leagues created, players attracted, disputes), display "Verified League" badge
- **Late-reveal via commitment scheme:** Hash picks on-chain at entry, reveal after lock � proves no retroactive tampering
- **Polymarket deep-link:** "Believe in this team? Bet on Polymarket" � potential affiliate revenue
- **Live goal event toasts:** As matches score, push real-time toast on leaderboard showing rank changes
- **Share card generator:** Auto-generate shareable image with current rank + league name for Twitter/Instagram
- **Creator leaderboard:** Rank creators by total value locked � public, drives creator competition

### ?? BLUE HAT � Process

- Phase 1 ? Design questions answered
- Phase 2 ? 360� product analysis complete
- Phase 3 ? Role Playing: map every UX flow per role
- Phase 4 ? Reverse Brainstorming: finalize risk register
- Then ? PRD, Architecture doc, UX spec

---

## Phase 3: Role Playing � User Journey Maps

*Each role walked step by step. Every screen, action, and pain point captured.*

---

### ROLE 1: ADMIN

**Step 1 � First time setup**
Admin visits app. Wallet not yet whitelisted � sees public app. Dev team adds their address to Admin whitelist via contract. Admin reconnects, signs message to prove ownership, app verifies on-chain. "Admin Panel" nav item appears. Chain-switch triggers re-verification.
- *Screen needed:* Admin nav item, chain indicator badge, re-verify prompt on chain switch

**Step 2 � Global contract settings**
Admin Panel ? Platform Settings:
- Current creator fee %, current dev fee %
- Minimum entry fee (global floor � 0, 0.1, 10, etc.)
- Free league creation: Enabled / Disabled toggle
- Legend: "Changes apply to new leagues only"
- Validation: creator + dev fee cannot exceed 100%; soft warning above ~10% combined
- *Screen needed:* Platform Settings form, current vs. pending state, tx confirmation modal

**Step 3 � Token whitelist review queue**
Admin Panel ? Token Whitelist. Three sections: Pending / Approved / Rejected.
Each pending request shows: token address, chain, requester wallet, fee paid, community votes (?/?), auto-detected flags (fee-on-transfer ??, rebase ??), date submitted.
Admin approves ? token added to chain's whitelist. Admin rejects ? app auto-triggers refund tx (minus gas). Optional rejection note stored in DB, visible to requester.
- *Screen needed:* Token queue table, individual token review drawer, approve/reject buttons, rejection note field, flag badges

**Step 4 � League moderation**
Admin Panel ? Leagues. Search/filter all leagues. Click a reported league ? see reports list (wallet, text, timestamp). Actions: Warn Creator / Pause League / Close + Refund / Dismiss Report.
- *Screen needed:* League moderation panel, reports list per league, action buttons + notes field

**Step 5 � Dispute management**
Admin Panel ? Disputes. Per-league view of all filed disputes (one per player address). Side-by-side: oracle result vs. disputed claim. Actions: Dismiss (keep deposit) / Accept + Override Results / Refund All. Accepted disputes trigger `overrideResults()` with admin-entered data from api-football.com.
- *Screen needed:* Disputes queue, side-by-side result comparison, override form, accept/dismiss with confirmation

**Step 6 � Oracle health & manual post**
Admin Panel ? Oracle Status. Per-chain health indicators:
- ? = results posted / ?? = past deadline, not posted
- `expectedResultsDeadline`, `resultsPostedAt` per chain
- [Manually Post Results] button � pre-fills from api-football.com
- [Extend Grace Period] button
- *Screen needed:* Oracle health dashboard, per-chain status, manual post form, grace extension button

**Step 7 � Featured league promotion**
Admin Panel ? Promotions. Table of leagues paying for featured placement (days remaining). Admin can flag any league as featured for free (goodwill/launch partners). Random rotation is automatic.

---

### ROLE 2: CREATOR

**Step 1 � Discovery & motivation**
Lands on homepage. Sees live stats (active leagues, total value locked, player count). Clicks "Create a League" CTA. Connects wallet.

**Step 2 � League creation wizard**

*Page 1 � Basic Info (off-chain):*
League name, description, chain (Ethereum / Base / Solana / Sonic), entry token (whitelisted tokens for selected chain)

*Page 2 � Rules (on-chain):*
- Entry fee (in selected token)
- Bonding curve: toggle on ? choose Linear / Exponential ? interactive chart shows price progression up to entry #100
- Max total entries (number or "Unlimited")
- Max entries per wallet address
- Minimum player threshold (optional, costs extra fee) � if not met ? full refund to all
- Allow prediction revisions? ? Free / Paid (enter revision fee, split to creator + dev)

*Page 3 � Review & Pay:*
- Full summary of all settings
- Creation fee displayed
- ?? Immutability warning: "These settings cannot be changed after creation"
- [Create League] ? wallet transaction
- *Screen needed:* Multi-step wizard, bonding curve chart, immutability warning modal, tx confirmation

**Step 3 � League created, share it**
Creator Dashboard for new league:
- Status: Open for entries | Pool: 0 | Entries: 0/max | Time until lock: 14d 6h
- Referral link [copy] with rich Open Graph metadata (league name, pool, fee)
- Share buttons: Discord | Telegram | X | Copy link
- [Promote to Featured] ? pay $20 USDC/day on-chain ? confirms days ? featured row
- *Screen needed:* Dashboard, referral link component with preview, promote button + duration input

**Step 4 � Watching entries**
Dashboard updates: entries count, pool value, bonding curve chart (next entry price), referral conversions. Predictions submitted counter shown (but not individual picks � hidden until lock).

**Step 5 � League locked, games begin**
Status: Locked � Games In Progress. Creator can now see all player predictions. Live leaderboard visible. Creator shares leaderboard updates to Discord to maintain engagement.

**Step 6 � Post-match: dispute window ? resolution**
Status: Results Posted � 24h Dispute Window. Creator can file disputes for free. If clean ? Resolved. Either creator or winner triggers payout tx ? one transaction pays: winner(s), creator fee (%), dev fee (%). Creator fee lands in their wallet.
- *Screen needed:* League status timeline, resolution screen, payout tx confirmation

**Step 7 � Dashboard history**
Past and active leagues shown. Past: total players, pool raised, creator cut earned, disputes filed. Referral stats. Badge for leagues where all players came via referral link.

---

### ROLE 3: PLAYER

**Step 1 � Entry via shared link**
Clicks link ? lands directly on league page (not homepage).
Sees: league name, entry fee, current prize pool, time remaining, creator description, entries so far/max, fee breakdown (pool / creator / dev), bonding curve notice if active.
[Connect Wallet & Enter] CTA prominent. "Get a wallet" helper for first-timers.

**Step 2 � Connect wallet & compliance modal**
Connects wallet. Compliance modal: "By entering you confirm you are legally permitted to participate in prediction contests in your jurisdiction." [I Agree & Continue]. Stored in DB (wallet + leagueId + timestamp).

**Step 3 � Prediction form**
12 group panels (A�L), each showing:
- Group letter + 4 teams with country flags
- Polymarket odds widget: "Win probability: Brazil 68% | Argentina 21% ..." (data-as-of timestamp)
- Desktop: drag-and-drop ranking (1st ? 4th)
- Mobile: forced pagination (one group per screen) with dropdown selectors per position
- Desktop toggle: all-groups scrollable ? paginated view

Bottom of form:
- Tiebreaker: "Predict total goals scored in all group stage matches (1�1000)" [number input] � mandatory
- Progress indicator: "12/12 groups ? Tiebreaker ?"
- [Review Picks]
- *Screen needed:* Group panels with DnD + mobile fallback, Polymarket widget, tiebreaker field, progress bar, desktop pagination toggle

**Step 4 � Review & submit**
Read-only summary grid of all 12 group picks + tiebreaker. [Confirm & Pay] ? wallet tx (entry fee ? contract, picks ? on-chain). Confirmation: "You're in!" ? Player Dashboard. Multiple entries: "Enter Again" button ? fresh blank form.

**Step 5 � Player dashboard**
All entered leagues listed. Per league: name, chain, rank (14th / 47), current score (23/60 pts), time to next impactful match, pool value, entry count. Click through to live leaderboard.

**Step 6 � Live scoring during tournament**
Leaderboard updates after each match. Page auto-updates or refresh to see rank change. Share card: "I'm currently 11th in [League Name] � can you beat me? [link]"

**Step 7 � Dispute window**
Notices Group F result looks wrong. Clicks [File Dispute] ? selects group(s) ? enters description ? confirms $50 USDC deposit (refund conditions shown) ? signs tx. Dispute appears in admin queue.

**Step 8 � Resolution & claim**
If won: [Trigger Payout] (or creator triggers it first) ? one tx pays all parties. Alternatively creator/winner triggers it. Funds arrive in wallet.
Final results visible: rank, score breakdown (which groups correct), their tiebreaker vs. winner's. Full prediction reveal for all entries.

**Step 9 � Browse other leagues (unauthenticated)**
Browse Leagues page � no wallet needed. Sort: newest / highest pool / most entries. Filter: chain, token, fee range. Featured leagues row at top. Each card: league name, creator (truncated), fee, pool, entries/max, time to lock.

---

### Screen Inventory (20 screens/components)

| # | Screen / Component | Roles |
|---|---|---|
| 1 | Landing page with live stats + CTAs | All |
| 2 | Browse leagues (filter/sort/featured row) | Player |
| 3 | League detail page | Player, Creator |
| 4 | Connect wallet + compliance modal | All |
| 5 | League creation wizard (3 steps) | Creator |
| 6 | Bonding curve preview chart | Creator |
| 7 | Prediction form (DnD + mobile paginated fallback) | Player |
| 8 | Pick review & submit confirmation | Player |
| 9 | Player dashboard (leagues, rank, live score) | Player |
| 10 | Live leaderboard (per league, real-time) | Player, Creator |
| 11 | Creator dashboard (stats, referral, promote) | Creator |
| 12 | Share card generator | Creator, Player |
| 13 | Dispute filing flow | Player, Creator |
| 14 | Admin � platform settings | Admin |
| 15 | Admin � token whitelist queue | Admin |
| 16 | Admin � league moderation | Admin |
| 17 | Admin � dispute management | Admin |
| 18 | Admin � oracle health & manual post | Admin |
| 19 | Admin � promotions management | Admin |
| 20 | Post-resolution claim + full prediction reveal | Player |

---

## Phase 4: Reverse Brainstorming � How Do We Make This Fail?

*Every failure mode is a defensive design requirement.*

### Smart Contract Failures
- **Malicious token in prize pool:** Fee-on-transfer token whitelisted, transfer tax bleeds prize pool on every entry/payout. ? *Defense: auto-detect + admin flag + staging test all whitelisted tokens before going live*
- **Re-entrancy on payout tx:** Payout function called before state updated. ? *Defense: checks-effects-interactions pattern; use ReentrancyGuard on all payout functions*
- **Integer overflow on bonding curve:** Exponential curve pricing overflows uint256 at high entry counts. ? *Defense: hard cap on curve multiplier; test at 10,000 entries in staging*
- **Frozen league � oracle never posts + grace period expires without admin action:** League permanently frozen, funds locked. ? *Defense: multi-layered oracle fallback (3-tier) + monitoring alerts; worst case: admin always has manual post ability*
- **Admin sets fee to 100%:** Creator + dev fee exceeds 100%, prize pool = 0. ? *Defense: contract-level hard cap (e.g., max 20% combined); validated on-chain, not just in UI*

### Oracle & Data Failures
- **api-football.com returns wrong standings:** Oracle posts bad data on-chain, bad data resolves leagues incorrectly. ? *Defense: dispute window (24h) provided for players to flag; admin can override with correct data*
- **api-football.com is down during cron window:** Oracle never posts. ? *Defense: 3-tier fallback; redundant cron; manual admin posting; grace extension*
- **Cron job posts results for wrong tournament edition:** E.g., stale 2022 data mistakenly fetched. ? *Defense: tournament ID/season parameter hardcoded in cron config; validated against expected group count before posting*

### Business & Economic Failures
- **Creator promotes a fake high-value league:** Creates league with $10,000 prize promise that doesn't exist (prize is entry pool only). ? *Defense: league page always shows "prize pool = total entries � fee minus rake" � no creator-defined prize promise; UI makes this clear*
- **Whale enters 1,000 times in a free league to farm:** Free league with unlimited entries per address is Sybil-trivial. ? *Defense: accepted � free leagues have no monetary prize. Admins can also disable free leagues globally*
- **Creator abandons league after creation:** Minimum threshold not met, refund triggered, creator paid nothing back. ? *Defense: expected behavior � accepted; creation fee is the spam deterrent*
- **Featured league rotation is gamed:** Single actor pays for 100 days of promotion, dominates the featured row. ? *Defense: random rotation among paid slots; display max N featured leagues at once; consider daily slot limit per creator*

### UX & Onboarding Failures
- **New user lands on league page, has no wallet:** Drops off immediately. ? *Defense: prominent "Get a Wallet" helper modal; consider WalletConnect + Coinbase Smart Wallet for embedded onboarding*
- **Player submits incomplete prediction form:** Not all 12 groups ranked, or tiebreaker empty. ? *Defense: [Confirm & Pay] button disabled until 12/12 groups + tiebreaker complete; progress indicator always visible*
- **Player thinks they claimed prize but tx failed silently:** Wallet tx rejected but UI shows success. ? *Defense: tx status polling + explicit success/failure state in UI; never show success until tx confirmed on-chain*
- **Mobile drag-and-drop breaks on a specific browser:** Player can't rank teams on mobile. ? *Defense: mobile always uses forced pagination + dropdowns � DnD is desktop-only*

### Legal & Regulatory Failures
- **User from restricted jurisdiction enters a league:** Self-certification clicked through without reading. ? *Defense: compliance modal per entry (not per session); store with timestamp; expand to geoblocking if regulators require it*
- **Dispute fee confiscation is legally classified as a penalty clause:** In some jurisdictions, penalty clauses in contracts are unenforceable. ? *Defense: frame dispute deposit as a "processing/review fee service charge" not a penalty; legal review before launch*

### Security Failures
- **Admin wallet phished, bad actor calls overrideResults() with wrong data:** Manipulated results settle league incorrectly. ? *Defense: multi-sig admin wallet; overrideResults() emits on-chain event that players can see; dispute window still active post-override*
- **Front-end SQL/NoSQL injection via league name field:** Malicious league name with injection payload stored in DB. ? *Defense: parameterized queries everywhere; input sanitization on all string fields before DB write*
- **Token whitelist request fee payment forged:** Actor submits whitelist request without paying. ? *Defense: payment verified on-chain before request is accepted into queue; contract enforces payment*

---

## Brainstorming Session Complete

**4 Phases completed:**
1. ? Question Storming � 77 questions, all design decisions captured
2. ? Six Thinking Hats � 360� product analysis
3. ? Role Playing � Full Admin, Creator, Player journey maps; 20 screens identified
4. ? Reverse Brainstorming � 20 failure modes documented as defensive requirements

**This session is the input for:**
- Product Requirements Document (PRD)
- Technical Architecture Document
- UX / Design Specification
- Smart Contract Specification
- Risk Register

---

## Addendum: Admin Manual Results Flow (Locked)

### Oracle Fallback � Full Admin Journey

**Trigger:** `resultsPostedAt` is null past `expectedResultsDeadline` on any chain.

**Step 1 � Oracle Health screen**
Admin sees ?? per chain. Clicks [Manually Post Results].

**Step 2 � App pre-fills form from api-football.com**
Backend fetches current tournament standings and populates a 12-group form (same drag-and-drop / dropdown UI as player prediction form, but pre-filled). Admin reviews and corrects any wrong rankings before submitting.

**Step 3 � Admin signs `postResults(groupStandings[12])`**
Results posted on-chain. 24-hour dispute window starts from this timestamp.

**Step 4 � Indexer auto-scores**
Indexer picks up `ResultsPosted` on-chain event. Calculates all player scores across all leagues on that chain (1pt/position, +1 bonus per perfect group, tiebreaker recorded). No admin action needed.

**Step 5 � App surfaces winners**
Oracle Health / Review & Resolve panel shows per-league winner(s), score, tiebreaker, prize pool. Admin (or winner/creator) clicks [Resolve League].

**Step 6 � Resolution tx**
`resolveLeague(leagueId, winner, payoutAmounts[])` � single tx pays winner, creator, dev simultaneously.

### Dispute Override (same flow, scoped)
Dispute filed on Group F ? Admin opens dispute override form ? only Group F is editable, rest locked ? `overrideResults(groupF)` ? indexer recalculates ? new winner surfaced ? resolve.

### Additional Screens Added to Inventory
| # | Screen | Role |
|---|---|---|
| 21 | Manual Post Results form (12 groups pre-filled, editable) | Admin |
| 22 | Review & Resolve panel (winners per league, trigger payout) | Admin |
| 23 | Dispute Override form (scoped to disputed groups only) | Admin |
