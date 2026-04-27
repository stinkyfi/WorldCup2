# Story 1.5: League.sol

Status: done

## Story

As a player,
I want a `League` contract that manages the full lifecycle of a single league (entry, lock, results, dispute window, payout),
So that all financial operations and state transitions are trustlessly enforced on-chain.

## Acceptance Criteria

1. **Given** a player calls `enter(bytes32 commitmentHash)` before lock time with the correct entry fee in the league's whitelisted token **When** max entries and max entries per wallet have not been reached **Then** their entry is recorded, fee transferred from player to contract via SafeERC20, `EntrySubmitted(address indexed player, bytes32 hash)` emitted.

2. **Given** lock time has passed **When** any address calls `enter` **Then** the transaction reverts with `LeagueLocked`.

3. **Given** `minThreshold > 0` and lock time has passed and total entries are below the threshold **When** anyone calls `checkThreshold()` **Then** state transitions to `Refunding`, `LeagueRefunding()` emitted; any entrant can then call `claimRefund()` to recover all their paid entry fees.

4. **Given** the league is in `Active` or `Refunding` state before the Merkle root is set **When** the `devWallet` calls `setMerkleRoot(bytes32 root)` **Then** the root is stored, `merkleRootSetAt` timestamp recorded, state transitions to `Resolved`, `MerkleRootSet(bytes32 root)` emitted.

5. **Given** a winner calls `claimPrize(uint256 amount, bytes32[] calldata proof)` with a valid Merkle proof and the league is `Resolved` **When** the claim has not already been used **Then** `amount` of `token` is transferred to the caller and `PrizeClaimed(address indexed player, uint256 amount)` emitted.

6. **Given** a valid `claimPrize` call is made **When** a second call is made with the same proof **Then** the transaction reverts with `AlreadyClaimed`.

7. **Given** 90 days have elapsed since `merkleRootSetAt` and unclaimed token balance remains **When** `devWallet` calls `sweepUnclaimed()` **Then** all remaining token balance transfers to `devWallet` and `UnclaimedSwept(uint256 amount)` emitted.

8. **Given** `claimPrize`, `claimRefund`, and `claimFee` functions exist **When** a re-entrancy attack is attempted via a malicious ERC-20 callback **Then** the second call reverts due to `ReentrancyGuard`.

## Tasks / Subtasks

- [x] Task 1: Replace the `League` contract stub body — implement state variables, events, errors, and constructor (AC: all)
  - [x] Add `enum LeagueState { Active, Refunding, Resolved }` at file scope (or inside contract)
  - [x] Add all `immutable` config fields from constructor args and params struct (see Dev Notes)
  - [x] Add all mutable state variables: `state`, `totalEntries`, entrant tracking, `merkleRoot`, `merkleRootSetAt`, claim tracking
  - [x] Declare all events (see Dev Notes)
  - [x] Declare all custom errors (see Dev Notes)
  - [x] Validate constructor args — revert `InvalidAddress` for zero `creator`/`oracleController`/`devWallet`, validate `devFeeBps + creatorFeeCap <= MAX_FEE_BPS`
  - [x] `npx hardhat compile` exits 0

- [x] Task 2: Implement `enter(bytes32 commitmentHash)` (AC: 1, 2)
  - [x] Revert `LeagueLocked` if `block.timestamp >= lockTime`
  - [x] Revert `MaxEntriesReached` if `maxEntries > 0 && totalEntries >= maxEntries`
  - [x] Revert `MaxEntriesPerWalletReached` if `maxEntriesPerWallet > 0 && _walletEntryCount[msg.sender] >= maxEntriesPerWallet`
  - [x] Use `SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), entryFee)`
  - [x] Update `_walletEntryCount[msg.sender]`, append `msg.sender` to `_entrantsList` if first entry for this wallet, increment `totalEntries`
  - [x] Emit `EntrySubmitted(msg.sender, commitmentHash)`
  - [x] Mark `nonReentrant`

- [x] Task 3: Implement `checkThreshold()` (AC: 3)
  - [x] Revert if `block.timestamp < lockTime` — threshold check only makes sense after lock
  - [x] Revert if `state != Active`
  - [x] If `minThreshold == 0` (no threshold set), do nothing and return
  - [x] If `totalEntries >= minThreshold`, revert `ThresholdMet` (league is healthy)
  - [x] Set `state = Refunding`, emit `LeagueRefunding()`

- [x] Task 4: Implement `claimRefund()` (AC: 3)
  - [x] Revert `LeagueNotRefunding` if `state != Refunding`
  - [x] Revert `NoRefundDue` if `_walletEntryCount[msg.sender] == 0` or already refund-claimed
  - [x] Calculate refund = `_walletEntryCount[msg.sender] * entryFee`
  - [x] Mark refund claimed for caller
  - [x] `SafeERC20.safeTransfer(IERC20(token), msg.sender, refund)`
  - [x] Emit `RefundClaimed(msg.sender, refund)`
  - [x] Mark `nonReentrant`

- [x] Task 5: Implement `setMerkleRoot(bytes32 root)` (AC: 4)
  - [x] Revert `NotAuthorized` if `msg.sender != devWallet`
  - [x] Revert `InvalidParams` if `root == bytes32(0)`
  - [x] Revert `MerkleRootAlreadySet` if `merkleRoot != bytes32(0)`
  - [x] Set `merkleRoot = root`, `merkleRootSetAt = block.timestamp`, `state = Resolved`
  - [x] Emit `MerkleRootSet(root)`

- [x] Task 6: Implement `claimPrize(uint256 amount, bytes32[] calldata proof)` (AC: 5, 6)
  - [x] Revert `LeagueNotResolved` if `state != Resolved`
  - [x] Build leaf: `keccak256(abi.encodePacked(msg.sender, amount, uint8(0)))` — claimType 0 = prize
  - [x] Revert `InvalidProof` if `!MerkleProof.verify(proof, merkleRoot, leaf)`
  - [x] Revert `AlreadyClaimed` if `_claimed[leaf]`
  - [x] Set `_claimed[leaf] = true`
  - [x] `SafeERC20.safeTransfer(IERC20(token), msg.sender, amount)`
  - [x] Emit `PrizeClaimed(msg.sender, amount)`
  - [x] Mark `nonReentrant`

- [x] Task 7: Implement `claimFee(uint256 amount, bytes32[] calldata proof)` (AC: 8)
  - [x] Same Merkle verification pattern as `claimPrize` but `claimType = 1` (fee claim)
  - [x] Revert `LeagueNotResolved` if `state != Resolved`
  - [x] Leaf: `keccak256(abi.encodePacked(msg.sender, amount, uint8(1)))`
  - [x] Revert `InvalidProof` / `AlreadyClaimed` per same pattern
  - [x] `SafeERC20.safeTransfer(IERC20(token), msg.sender, amount)`
  - [x] Emit `FeeClaimed(msg.sender, amount)`
  - [x] Mark `nonReentrant`

- [x] Task 8: Implement `sweepUnclaimed()` (AC: 7)
  - [x] Revert `NotAuthorized` if `msg.sender != devWallet`
  - [x] Revert `LeagueNotResolved` if `state != Resolved`
  - [x] Revert `UnclaimedNotExpired` if `block.timestamp < merkleRootSetAt + UNCLAIMED_EXPIRY`
  - [x] Transfer full remaining token balance to `devWallet`
  - [x] Emit `UnclaimedSwept(amount)`

- [x] Task 9: Create `contracts/test/League.test.ts` and add fixture (AC: all)
  - [x] Add `deployLeague()` fixture to `contracts/test/fixtures/index.ts`
  - [x] Write tests covering all 8 ACs including edge cases (see Dev Notes)
  - [x] `npm test` exits 0 — 90 contract `node:test` cases passing (includes new League suite)

- [x] Task 10: Verify
  - [x] `npx hardhat compile` exits 0 with no warnings
  - [x] `npm test` exits 0 — all League tests AND all prior tests pass

## Dev Notes

### ⚠️ Hardhat 3 — This Project Uses ESM (NOT CommonJS)

Same rules as Stories 1.2–1.4 — do not deviate:

- All TypeScript files compile to ESM — use `import`/`export`, never `require()`
- `tsconfig.json` uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
- **All relative imports in `.ts` files MUST use `.js` extension** — e.g. `import { deployLeague } from "./fixtures/index.js"`
- Test framework: `import { describe, it } from "node:test"` + `import assert from "node:assert/strict"` — NOT Mocha/Chai
- No `loadFixture` — call fixture functions directly inside each `it()` block

### ⚠️ Hardhat 3 — viem via network connection (NOT hre.viem)

```typescript
// In fixtures and tests — ALWAYS use this pattern:
const connection = await hre.network.getOrCreate("hardhat");

// Public client
const publicClient = await connection.viem.getPublicClient();

// Wallet clients
const walletClients = await connection.viem.getWalletClients();

// Deploy contract
const contract = await connection.viem.deployContract("ContractName", [arg1, arg2]);

// Get existing contract by address
const instance = await connection.viem.getContractAt("ContractName", address);

// NEVER use hre.viem.* — it does not exist in this project's Hardhat version
// NEVER use hre.network.connect() — deprecated
```

### ⚠️ Event querying pattern

```typescript
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const events = await contract.getEvents.EventName(
  {},
  { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
);
```

### ⚠️ Revert testing pattern

```typescript
await assert.rejects(
  contract.simulate.functionName([args], { account: wallet.account }),
  (err: Error) => err.message.includes("ErrorName")
);
```

### ⚠️ ERC-20 token approvals in tests

`enter()` calls `safeTransferFrom` which requires prior `approve`. The test fixture must call:
```typescript
await token.write.approve([leagueAddress, entryFee], { account: player.account });
```
For multi-entry tests, approve `entryFee * numEntries`.

### Contract Design — State Variables

```solidity
// ─── Constants ───────────────────────────────────────────────────────────────
uint256 public constant MAX_FEE_BPS = 1000;        // 10% hard cap: devFee + creatorFee combined
uint256 public constant UNCLAIMED_EXPIRY = 90 days; // sweep window after merkleRootSetAt

// ─── Immutable config (set in constructor, never changed) ───────────────────
address public immutable creator;
address public immutable oracleController;   // stored for transparency; not called by League itself
address public immutable devWallet;
uint256 public immutable devFeeBps;          // platform dev fee in bps (snapshotted from factory)
uint256 public immutable creatorFeeCap;      // max creator fee in bps (snapshotted from factory)
address public immutable token;              // ERC-20 entry/payout token
uint256 public immutable entryFee;           // per-entry fee in token smallest units
uint256 public immutable maxEntries;         // 0 = no cap
uint256 public immutable maxEntriesPerWallet;// 0 = no cap
uint256 public immutable minThreshold;       // 0 = no refund threshold
RevisionPolicy public immutable revisionPolicy;
uint256 public immutable lockTime;           // Unix timestamp — entries blocked on or after this

// ─── State machine ───────────────────────────────────────────────────────────
LeagueState public state;  // Active → Refunding OR Active → Resolved

// ─── Entry tracking ──────────────────────────────────────────────────────────
uint256 public totalEntries;
address[] private _entrantsList;                          // for refund iteration (no duplicates)
mapping(address => uint256) private _walletEntryCount;   // entries per wallet (refund amount calc)
mapping(address => bool) private _refundClaimed;         // claimed refund flag

// ─── Merkle claim ─────────────────────────────────────────────────────────────
bytes32 public merkleRoot;
uint256 public merkleRootSetAt;
mapping(bytes32 => bool) private _claimed;               // leaf hash → claimed
```

### Contract Design — Events

```solidity
event EntrySubmitted(address indexed player, bytes32 commitmentHash);
event LeagueRefunding();
event MerkleRootSet(bytes32 indexed root);
event PrizeClaimed(address indexed player, uint256 amount);
event FeeClaimed(address indexed claimant, uint256 amount);
event RefundClaimed(address indexed player, uint256 amount);
event UnclaimedSwept(uint256 amount);
```

### Contract Design — Custom Errors

```solidity
error LeagueLocked();               // enter() called on/after lockTime
error LeagueNotActive();            // operation requires Active state
error LeagueNotRefunding();         // claimRefund() when state != Refunding
error LeagueNotResolved();          // claimPrize/claimFee/sweepUnclaimed when state != Resolved
error MaxEntriesReached();          // totalEntries >= maxEntries (and maxEntries > 0)
error MaxEntriesPerWalletReached(); // wallet already at limit
error ThresholdMet();               // checkThreshold() when entries >= minThreshold
error MerkleRootAlreadySet();       // setMerkleRoot() called twice
error InvalidProof();               // Merkle proof verification fails
error AlreadyClaimed();             // leaf already used
error NoRefundDue();                // claimRefund() with no entries or already claimed
error UnclaimedNotExpired();        // sweepUnclaimed() before 90-day window
error NotAuthorized();              // setMerkleRoot/sweepUnclaimed called by non-devWallet
error InvalidAddress();             // zero address in constructor
error InvalidParams();              // zero root or fee overflow
```

### Contract Design — Merkle Leaf Encoding

Use a `claimType` discriminator to prevent prize and fee claims from sharing the same leaf (which would allow a claimant to use a fee leaf to claim a prize and vice-versa):

```solidity
// Prize claim leaf (claimType = 0)
bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount, uint8(0)));

// Fee claim leaf (claimType = 1)
bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount, uint8(1)));
```

The indexer MUST encode leaves with the same discriminator when building the Merkle tree.
The `_claimed[leaf]` mapping reuses the leaf as the key — no separate nonce needed.

### Required Imports

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./League.sol"; // RevisionPolicy, LeagueParams already at file scope in League.sol
```

`MerkleProof` is at `@openzeppelin/contracts/utils/cryptography/MerkleProof.sol` in OZ v5.

### Constructor Signature (existing — must not change)

The stub constructor from Story 1.4 is:
```solidity
constructor(
    address /*creator*/,
    address /*oracleController*/,
    address /*devWallet*/,
    uint256 /*devFeeBps*/,
    uint256 /*creatorFeeCap*/,
    LeagueParams memory /*params*/
) {}
```

Story 1.5 fills in the body and adds `immutable` assignments. The signature **must stay identical** — `LeagueFactory.sol` calls `new League(...)` with this exact arg order.

### Entry — Token Approval Requirement

`enter()` calls `IERC20(token).safeTransferFrom(msg.sender, address(this), entryFee)`.
Players must call `token.approve(leagueAddress, entryFee)` before calling `enter()`.
LeagueFactory does NOT handle approvals — this is player responsibility (same as any DeFi protocol).

### checkThreshold() — Design Notes

- Only callable after `lockTime` (revert `LeagueNotActive` if before lock OR if already Refunding/Resolved)
- Only meaningful if `minThreshold > 0` — if `minThreshold == 0`, function returns without state change (no revert, no event)
- If `totalEntries >= minThreshold` → revert `ThresholdMet` (caller should not have called it)
- `_entrantsList` enables refund iteration in tests — the contract itself uses `_walletEntryCount[player]` for per-player refunds (no loop needed in `claimRefund`)

### setMerkleRoot() — Authorization

`setMerkleRoot` is restricted to `devWallet` (the platform operator who runs the indexer service). This keeps authorization simple without introducing a separate indexer address. The `devWallet` restriction is enforced via `if (msg.sender != devWallet) revert NotAuthorized()`.

### sweepUnclaimed() — Balance Transfer

```solidity
uint256 remaining = IERC20(token).balanceOf(address(this));
if (remaining == 0) return; // nothing to sweep
SafeERC20.safeTransfer(IERC20(token), devWallet, remaining);
emit UnclaimedSwept(remaining);
```

### Fixture Design — `deployLeague()`

Add to `contracts/test/fixtures/index.ts`:

```typescript
export async function deployLeague() {
  const connection = await hre.network.getOrCreate("hardhat");
  const walletClients = await connection.viem.getWalletClients();
  const [owner, devWalletClient, creator, oracle, player1, player2, ...rest] = walletClients;

  // Deploy token
  const token = await connection.viem.deployContract("MockERC20", ["TestToken", "TTK"]);

  // Mint entry tokens to player1 and player2
  const ENTRY_FEE = 5_000_000_000_000_000_000n; // 5 tokens
  await token.write.mint([player1.account.address, ENTRY_FEE * 10n]);
  await token.write.mint([player2.account.address, ENTRY_FEE * 10n]);

  // lockTime = 7 days from now (deterministic)
  const lockTime = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

  const params: LeagueParams = {
    token: token.address,
    entryFee: ENTRY_FEE,
    maxEntries: 100n,
    maxEntriesPerWallet: 5n,
    minThreshold: 2n,  // 2 entries required
    revisionPolicy: 0, // Locked
    lockTime,
  };

  const league = await connection.viem.deployContract("League", [
    creator.account.address,
    oracle.account.address,    // oracleController (any non-zero address)
    devWalletClient.account.address,
    200n,  // devFeeBps = 2%
    300n,  // creatorFeeCap = 3%
    params,
  ]);

  return {
    league,
    token,
    owner,
    devWallet: devWalletClient,
    creator,
    oracle,
    player1,
    player2,
    otherAccounts: rest,
    connection,
    entryFee: ENTRY_FEE,
    lockTime,
    params,
  };
}
```

**Important type note:** `LeagueParams` is a Solidity struct — pass as a tuple object with fields in order (viem handles struct → tuple automatically).

### Test Coverage Requirements

Write `contracts/test/League.test.ts` covering at minimum:

**AC1 — Entry happy path:**
- Player approves token and enters → `EntrySubmitted` emitted, contract holds `entryFee`
- Second player enters → `totalEntries == 2`
- Same player enters twice (within wallet limit) → `_walletEntryCount` increments

**AC2 — Entry after lock:**
- Manipulate time (use `hre.network.provider.send("evm_setNextBlockTimestamp", ...)` + `evm_mine`) to advance past `lockTime`
- `enter()` reverts with `LeagueLocked`

**AC2/edges — Entry caps:**
- Deploy league with `maxEntries: 1n` → second entry reverts `MaxEntriesReached`
- Deploy league with `maxEntriesPerWallet: 1n` → same player second entry reverts `MaxEntriesPerWalletReached`

**AC3 — checkThreshold + claimRefund:**
- Advance time past lockTime, only 1 entry (threshold=2) → `checkThreshold()` → state=Refunding, `LeagueRefunding` emitted
- Player calls `claimRefund()` → receives `entryFee` back, `RefundClaimed` emitted
- Second `claimRefund()` by same player reverts `NoRefundDue`
- `claimRefund()` before threshold checked reverts `LeagueNotRefunding`
- `checkThreshold()` when `minThreshold=0` does nothing (no revert, no event, state stays Active)
- `checkThreshold()` when entries >= threshold reverts `ThresholdMet`

**AC4 — setMerkleRoot:**
- devWallet calls `setMerkleRoot(validRoot)` → state=Resolved, `MerkleRootSet` emitted
- Non-devWallet call reverts `NotAuthorized`
- Zero root reverts `InvalidParams`
- Second call reverts `MerkleRootAlreadySet`

**AC5/6 — claimPrize:**
- Build real Merkle tree off-chain (in test) with player1 amount; compute proof; player1 claims → balance increases
- Double claim reverts `AlreadyClaimed`
- Wrong proof reverts `InvalidProof`
- `claimPrize` before Resolved reverts `LeagueNotResolved`

**AC7 — sweepUnclaimed:**
- Set Merkle root, manipulate time forward 90 days + 1 second, devWallet sweeps → `UnclaimedSwept`
- Before 90 days reverts `UnclaimedNotExpired`
- Non-devWallet reverts `NotAuthorized`

**AC8 — claimFee:**
- Build Merkle leaf with claimType=1 (fee), creator calls `claimFee` → `FeeClaimed` emitted
- Wrong claimType (using prize leaf for claimFee) reverts `InvalidProof`

### Merkle Tree Construction in Tests

Use the `merkletreejs` package which is already a dependency of `merkleBuilder.ts` in the architecture. Check if it's installed in `contracts/package.json`; if not, install it. If not present, implement a minimal 2-leaf tree manually:

```typescript
import { keccak256, encodePacked } from "viem";

// Build a 2-leaf tree manually for tests
function makeLeaf(address: `0x${string}`, amount: bigint, claimType: number): `0x${string}` {
  return keccak256(encodePacked(
    ["address", "uint256", "uint8"],
    [address, amount, claimType]
  ));
}

// For a simple 2-leaf tree:
// root = keccak256(sort(leaf1, leaf2))
// proof for leaf1 = [leaf2], proof for leaf2 = [leaf1]
function makeRoot(leaf1: `0x${string}`, leaf2: `0x${string}`): `0x${string}` {
  const sorted = [leaf1, leaf2].sort();
  return keccak256(encodePacked(["bytes32", "bytes32"], [sorted[0], sorted[1]]));
}

function makeProof(myLeaf: `0x${string}`, otherLeaf: `0x${string}`): `0x${string}`[] {
  return [otherLeaf];
}
```

**Critical:** OZ `MerkleProof.sol` concatenates siblings in SORTED order (smaller hash first). Ensure your off-chain tree uses the same sort-before-hash convention. If using `merkletreejs`, set `{ sortPairs: true }`.

### Time Manipulation in Tests

```typescript
// Advance past lockTime
await hre.network.provider.send("evm_setNextBlockTimestamp", [Number(lockTime) + 1]);
await hre.network.provider.send("evm_mine", []);
```

This is available in Hardhat's EVM network and works in the `node:test` runner.

### ⚠️ DO NOT add a `creatorFeeBps` field to LeagueParams

The factory already deployed and tested `LeagueFactory` with the current `LeagueParams` struct. Adding fields would break existing tests. The creator fee is encoded in the Merkle tree by the indexer; the on-chain `creatorFeeCap` is stored for transparency only.

### ⚠️ DO NOT change the `RevisionPolicy` enum or `LeagueParams` struct

These are at file scope in `League.sol` and imported by `LeagueFactory.sol`. Any changes would require recompiling and retesting the factory. Both are correct as-is for Story 1.5.

### ⚠️ Prior Tests Must Continue to Pass

After Story 1.5, `npm test` must show all prior tests passing plus all new League tests (90 `node:test` cases as of completion).

## Dev Agent Record

### Implementation Plan

- Implemented full `League` lifecycle per story: constructor validation, `enter`, `checkThreshold`, `claimRefund`, `setMerkleRoot`, `claimPrize`, `claimFee`, `sweepUnclaimed` with `ReentrancyGuard` on external value-transfer paths.
- `checkThreshold`: `minThreshold == 0` early return (no-op after lock); otherwise transition to `Refunding` when below threshold.
- Tests: `deployLeague()` fixture, viem Merkle helpers aligned with OZ sorted pairs, `getEventSelector` for parameterless `LeagueRefunding` log assertion.

### Debug Log

- Restored `minThreshold == 0` no-op in `checkThreshold` (removed temporary `InvalidParams` revert).
- `getEvents.LeagueRefunding` did not return logs in Hardhat viem; asserted `LeagueRefunding` via `receipt.logs` + `getEventSelector("LeagueRefunding()")`.

### Completion Notes

- `npx hardhat compile` and `npm test` succeed in `contracts/` (90 passing `node:test` cases).
- Code review patch applied: AC4 `setMerkleRoot` from **Refunding** integration test.
- Story status **done**; sprint `1-5-leaguesol` **done**.

## File List

- `contracts/contracts/League.sol`
- `contracts/test/League.test.ts`
- `contracts/test/fixtures/index.ts`

## Change Log

- **2026-04-27:** Story 1.5 — `League.sol` implementation, `League.test.ts` + `deployLeague` fixture; `checkThreshold` fix; test event assertion fix; story and sprint marked review.
- **2026-04-27:** Code review — AC4 Refunding → `setMerkleRoot` test added; story and sprint marked **done**.

### Review Findings

- [x] [Review][Patch] Add test: `setMerkleRoot` succeeds when league is in `Refunding` (AC4) — applied 2026-04-27 [contracts/test/League.test.ts]

- [x] [Review][Defer] `creator` and `oracleController` immutables are stored but unused in `League.sol` in this story — deferred, expected for later oracle/creator flows [contracts/contracts/League.sol]

- [x] [Review][Defer] `_entrantsList` is written on first entry per wallet but never read on-chain in this story — deferred unless a follow-up story needs enumeration or gas cleanup [contracts/contracts/League.sol]
