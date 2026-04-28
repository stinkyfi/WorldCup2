## Story 6.6: Full Prediction History Post-Resolution

### Summary
Players visiting **`/league/:address/enter`** after the league contract has a **non-zero Merkle root** see their **final rank/score**, **full group breakdown** (predicted vs actual, points, tiebreaker), **Share result**, and a stub **Claim prize** flow when rank is within a placeholder band.

### Resolution gate
- **On-chain**: `League.merkleRoot() !== bytes32(0)` (same moment `state` becomes `Resolved` in the contract).
- **Dispute window**: Epic 7 UI is not wired yet; once disputes exist, we can tighten this gate (e.g. hide payouts until disputes close).

### Frontend
- **`LeagueEntryPage`**: Reads `merkleRoot`; when set, swaps the fee/compliance entry UI for **`ResolvedEntrySection`** — leaderboard subset for the wallet, optional multi-entry selector, **`fetchLeaderboardBreakdown`** reuse.
- **`LeaderboardBreakdownGrid`**: Shared breakdown UI extracted from **`LeagueLeaderboardPage`**.
- **`leagueAbi`**: Added `merkleRoot()`, `merkleRootSetAt()` for reads.
- **`LeagueClaimPlaceholderPage`** + route **`/league/:address/claim`** (Epic 8 replaces content).

### Claim prize placeholder
- **Claim prize** shows when **`rank ≤ 10`** (`PLACEHOLDER_PRIZE_RANK_CAP`). Epic 8 should replace this with Merkle-backed eligibility.

### Share result
- Uses **`navigator.share`** when available; otherwise copies **`DegenDraft — {title}`**, rank/score line, and deep link to the entry URL (preserves `entryId` query param when present).

### Backend
- Reuses existing **`GET /api/v1/leaderboard`** and **`GET /api/v1/leaderboard/breakdown`** (no new routes).

### Notes / Follow-ups
- Replace placeholder prize rank cap with indexer/Merkle eligibility when Epic 8 lands.
- Optional: authenticated breakdown scoped to session wallet only (privacy).
