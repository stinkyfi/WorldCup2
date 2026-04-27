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

export {};
