# Story 1.7: Multi-chain deploy scripts

Status: done

## Story

As a developer,
I want repeatable deploy and verify scripts for all configured Hardhat networks,
So that core contracts can be shipped to Base, Ethereum, and Sonic with recorded addresses and explorer verification.

## Acceptance Criteria

1. **Given** configured RPC and keys **When** `npx hardhat run scripts/deploy.ts --network <remote>` runs **Then** it deploys `WhitelistRegistry` → `OracleController` → `LeagueFactory`, prints addresses, and writes `deployments/<network>.json` with name, address, deployer, block number, timestamp, and tx hash per contract.

2. **Given** a required env var is missing **When** the deploy script starts on a remote network **Then** it throws before any deployment broadcast, naming the missing key(s).

3. **Given** chain-family env files **When** deploying to Base / Ethereum / Sonic networks **Then** `.env.base`, `.env.ethereum`, or `.env.sonic` is loaded (if present) after the active network name is known.

4. **Given** a prior `deployments/<network>.json` **When** `npx hardhat run scripts/verify.ts --network <remote>` runs with the correct explorer API key **Then** each recorded contract is submitted to `hardhat verify etherscan` with matching `--contract` and constructor args.

## Tasks / Subtasks

- [x] `scripts/boot-env.ts` — load `.env.base` / `.env.ethereum` / `.env.sonic` by network name
- [x] `scripts/helpers.ts` — `requireEnv`, deployment JSON read/write, verify-args module writer
- [x] `scripts/deploy.ts` — ordered deploy, env validation, `deployments/<network>.json`
- [x] `scripts/verify.ts` — read deployment file, Sonic uses `SONICSCAN_API_KEY` as explorer key for the verify subprocess
- [x] `hardhat.config.ts` — `accounts` + `chainId` on remote HTTP networks
- [x] `.env.example` — deploy-related variables documented
- [x] `package.json` — `deploy` and `verify:deployed` scripts
- [x] `deployments/.gitkeep`, `.gitignore` for verify temp + local `default.json`

## Dev Notes

- **Hardhat 3:** The in-process chain is `connection.networkName === "default"` when `--network` is omitted. The name `hardhat` is not listed in `networks` in this repo, so `npx hardhat run scripts/deploy.ts --network hardhat` fails; use `npx hardhat run scripts/deploy.ts` for a local smoke deploy.
- **Tx hash:** `deployContract` does not expose the deployment tx hash on the returned instance; the script uses `sendDeploymentTransaction` + `waitForTransactionReceipt`.
- **Verify:** Constructor args are emitted as a tiny `.mjs` module under `deployments/.verify-temp/` (gitignored) because Hardhat expects `--constructor-args-path` to be a module that `export default`s the args array.

## Dev Agent Record

### Implementation Plan

- Align deploy order and constructor arguments with existing test fixtures; gate remote deploys on `DEPLOYER_KEY`, `ORACLE_ADDRESS`, and `DEV_WALLET_ADDRESS`.
- Use `loadChainFamilyDotenv` after `getOrCreate()` so env files load after the network name is resolved.

### Completion Notes

- Local smoke: `npx hardhat run scripts/deploy.ts` writes `deployments/default.json` (gitignored). Remote: `npm run deploy -- --network base-testnet` with `.env.base` + keys.
- Verify: `npm run verify:deployed -- --network base-testnet` (non-Sonic) requires `ETHERSCAN_API_KEY`; Sonic networks require `SONICSCAN_API_KEY` (injected into the verify child as `ETHERSCAN_API_KEY`).

## File List

- `contracts/scripts/boot-env.ts`
- `contracts/scripts/helpers.ts`
- `contracts/scripts/deploy.ts`
- `contracts/scripts/verify.ts`
- `contracts/hardhat.config.ts`
- `contracts/package.json`
- `contracts/.env.example`
- `contracts/.gitignore`
- `contracts/deployments/.gitkeep`

## Change Log

- **2026-04-27:** Story 1.7 — multi-chain deploy + verify scripts, deployment JSON, env documentation, Hardhat network accounts/chain IDs.
