# Story 1.3: OracleController.sol

Status: done

## Story

As a platform oracle,
I want an `OracleController` contract that manages authorised result posters, group result storage, and grace period logic,
So that group stage results can be posted on-chain by authorised crons or admin and subsequently consumed by `League.sol`.

## Acceptance Criteria

1. **Given** the contract is deployed with an authorised oracle address **When** the oracle calls `postResults(uint8 groupId, address[4] rankings)` after match completion **Then** the results are stored, a `ResultsPosted(groupId, rankings)` event is emitted, and `getResults(groupId)` returns the correct rankings.

2. **Given** results already posted for a group **When** the oracle calls `postResults` again for the same group **Then** the transaction is idempotent — it succeeds if data matches, reverts with `ResultsAlreadyPosted` if data conflicts.

3. **Given** the contract is deployed with `stagingMode = true` **When** a developer calls `setResultsForTesting(uint8 groupId, address[4] rankings)` **Then** results are set without oracle auth check (staging-only mock).

4. **Given** `stagingMode = false` (production deploy) **When** anyone calls `setResultsForTesting` **Then** the transaction reverts.

5. **Given** a configured grace period has passed without results posted **When** an admin calls `extendGracePeriod(uint8 groupId, uint256 additionalSeconds)` **Then** the deadline extends and a `GracePeriodExtended` event is emitted.

6. **Given** a non-authorised address **When** they call `postResults` **Then** the transaction reverts with `UnauthorisedOracle`.

## Tasks / Subtasks

- [x] Task 1: Write `OracleController.sol` (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `contracts/contracts/OracleController.sol`
  - [x] Import and inherit OZ v5 `Ownable` — constructor takes `address initialOwner` (OZ v5 syntax)
  - [x] Constructor: `(address initialOwner, address oracle_, bool stagingMode_)` — sets `oracle`, `stagingMode` (`immutable`) and calls `Ownable(initialOwner)`
  - [x] State variables: `oracle` (public address), `stagingMode` (public immutable bool), `mapping(uint8 => address[4]) private _results`, `mapping(uint8 => bool) private _resultsPosted`, `mapping(uint8 => uint256) public expectedDeadline`
  - [x] `onlyOracle` modifier: `if (msg.sender != oracle) revert UnauthorisedOracle(msg.sender)`
  - [x] `postResults(uint8 groupId, address[4] calldata rankings) external` with `onlyOracle`: idempotency check then store + emit `ResultsPosted`
  - [x] `getResults(uint8 groupId) external view returns (address[4] memory)`
  - [x] `hasResultsPosted(uint8 groupId) external view returns (bool)`
  - [x] `setResultsForTesting(uint8 groupId, address[4] calldata rankings) external`: revert `NotStagingMode` if `!stagingMode`, else store + emit `ResultsPosted`
  - [x] `extendGracePeriod(uint8 groupId, uint256 additionalSeconds) external onlyOwner`: `expectedDeadline[groupId] += additionalSeconds`, emit `GracePeriodExtended`
  - [x] `setGroupDeadline(uint8 groupId, uint256 timestamp) external onlyOwner`: sets initial deadline for a group
  - [x] Events: `ResultsPosted(uint8 indexed groupId, address[4] rankings)`, `GracePeriodExtended(uint8 indexed groupId, uint256 newDeadline)`
  - [x] Custom errors: `UnauthorisedOracle(address caller)`, `ResultsAlreadyPosted(uint8 groupId)`, `NotStagingMode()`
  - [x] `npx hardhat compile` exits 0

- [x] Task 2: Add fixtures to `contracts/test/fixtures/index.ts` (AC: all)
  - [x] Add `deployOracleController()`: deploys with `stagingMode = false`; `oracle = otherAccounts[0]`; returns `{ oracleController, owner, oracle, otherAccounts, connection }`
  - [x] Add `deployOracleControllerStaging()`: deploys with `stagingMode = true`; same oracle setup; returns same shape
  - [x] Keep all existing `deployWhitelistRegistry` export intact — do not break Story 1.2 tests

- [x] Task 3: Write `contracts/test/OracleController.test.ts` (AC: #1–#6)
  - [x] Import `describe`, `it` from `"node:test"`, `assert` from `"node:assert/strict"`
  - [x] Import both fixtures from `"./fixtures/index.js"` (`.js` required — NodeNext ESM)
  - [x] Test AC1: oracle posts results → `getResults(groupId)` returns exact rankings; test block-scoped `ResultsPosted` event
  - [x] Test AC2 (idempotent same data): oracle posts same group twice → second call succeeds, no error
  - [x] Test AC2 (conflicting data): oracle posts different rankings for same group → reverts with `ResultsAlreadyPosted`
  - [x] Test AC3 (staging): `setResultsForTesting` sets results; `getResults` returns them; no auth check needed
  - [x] Test AC4 (production): `setResultsForTesting` called on production instance → reverts with `NotStagingMode`
  - [x] Test AC5: owner extends grace period → `expectedDeadline[groupId]` increases; block-scoped `GracePeriodExtended` event
  - [x] Test AC5 (non-owner): non-owner calls `extendGracePeriod` → reverts with `OwnableUnauthorizedAccount`
  - [x] Test AC6: non-oracle address calls `postResults` → reverts with `UnauthorisedOracle`
  - [x] Test `hasResultsPosted`: returns false before posting, true after

- [x] Task 4: Verify (AC: all)
  - [x] `npx hardhat compile` exits 0 with no warnings
  - [x] `npm test` exits 0 — all OracleController tests AND all WhitelistRegistry tests pass

### Review Findings

- [x] [Review][Decision] B1 — `oracle` address not rotatable: added `setOracle(address newOracle) external onlyOwner` with zero-address guard. Oracle rotation now possible without redeployment.
- [x] [Review][Decision] E4 — `getResults` returns silent zero-address array for unposted groups: added `ResultsNotPosted(uint8 groupId)` revert in `getResults`. Callers cannot accidentally misread unposted groups.
- [x] [Review][Patch] B4 — Zero-address guard on `oracle_` constructor param: added `if (oracle_ == address(0)) revert InvalidAddress()` in constructor.
- [x] [Review][Defer] B2+E2 — `extendGracePeriod` before `setGroupDeadline` silently creates a past deadline; zero-second extend emits spurious event [OracleController.sol:106–111] — deferred, pre-existing design limitation acceptable for MVP
- [x] [Review][Defer] B3+E1 — `setResultsForTesting` allows silent overwrite in staging with no idempotency guard, inconsistent with production behaviour [OracleController.sol:96–101] — deferred, staging-only and intentional

## Dev Notes

### ⚠️ Hardhat 3 — This Project Uses ESM (NOT CommonJS)

Same rules as Story 1.2 — do not deviate:

- All TypeScript files compile to ESM — use `import`/`export`, never `require()`
- `tsconfig.json` uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
- **All relative imports in `.ts` files MUST use `.js` extension** — e.g. `import { deployOracleController } from "./fixtures/index.js"`. NodeNext ESM resolves `.js` → `.ts` at compile time.
- Bare module imports (e.g. `import hre from "hardhat"`) do NOT need `.js`

### ⚠️ Hardhat 3 — Viem Lives on `NetworkConnection`, NOT on `hre`

`hre.viem` does not exist in Hardhat 3. Pattern used throughout this project:

```typescript
const connection = await hre.network.getOrCreate();
const [owner, oracle, ...otherAccounts] = await connection.viem.getWalletClients();
const oracleController = await connection.viem.deployContract("OracleController", [
  owner.account.address,
  oracle.account.address,
  false,
]);
```

`hre.network.connect()` is also deprecated — always use `getOrCreate()`.

### ⚠️ Hardhat 3 — No `loadFixture`

`loadFixture` is not exported from any Hardhat 3 package. Call the fixture function directly inside each `it()` block. Each call deploys a fresh contract instance, giving isolated state per test.

```typescript
it("oracle can post results", async () => {
  const { oracleController, oracle } = await deployOracleController();
  // ... test body
});
```

### OZ v5 — Critical Syntax

**Ownable constructor:**
```solidity
constructor(address initialOwner, address oracle_, bool stagingMode_) Ownable(initialOwner) {
    oracle = oracle_;
    stagingMode = stagingMode_;     // immutable — assigned once in constructor
}
```

**`immutable` for `stagingMode`:**  
Declaring `stagingMode` as `immutable` prevents any future mutation and is cheaper to read than a regular `storage` variable. The deploy-time `stagingMode` value is embedded in bytecode.

**OZ v5 error name for Ownable:**  
`OwnableUnauthorizedAccount(address account)` — not the v4 string revert. Tests should match on `"OwnableUnauthorizedAccount"` string fragment.

### Solidity Design: `OracleController.sol`

**Complete implementation outline:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OracleController is Ownable {
    address public oracle;
    bool public immutable stagingMode;

    mapping(uint8 => address[4]) private _results;
    mapping(uint8 => bool) private _resultsPosted;
    mapping(uint8 => uint256) public expectedDeadline;

    event ResultsPosted(uint8 indexed groupId, address[4] rankings);
    event GracePeriodExtended(uint8 indexed groupId, uint256 newDeadline);

    error UnauthorisedOracle(address caller);
    error ResultsAlreadyPosted(uint8 groupId);
    error NotStagingMode();

    modifier onlyOracle() {
        if (msg.sender != oracle) revert UnauthorisedOracle(msg.sender);
        _;
    }

    constructor(address initialOwner, address oracle_, bool stagingMode_) Ownable(initialOwner) {
        oracle = oracle_;
        stagingMode = stagingMode_;
    }

    function postResults(uint8 groupId, address[4] calldata rankings) external onlyOracle {
        if (_resultsPosted[groupId]) {
            // Idempotency: if same data → succeed silently; if different → revert
            address[4] storage stored = _results[groupId];
            for (uint8 i = 0; i < 4; i++) {
                if (stored[i] != rankings[i]) revert ResultsAlreadyPosted(groupId);
            }
            return; // identical data — no-op, no event re-emitted
        }
        _results[groupId] = rankings;
        _resultsPosted[groupId] = true;
        emit ResultsPosted(groupId, rankings);
    }

    function getResults(uint8 groupId) external view returns (address[4] memory) {
        return _results[groupId];
    }

    function hasResultsPosted(uint8 groupId) external view returns (bool) {
        return _resultsPosted[groupId];
    }

    function setResultsForTesting(uint8 groupId, address[4] calldata rankings) external {
        if (!stagingMode) revert NotStagingMode();
        _results[groupId] = rankings;
        _resultsPosted[groupId] = true;
        emit ResultsPosted(groupId, rankings);
    }

    function extendGracePeriod(uint8 groupId, uint256 additionalSeconds) external onlyOwner {
        uint256 newDeadline = expectedDeadline[groupId] + additionalSeconds;
        expectedDeadline[groupId] = newDeadline;
        emit GracePeriodExtended(groupId, newDeadline);
    }

    function setGroupDeadline(uint8 groupId, uint256 timestamp) external onlyOwner {
        expectedDeadline[groupId] = timestamp;
    }
}
```

**Why `address[4]`?** Each World Cup group has exactly 4 qualified teams, ranked 1st–4th. `uint8` for `groupId` covers 0–255 (12 groups A–L fit as 0–11). Fixed-size array avoids dynamic-length ABI overhead and makes idempotency comparison predictable.

**Why `stagingMode` is `immutable`?** Once deployed to mainnet with `stagingMode = false`, any upgrade path should redeploy the contract, not flip a flag. `immutable` enforces this at the EVM level and signals intent clearly.

**Idempotency for redundant cron (FR31):** Both the primary cron and the redundant cron can call `postResults` with identical data. The second call hits the `return` early path - no revert, no event. This is the correct pattern for distributed idempotent systems.

**`setGroupDeadline` is not in ACs but is necessary:** Without an initial deadline, `extendGracePeriod` just adds seconds to `0` (= additionalSeconds as Unix timestamp, which makes sense if you want to set from scratch too). However, for semantic clarity, `setGroupDeadline` sets an absolute timestamp while `extendGracePeriod` adds to it. Both are `onlyOwner`.

### Fixtures: `contracts/test/fixtures/index.ts`

Add two new exports to the existing file — do not touch the `deployWhitelistRegistry` function:

```typescript
export async function deployOracleController() {
  const connection = await hre.network.getOrCreate();
  const [owner, oracle, ...otherAccounts] = await connection.viem.getWalletClients();
  const oracleController = await connection.viem.deployContract("OracleController", [
    owner.account.address,
    oracle.account.address,
    false, // stagingMode = false (production)
  ]);
  return { oracleController, owner, oracle, otherAccounts, connection };
}

export async function deployOracleControllerStaging() {
  const connection = await hre.network.getOrCreate();
  const [owner, oracle, ...otherAccounts] = await connection.viem.getWalletClients();
  const oracleController = await connection.viem.deployContract("OracleController", [
    owner.account.address,
    oracle.account.address,
    true, // stagingMode = true
  ]);
  return { oracleController, owner, oracle, otherAccounts, connection };
}
```

Note: `oracle` is the second wallet client (`otherAccounts[0]` in the old naming, now promoted to its own named destructure). `otherAccounts` becomes the remaining clients (index 2 onward).

### Tests: `contracts/test/OracleController.test.ts`

**Address arrays for rankings:**  
Rankings are `address[4]` — 4 team addresses per group. Use wallet EOA addresses from `otherAccounts` (no code.length check applies to team addresses; only `approveToken` has that guard). Build a helper or inline tuple:

```typescript
const rankings = [
  otherAccounts[0].account.address,
  otherAccounts[1].account.address,
  otherAccounts[2].account.address,
  otherAccounts[3].account.address,
] as const;

await oracleController.write.postResults([0, rankings], { account: oracle.account });
```

**Calling from oracle account vs. owner account:**  
The default implicit caller for `contract.write.*` is the first wallet client (owner). To call as oracle, pass `{ account: oracle.account }`. To call as a non-oracle non-owner (attacker), pass `{ account: otherAccounts[0].account }`.

**Block-scoped event assertions (lesson from Story 1.2):**
```typescript
const txHash = await oracleController.write.postResults([0, rankings], { account: oracle.account });
const publicClient = await connection.viem.getPublicClient();
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

const events = await oracleController.getEvents.ResultsPosted(
  {},
  { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
);
assert.equal(events.length, 1);
assert.equal(events[0].args.groupId, 0);
```

For `address[4]` event arg comparison, lowercase both sides:
```typescript
const emittedRankings = events[0].args.rankings;
assert.deepEqual(
  emittedRankings?.map((a: string) => a.toLowerCase()),
  rankings.map(a => a.toLowerCase())
);
```

**Idempotent same-data test:**
```typescript
it("posting same results again succeeds (idempotent)", async () => {
  const { oracleController, oracle, otherAccounts } = await deployOracleController();
  const rankings = [
    otherAccounts[0].account.address,
    otherAccounts[1].account.address,
    otherAccounts[2].account.address,
    otherAccounts[3].account.address,
  ] as const;

  await oracleController.write.postResults([0, rankings], { account: oracle.account });
  // Second identical post — should NOT throw
  await oracleController.write.postResults([0, rankings], { account: oracle.account });
  // Still returns the same data
  const stored = await oracleController.read.getResults([0]);
  assert.deepEqual(
    stored.map((a: string) => a.toLowerCase()),
    rankings.map(a => a.toLowerCase())
  );
});
```

**Conflicting data test:**
```typescript
it("posting conflicting results for same group reverts with ResultsAlreadyPosted", async () => {
  const { oracleController, oracle, otherAccounts } = await deployOracleController();
  const rankings1 = [...] as const;
  const rankings2 = [/* different order */] as const;

  await oracleController.write.postResults([0, rankings1], { account: oracle.account });

  await assert.rejects(
    oracleController.simulate.postResults([0, rankings2], { account: oracle.account }),
    (err: Error) => err.message.includes("ResultsAlreadyPosted")
  );
});
```

### Project Structure Notes

- New contract: `contracts/contracts/OracleController.sol`
- Updated fixture: `contracts/test/fixtures/index.ts` (add two exports, preserve existing)
- New test: `contracts/test/OracleController.test.ts`
- No changes to: `hardhat.config.ts`, `package.json`, `WhitelistRegistry.sol`, `MockERC20.sol`
- Architecture file path: `contracts/contracts/OracleController.sol` ✓ (matches architecture.md)

### References

- Story 1.2 completion notes — Hardhat 3 ESM patterns, OZ v5 syntax: [Source: _bmad-output/implementation-artifacts/1-2-whitelistregistrysol.md]
- Architecture contract pattern: `setResultsForTesting()` staging-only, gated by deploy-time flag: [Source: _bmad-output/planning-artifacts/architecture.md#Smart Contract Patterns]
- Architecture project structure: `contracts/contracts/OracleController.sol`: [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Story 1.3 ACs: `postResults`, idempotency, staging mode, grace period, `UnauthorisedOracle`: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: OracleController.sol]
- FR31: Redundant cron must be idempotent: [Source: _bmad-output/planning-artifacts/epics.md#Requirements]
- FR34: Admin can extend oracle grace period: [Source: _bmad-output/planning-artifacts/epics.md#Requirements]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- `stagingMode` declared `immutable` — assigned in constructor, embedded in bytecode, cannot be mutated post-deploy. Signals production safety at EVM level.
- Idempotency loop: identical rankings on second `postResults` call returns early (no event re-emitted, no revert). Different rankings revert with `ResultsAlreadyPosted`. Safe for redundant cron (FR31).
- `makeRankings()` test helper avoids repetition across test blocks that need an `address[4]` tuple.
- `otherAccounts` in `deployOracleController` is index 2+ (owner = index 0, oracle = index 1). Four `otherAccounts` available for ranking tuples.
- Block-scoped `getEvents` with `{ fromBlock, toBlock }` applied consistently — lesson carried from Story 1.2.
- Post-review patches: `setOracle(address)` onlyOwner added for key rotation; `getResults` now reverts with `ResultsNotPosted` for unposted groups; `InvalidAddress` revert added to constructor and `setOracle` for zero-address guard.
- All 21 OracleController tests + all 14 WhitelistRegistry tests pass: **35/35 total**.

### File List

- `contracts/contracts/OracleController.sol` (new)
- `contracts/test/fixtures/index.ts` (modified — added `deployOracleController`, `deployOracleControllerStaging`)
- `contracts/test/OracleController.test.ts` (new)
### Change Log

| Date | Change | Reason |
|------|--------|-------|
| 2026-04-27 | Story created | Initial story context for Story 1.3: OracleController.sol |
| 2026-04-27 | Implementation complete | OracleController.sol + fixtures + 14 tests; 28/28 passing |
| 2026-04-27 | Post-review patches | D1: added setOracle() for key rotation; D2: getResults reverts ResultsNotPosted; B4: InvalidAddress guard on constructor; 35/35 passing |
