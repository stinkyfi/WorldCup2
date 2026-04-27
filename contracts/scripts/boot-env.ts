/**
 * Load `.env.base` / `.env.ethereum` / `.env.sonic` for the active Hardhat network.
 * Call after `hre.network.getOrCreate()` so the network name is known (HH3 does not
 * always set `HARDHAT_NETWORK` before user script modules load).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsRoot = path.resolve(__dirname, "..");

const NETWORK_TO_ENV_FILE: Record<string, string> = {
  "base-testnet": ".env.base",
  "base-mainnet": ".env.base",
  "ethereum-sepolia": ".env.ethereum",
  "ethereum-mainnet": ".env.ethereum",
  "sonic-testnet": ".env.sonic",
  "sonic-mainnet": ".env.sonic",
};

export function loadChainFamilyDotenv(networkName: string | undefined): void {
  if (networkName === undefined || networkName === "") return;
  const file = NETWORK_TO_ENV_FILE[networkName];
  if (file === undefined) return;
  const envPath = path.join(contractsRoot, file);
  if (fs.existsSync(envPath)) {
    dotenvConfig({ path: envPath, override: true });
  }
}
