// Shared test fixtures for contract test suites (Stories 1.2–1.6)
//
// Each contract story adds its own fixture factory here:
//   deployWhitelistRegistry()  — Story 1.2 ✅
//   deployOracleController()   — Story 1.3
//   deployLeagueFactory()      — Story 1.4
//   deployLeague()             — Story 1.5
//
// In Hardhat 3 viem helpers live on NetworkConnection, not on hre directly.
// Each fixture connects to the shared in-process network and deploys a fresh
// contract instance so every test starts with isolated contract state.
//
// WhitelistRegistry requires token.code.length > 0, so tests use deployed
// MockERC20 instances rather than hardcoded mainnet addresses.

import hre from "hardhat";

export async function deployWhitelistRegistry() {
  const connection = await hre.network.getOrCreate();
  const [owner, ...otherAccounts] = await connection.viem.getWalletClients();
  const whitelistRegistry = await connection.viem.deployContract("WhitelistRegistry", [
    owner.account.address, // OZ v5 Ownable — initialOwner required
  ]);
  // Deploy two mock ERC-20 tokens for use in tests
  const tokenA = await connection.viem.deployContract("MockERC20", ["Token A", "TKNA"]);
  const tokenB = await connection.viem.deployContract("MockERC20", ["Token B", "TKNB"]);
  return { whitelistRegistry, owner, otherAccounts, connection, tokenA, tokenB };
}

// ─── Story 1.3: OracleController fixtures ────────────────────────────────────

export async function deployOracleController() {
  const connection = await hre.network.getOrCreate();
  const [owner, oracle, ...otherAccounts] = await connection.viem.getWalletClients();
  const oracleController = await connection.viem.deployContract("OracleController", [
    owner.account.address,  // OZ v5 Ownable — initialOwner
    oracle.account.address, // authorised oracle address
    false,                  // stagingMode = false (production)
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

// ─── Story 1.4: LeagueFactory fixtures ───────────────────────────────────────

export async function deployLeagueFactory() {
  const connection = await hre.network.getOrCreate();
  const [owner, devWallet, creator, oracle, ...otherAccounts] =
    await connection.viem.getWalletClients();

  // Deploy dependencies in order
  const whitelistRegistry = await connection.viem.deployContract("WhitelistRegistry", [
    owner.account.address,
  ]);
  const token = await connection.viem.deployContract("MockERC20", ["Test Token", "TST"]);
  // Approve the test token so createLeague passes the whitelist check
  await whitelistRegistry.write.approveToken([token.address]);

  const oracleController = await connection.viem.deployContract("OracleController", [
    owner.account.address,
    oracle.account.address,
    false, // stagingMode = false
  ]);

  const creationFee = 10_000_000_000_000_000n; // 0.01 ETH
  const leagueFactory = await connection.viem.deployContract("LeagueFactory", [
    owner.account.address,
    whitelistRegistry.address,
    oracleController.address,
    devWallet.account.address,
    creationFee,
    200n,                         // devFeeBps: 2%
    300n,                         // creatorFeeCap: 3%
    1_000_000_000_000_000_000n,   // minEntryAmount: 1 token (18-decimal)
  ]);

  const publicClient = await connection.viem.getPublicClient();
  const { timestamp: latestTimestamp } = await publicClient.getBlock({ blockTag: "latest" });

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
    latestTimestamp,
  };
}

// ─── Story 1.5: League fixtures ──────────────────────────────────────────────

const DEFAULT_ENTRY_FEE = 5_000_000_000_000_000_000n; // 5 tokens (18-decimal)

/** Epic 7 dispute escrow disabled — zero token / zero amount / zero refund authority */
export const LEAGUE_DISPUTE_DISABLED = [
  "0x0000000000000000000000000000000000000000" as `0x${string}`,
  0n,
  "0x0000000000000000000000000000000000000000" as `0x${string}`,
] as const;

export async function deployLeague() {
  const connection = await hre.network.getOrCreate();
  const [owner, devWalletClient, creator, oracle, player1, player2, ...rest] =
    await connection.viem.getWalletClients();

  const token = await connection.viem.deployContract("MockERC20", ["TestToken", "TTK"]);

  // Mint enough tokens for players (10 entries each)
  await token.write.mint([player1.account.address, DEFAULT_ENTRY_FEE * 10n]);
  await token.write.mint([player2.account.address, DEFAULT_ENTRY_FEE * 10n]);

  // Use EVM block timestamp so lockTime stays in the future even after time-advancing tests
  const publicClient = await connection.viem.getPublicClient();
  const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
  const lockTime = latestBlock.timestamp + 7n * 24n * 60n * 60n;

  const params = {
    token: token.address,
    entryFee: DEFAULT_ENTRY_FEE,
    maxEntries: 100n,
    maxEntriesPerWallet: 5n,
    minThreshold: 2n,
    revisionFee: 0n,
    revisionPolicy: 0,
    lockTime,
  } as const;

  const league = await connection.viem.deployContract("League", [
    creator.account.address,
    oracle.account.address,
    devWalletClient.account.address,
    200n,  // devFeeBps = 2%
    300n,  // creatorFeeCap = 3%
    params,
    ...LEAGUE_DISPUTE_DISABLED,
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
    entryFee: DEFAULT_ENTRY_FEE,
    lockTime,
    params,
  };
}

export {};
