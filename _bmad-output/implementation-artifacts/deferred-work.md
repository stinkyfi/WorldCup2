# Deferred Work

## Deferred from: code review of 1-1-hardhat-contracts-repo-init-and-config (2026-04-26)

- **SONICSCAN_API_KEY not wireable in Hardhat 3 verify config** — Hardhat 3 `verify.etherscan.apiKey` only accepts `string | ConfigVariable`, not a per-network map. Sonic verification currently requires `npx hardhat verify --network sonic-mainnet --api-key $SONICSCAN_API_KEY <address>`. Consider a custom Hardhat task or check if a future hardhat-verify update adds per-network key support.
- **DEPLOYER_KEY not wired into network accounts** — `contracts/hardhat.config.ts` has no `accounts` field on any network. Explicitly deferred to Story 1.7 per spec.
- **Unpinned `^` semver ranges** — `@openzeppelin/contracts`, `hardhat`, and toolbox all use `^`; supply-chain risk for smart contract projects; consider pinning exact versions or using a policy-approved range strategy.
- **No gas configuration on mainnet networks** — `base-mainnet`, `ethereum-mainnet`, `sonic-mainnet` have no `gasPrice`/`gasMultiplier`; deploy safety config belongs in Story 1.7.
- **No `engines` field in package.json** — No Node.js version constraint; Hardhat 3 requires ≥ 18.x; add `"engines": { "node": ">=18.0.0" }`.
- **No `chainId` guard in network definitions** — Without explicit `chainId`, a misconfigured RPC URL pointing to the wrong chain won't be caught before broadcast. Story 1.7 should add chainId to all network configs.
- **NodeNext `.js` extension requirement undocumented** — `module: NodeNext` requires `.js` suffixes on all relative imports in TypeScript source. Story 1.2+ authors must follow this pattern; consider adding a note to the project conventions.
- **`skipLibCheck: true`** — Standard Hardhat practice but reduces type-safety coverage in plugin declaration files.
