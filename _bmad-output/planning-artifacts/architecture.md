---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
status: 'complete'
completedAt: '2026-04-26'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'WorldCup2'
user_name: 'Stinky'
date: '2026-04-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 65 FRs across 11 capability areas — Authentication & Identity, League Discovery & Browsing, League Creation, Prediction Entry, Live Tournament Experience, Oracle & Results, Dispute Resolution, Payout & Resolution, Token Whitelist, Admin Platform Management, Landing Page & Platform Stats.

**Non-Functional Requirements:** 23 NFRs across Performance, Security, Reliability, Scalability, Accessibility, and Integration domains. Architecturally binding NFRs:
- NFR1: Leaderboard refresh within 30s of indexed match result
- NFR3: All UI queries served from indexer DB — zero direct RPC calls for rendering
- NFR6: Commitment hash (keccak256) on-chain — raw predictions never stored on-chain in plaintext
- NFR13: Zero permanently frozen leagues — 3-tier oracle fallback is a hard system requirement
- NFR14: ReentrancyGuard + checks-effects-interactions on all payout functions
- NFR16: Slither static analysis clean (no high-severity findings) before mainnet

**Scale & Complexity:**
- Complexity level: **High** — blockchain/web3, multi-chain EVM, custom oracle, custom indexer, dispute resolution state machine, Merkle payout model
- Primary domain: Full-stack with smart contracts as the core trust layer
- Estimated architectural components: ~8

### Technical Constraints & Dependencies

- **Hard deadline:** World Cup 2026 group stage kick-off (~June 11, 2026) — architecture must bias towards the simplest working solution
- **EVM-only at MVP:** Base, Ethereum, Sonic — one Solidity codebase deployed independently per chain. Solana deferred post-MVP.
- **No formal audit:** Mitigation via Slither + AI-assisted review + comprehensive test suite + mock oracle staging runs
- **No cross-chain state sharing:** Each chain is fully isolated — same contracts, independent deployments, unified indexer
- **Token decimal agnosticism:** All ERC-20 operations must handle arbitrary decimals; USSD (Sonic) explicitly tested
- **No server-side private key:** All admin contract actions require on-chain wallet signature
- **api-football.com v3** is the canonical oracle data source and dispute ground truth

### Cross-Cutting Concerns

- **Multi-chain awareness:** Every component (indexer, oracle cron, admin panel, frontend) must be chain-aware and handle Base/Ethereum/Sonic simultaneously
- **Event-driven state reconstruction:** All system state flows from on-chain events — indexer reliability is critical path for scoring, leaderboard, and payout
- **Gas optimisation as a design principle:** Commitment hash + event-driven audit trail + Merkle root (not full prediction storage) minimises on-chain storage by design
- **Security boundary at Merkle tree:** The off-chain-built, on-chain-posted Merkle payout root is a trust boundary — tree integrity must be verifiable
- **Oracle idempotency:** Primary and redundant crons must both be safe to call simultaneously — no double-posting
- **Immutability contract:** Fee rates locked at league creation — contract and indexer must both enforce and respect this invariant

## Starter Template Decisions

### Project Structure — Multi-Repo Monorepo

WorldCup2 has three distinct sub-projects. Recommended layout:

```
WorldCup2/
├── contracts/        # Hardhat — Solidity smart contracts
├── backend/          # Node.js + TypeScript — indexer, oracle cron, REST API
└── frontend/         # Vite + React + TypeScript — player/creator/admin UI
```

### Contracts — Hardhat

**Starter:** `npx hardhat init` (TypeScript project)

**Architectural decisions provided:**
- Language: Solidity + TypeScript test/deploy scripts
- Test framework: Hardhat + ethers.js / Chai / Mocha
- Static analysis: Slither (run separately as CI step)
- Deployment: Hardhat Ignition or custom deploy scripts per chain
- Network config: `hardhat.config.ts` — Base, Ethereum, Sonic, localhost

**Key dependencies to add:**
- `@openzeppelin/contracts` — ReentrancyGuard, SafeERC20, Ownable
- `hardhat-verify` — contract verification on all block explorers
- `dotenv` — RPC URLs and deployer key per chain (never committed)

### Backend — TypeScript Node.js

**Starter:** Plain `npm init` + TypeScript (no framework overhead)

**Stack decisions:**
- Language: TypeScript (strict mode)
- Runtime: Node.js LTS
- HTTP layer: **Fastify** — lighter than Express, native TypeScript, faster
- DB client: **Prisma** — ORM with migration support over Postgres
- Chain listener: **viem** `watchContractEvent` / polling — TypeScript-native, no ethers dependency
- Job runner: **node-cron** for oracle cron tiers 1 & 2
- Merkle tree: **merkletreejs** + **keccak256** — off-chain tree construction
- Alerting: Telegram Bot API via HTTP — no external service dependency

### Frontend — Vite + React + TypeScript

**Starter:** `npm create rainbowkit@latest` — scaffolds Vite + React + TypeScript + RainbowKit + wagmi + viem in one command

**Architectural decisions provided:**
- Language: TypeScript
- Build tool: Vite (no SSR — pure SPA)
- UI library: React
- Web3: RainbowKit + wagmi + viem

**Key additions:**
- `@tanstack/react-query` — server state, caching, background refetch for leaderboard polling
- `zustand` — lightweight client state (wallet, UI state)
- CSS: **Tailwind CSS** — utility-first, fast to ship
- Drag-and-drop: **@dnd-kit/core** — accessible, touch-friendly, actively maintained

## Core Architectural Decisions

### Data Architecture

- **Database:** PostgreSQL — containerised via Docker, IT-managed on self-hosted servers
- **ORM / Migrations:** Prisma — migrations in `backend/prisma/`, single schema source of truth
- **Caching:** None at MVP — Postgres with proper indexing is sufficient at target scale (1,000 entries, 40 leagues)
- **Leaderboard refresh:** Event-driven — indexer writes updated scores to Postgres on `ResultsPosted` on-chain event; API exposes `lastUpdatedAt` timestamp; frontend re-renders only on timestamp change. No fixed polling — no update if no new game data.
- **Data separation:**
  - On-chain: commitment hash, entry amounts, oracle results, Merkle payout root, token whitelist
  - Off-chain (Postgres): league metadata, plaintext predictions (post-lock reveal), scores, leaderboard, referral stats, compliance signatures, dispute records

### Authentication & Security

- **Player/Creator auth:** Sign-in-with-Ethereum (SIWE) — wallet signs a server-issued nonce; backend verifies signature; issues short-lived session via HTTP-only cookie
- **Admin auth:** Same SIWE flow; backend checks signing wallet against admin whitelist table in Postgres (mirrors on-chain admin list)
- **No server-side private key:** All contract write actions require user wallet signature — backend never holds a signing key
- **API security:** Fastify rate-limit plugin on all public endpoints; Prisma parameterised queries; input sanitisation middleware on all string fields before DB write

### API & Communication

- **Pattern:** REST — `/api/v1/` prefix from day one
- **Internal architecture:** Indexer, oracle cron, and API are co-located Node.js services sharing the same Postgres DB — no internal HTTP between them
- **Error responses:** Consistent `{ error: string, code: string }` shape on all 4xx/5xx
- **Leaderboard endpoint:** Returns payload + `lastUpdatedAt` — clients decide whether to re-render

### Infrastructure & Deployment

- **Hosting:** Self-hosted servers (IT-managed)
- **Database:** Docker container (Postgres) — IT handles provisioning and backups
- **Frontend:** Static Vite build served via Nginx on self-hosted
- **Backend:** Node.js process, self-hosted — IT manages via PM2 or systemd
- **Contract deployment:** Hardhat deploy scripts per chain — developer runs manually; deployer keys in `.env.base`, `.env.ethereum`, `.env.sonic` (never committed)
- **CI/CD:** Deferred to IT preference

### Deferred Decisions (Post-MVP)

- Redis / caching layer — revisit if leaderboard query times degrade under load
- Horizontal Postgres scaling — read replicas if volume exceeds projections (NFR17)
- CDN for frontend static assets

## Implementation Patterns & Consistency Rules

### Naming Conventions

**Database (Postgres / Prisma):**
- Tables: `snake_case` plural — `leagues`, `entries`, `disputes`, `whitelist_tokens`
- Columns: `snake_case` — `entry_fee`, `league_id`, `created_at`
- Foreign keys: `{table_singular}_id` — `league_id`, `player_address`
- Indexes: `idx_{table}_{column}` — `idx_entries_league_id`
- Timestamps: always `created_at` / `updated_at` (Prisma `@default(now())` / `@updatedAt`)

**API Endpoints:**
- Plural nouns: `/api/v1/leagues`, `/api/v1/entries`, `/api/v1/disputes`
- Route params: `/:id` or `/:leagueId` — camelCase param names
- Query params: `camelCase` — `?entryToken=`, `?chainId=`
- No verbs in URLs — use HTTP method to express action

**TypeScript (backend + frontend):**
- Files: `camelCase.ts` for utilities/services, `PascalCase.tsx` for React components
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase` — `LeagueEntry`, `OracleResult`
- Constants: `UPPER_SNAKE_CASE` — `MAX_ENTRIES`, `DISPUTE_WINDOW_HOURS`
- Solidity: follows Solidity style guide — `PascalCase` contracts, `camelCase` functions, `UPPER_SNAKE_CASE` constants

**React components:**
- File: `ComponentName.tsx` collocated with `ComponentName.test.tsx`
- One component per file
- Named exports (not default) for all components

### API Response Format

All API responses follow a consistent envelope:

```typescript
// Success
{ data: T, meta?: { lastUpdatedAt?: string, total?: number } }

// Error
{ error: string, code: string }
```

HTTP status codes: `200` success, `201` created, `400` bad request, `401` unauthenticated, `403` forbidden, `404` not found, `422` validation error, `500` server error.

### Error Handling Patterns

- **Backend:** All async route handlers wrapped in try/catch; errors thrown as `AppError(message, code, statusCode)`; global Fastify error handler formats to `{ error, code }`
- **Frontend:** React Query handles loading/error states; component-level error boundaries for page-level failures; never show raw error objects to users — map codes to user-friendly messages
- **Contract errors:** Parse revert reasons from viem `ContractFunctionRevertedError`; map to user-facing messages in a `contractErrors.ts` mapping file

### On-Chain / Off-Chain Boundary Rules

- **Never** read prediction plaintext from on-chain — always from Postgres
- **Never** calculate scores in the API layer — scores come from indexer writes only
- **Never** post the Merkle root from the API layer — only the indexer service does this after verifying the dispute window
- **Always** verify on-chain state before trusting Postgres state for fund-critical operations (claims, refunds)

### Smart Contract Patterns

- All payout/refund/claim functions: `ReentrancyGuard` + checks-effects-interactions
- Storage: commitment hash only per entry — no raw prediction arrays on-chain
- Events emitted on every state transition (used by indexer as source of truth)
- `setResultsForTesting()` function on oracle contract — staging/mock only, gated by a `testingMode` flag set at deploy time
- Fee cap enforced on-chain: `require(creatorFee + devFee <= MAX_FEE_BPS)` — not just UI validation

### Frontend State Rules

- **Server state** (leagues, entries, leaderboard, scores): `@tanstack/react-query` — never duplicated in Zustand
- **Client/UI state** (wallet connection status, modals, form progress): `zustand`
- **No prop drilling beyond 2 levels** — use Zustand store or React context
- **Wallet address** is the user identifier everywhere — no user ID concept

### Enforcement

All AI agents implementing stories **MUST**:
- Follow `snake_case` for DB, `camelCase` for API params and TypeScript, `PascalCase` for types and React components
- Use the `{ data, meta }` / `{ error, code }` response envelope on every endpoint
- Emit a contract event on every state-mutating function
- Write scores to Postgres only from the indexer — never from API routes
- Never store PII — wallet address + leagueId + timestamp only for compliance records

## Project Structure & Boundaries

### Complete Project Directory Structure

```
WorldCup2/
├── README.md
├── docker-compose.yml              # Postgres container for local dev + IT reference
├── .gitignore
│
├── contracts/                      # Hardhat — Solidity smart contracts
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                # RPC_URL_BASE, RPC_URL_ETHEREUM, RPC_URL_SONIC, DEPLOYER_KEY
│   ├── contracts/
│   │   ├── LeagueFactory.sol       # Admin whitelist, global fee params, creates League instances
│   │   ├── League.sol              # Per-league: entry, commitment hash, state machine, Merkle claim
│   │   ├── OracleController.sol    # Posts group results on-chain, expectedResultsDeadline
│   │   └── WhitelistRegistry.sol   # Token whitelist — one deployment per chain, no chainId param
│   │                              # Extended in Epic 9: submitRequest (fee escrow), approveRequest,
│   │                              # rejectRequest (auto-refund). Constructor adds feeToken + requestFee.
│   ├── scripts/
│   │   ├── deploy-base.ts
│   │   ├── deploy-ethereum.ts
│   │   ├── deploy-sonic.ts
│   │   └── helpers.ts              # Shared deploy utilities
│   └── test/
│       ├── League.test.ts          # Full state machine, entry, dispute, Merkle claim
│       ├── OracleController.test.ts
│       ├── WhitelistRegistry.test.ts
│       └── fixtures/               # Shared fixtures, mock oracle (setResultsForTesting)
│
├── backend/                        # Node.js + TypeScript — indexer, oracle, API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                # DATABASE_URL, RPC_URL_*, TELEGRAM_BOT_TOKEN, API_PORT
│   ├── prisma/
│   │   ├── schema.prisma           # Single schema for all chains + all domains
│   │   └── migrations/
│   └── src/
│       ├── index.ts                # Entry point — starts indexer, oracle crons, API server
│       ├── config.ts               # Env vars, chain configs, contract addresses per chain
│       ├── db.ts                   # Prisma client singleton
│       │
│       ├── indexer/                # On-chain event listeners → Postgres writes
│       │   ├── index.ts            # Starts listeners for Base, Ethereum, Sonic
│       │   ├── listeners/
│       │   │   ├── entrySubmitted.ts    # EntrySubmitted event → write entry row
│       │   │   ├── resultsPosted.ts     # ResultsPosted event → score all entries, update leaderboard
│       │   │   ├── disputeFiled.ts      # DisputeFiled event → write dispute row
│       │   │   └── leagueResolved.ts    # LeagueResolved event → update league status
│       │   └── scoring/
│       │       ├── scorer.ts            # Score predictions: 1pt/position + 1pt perfect group bonus
│       │       └── merkleBuilder.ts     # Build Merkle payout tree, post root on-chain
│       │
│       ├── oracle/                 # Oracle cron services
│       │   ├── cron-primary.ts     # Tier 1: auto-post after last group stage match
│       │   ├── cron-redundant.ts   # Tier 2: redundant independent cron (idempotent)
│       │   ├── apifootball.ts      # api-football.com v3 client
│       │   ├── poster.ts           # On-chain result posting (used by crons + admin manual)
│       │   └── alerts.ts           # Telegram webhook alert on deadline miss
│       │
│       ├── api/                    # Fastify REST API — /api/v1/
│       │   ├── server.ts           # Fastify setup: rate-limit, cors, global error handler
│       │   ├── routes/
│       │   │   ├── auth.ts             # POST /auth/nonce, POST /auth/verify (SIWE)
│       │   │   ├── leagues.ts          # GET /leagues, GET /leagues/:id, GET /leagues/featured
│       │   │   ├── entries.ts          # POST /entries, GET /entries/:leagueId
│       │   │   ├── leaderboard.ts      # GET /leaderboard/:leagueId (+ lastUpdatedAt)
│       │   │   ├── disputes.ts         # POST /disputes, GET /disputes/:leagueId
│       │   │   ├── whitelist.ts        # GET /whitelist, POST /whitelist/vote (vote tally in Postgres only)
│       │   │   ├── stats.ts            # GET /stats — TVL, active leagues, player count
│       │   │   └── admin/
│       │   │       ├── settings.ts     # Platform params (fee %, min entry, free league toggle)
│       │   │       ├── oracle.ts       # Oracle health, pre-filled manual post payload
│       │   │       ├── disputes.ts     # Dispute queue actions (accept/dismiss/refund-all)
│       │   │       ├── leagues.ts      # League moderation (warn/pause/close/dismiss)
│       │   │       └── whitelist.ts    # Approve/reject: provides on-chain tx payload for admin to sign
│       │   └── middleware/
│       │       ├── auth.ts             # SIWE session verification
│       │       ├── adminOnly.ts        # Admin whitelist check
│       │       └── sanitize.ts         # Input sanitisation on all string fields
│       │
│       └── shared/
│           ├── types.ts                # Shared TypeScript types (ChainId, LeagueStatus…)
│           ├── constants.ts            # DISPUTE_WINDOW_HOURS, MAX_FEE_BPS, UNCLAIMED_EXPIRY_DAYS
│           └── utils.ts                # Address formatting, decimal handling
│
└── frontend/                       # Vite + React + TypeScript + RainbowKit
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── index.html
    ├── .env.example                # VITE_API_URL, VITE_CHAIN_IDS, contract addresses per chain
    ├── public/flags/               # Public-domain country flag SVGs
    └── src/
        ├── main.tsx                # App entry — RainbowKit + wagmi + React Query providers
        ├── App.tsx                 # Router setup
        ├── config/
        │   ├── chains.ts           # Supported chains + RPC config
        │   ├── contracts.ts        # Contract addresses per chain
        │   └── queryClient.ts      # React Query client config
        ├── pages/
        │   ├── Landing.tsx         # FR61 — live stats, primary CTAs
        │   ├── Browse.tsx          # FR6–9 — league list, filter/sort/featured row
        │   ├── LeagueDetail.tsx    # FR10 — league info, entry CTA
        │   ├── PredictionForm.tsx  # FR17–24 — group rankings, tiebreaker, Polymarket widget
        │   ├── Leaderboard.tsx     # FR25–26 — live rank + score breakdown
        │   ├── PlayerDashboard.tsx # FR25, FR48 — active/past leagues, history
        │   ├── CreatorDashboard.tsx# FR27–29 — stats, referral link, league status
        │   ├── DisputeFlow.tsx     # FR35–36 — file dispute
        │   ├── ClaimPayout.tsx     # FR44–46 — Merkle proof claim
        │   ├── Whitelist.tsx       # FR49–50 — submit request + community upvote queue
        │   └── admin/
        │       ├── AdminLayout.tsx
        │       ├── Settings.tsx    # FR55
        │       ├── OracleHealth.tsx# FR59
        │       ├── Disputes.tsx    # FR37–40
        │       ├── Leagues.tsx     # FR56–58, FR60
        │       ├── Whitelist.tsx   # FR51–54
        │       └── Promotions.tsx  # FR15, FR58
        ├── components/
        │   ├── ui/                 # Reusable design system: Button, Modal, Badge, Table…
        │   ├── prediction/
        │   │   ├── GroupPanel.tsx      # Single group ranking (DnD desktop + dropdown mobile)
        │   │   ├── TiebreakerInput.tsx
        │   │   └── PolymarketWidget.tsx # FR22
        │   ├── league/
        │   │   ├── LeagueCard.tsx
        │   │   ├── LeagueStatusBadge.tsx
        │   │   └── FeeBreakdown.tsx
        │   ├── leaderboard/
        │   │   └── LeaderboardTable.tsx
        │   ├── wallet/
        │   │   ├── ConnectButton.tsx   # RainbowKit wrapper + "Get a Wallet" helper (FR2)
        │   │   └── IdentityDisplay.tsx # FR3 — ENS/Basename/truncated address + avatar
        │   └── compliance/
        │       └── ComplianceModal.tsx # FR23
        ├── hooks/
        │   ├── useLeagues.ts       # React Query — league data
        │   ├── useLeaderboard.ts   # React Query — leaderboard + lastUpdatedAt
        │   ├── useEntry.ts         # wagmi — write entry to contract
        │   ├── useClaim.ts         # wagmi — Merkle claim
        │   ├── useAuth.ts          # SIWE auth flow
        │   └── useAdmin.ts         # Admin status check against API
        ├── store/
        │   └── ui.ts               # Zustand — modal state, active chain, form progress
        ├── lib/
        │   ├── api.ts              # Typed API client (fetch wrapper for /api/v1/)
        │   ├── contractErrors.ts   # Revert reason → user-facing message map
        │   ├── merkle.ts           # Client-side Merkle proof verification
        │   └── formatting.ts       # Currency, address, date display formatting
        └── types/
            └── index.ts            # Shared frontend TypeScript types
```

### Architectural Boundaries

| Boundary | Rule |
|---|---|
| **UI → Chain** | Only wagmi contract writes (entry, claim) go direct to chain. All reads go via `/api/v1/`. |
| **API → DB** | API routes are read-only on leaderboard/scores tables. Only indexer writes scores. |
| **Indexer → Postgres** | `resultsPosted.ts` listener is the only writer to leaderboard and score tables. |
| **Oracle → Chain** | `oracle/poster.ts` posts results on-chain. Oracle never writes to Postgres directly — indexer picks up the emitted event. |
| **Admin → Chain** | Admin on-chain actions (postResults, overrideResults) are wallet-signed in the browser. Backend provides the pre-filled payload; never signs on behalf of admin. |

### FR-to-Structure Mapping Summary

| FR Range | Capability | Backend Route | Frontend Page |
|---|---|---|---|
| FR1–5 | Auth & Identity | `api/routes/auth.ts` | `ConnectButton`, `IdentityDisplay` |
| FR6–11 | Browse & Discovery | `api/routes/leagues.ts` | `Browse.tsx`, `LeagueDetail.tsx` |
| FR12–16 | League Creation | `api/routes/leagues.ts` (POST) | `CreatorDashboard.tsx` |
| FR17–24 | Prediction Entry | `api/routes/entries.ts` | `PredictionForm.tsx` |
| FR25–29 | Live Experience | `api/routes/leaderboard.ts` | `Leaderboard.tsx`, `CreatorDashboard.tsx` |
| FR30–34 | Oracle & Results | `oracle/` services | `admin/OracleHealth.tsx` |
| FR35–41 | Dispute Resolution | `api/routes/disputes.ts` | `DisputeFlow.tsx`, `admin/Disputes.tsx` |
| FR42–48, FR63 | Payout & Resolution | `indexer/scoring/merkleBuilder.ts` | `ClaimPayout.tsx` |
| FR49–54 | Token Whitelist | `WhitelistRegistry.sol` (request + fee escrow on-chain, Epic 9); indexer indexes `RequestSubmitted`/`RequestApproved`/`RequestRejected` events; FR50 votes stored in Postgres only (no on-chain vote storage — gas cost with no contract logic benefit) | `Whitelist.tsx`, `admin/Whitelist.tsx` |
| FR55–60 | Admin Management | `api/routes/admin/*` | `admin/*` pages |
| FR61–62 | Landing & Stats | `api/routes/stats.ts` | `Landing.tsx` |

## Architecture Validation Results

### Coherence Validation ✅

- All technology choices are compatible — Hardhat + viem + wagmi + Prisma + Fastify form a consistent TypeScript-first stack
- No ethers.js / viem split — viem used throughout backend and frontend
- Naming conventions are internally consistent and match each library’s own conventions
- Project structure maps cleanly to responsibility boundaries with no overlapping ownership

### Requirements Coverage Validation ✅

**All 63 core FRs** have a traceable file/route/component in the project structure.

**Architecturally binding NFRs covered:**

| NFR | Architectural Support |
|---|---|
| NFR1 — 30s leaderboard refresh | `resultsPosted.ts` listener writes on event; `lastUpdatedAt` on leaderboard API response |
| NFR3 — no RPC for UI reads | API boundary enforces all reads go via `/api/v1/` |
| NFR6 — commitment hash | `League.sol` stores `keccak256` only; plaintext stored in Postgres after lock reveal |
| NFR7 — parameterised queries | Prisma enforces this by design — no raw SQL surface |
| NFR9 — no server private key | Admin routes provide payload; wallet signs in browser |
| NFR13 — no frozen leagues | 3-tier oracle in `oracle/` + `alerts.ts` + admin manual path all present |
| NFR14 — reentrancy | `League.sol` patterns enforced; Hardhat test fixtures validate |
| NFR16 — Slither | Run on `contracts/` as pre-deploy step |

### Gap Analysis

| Priority | Gap | Resolution |
|---|---|---|
| 🟡 Minor | `LeagueCreationWizard` not explicitly listed | Lives in `CreatorDashboard.tsx`; extract to `components/league/LeagueCreationWizard.tsx` when implementing |
| 🟡 Minor | Frontend `test/` directory not listed | Add `frontend/test/components/` and `frontend/test/hooks/` at implementation time |

No critical or blocking gaps found.

### Architecture Completeness Checklist

- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed
- [x] Technical constraints and hard deadline identified
- [x] Cross-cutting concerns mapped
- [x] Technology stack fully specified (Hardhat, Node.js/TS, Vite/React/RainbowKit)
- [x] Integration patterns defined (SIWE, wagmi writes, REST reads)
- [x] Performance considerations addressed (event-driven leaderboard, NFR3 boundary)
- [x] Naming conventions established
- [x] Structure patterns and communication patterns documented
- [x] Process patterns (error handling, on-chain/off-chain boundary rules) documented
- [x] Complete directory structure defined
- [x] FR-to-structure mapping complete for all 63 core FRs

### Overall Status: ✅ READY FOR IMPLEMENTATION

**Confidence: High.** All 63 core FRs have a traceable implementation location. All architecturally binding NFRs have a design-level mitigation. The commitment hash + event-driven + Merkle payout pattern is fully supported by the chosen stack.

**First implementation action:** `npx hardhat init` inside `contracts/` — smart contracts are the highest-risk component (security, gas, correctness) and must be developed and fully tested before backend or frontend work begins.
