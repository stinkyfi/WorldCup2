# Story 1.6: Contract Test Suite & Slither

Status: done

## Story

As a developer,
I want a comprehensive test suite covering all contracts with high line coverage and a documented Slither path,
So that the contract suite is verifiably secure before staging deployment.

## Acceptance Criteria

1. **Given** all four production contracts are implemented (Stories 1.2–1.5) **When** `npm test` is run in `contracts/` **Then** all tests pass and coverage shows ≥90% **line** coverage for each of `League.sol`, `LeagueFactory.sol`, `OracleController.sol`, and `WhitelistRegistry.sol` (enforced by `npm run check:coverage`).

2. **Given** edge-case scenarios **When** tests cover boundary conditions (zero fees, lock-after-open window, fee-on-transfer behaviour, dust Merkle payout, refunding threshold, failed ETH forward to dev wallet) **Then** those tests pass.

3. **Given** Slither is run against the project **When** the crytic-compile + Hardhat 3 toolchain is compatible **Then** no high-severity findings; mediums documented in `contracts/slither-notes.md`. Until then, `slither-notes.md` records the HH3 artifact blocker and mitigations (tests + coverage).

4. **Given** a malicious ERC-20 attempts re-entrancy on `League.claimPrize` / `claimRefund` **When** the attack tests run **Then** the nested call reverts (ReentrancyGuard) and funds are not double-spent.

## Tasks / Subtasks

- [x] Add Story 1.6 security & edge-case tests (`contracts/test/story16-security-and-edges.test.ts`)
- [x] Add mocks: `MaliciousReentrantERC20`, `RejectingEthReceiver`, `FeeOnTransferERC20`
- [x] Add `npm run test:coverage` and `npm run check:coverage` (≥90% line on four production contracts)
- [x] Add `npm run slither` wrapper + `contracts/slither-notes.md` (HH3 / crytic-compile status)
- [x] Ignore `coverage/` output in `contracts/.gitignore`
- [x] `npm test` and `npm run check:coverage` exit 0

## Dev Notes

- **Branch coverage (≥85% per epic):** Hardhat 3 Solidity coverage for this project does not emit branch counters in `lcov.info`. Line coverage and targeted security tests are the enforced gates until Slither (or another tool) runs on HH3 artifacts.
- **Slither:** `crytic-compile` fails on `_format: hh3-artifact-1"` — see `contracts/slither-notes.md`.

## Dev Agent Record

### Implementation Plan

- Extended tests for constructor zero-address paths, `DevWalletTransferFailed`, lock window, fee-on-transfer documentation, 1-wei Merkle claim, `sweepUnclaimed` zero-balance path, `setGlobalParams(0,0,…)`.
- Re-entrancy probes via `MaliciousReentrantERC20` calling `claimPrize` / `claimRefund` from `ERC20._update` after transfer (nested `nonReentrant` reverts).

### Completion Notes

- 104 `node:test` cases passing; production contracts at **100%** line coverage under `check:coverage`.
- Slither documented as blocked on HH3; `npm run slither` exits non-zero until upstream fix (launcher tries `python`, `python3`, `py -3`).

## File List

- `contracts/contracts/mocks/MaliciousReentrantERC20.sol`
- `contracts/contracts/mocks/RejectingEthReceiver.sol`
- `contracts/contracts/mocks/FeeOnTransferERC20.sol`
- `contracts/test/story16-security-and-edges.test.ts`
- `contracts/scripts/check-coverage.mjs`
- `contracts/scripts/run-slither.mjs`
- `contracts/slither-notes.md`
- `contracts/package.json`
- `contracts/.gitignore`

## Change Log

- **2026-04-27:** Story 1.6 — security/edge tests, coverage gate, Slither wrapper + notes, gitignore `coverage/`.
- **2026-04-27:** Code review — branch-coverage gap deferred (see Review Findings); post-review: `run-slither.mjs` tries `python3` / `py -3` / `python`.
- **2026-04-27:** Story and sprint marked **done** after review option 1; `run-slither.mjs` launcher hardening.

### Review Findings

- [x] [Review][Defer] Epic branch-coverage target (≥85%) is not emitted by Hardhat 3 Solidity coverage in this repo (`lcov` has no `BRDA`); enforced substitute is line coverage + security tests — see Dev Notes [contracts/scripts/check-coverage.mjs]

- [x] [Review][Patch] `run-slither.mjs` tries `python` / `python3` / `py -3` and skips missing-interpreter noise — applied 2026-04-27 [contracts/scripts/run-slither.mjs]
