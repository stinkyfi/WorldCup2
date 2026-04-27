# Story 1.4: LeagueFactory.sol

Status: review

## Story

As a creator,
I want a `LeagueFactory` contract that deploys new `League` instances with validated parameters,
So that every league on the platform has trusted, auditable creation provenance.

## Acceptance Criteria

1. **Given** a caller provides valid parameters (whitelisted token, entry fee > 0, valid revision policy enum) **When** they call `createLeague(LeagueParams params)` with at least the creation fee in ETH (`msg.value >= creationFee`) **Then** a new `League` contract is deployed, registered in the internal `_leagues[]` array, a `LeagueCreated(address indexed league, address indexed creator)` event is emitted, and the full `msg.value` is forwarded to `devWallet`.

2. **Given** a caller provides a non-whitelisted token address **When** they call `createLeague` **Then** the transaction reverts with `TokenNotWhitelisted(address token)`.

3. **Given** `creationsPaused = true` **When** any caller calls `createLeague` **Then** the transaction reverts with `CreationsPaused`.

4. **Given** the owner calls `setGlobalParams(uint256 devFeeBps_, uint256 creatorFeeCap_, uint256 minEntryAmount_)` **When** the call succeeds **Then** the three global params are updated in storage, a `GlobalParamsUpdated(uint256, uint256, uint256)` event is emitted, and subsequently created leagues inherit the new values (existing leagues are unaffected because params are snapshotted at `new League(...)`).

5. **Given** `getLeagues(uint256 offset, uint256 limit)` is called **When** leagues exist **Then** it returns a paginated slice of deployed league addresses; if `offset >= total` it returns an empty array.

## Tasks / Subtasks

- [x] Task 1: Create `contracts/contracts/League.sol` stub (AC: #1 — factory needs `new League(...)` to compile)
  - [x] Define `RevisionPolicy` enum (`Locked`, `Free`, `Paid`) at file scope in `League.sol`
  - [x] Define `LeagueParams` struct at file scope in `League.sol` (fields: `address token`, `uint256 entryFee`, `uint256 maxEntries`, `uint256 maxEntriesPerWallet`, `uint256 minThreshold`, `RevisionPolicy revisionPolicy`, `uint256 lockTime`)
  - [x] Implement minimal `League` contract with constructor`(address creator, address oracleController, address devWallet, uint256 devFeeBps, uint256 creatorFeeCap, LeagueParams memory params)` — body is intentionally empty (Story 1.5 fills it in)
  - [x] Add NatSpec `@dev` stub comment: "Full implementation in Story 1.5 — this stub exists only to allow LeagueFactory to compile and deploy League instances"
  - [x] `npx hardhat compile` exits 0

- [x] Task 2: Write `contracts/contracts/LeagueFactory.sol` (AC: #1–#5)
  - [x] Import OZ v5 `Ownable`, `WhitelistRegistry.sol`, and `League.sol`
  - [x] Declare `address public immutable whitelistRegistry`, `address public immutable oracleController`, `address public immutable devWallet`
  - [x] Declare mutable global params: `uint256 public creationFee`, `uint256 public devFeeBps`, `uint256 public creatorFeeCap`, `uint256 public minEntryAmount`, `bool public creationsPaused`
  - [x] Declare `address[] private _leagues`
  - [x] Events: `LeagueCreated(address indexed league, address indexed creator)`, `GlobalParamsUpdated(uint256 devFeeBps, uint256 creatorFeeCap, uint256 minEntryAmount)`, `CreationsPausedUpdated(bool paused)`
  - [x] Custom errors: `TokenNotWhitelisted(address token)`, `CreationsPaused()`, `InsufficientCreationFee(uint256 required, uint256 provided)`, `InvalidParams()`, `InvalidAddress()`, `DevWalletTransferFailed()`
  - [x] Constructor: `(address initialOwner, address whitelistRegistry_, address oracleController_, address devWallet_, uint256 creationFee_, uint256 devFeeBps_, uint256 creatorFeeCap_, uint256 minEntryAmount_) Ownable(initialOwner)` — guard all three address params against `address(0)` → `InvalidAddress`
  - [x] `createLeague(LeagueParams calldata params) external payable returns (address league)`:
    - Revert `CreationsPaused` if paused
    - Revert `InsufficientCreationFee(creationFee, msg.value)` if `msg.value < creationFee`
    - Revert `TokenNotWhitelisted(params.token)` if `!WhitelistRegistry(whitelistRegistry).isWhitelisted(params.token)`
    - Revert `InvalidParams` if `params.entryFee == 0`
    - Deploy: `League newLeague = new League(msg.sender, oracleController, devWallet, devFeeBps, creatorFeeCap, params)`
    - Push `address(newLeague)` to `_leagues`
    - Forward ETH: `(bool sent,) = devWallet.call{value: msg.value}("")` — revert `DevWalletTransferFailed` if not sent
    - Emit `LeagueCreated(address(newLeague), msg.sender)`
    - Return `address(newLeague)`
  - [x] `setGlobalParams(uint256 devFeeBps_, uint256 creatorFeeCap_, uint256 minEntryAmount_) external onlyOwner`: update storage, emit `GlobalParamsUpdated`
  - [x] `setCreationsPaused(bool paused_) external onlyOwner`: update `creationsPaused`, emit `CreationsPausedUpdated(paused_)`
  - [x] `setCreationFee(uint256 fee_) external onlyOwner`: update `creationFee`
  - [x] `getLeagues(uint256 offset, uint256 limit) external view returns (address[] memory)`: paginated slice — if `offset >= _leagues.length` return empty; clamp end to array bounds; copy slice to result
  - [x] `npx hardhat compile` exits 0 with no warnings

- [x] Task 3: Add fixture to `contracts/test/fixtures/index.ts` (AC: all)
  - [x] Add `deployLeagueFactory()` export — do NOT touch existing `deployWhitelistRegistry`, `deployOracleController`, or `deployOracleControllerStaging` functions
  - [x] Fixture deploys in dependency order: `WhitelistRegistry` → `MockERC20 token` (approve it) → `OracleController` → `LeagueFactory`
  - [x] Wallet client destructure: `[owner, devWallet, creator, oracle, ...otherAccounts]`
  - [x] Factory constructor args: `creationFee = 10_000_000_000_000_000n` (0.01 ETH), `devFeeBps = 200n`, `creatorFeeCap = 300n`, `minEntryAmount = 1_000_000_000_000_000_000n` (1 token unit in 18-decimal)
  - [x] Return shape: `{ leagueFactory, whitelistRegistry, oracleController, owner, devWallet, creator, oracle, token, otherAccounts, connection, creationFee }`

- [x] Task 4: Write `contracts/test/LeagueFactory.test.ts` (AC: #1–#5)
  - [x] Import `describe`, `it` from `"node:test"` and `assert` from `"node:assert/strict"`
  - [x] Import `deployLeagueFactory` from `"./fixtures/index.js"` (NodeNext `.js` extension required)
  - [x] Test AC1 — happy path: valid params, `msg.value = creationFee` → `LeagueCreated` event emitted with correct `league` address and `creator`; `getLeagues(0n, 10n)` returns the new address; devWallet ETH balance increases by `creationFee`
  - [x] Test AC1 — exact: deployed League address is a real contract (not `address(0)`)
  - [x] Test AC2 — non-whitelisted token: `simulate.createLeague` with unwhitelisted ERC20 → rejects with `"TokenNotWhitelisted"`
  - [x] Test AC3 — creations paused: owner calls `setCreationsPaused([true])` → `CreationsPausedUpdated(true)` event; subsequent `simulate.createLeague` rejects with `"CreationsPaused"`
  - [x] Test AC3 — re-enable: after pausing, owner calls `setCreationsPaused([false])` → `createLeague` succeeds again
  - [x] Test AC4 — setGlobalParams: owner updates to `(300n, 400n, 2_000_000_000_000_000_000n)` → `GlobalParamsUpdated` event; `devFeeBps` storage reads `300n`
  - [x] Test AC4 — non-owner: non-owner calls `setGlobalParams` → rejects with `"OwnableUnauthorizedAccount"`
  - [x] Test AC5 — pagination: create 3 leagues; `getLeagues(1n, 1n)` returns exactly the second league address; `getLeagues(10n, 5n)` returns empty array (offset past end)
  - [x] Test — insufficient fee: `simulate.createLeague` with `value: 0n` when `creationFee > 0` → rejects with `"InsufficientCreationFee"`
  - [x] Test — zero entryFee: `simulate.createLeague` with `params.entryFee = 0n` → rejects with `"InvalidParams"`
  - [x] Test — constructor zero address: `deployContract("LeagueFactory", [owner, whitelistRegistry.address, oracleController.address, zeroAddress, ...])` inside test → rejects with `"InvalidAddress"`

- [x] Task 5: Verify (AC: all)
  - [x] `npx hardhat compile` exits 0 with no warnings
  - [x] `npm test` exits 0 — all LeagueFactory tests AND all prior tests (WhitelistRegistry + OracleController) pass

### Review Findings

- [x] [Review][Decision] BH-1 — Reentrancy on `createLeague`: No `ReentrancyGuard` on `createLeague`. A reentrant `devWallet` contract could call back into `createLeague` after `_leagues.push` and before the function returns. Options: A) Add `nonReentrant` from OZ `ReentrancyGuard` to `createLeague`; B) Accept the risk (devWallet is owner-controlled, not user-supplied). **Decision: A — applied.**
- [x] [Review][Decision] BH-5 — `lockTime = 0` accepted silently: A creator can pass `lockTime = 0` (or any past timestamp), making the league immediately locked at creation — entries can never be submitted. Options: A) Add `if (params.lockTime <= block.timestamp) revert InvalidParams()` guard in `createLeague`; B) Accept as-is (creator responsibility). **Decision: A — applied.**
- [x] [Review][Patch] BH-2 — `setCreationFee` emits no event: Every other owner setter emits an event, but `setCreationFee` is silent. Add `event CreationFeeUpdated(uint256 newFee)` and emit it. **Patched.**
- [x] [Review][Defer] BH-4 — Interface not verified on registry/oracle setters: `setWhitelistRegistry` and `setOracleController` accept any non-zero address without verifying the expected interface. A misconfigured address would silently break `createLeague`. Deferred — owner-controlled setters, acceptable for MVP.
- [x] [Review][Defer] EC-3 — Excess `msg.value` gifted to devWallet: When `msg.value > creationFee`, the full amount is forwarded. By-design per NatSpec but untested and may surprise callers. Deferred — acceptable for MVP.

## Dev Notes

### ⚠️ Hardhat 3 — This Project Uses ESM (NOT CommonJS)

Same rules as Stories 1.2 and 1.3 — do not deviate:

- All TypeScript files compile to ESM — use `import`/`export`, never `require()`
- `tsconfig.json` uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
- **All relative imports in `.ts` files MUST use `.js` extension** — e.g. `import { deployLeagueFactory } from "./fixtures/index.js"`. NodeNext ESM resolves `.js` → `.ts` at compile time.
- Bare module imports (e.g. `import hre from "hardhat"`) do NOT need `.js`

### ⚠️ Hardhat 3 — Viem Lives on `NetworkConnection`, NOT on `hre`

`hre.viem` does not exist in Hardhat 3. Pattern used throughout this project:

```typescript
const connection = await hre.network.getOrCreate();
const [owner, devWallet, creator, oracle, ...otherAccounts] = await connection.viem.getWalletClients();
const leagueFactory = await connection.viem.deployContract("LeagueFactory", [
  owner.account.address,
  whitelistRegistry.address,
  oracleController.address,
  devWallet.account.address,
  10_000_000_000_000_000n, // 0.01 ETH creationFee
  200n,                    // devFeeBps
  300n,                    // creatorFeeCap
  1_000_000_000_000_000_000n, // minEntryAmount
]);
```

`hre.network.connect()` is deprecated — always use `getOrCreate()`.

### ⚠️ Hardhat 3 — No `loadFixture`

`loadFixture` is not exported from any Hardhat 3 package. Call the fixture function directly inside each `it()` block:

```typescript
it("createLeague emits LeagueCreated", async () => {
  const { leagueFactory, creator, token, creationFee } = await deployLeagueFactory();
  // ... test body
});
```

### OZ v5 — Critical Syntax

**Ownable constructor:**
```solidity
constructor(
  address initialOwner,
  address whitelistRegistry_,
  // ...
) Ownable(initialOwner) {
  if (whitelistRegistry_ == address(0)) revert InvalidAddress();
  // ...
}
```

**OZ v5 error name for Ownable:** `OwnableUnauthorizedAccount(address account)` — not the v4 string revert. Tests match on `"OwnableUnauthorizedAccount"` string fragment.

### Solidity Design: `League.sol` Stub

`League.sol` defines the data types (`RevisionPolicy` enum, `LeagueParams` struct) at **file scope** (not inside the contract) so `LeagueFactory.sol` can import them without circular dependency. The stub `League` contract has a constructor that accepts all params but does nothing with them:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Minimal stub deployed by LeagueFactory. Full implementation in Story 1.5.
/// RevisionPolicy and LeagueParams defined here (file scope) so LeagueFactory
/// can import them without circular dependency.

enum RevisionPolicy { Locked, Free, Paid }

struct LeagueParams {
    address token;
    uint256 entryFee;
    uint256 maxEntries;
    uint256 maxEntriesPerWallet;
    uint256 minThreshold;
    RevisionPolicy revisionPolicy;
    uint256 lockTime;
}

contract League {
    /// @dev Stub constructor — accepts all factory-supplied params but contains no logic.
    ///      Story 1.5 replaces this body with the full league state machine.
    constructor(
        address /*creator*/,
        address /*oracleController*/,
        address /*devWallet*/,
        uint256 /*devFeeBps*/,
        uint256 /*creatorFeeCap*/,
        LeagueParams memory /*params*/
    ) {}
}
```

### Solidity Design: `LeagueFactory.sol`

**Complete implementation outline:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./WhitelistRegistry.sol";
import "./League.sol";

/// @title LeagueFactory
/// @notice Validates parameters, deploys League instances, and maintains a paginated registry.
///         Reads WhitelistRegistry.isWhitelisted() to gate token acceptance.
///         Global params (devFeeBps, creatorFeeCap, minEntryAmount) are snapshotted into
///         each deployed League — existing leagues are never affected by subsequent changes.
contract LeagueFactory is Ownable {
    address public immutable whitelistRegistry;
    address public immutable oracleController;
    address public immutable devWallet;

    uint256 public creationFee;
    uint256 public devFeeBps;
    uint256 public creatorFeeCap;
    uint256 public minEntryAmount;
    bool public creationsPaused;

    address[] private _leagues;

    event LeagueCreated(address indexed league, address indexed creator);
    event GlobalParamsUpdated(uint256 devFeeBps, uint256 creatorFeeCap, uint256 minEntryAmount);
    event CreationsPausedUpdated(bool paused);

    error TokenNotWhitelisted(address token);
    error CreationsPaused();
    error InsufficientCreationFee(uint256 required, uint256 provided);
    error InvalidParams();
    error InvalidAddress();
    error DevWalletTransferFailed();

    constructor(
        address initialOwner,
        address whitelistRegistry_,
        address oracleController_,
        address devWallet_,
        uint256 creationFee_,
        uint256 devFeeBps_,
        uint256 creatorFeeCap_,
        uint256 minEntryAmount_
    ) Ownable(initialOwner) {
        if (whitelistRegistry_ == address(0)) revert InvalidAddress();
        if (oracleController_ == address(0)) revert InvalidAddress();
        if (devWallet_ == address(0)) revert InvalidAddress();
        whitelistRegistry = whitelistRegistry_;
        oracleController = oracleController_;
        devWallet = devWallet_;
        creationFee = creationFee_;
        devFeeBps = devFeeBps_;
        creatorFeeCap = creatorFeeCap_;
        minEntryAmount = minEntryAmount_;
    }

    function createLeague(LeagueParams calldata params) external payable returns (address league) {
        if (creationsPaused) revert CreationsPaused();
        if (msg.value < creationFee) revert InsufficientCreationFee(creationFee, msg.value);
        if (!WhitelistRegistry(whitelistRegistry).isWhitelisted(params.token))
            revert TokenNotWhitelisted(params.token);
        if (params.entryFee == 0) revert InvalidParams();

        League newLeague = new League(
            msg.sender,
            oracleController,
            devWallet,
            devFeeBps,
            creatorFeeCap,
            params
        );
        league = address(newLeague);
        _leagues.push(league);

        (bool sent,) = devWallet.call{value: msg.value}("");
        if (!sent) revert DevWalletTransferFailed();

        emit LeagueCreated(league, msg.sender);
    }

    function setGlobalParams(
        uint256 devFeeBps_,
        uint256 creatorFeeCap_,
        uint256 minEntryAmount_
    ) external onlyOwner {
        devFeeBps = devFeeBps_;
        creatorFeeCap = creatorFeeCap_;
        minEntryAmount = minEntryAmount_;
        emit GlobalParamsUpdated(devFeeBps_, creatorFeeCap_, minEntryAmount_);
    }

    function setCreationsPaused(bool paused_) external onlyOwner {
        creationsPaused = paused_;
        emit CreationsPausedUpdated(paused_);
    }

    function setCreationFee(uint256 fee_) external onlyOwner {
        creationFee = fee_;
    }

    function getLeagues(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = _leagues.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _leagues[offset + i];
        }
        return result;
    }
}
```

**Why `CreationsPaused` error and `creationsPaused` variable have different casing:**
Solidity is case-sensitive. `error CreationsPaused()` (PascalCase) and `bool public creationsPaused` (camelCase) are different identifiers — no collision.

**Why `devWallet` is `immutable`:**
The dev wallet is a platform-level address set at deploy time. Making it `immutable` signals operational intent: rotate by redeploying, not by calling a mutator. No AC exists for rotating `devWallet` in this story.

**Why `whitelistRegistry` and `oracleController` are `immutable`:**
Both are singleton deployments per chain. Changing them would mean all future leagues reference different contracts — that requires a full factory redeployment. `immutable` enforces this at the EVM level.

**ETH forwarding pattern:**
The creation fee is charged in native ETH (not ERC-20) to keep `createLeague` chain-agnostic — the entry token varies per league. The full `msg.value` (which is `>= creationFee`) is forwarded to `devWallet`. Any excess above `creationFee` is treated as additional platform contribution. The low-level `call{value: msg.value}("")` pattern is chosen over `transfer` (2300 gas limit — fails for smart contract wallets) and `send` (deprecated).

### Fixtures: `contracts/test/fixtures/index.ts`

Add one new export at the bottom of the file. Do NOT modify or remove any existing exports:

```typescript
// ─── Story 1.4: LeagueFactory fixtures ───────────────────────────────────────

export async function deployLeagueFactory() {
  const connection = await hre.network.getOrCreate();
  const [owner, devWallet, creator, oracle, ...otherAccounts] =
    await connection.viem.getWalletClients();

  // Deploy dependencies
  const whitelistRegistry = await connection.viem.deployContract("WhitelistRegistry", [
    owner.account.address,
  ]);
  const token = await connection.viem.deployContract("MockERC20", ["Test Token", "TST"]);
  await whitelistRegistry.write.approveToken([token.address]);

  const oracleController = await connection.viem.deployContract("OracleController", [
    owner.account.address,
    oracle.account.address,
    false,
  ]);

  const creationFee = 10_000_000_000_000_000n; // 0.01 ETH
  const leagueFactory = await connection.viem.deployContract("LeagueFactory", [
    owner.account.address,
    whitelistRegistry.address,
    oracleController.address,
    devWallet.account.address,
    creationFee,
    200n,                          // devFeeBps: 2%
    300n,                          // creatorFeeCap: 3%
    1_000_000_000_000_000_000n,    // minEntryAmount: 1 (18-decimal token unit)
  ]);

  return {
    leagueFactory,
    whitelistRegistry,
    oracleController,
    owner,
    devWallet,
    creator,
    oracle,
    token,
    otherAccounts,
    connection,
    creationFee,
  };
}
```

### Tests: `contracts/test/LeagueFactory.test.ts`

**Building `LeagueParams` for tests — use `as const` tuple:**
```typescript
const validParams = {
  token: token.address,
  entryFee: 5_000_000_000_000_000_000n, // 5 tokens
  maxEntries: 100n,
  maxEntriesPerWallet: 5n,
  minThreshold: 10n,
  revisionPolicy: 0,   // RevisionPolicy.Locked
  lockTime: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60), // 7 days from now
} as const;
```

**Calling `createLeague` with ETH value:**
```typescript
const txHash = await leagueFactory.write.createLeague(
  [validParams],
  { account: creator.account, value: creationFee }
);
```

**Simulate for revert assertions:**
```typescript
await assert.rejects(
  leagueFactory.simulate.createLeague(
    [invalidParams],
    { account: creator.account, value: creationFee }
  ),
  (err: Error) => err.message.includes("TokenNotWhitelisted")
);
```

**Block-scoped event assertion:**
```typescript
const publicClient = await connection.viem.getPublicClient();
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const events = await leagueFactory.getEvents.LeagueCreated(
  {},
  { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
);
assert.equal(events.length, 1);
assert.equal(events[0].args.creator?.toLowerCase(), creator.account.address.toLowerCase());
```

**ETH balance check for devWallet:**
```typescript
const publicClient = await connection.viem.getPublicClient();
const balanceBefore = await publicClient.getBalance({ address: devWallet.account.address });

const txHash = await leagueFactory.write.createLeague(
  [validParams],
  { account: creator.account, value: creationFee }
);
await publicClient.waitForTransactionReceipt({ hash: txHash });

const balanceAfter = await publicClient.getBalance({ address: devWallet.account.address });
assert.equal(balanceAfter - balanceBefore, creationFee);
```

**Checking deployed League address is non-zero (real contract):**
```typescript
const leagueAddress = events[0].args.league as `0x${string}`;
assert.notEqual(leagueAddress, "0x0000000000000000000000000000000000000000");

// Optionally verify it has bytecode
const bytecode = await publicClient.getBytecode({ address: leagueAddress });
assert.ok(bytecode && bytecode.length > 2, "deployed league should have bytecode");
```

**Constructor zero-address test pattern:**
```typescript
it("constructor reverts with InvalidAddress if devWallet is zero", async () => {
  const { connection, owner, whitelistRegistry, oracleController } = await deployLeagueFactory();
  const zeroAddress = "0x0000000000000000000000000000000000000000" as const;
  await assert.rejects(
    connection.viem.deployContract("LeagueFactory", [
      owner.account.address,
      whitelistRegistry.address,
      oracleController.address,
      zeroAddress, // devWallet = zero
      0n, 0n, 0n, 0n,
    ]),
    (err: Error) => err.message.includes("InvalidAddress")
  );
});
```

**Pagination test — 3 leagues:**
```typescript
it("getLeagues returns paginated slice", async () => {
  const { leagueFactory, creator, token, creationFee } = await deployLeagueFactory();
  const params = { /* validParams */ } as const;

  // Create 3 leagues (call 3 times)
  await leagueFactory.write.createLeague([params], { account: creator.account, value: creationFee });
  await leagueFactory.write.createLeague([params], { account: creator.account, value: creationFee });
  await leagueFactory.write.createLeague([params], { account: creator.account, value: creationFee });

  const all = await leagueFactory.read.getLeagues([0n, 10n]);
  assert.equal(all.length, 3);

  const page = await leagueFactory.read.getLeagues([1n, 1n]);
  assert.equal(page.length, 1);
  assert.equal(page[0].toLowerCase(), all[1].toLowerCase());

  const beyond = await leagueFactory.read.getLeagues([10n, 5n]);
  assert.equal(beyond.length, 0);
});
```

### Project Structure Notes

- New contract (stub): `contracts/contracts/League.sol` — defines `RevisionPolicy`, `LeagueParams`, minimal `League` constructor; **Story 1.5 replaces the constructor body entirely**
- New contract: `contracts/contracts/LeagueFactory.sol`
- Updated fixture: `contracts/test/fixtures/index.ts` (add `deployLeagueFactory` — preserve all existing exports)
- New test: `contracts/test/LeagueFactory.test.ts`
- No changes to: `hardhat.config.ts`, `package.json`, `OracleController.sol`, `WhitelistRegistry.sol`, `MockERC20.sol`
- Architecture file path for `LeagueFactory.sol`: `contracts/contracts/LeagueFactory.sol` ✓ (matches architecture.md)
- Architecture file path for `League.sol`: `contracts/contracts/League.sol` ✓ (matches architecture.md)

### References

- Story 1.2, 1.3 completion notes — Hardhat 3 ESM patterns, OZ v5 syntax, block-scoped events, `simulate.*` revert pattern
- Architecture: "Admin whitelist, global fee params, creates League instances": `_bmad-output/planning-artifacts/architecture.md` line 250
- Architecture: fee cap enforced on-chain: `require(creatorFee + devFee <= MAX_FEE_BPS)` — but this is a `League.sol` concern (Story 1.5), not factory
- Architecture: "ReentrancyGuard" — not needed on LeagueFactory (no user funds held); only League.sol requires it
- PRD: FR12 (create league with params), FR13 (revision policy), FR55 (setGlobalParams), FR56 (setCreationsPaused)
- epics.md Story 1.4 ACs at line 353–381

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- All 48 tests pass: 13 LeagueFactory + 21 OracleController + 14 WhitelistRegistry

### Completion Notes List

- `RevisionPolicy` enum and `LeagueParams` struct defined at file scope in `League.sol` (not inside the contract) — enables clean import by `LeagueFactory.sol` without circular dependency.
- `League.sol` stub constructor accepts all factory-supplied params with named `/*comment*/` suppression to avoid unused-variable warnings; Story 1.5 replaces the body.
- `devWallet`, `whitelistRegistry`, `oracleController` are `immutable` — rotation requires redeployment, matching per-chain architecture intent.
- Creation fee collected in native ETH (not ERC-20) — chain-agnostic; entry tokens vary per league. Full `msg.value` forwarded to `devWallet` via low-level `call{value}` to avoid 2300-gas limit on smart-contract wallets.
- `getLeagues` paginator clamps `end` to array bounds, returns empty array if `offset >= total` — no out-of-bounds risk.
- `npx hardhat compile` exits 0 with no warnings; `npm test` exits 0 — 48/48 passing.
