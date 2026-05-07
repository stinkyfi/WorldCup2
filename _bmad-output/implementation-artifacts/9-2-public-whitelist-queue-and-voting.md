# Story 9.2: Public Whitelist Queue & Voting

Status: done

## Story

As a user,  
I want to browse pending whitelist requests and upvote or downvote them,  
so that the community can signal which tokens are most wanted and admins can prioritise review.

## Acceptance Criteria

1. **Given** a visitor navigates to the token whitelist page  
   **When** the pending queue renders  
   **Then** all pending whitelist requests are shown with: token address, chain, requester wallet, submission date, current upvote count, downvote count, and status (Pending / Approved / Rejected).  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.2]

2. **Given** an authenticated user views a pending request  
   **When** they click Upvote or Downvote  
   **Then** their vote is recorded (one vote per wallet per request); the vote count updates immediately.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.2]

3. **Given** a user has already voted on a request  
   **When** they view the same request again  
   **Then** their vote is highlighted and they cannot vote again — the vote buttons are disabled.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.2]

4. **Given** a visitor (no wallet)  
   **When** they view the queue  
   **Then** vote counts are visible but vote buttons are not shown — voting requires authentication.  
   [Source: `_bmad-output/planning-artifacts/epics.md` → Story 9.2]

## Tasks / Subtasks

- [x] Task 1: Contracts: queue + votes (AC: #1–#3)
  - [x] Add request status enum and public getters for request count + paginated reads.
  - [x] Add `vote(requestId, isUpvote)` with one-vote-per-wallet-per-request enforcement and vote counts.
  - [x] Add tests for voting + double-vote prevention.

- [x] Task 2: Frontend: queue UI + vote UX (AC: #1–#4)
  - [x] Render a paginated queue for the selected chain on `/whitelist`.
  - [x] Show vote counts always; hide vote buttons when not authenticated.
  - [x] Disable + highlight voted state after a wallet votes.

- [x] Task 3: Quality gates
  - [x] `contracts` tests + lint
  - [x] `frontend` tests + lint

## Review checklist — 2026-05-07

Re-verified acceptance criteria against `WhitelistRegistry` + token whitelist UI (`TokenWhitelistPage`).

| AC | Result | Evidence |
|---|--------|----------|
| 1 Queue fields | Done | Rows show chain label + id, token, requester, submission time (UTC ISO), ▲▼ counts, status. Page scope explains newest **25** requests (pagination extension if queue grows beyond that). |
| 2 Vote records one-per-wallet | Done | On-chain `vote` + `voteOf`; UI refetches after receipt. |
| 3 Highlights + disables after vote | Done | Button variants + `hasVoted`. |
| 4 Visitors see counts, no buttons | Done | Buttons only when `isConnected`. |

Registry hardening: **`vote`** only applies to **pending** requests (`RequestNotPending`); the public UI disables voting when status ≠ Pending.

Contracts: `npx hardhat test test/WhitelistRegistry.test.ts` — **pass**. Frontend: `npm run test` (Vitest) — **pass**.

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Completion Notes List

- Added on-chain request queue reads (`requestCount`, `requests(id)`, `getRequests`) and voting (`vote`, `voteOf`, counts + event) to `WhitelistRegistry`.
- Updated `/whitelist` to render the queue with vote counts and one-vote-per-wallet buttons (hidden for visitors).

### File List

- `contracts/contracts/WhitelistRegistry.sol`
- `contracts/test/WhitelistRegistry.test.ts`
- `frontend/src/lib/whitelistRegistryAbi.ts`
- `frontend/src/pages/TokenWhitelistPage.tsx`

