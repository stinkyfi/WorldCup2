# Story 1.1: Hardhat Contracts Repo — Init & Config

Status: done

## Story

As a developer,
I want a fully configured Hardhat TypeScript project in `contracts/`,
So that smart contract development, testing, and deployment can begin immediately with consistent tooling.

## Acceptance Criteria

1. **Given** no `contracts/` directory exists **When** I run the repo initialisation **Then** `contracts/` is created with Hardhat TypeScript config, `hardhat.config.ts` targeting Base, Ethereum, and Sonic testnets & mainnets, `@openzeppelin/contracts` and `viem` installed, `.env.example` with all required keys documented, and `npm test` runs with 0 errors on an empty test suite.

2. **Given** a developer checks out the repo fresh **When** they run `npm install` in `contracts/` **Then** all dependencies install without errors and `npx hardhat compile` succeeds with no contracts present.

3. **Given** `.env.*` files are in `.gitignore` **Then** no private keys are ever committed to the repo.

## Tasks / Subtasks

- [x] Task 1: Initialise Hardhat 3 TypeScript project in `contracts/` (AC: #1, #2)
  - [x] Create `contracts/` directory at project root
  - [x] Run `npx hardhat --init` inside `contracts/` — select TypeScript + viem toolbox when prompted (or create `package.json`/`hardhat.config.ts` manually if non-interactive environment — see Dev Notes)
  - [x] Verify default init output compiles: `npx hardhat compile` succeeds

- [x] Task 2: Configure `hardhat.config.ts` with all required networks (AC: #1)
  - [x] Set Solidity compiler version to `"0.8.28"` (latest stable, compatible with OZ v5)
  - [x] Configure `localhost` network (default Hardhat node — no env vars needed)
  - [x] Configure `base-testnet` (Base Sepolia — chainId 84532)
  - [x] Configure `base-mainnet` (Base Mainnet — chainId 8453)
  - [x] Configure `ethereum-sepolia` (Sepolia — chainId 11155111)
  - [x] Configure `ethereum-mainnet` (Ethereum Mainnet — chainId 1)
  - [x] Configure `sonic-testnet` (Sonic Blaze — chainId 57054)
  - [x] Configure `sonic-mainnet` (Sonic Mainnet — chainId 146)
  - [x] All non-localhost networks read RPC URL and deployer key from `.env` via `dotenv`
  - [x] Add `etherscan` (block explorer verification) config for all 6 non-localhost networks — see Dev Notes for Sonic custom API URL

- [x] Task 3: Install required dependencies (AC: #1, #2)
  - [x] Install production dependency: `@openzeppelin/contracts@^5.6.1`
  - [x] Install dev dependency: `dotenv` (for loading `.env.*` in deploy scripts and config)
  - [x] Confirm `viem` is present (bundled via `@nomicfoundation/hardhat-toolbox-viem`)
  - [x] Confirm `@nomicfoundation/hardhat-verify` is present (bundled via toolbox)
  - [x] Run `npm install` from clean state and verify zero errors

- [x] Task 4: Create `.env.example` with all required keys documented (AC: #1, #3)
  - [x] Add `RPC_URL_BASE_TESTNET`, `RPC_URL_BASE_MAINNET`
  - [x] Add `RPC_URL_ETHEREUM_SEPOLIA`, `RPC_URL_ETHEREUM_MAINNET`
  - [x] Add `RPC_URL_SONIC_TESTNET`, `RPC_URL_SONIC_MAINNET`
  - [x] Add `DEPLOYER_KEY` (0x-prefixed private key — never the real key, just the var name with placeholder)
  - [x] Add `BASESCAN_API_KEY`, `ETHERSCAN_API_KEY`, `SONICSCAN_API_KEY`
  - [x] Each key has an inline comment describing its purpose

- [x] Task 5: Configure `.gitignore` to protect secrets (AC: #3)
  - [x] Add `.env`, `.env.*` (catch all env variants: `.env.base`, `.env.ethereum`, `.env.sonic`, `.env.local`, etc.)
  - [x] Add `artifacts/`, `cache/`, `deployments/` (generated output — not committed)
  - [x] Add `node_modules/`
  - [x] Verify `.env.example` is NOT in gitignore (it should be committed)

- [x] Task 6: Create directory scaffold matching architecture spec (AC: #1)
  - [x] Create `contracts/contracts/` directory (Solidity source files go here — empty for this story)
  - [x] Create `contracts/scripts/` directory with `helpers.ts` stub (deploy utilities for Story 1.7)
  - [x] Create `contracts/test/` directory with `fixtures/` subdirectory
  - [x] Create `contracts/test/fixtures/index.ts` stub (shared fixtures for Stories 1.2–1.6)

- [x] Task 7: Verify complete setup (AC: #1, #2, #3)
  - [x] `npm test` in `contracts/` exits with code 0 (empty suite — no test files yet)
  - [x] `npx hardhat compile` exits with code 0 (no contracts yet — just the empty dir)
  - [x] `git status` confirms no `.env` or secret files are tracked
  - [x] Confirm `tsconfig.json` is present and valid

## Dev Notes

### ⚠️ Hardhat 3 vs Hardhat 2 — Critical Difference

**Use Hardhat 3** (`hardhat@^3.4.1` — current as of April 2026). The architecture was written referencing `npx hardhat init` (Hardhat 2 syntax). Hardhat 3 changes this to `npx hardhat --init`. Use Hardhat 3 because:
- It's the current stable release (v3.4.1, published 5 days ago as of writing)
- `@nomicfoundation/hardhat-toolbox-viem` aligns with the project's viem-first tech stack (backend + frontend both use `viem`)
- Avoids bringing ethers.js into the contracts repo when the rest of the project avoids it

**Key Hardhat 3 differences from v2:**
- Init command: `npx hardhat --init` (note the `--`)
- Recommended toolbox: `@nomicfoundation/hardhat-toolbox-viem` (not the ethers-based toolbox)
- `@nomicfoundation/hardhat-verify` is bundled inside `hardhat-toolbox-viem`
- Node.js v22+ required

### `hardhat.config.ts` Pattern

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
dotenv.config();

const deployerKey = process.env.DEPLOYER_KEY ?? "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    "base-testnet": {
      url: process.env.RPC_URL_BASE_TESTNET ?? "",
      accounts: [deployerKey],
      chainId: 84532,
    },
    "base-mainnet": {
      url: process.env.RPC_URL_BASE_MAINNET ?? "",
      accounts: [deployerKey],
      chainId: 8453,
    },
    "ethereum-sepolia": {
      url: process.env.RPC_URL_ETHEREUM_SEPOLIA ?? "",
      accounts: [deployerKey],
      chainId: 11155111,
    },
    "ethereum-mainnet": {
      url: process.env.RPC_URL_ETHEREUM_MAINNET ?? "",
      accounts: [deployerKey],
      chainId: 1,
    },
    "sonic-testnet": {
      url: process.env.RPC_URL_SONIC_TESTNET ?? "",
      accounts: [deployerKey],
      chainId: 57054,
    },
    "sonic-mainnet": {
      url: process.env.RPC_URL_SONIC_MAINNET ?? "",
      accounts: [deployerKey],
      chainId: 146,
    },
  },
  etherscan: {
    apiKey: {
      "base-testnet": process.env.BASESCAN_API_KEY ?? "",
      "base-mainnet": process.env.BASESCAN_API_KEY ?? "",
      "ethereum-sepolia": process.env.ETHERSCAN_API_KEY ?? "",
      "ethereum-mainnet": process.env.ETHERSCAN_API_KEY ?? "",
      "sonic-testnet": process.env.SONICSCAN_API_KEY ?? "",
      "sonic-mainnet": process.env.SONICSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network: "base-testnet",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "sonic-testnet",
        chainId: 57054,
        urls: {
          apiURL: "https://api-testnet.sonicscan.org/api",
          browserURL: "https://testnet.sonicscan.org",
        },
      },
      {
        network: "sonic-mainnet",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org",
        },
      },
    ],
  },
};

export default config;
```

**Important:** The `deployerKey` fallback value (`0x000...001`) is a deterministic dummy address — never a real key. This allows `npx hardhat compile` to succeed without a real `.env` present.

### Dependency Versions (as of April 2026)

| Package | Version | Notes |
|---|---|---|
| `hardhat` | `^3.4.1` | Use Hardhat 3, NOT v2 |
| `@nomicfoundation/hardhat-toolbox-viem` | latest | Includes viem, hardhat-verify, chai, mocha |
| `@openzeppelin/contracts` | `^5.6.1` | Latest audited release (`latest` tag) |
| `dotenv` | `^16.x` | For loading `.env` in config and scripts |

The `hardhat-toolbox-viem` automatically includes:
- `viem` — chain interaction (aligns with backend + frontend)
- `@nomicfoundation/hardhat-verify` — block explorer verification
- `chai` + `mocha` — test runner and assertions
- `@nomicfoundation/hardhat-network-helpers` — block time manipulation in tests

**No need to install `ethers.js`** — viem is used throughout this project.

### OpenZeppelin v5 — Solidity Version Requirement

OZ Contracts v5.x requires Solidity `^0.8.20` minimum. Set compiler to `"0.8.28"` (latest stable) to comply with OZ v5 and benefit from all recent optimisations.

OZ v5 import paths used in this project:
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/utils/ReentrancyGuard.sol`
- `@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol`
- `@openzeppelin/contracts/token/ERC20/IERC20.sol`

These are NOT needed in this story (no contracts yet) but inform why the Solidity version is set to `0.8.28`.

### Network Chain IDs — Reference

| Network | Chain ID | Public RPC (fallback only) | Block Explorer |
|---|---|---|---|
| Base Sepolia (testnet) | 84532 | `https://sepolia.base.org` | `https://sepolia.basescan.org` |
| Base Mainnet | 8453 | `https://mainnet.base.org` | `https://basescan.org` |
| Ethereum Sepolia | 11155111 | `https://rpc.sepolia.org` | `https://sepolia.etherscan.io` |
| Ethereum Mainnet | 1 | (use Alchemy/Infura — no reliable public RPC) | `https://etherscan.io` |
| Sonic Blaze (testnet) | 57054 | `https://rpc.blaze.soniclabs.com` | `https://testnet.sonicscan.org` |
| Sonic Mainnet | 146 | `https://rpc.soniclabs.com` | `https://sonicscan.org` |

**Use Alchemy or Infura for production RPC URLs** — public RPCs should only go in `.env.example` comments as reference, not as real values.

### `tsconfig.json` for Hardhat 3

Hardhat 3 init creates this automatically. If setting up manually:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Directory Scaffold — Final Expected Structure

After this story, `contracts/` at the repo root should look like:

```
contracts/
├── package.json
├── package-lock.json
├── hardhat.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── contracts/               ← Solidity source files go here (empty for now)
├── scripts/
│   └── helpers.ts           ← stub: shared deploy utilities (Story 1.7 fills this)
└── test/
    └── fixtures/
        └── index.ts         ← stub: shared test fixtures (Stories 1.2–1.6 fill this)
```

**No `ignition/` directory** — architecture uses manual deploy scripts (not Hardhat Ignition). Story 1.7 adds the deploy scripts.

### `.env.example` Content

```
# ─── RPC Endpoints ───────────────────────────────────────────────────────────
# Base Sepolia testnet (get from Alchemy/Infura or use public: https://sepolia.base.org)
RPC_URL_BASE_TESTNET=

# Base Mainnet
RPC_URL_BASE_MAINNET=

# Ethereum Sepolia testnet
RPC_URL_ETHEREUM_SEPOLIA=

# Ethereum Mainnet (use Alchemy/Infura — no reliable public RPC)
RPC_URL_ETHEREUM_MAINNET=

# Sonic Blaze testnet (public: https://rpc.blaze.soniclabs.com)
RPC_URL_SONIC_TESTNET=

# Sonic Mainnet (public: https://rpc.soniclabs.com)
RPC_URL_SONIC_MAINNET=

# ─── Deployer ─────────────────────────────────────────────────────────────────
# 0x-prefixed private key of the deployer wallet — NEVER commit a real key
DEPLOYER_KEY=0x_your_private_key_here

# ─── Block Explorer API Keys ──────────────────────────────────────────────────
# Used by `npx hardhat verify` to verify contracts on block explorers
# Get from: https://basescan.org/myapikey
BASESCAN_API_KEY=

# Get from: https://etherscan.io/myapikey
ETHERSCAN_API_KEY=

# Get from: https://sonicscan.org/myapikey
SONICSCAN_API_KEY=
```

### Security — `.gitignore` Must Cover

```
# Dependencies
node_modules/

# Hardhat generated output
artifacts/
cache/
deployments/

# Environment files — NEVER commit private keys
.env
.env.*
!.env.example

# TypeScript output
dist/
```

The `!.env.example` negation ensures `.env.example` is tracked even though `.env.*` is ignored.

### Non-Interactive Init Alternative

If running in CI or a non-interactive shell where `npx hardhat --init` can't be prompted, create files directly:

1. Create `package.json` with `"type": "commonjs"` and the dependencies listed above
2. Create `hardhat.config.ts` from the pattern in this story
3. Create `tsconfig.json` from the pattern above
4. Run `npm install`

This is equivalent to what `--init` produces.

### `scripts/helpers.ts` Stub

```typescript
// Shared deploy utilities for deploy-base.ts, deploy-ethereum.ts, deploy-sonic.ts (Story 1.7)
// This file is intentionally minimal — filled out in Story 1.7

export async function getDeployer() {
  // Placeholder — Story 1.7 implements deployment helpers
  throw new Error("Deploy helpers not yet implemented — see Story 1.7");
}
```

### `test/fixtures/index.ts` Stub

```typescript
// Shared test fixtures for contract tests (Stories 1.2–1.6)
// This file is intentionally minimal — filled out per contract story

export {};
```

### Project Structure Notes

- **Repo root is `DegenDraft/`** — the `contracts/` project lives at `DegenDraft/contracts/`. All paths in this story are relative to `DegenDraft/`.
- **`package.json` at `contracts/` level only** — no root-level `package.json` monorepo setup for this story. Backend and frontend get their own in Stories 1.8 and 1.9.
- **No `contracts/ignition/`** — architecture uses manual Hardhat scripts (Story 1.7), not Hardhat Ignition modules.

### References

- [Source: architecture.md#Contracts — Hardhat] — `npx hardhat init`, TypeScript, Hardhat + viem, Slither, Hardhat Ignition or custom scripts, Base/Ethereum/Sonic/localhost networks
- [Source: architecture.md#Project Structure] — complete directory layout; `contracts/contracts/*.sol`, `scripts/deploy-*.ts`, `test/*.test.ts`, `.env.example`
- [Source: epics.md#Story 1.1] — acceptance criteria; OpenZeppelin + viem installed; `.env.*` in gitignore
- [Source: prd.md#Additional Requirements] — hardhat deploy scripts one per chain; deployer keys in `.env.*` never committed
- [Source: architecture.md#Smart Contract Patterns] — `ReentrancyGuard`, `SafeERC20`, `Ownable` from OZ; `setResultsForTesting()` gated by `testingMode` flag
- [Source: npmjs.com/hardhat] — v3.4.1 latest as of April 2026; `npx hardhat --init`
- [Source: npmjs.com/@openzeppelin/contracts] — v5.6.1 latest audited as of April 2026

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

### Completion Notes List

- **Hardhat 3 vs 2**: Hardhat 3.4.1 was used. Architecture doc referenced Hardhat 2 `init` syntax — Hardhat 3 uses `defineConfig()` + `plugins: []` array, not `import "@plugin"` side-effect imports.
- **Toolbox version**: `@nomicfoundation/hardhat-toolbox-viem@5.0.4` is the Hardhat 3 compatible version. Story was initially scoped with `^3.0.0` (Hardhat 2 toolbox) which caused an `ERESOLVE` peer conflict on install. Bumped to `^5.0.4`.
- **No dotenv**: Hardhat 3 provides `configVariable("ENV_VAR")` for lazy environment variable resolution directly in config — no `dotenv` package needed. The `.env` file is read automatically if present.
- **Etherscan API v2 single key**: `verify.etherscan.apiKey` accepts one key for all supported chains. Removed `BASESCAN_API_KEY` — same `ETHERSCAN_API_KEY` covers Base via v2 endpoint. Sonic still requires `SONICSCAN_API_KEY` (separate endpoint).
- **chainDescriptors for Base + Sonic**: These chains are not natively known to `hardhat-verify`. Added under `chainDescriptors:` with correct `apiUrl` values for BaseScan (Sepolia + mainnet) and SonicScan (testnet + mainnet).
- **Test runner**: Hardhat 3 uses the Node.js built-in test runner, not Mocha. `npm test` runs `hardhat test`. The `test/fixtures/index.ts` stub (with `export {}`) registered as 1 passing test suite — this is expected.
- **npm audit**: 15 vulnerabilities in `elliptic` (via `@ethersproject/signing-key` in `hardhat-verify`/`hardhat-ignition`) in the dev toolchain. These are not in deployed bytecode. `npm audit fix` would incorrectly downgrade to Hardhat 2. Left as-is; acceptable for dev tooling.
- **ESM config**: `"type": "module"` and `tsconfig.json` `"module": "NodeNext"` required for Hardhat 3 ESM compatibility.
- **Stray root package-lock.json**: `npm install --prefix contracts` creates a lock file in the CWD (repo root) in addition to `contracts/`. Deleted stray root `package-lock.json`.

### File List

- contracts/.env.example
- contracts/.gitignore
- contracts/contracts/.gitkeep
- contracts/hardhat.config.ts
- contracts/package.json
- contracts/package-lock.json
- contracts/scripts/helpers.ts
- contracts/test/fixtures/index.ts
- contracts/tsconfig.json

### Review Findings

- [x] [Review][Patch] Missing `outDir` in tsconfig.json [contracts/tsconfig.json] — added `"outDir": "./dist"` so `tsc` emits to `dist/` instead of adjacent to source files.
- [x] [Review][Patch] `dist/` duplicated in .gitignore [contracts/.gitignore] — removed duplicate entry under "TypeScript build output" section.
- [x] [Review][Defer] SONICSCAN_API_KEY documented but not wireable in Hardhat 3 verify config [contracts/hardhat.config.ts] — Hardhat 3 `verify.etherscan.apiKey` only accepts `string | ConfigVariable` (no per-network mapping); Sonic verification needs `--api-key <SONICSCAN_API_KEY>` flag at CLI or a custom task — deferred, Hardhat 3 schema limitation
- [x] [Review][Defer] DEPLOYER_KEY documented but no `accounts` wired into network config [contracts/hardhat.config.ts] — explicitly deferred to Story 1.7 per spec ("No deployer accounts/private keys in network config yet") — deferred, pre-existing
- [x] [Review][Defer] Unpinned `^` semver ranges for smart contract tooling [contracts/package.json] — OZ, Hardhat, and toolbox use `^` ranges; supply-chain risk for audited contract projects; policy decision — deferred, pre-existing
- [x] [Review][Defer] No gas configuration on mainnet networks [contracts/hardhat.config.ts] — no `gasPrice`/`gasMultiplier` on Base/Ethereum/Sonic mainnets; deploy safety config belongs in Story 1.7 — deferred, pre-existing
- [x] [Review][Defer] No `engines` field in package.json [contracts/package.json] — no Node.js version constraint declared; Hardhat 3 requires ≥ 18.x; nice-to-have — deferred, pre-existing
- [x] [Review][Defer] No `chainId` guard in network definitions [contracts/hardhat.config.ts] — without explicit `chainId`, a misconfigured RPC URL pointing to the wrong chain won't be caught before broadcast; deploy safety config relevant for Story 1.7 — deferred, pre-existing
- [x] [Review][Defer] NodeNext `.js` extension requirement undocumented [contracts/tsconfig.json] — `module: NodeNext` requires `.js` suffixes on all relative imports; stubs are currently empty so no bug now, but Story 1.2+ authors must know this — deferred, pre-existing
- [x] [Review][Defer] `skipLibCheck: true` hides declaration-file type errors [contracts/tsconfig.json] — standard Hardhat practice but reduces type-safety coverage in plugin declarations — deferred, pre-existing

### Change Log

- 2026-04-26: Initialized `contracts/` with Hardhat 3.4.1 TypeScript project. Configured 6 networks (Base Sepolia/Mainnet, Ethereum Sepolia/Mainnet, Sonic Blaze/Mainnet), OZ v5.6.1, ESM toolchain. All AC verified: compile ✅, tests ✅, gitignore ✅.
