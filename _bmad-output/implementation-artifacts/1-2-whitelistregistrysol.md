# Story 1.2: WhitelistRegistry.sol

Status: review

## Story

As a platform admin,
I want a `WhitelistRegistry` contract that maintains the canonical list of approved ERC-20 tokens on this chain,
So that league creators can only select tokens that have passed platform vetting.

## Acceptance Criteria

1. **Given** the contract is deployed by the owner address **When** the owner calls `approveToken(address token)` **Then** `isWhitelisted(token)` returns `true` and a `TokenApproved` event is emitted.

2. **Given** a whitelisted token **When** the owner calls `removeToken(address token)` **Then** `isWhitelisted(token)` returns `false` and a `TokenRemoved` event is emitted.

3. **Given** a non-owner address **When** they call `approveToken` or `removeToken` **Then** the transaction reverts with `OwnableUnauthorizedAccount`.

4. **Given** the contract is deployed **When** `getWhitelistedTokens()` is called **Then** it returns all currently whitelisted token addresses on this chain.

> **Deployment model:** One `WhitelistRegistry` is deployed per supported chain (Base, Sonic, Ethereum). Each contract is chain-unaware — it manages approved tokens for the chain it lives on. No `chainId` param is needed. The app connects to the correct chain and calls the correct contract address.

## Tasks / Subtasks

- [x] Task 1: Write `WhitelistRegistry.sol` (AC: #1, #2, #3, #4)
  - [x] Create `contracts/contracts/WhitelistRegistry.sol`
  - [x] Import and inherit OZ v5 `Ownable` — constructor takes `address initialOwner` (OZ v5 syntax)
  - [x] Use OZ `EnumerableSet.AddressSet` for O(1) add/remove/contains and enumerable `values()`
  - [x] Implement `approveToken(address token) external onlyOwner`
  - [x] Implement `removeToken(address token) external onlyOwner`
  - [x] Implement `isWhitelisted(address token) external view returns (bool)`
  - [x] Implement `getWhitelistedTokens() external view returns (address[] memory)`
  - [x] Emit `TokenApproved(address indexed token)` in `approveToken`
  - [x] Emit `TokenRemoved(address indexed token)` in `removeToken`
  - [x] Add custom errors: `TokenAlreadyWhitelisted(address token)` and `TokenNotWhitelisted(address token)`
  - [x] `npx hardhat compile` exits 0

- [x] Task 2: Add `deployWhitelistRegistry` fixture to `contracts/test/fixtures/index.ts` (AC: all)
  - [x] Import `hre` from `"hardhat"` (ESM, no `.js` extension on bare imports)
  - [x] Export `deployWhitelistRegistry()` async function using `hre.network.getOrCreate()` and `connection.viem.deployContract("WhitelistRegistry", [ownerAddress])`
  - [x] Return `{ whitelistRegistry, owner, otherAccounts, connection }` — connection needed for `getPublicClient()` in event tests

- [x] Task 3: Write `contracts/test/WhitelistRegistry.test.ts` (AC: #1, #2, #3, #4)
  - [x] Import `describe`, `it` from `"node:test"` and `assert` from `"node:assert/strict"`
  - [x] Import `deployWhitelistRegistry` from `"./fixtures/index.js"` (`.js` extension required — NodeNext ESM)
  - [x] Test AC1: owner approves token → `isWhitelisted` returns true, `TokenApproved` event in receipt logs
  - [x] Test AC1 edge: approve already-whitelisted token → reverts with `TokenAlreadyWhitelisted`
  - [x] Test AC2: owner removes whitelisted token → `isWhitelisted` returns false, `TokenRemoved` event in receipt logs
  - [x] Test AC2 edge: remove non-whitelisted token → reverts with `TokenNotWhitelisted`
  - [x] Test AC3: non-owner calls `approveToken` → reverts (expect `OwnableUnauthorizedAccount` in error)
  - [x] Test AC3: non-owner calls `removeToken` → reverts (expect `OwnableUnauthorizedAccount` in error)
  - [x] Test AC4: `getWhitelistedTokens` returns correct address list after multiple approvals
  - [x] Test AC4: `getWhitelistedTokens` excludes removed tokens
  - [x] Test AC4: `getWhitelistedTokens` returns empty array when no tokens approved

- [x] Task 4: Verify (AC: all)
  - [x] `npx hardhat compile` exits 0 with no warnings
  - [x] `npm test` exits 0 with all WhitelistRegistry tests passing

## Dev Notes

### ⚠️ Hardhat 3 — This Project Uses ESM (NOT CommonJS)

The contracts project (`contracts/package.json`) has `"type": "module"`. This means:

- All TypeScript files compile to ESM — use `import`/`export`, never `require()`
- `tsconfig.json` uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
- **All relative imports in `.ts` files MUST use `.js` extension** — write `import { x } from "./fixtures/index.js"`, NOT `"./fixtures/index"`. This is a NodeNext ESM requirement; TypeScript resolves `.js` to `.ts` at compile time.
- Bare module imports (e.g. `import hre from "hardhat"`) do NOT need `.js`

### ⚠️ Hardhat 3 Config — Do Not Touch `hardhat.config.ts`

The existing `hardhat.config.ts` uses Hardhat 3 `defineConfig` + `configVariable`. **Do not modify it.** It is correct as-is. The story only adds Solidity source files and TypeScript test files.

### OZ v5 — Critical Syntax Differences from v4

**Ownable constructor:**
```solidity
// OZ v5 — initialOwner must be provided explicitly
constructor(address initialOwner) Ownable(initialOwner) {}
// NOT: constructor() {} // (v4 pattern — does NOT work in v5)
```

**OZ v5 error names:**
- `Ownable.sol` reverts with `OwnableUnauthorizedAccount(address account)` (not `"Ownable: caller is not the owner"` string — that was v4)
- The AC correctly references `OwnableUnauthorizedAccount`

**EnumerableSet import (OZ v5):**
```solidity
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
// Usage:
using EnumerableSet for EnumerableSet.AddressSet;
mapping(uint256 => EnumerableSet.AddressSet) private _tokens;
// _tokens[chainId].add(token)    → returns bool (false if already present)
// _tokens[chainId].remove(token) → returns bool (false if not present)
// _tokens[chainId].contains(token) → bool
// _tokens[chainId].values()      → address[] memory (O(n))
```

**Why EnumerableSet?** Standard `mapping(uint256 => address[])` with a reverse-lookup mapping works but removal is O(n) swap-and-pop. OZ `EnumerableSet.AddressSet` gives O(1) add/remove/contains and efficient enumeration via `.values()`. This is the correct OZ v5 tool for this use case.

### Recommended `WhitelistRegistry.sol` Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract WhitelistRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(uint256 chainId => EnumerableSet.AddressSet) private _tokens;

    event TokenApproved(address indexed token, uint256 indexed chainId);
    event TokenRemoved(address indexed token, uint256 indexed chainId);

    error TokenAlreadyWhitelisted(address token, uint256 chainId);
    error TokenNotWhitelisted(address token, uint256 chainId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function approveToken(address token, uint256 chainId) external onlyOwner {
        if (!_tokens[chainId].add(token)) revert TokenAlreadyWhitelisted(token, chainId);
        emit TokenApproved(token, chainId);
    }

    function removeToken(address token, uint256 chainId) external onlyOwner {
        if (!_tokens[chainId].remove(token)) revert TokenNotWhitelisted(token, chainId);
        emit TokenRemoved(token, chainId);
    }

    function isWhitelisted(address token, uint256 chainId) external view returns (bool) {
        return _tokens[chainId].contains(token);
    }

    function getWhitelistedTokens(uint256 chainId) external view returns (address[] memory) {
        return _tokens[chainId].values();
    }
}
```

> You may add NATSPEC (`///` comments) above each function and event — good practice for a contract that will be audited and indexed.

### Test File Pattern — Hardhat 3 with `node:test` and `hre.viem`

This project's test runner is **Node.js built-in `node:test`** (NOT Mocha/Chai). This is what Hardhat 3 + `hardhat-toolbox-viem` uses.

```typescript
// contracts/test/WhitelistRegistry.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployWhitelistRegistry } from "./fixtures/index.js";

const FAKE_TOKEN = "0x1234567890123456789012345678901234567890";
const BASE_MAINNET_CHAIN_ID = 8453n; // viem uses bigint for uint256

describe("WhitelistRegistry", () => {
  it("owner can approve a token", async () => {
    const { whitelistRegistry, owner } = await loadFixture(deployWhitelistRegistry);
    await whitelistRegistry.write.approveToken([FAKE_TOKEN, BASE_MAINNET_CHAIN_ID]);
    const listed = await whitelistRegistry.read.isWhitelisted([FAKE_TOKEN, BASE_MAINNET_CHAIN_ID]);
    assert.equal(listed, true);
  });

  it("non-owner cannot approve", async () => {
    const { whitelistRegistry, otherAccounts } = await loadFixture(deployWhitelistRegistry);
    await assert.rejects(
      whitelistRegistry.write.approveToken([FAKE_TOKEN, BASE_MAINNET_CHAIN_ID], {
        account: otherAccounts[0].account,
      }),
      /OwnableUnauthorizedAccount/
    );
  });

  // ... etc
});
```

**Key viem contract API (Hardhat 3):**
- `contract.read.functionName([...args])` — calls view/pure functions
- `contract.write.functionName([...args], { account?: WalletClient["account"] })` — sends a transaction; by default uses `hre.viem.getWalletClients()[0]` (the owner in our fixture)
- `contract.simulate.functionName([...args], options)` — dry-run without broadcast (useful for asserting reverts without gas)
- Contract addresses are available as `contract.address` (typed as `Address`)
- All `uint256` parameters pass as `bigint` in TypeScript/viem (e.g. `8453n`)

**Checking reverts:** `await assert.rejects(promise, /ErrorName/)` matches the error name in the thrown error string. Alternatively:
```typescript
await assert.rejects(
  contract.simulate.approveToken([...], { account: nonOwner }),
  (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
);
```

**Checking events:** After a write call, retrieve the transaction receipt and parse logs:
```typescript
const txHash = await whitelistRegistry.write.approveToken([FAKE_TOKEN, chainId]);
const publicClient = await hre.viem.getPublicClient();
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
// receipt.logs contains raw logs — or use contract.getEvents.TokenApproved() after the block
```

### Fixture Pattern — `test/fixtures/index.ts`

Replace the current `export {}` stub with the `deployWhitelistRegistry` factory. It will be extended by Stories 1.3, 1.4, and 1.5 (each story adds its own deploy fixture here). Keep all existing exports when adding new ones.

```typescript
// contracts/test/fixtures/index.ts
import hre from "hardhat";

export async function deployWhitelistRegistry() {
  const [owner, ...otherAccounts] = await hre.viem.getWalletClients();
  const whitelistRegistry = await hre.viem.deployContract("WhitelistRegistry", [
    owner.account.address, // OZ v5 Ownable — initialOwner required
  ]);
  return { whitelistRegistry, owner, otherAccounts };
}
```

### chainId as `bigint` in TypeScript

In viem (and Hardhat 3 with hardhat-viem), Solidity `uint256` parameters are passed as TypeScript `bigint`. Always suffix chain ID literals with `n`:
```typescript
const BASE_MAINNET = 8453n;         // ✅
const BASE_TESTNET = 84532n;        // ✅
const SONIC_MAINNET = 146n;         // ✅
// const BASE_MAINNET = 8453;       // ❌ — will throw type error or be coerced incorrectly
```

### System Integration Context (Future Stories Depend on This)

`WhitelistRegistry.sol` is the **dependency of `LeagueFactory.sol` (Story 1.4)**. The factory constructor will accept a `WhitelistRegistry` address and call `isWhitelisted(token, chainId)` before creating a league with `TokenNotWhitelisted` revert on failure. Design this contract with that consumer in mind:

- The `isWhitelisted` function signature must remain stable — Story 1.4 calls it
- Events are consumed by the indexer (Story 1.8+) — `TokenApproved` and `TokenRemoved` are the source of truth for what tokens are in the backend token list

**Indexer contract events expected (architecture):**
| Event | Emitted when | Consumed by |
|---|---|---|
| `TokenApproved(address indexed token, uint256 indexed chainId)` | `approveToken` | Backend indexer (Epic 9) |
| `TokenRemoved(address indexed token, uint256 indexed chainId)` | `removeToken` | Backend indexer (Epic 9) |

The indexer doesn't exist yet — but design events correctly now so they can be reliably indexed later. Indexing on `indexed` parameters is critical for log filtering efficiency.

### Architecture Compliance Checklist

- [ ] `WhitelistRegistry.sol` in `contracts/contracts/` ✓ (architecture spec path)
- [ ] Test in `contracts/test/WhitelistRegistry.test.ts` ✓ (architecture spec path)
- [ ] Fixtures in `contracts/test/fixtures/index.ts` ✓
- [ ] OZ `Ownable` + `ReentrancyGuard` on payout functions (no payouts in this contract so no ReentrancyGuard needed here)
- [ ] Custom error on every revert (not string errors) ✓ — architecture mandates this
- [ ] Events on every state mutation ✓ — required for indexer event-driven architecture
- [ ] Solidity `0.8.28` ✓ (already set in `hardhat.config.ts`)
- [ ] `@openzeppelin/contracts@^5.6.1` ✓ (already installed)

### OZ v5 Import Paths Used in This Story

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
```

These are both present in OZ v5.6.1 (already installed in `contracts/node_modules/`).

### Project Structure Notes

- `contracts/contracts/WhitelistRegistry.sol` — new file (Solidity source lives in `contracts/contracts/`, not `contracts/`)
- `contracts/test/WhitelistRegistry.test.ts` — new test file
- `contracts/test/fixtures/index.ts` — modify (add export, keep `export {}` removed, replace with actual exports)
- No changes to `hardhat.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`, or `.env.example`

### References

- [Source: epics.md#Story 1.2] — Acceptance criteria, `approveToken`, `removeToken`, `isWhitelisted`, `getWhitelistedTokens`
- [Source: architecture.md#Smart Contract Patterns] — Custom errors, events on every state mutation, OZ Ownable, no server-side key
- [Source: architecture.md#Project Structure] — File locations: `contracts/contracts/WhitelistRegistry.sol`, `test/WhitelistRegistry.test.ts`, `test/fixtures/`
- [Source: architecture.md#Contracts — Hardhat] — `@openzeppelin/contracts`, `hardhat-verify`, viem-based toolchain
- [Source: 1-1-hardhat-contracts-repo-init-and-config.md#Completion Notes] — Hardhat 3 confirmed ESM, `node:test` runner, `hre.viem` for tests, NodeNext `.js` extension requirement, `configVariable()` pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **Hardhat 3 viem API**: `hre.viem` does NOT exist on the root `hre` object. Viem helpers are on `NetworkConnection` only. Use `hre.network.getOrCreate()` (preferred) or `hre.network.connect()` (deprecated) to get a connection, then call `connection.viem.getWalletClients()`, `connection.viem.deployContract()`, etc. Return `connection` from fixtures for use in tests that call `connection.viem.getPublicClient()`.
- **`loadFixture` not a named export in Hardhat 3**: `@nomicfoundation/hardhat-network-helpers` in Hardhat 3 only exports the plugin default. `loadFixture` is a method on `NetworkConnection.networkHelpers`. For test isolation, deploy a fresh contract in each test by calling the fixture function directly — each deploy creates a new contract at a new address, so tests operate on isolated state.
- **Per-chain deployment, no chainId param**: The original epics spec had `uint8 chainId` params. Redesigned: one `WhitelistRegistry` per chain, no chainId in any function. The app calls the correct chain's contract address.
- **`InvalidTokenAddress` guard**: `approveToken` rejects `address(0)` and any address with `token.code.length == 0` (EOA). Admin UI mirrors this: `eth_getCode` check before enabling the Approve button.
- **MockERC20 required for tests**: Because `approveToken` enforces `code.length > 0`, tests cannot use hardcoded mainnet addresses. `contracts/contracts/mocks/MockERC20.sol` is deployed in the fixture and its addresses used throughout tests.
- **Event filter scoped to block**: `getEvents` calls now pass `{ fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }` to avoid cross-test event leakage.
- **`hre.network.getOrCreate()` vs `connect()`**: `connect()` is deprecated in Hardhat 3. Use `getOrCreate()` — it returns a cached connection to the in-process localhost network, which is what tests use.

### File List

- `contracts/contracts/WhitelistRegistry.sol` — NEW
- `contracts/contracts/mocks/MockERC20.sol` — NEW (test helper)
- `contracts/test/fixtures/index.ts` — MODIFIED
- `contracts/test/WhitelistRegistry.test.ts` — NEW

### Change Log

- 2026-04-27: Story 1.2 implemented. WhitelistRegistry.sol created and compiled. 14 tests passing.
- 2026-04-27: Post-review patches — per-chain redesign, InvalidTokenAddress guard, MockERC20, block-scoped event filters. 14 tests passing.
