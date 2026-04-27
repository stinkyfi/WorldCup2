import hre from "hardhat";
import { loadChainFamilyDotenv } from "./boot-env.js";
import {
  REMOTE_NETWORKS,
  parseAddressEnv,
  requireEnv,
  writeDeploymentFile,
  type DeploymentContractEntry,
  type DeploymentFile,
} from "./helpers.js";

function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseUintEnv(key: string, defaultWei: bigint): bigint {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") return defaultWei;
  return BigInt(raw.trim());
}

async function main(): Promise<void> {
  const connection = await hre.network.getOrCreate();
  const networkName = connection.networkName;
  loadChainFamilyDotenv(networkName);

  if (REMOTE_NETWORKS.has(networkName)) {
    requireEnv(["DEPLOYER_KEY", "ORACLE_ADDRESS", "DEV_WALLET_ADDRESS"]);
  }
  const publicClient = await connection.viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  const wallets = await connection.viem.getWalletClients();
  const deployer = wallets[0];
  if (!deployer) throw new Error("No deployer wallet (accounts empty)");

  let oracleAddr: `0x${string}`;
  let devWalletAddr: `0x${string}`;
  if (REMOTE_NETWORKS.has(networkName)) {
    oracleAddr = parseAddressEnv("ORACLE_ADDRESS");
    devWalletAddr = parseAddressEnv("DEV_WALLET_ADDRESS");
  } else {
    const o = wallets[1];
    const d = wallets[2];
    if (!o || !d) {
      throw new Error("Local network needs at least 3 default accounts (oracle + dev wallet).");
    }
    oracleAddr = o.account.address;
    devWalletAddr = d.account.address;
  }

  const stagingMode = parseBoolEnv("ORACLE_STAGING_MODE", false);

  const creationFee = parseUintEnv("LEAGUE_FACTORY_CREATION_FEE_WEI", 10_000_000_000_000_000n);
  const devFeeBps = parseUintEnv("LEAGUE_FACTORY_DEV_FEE_BPS", 200n);
  const creatorFeeCap = parseUintEnv("LEAGUE_FACTORY_CREATOR_FEE_CAP_BPS", 300n);
  const minEntryAmount = parseUintEnv("LEAGUE_FACTORY_MIN_ENTRY_AMOUNT_WEI", 1_000_000_000_000_000_000n);

  const deployedAt = new Date().toISOString();
  const contracts: DeploymentContractEntry[] = [];

  const wrSend = await connection.viem.sendDeploymentTransaction("WhitelistRegistry", [
    deployer.account.address,
  ]);
  const wrHash = wrSend.deploymentTransaction.hash;
  const wrReceipt = await publicClient.waitForTransactionReceipt({ hash: wrHash, confirmations: 1 });
  const whitelistRegistry = wrSend.contract;
  contracts.push({
    name: "WhitelistRegistry",
    contract: "contracts/WhitelistRegistry.sol:WhitelistRegistry",
    address: whitelistRegistry.address,
    txHash: wrHash,
    blockNumber: Number(wrReceipt.blockNumber),
    deployer: deployer.account.address,
    deployedAt,
    constructorArgs: [deployer.account.address],
  });

  const ocSend = await connection.viem.sendDeploymentTransaction("OracleController", [
    deployer.account.address,
    oracleAddr,
    stagingMode,
  ]);
  const ocHash = ocSend.deploymentTransaction.hash;
  const ocReceipt = await publicClient.waitForTransactionReceipt({ hash: ocHash, confirmations: 1 });
  const oracleController = ocSend.contract;
  contracts.push({
    name: "OracleController",
    contract: "contracts/OracleController.sol:OracleController",
    address: oracleController.address,
    txHash: ocHash,
    blockNumber: Number(ocReceipt.blockNumber),
    deployer: deployer.account.address,
    deployedAt,
    constructorArgs: [deployer.account.address, oracleAddr, stagingMode],
  });

  const lfSend = await connection.viem.sendDeploymentTransaction("LeagueFactory", [
    deployer.account.address,
    whitelistRegistry.address,
    oracleController.address,
    devWalletAddr,
    creationFee,
    devFeeBps,
    creatorFeeCap,
    minEntryAmount,
  ]);
  const lfHash = lfSend.deploymentTransaction.hash;
  const lfReceipt = await publicClient.waitForTransactionReceipt({ hash: lfHash, confirmations: 1 });
  const leagueFactory = lfSend.contract;
  contracts.push({
    name: "LeagueFactory",
    contract: "contracts/LeagueFactory.sol:LeagueFactory",
    address: leagueFactory.address,
    txHash: lfHash,
    blockNumber: Number(lfReceipt.blockNumber),
    deployer: deployer.account.address,
    deployedAt,
    constructorArgs: [
      deployer.account.address,
      whitelistRegistry.address,
      oracleController.address,
      devWalletAddr,
      creationFee,
      devFeeBps,
      creatorFeeCap,
      minEntryAmount,
    ],
  });

  const record: DeploymentFile = {
    network: networkName,
    chainId,
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    contracts,
  };
  writeDeploymentFile(record);

  console.log(`Deployment written to deployments/${networkName}.json`);
  for (const c of contracts) {
    console.log(`${c.name}: ${c.address} (block ${c.blockNumber})`);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
