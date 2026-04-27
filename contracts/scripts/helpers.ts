import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress } from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repository root of the `contracts/` package */
export const CONTRACTS_ROOT = path.resolve(__dirname, "..");

export const REMOTE_NETWORKS = new Set([
  "base-testnet",
  "base-mainnet",
  "ethereum-sepolia",
  "ethereum-mainnet",
  "sonic-testnet",
  "sonic-mainnet",
]);

export function getDeploymentsDir(): string {
  return path.join(CONTRACTS_ROOT, "deployments");
}

/** Exit before broadcast if any named variable is unset or blank. */
export function requireEnv(names: readonly string[]): void {
  const missing: string[] = [];
  for (const n of names) {
    const v = process.env[n];
    if (v === undefined || v.trim() === "") missing.push(n);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) before deployment broadcast: ${missing.join(", ")}`,
    );
  }
}

export function parseAddressEnv(varName: string): `0x${string}` {
  requireEnv([varName]);
  const raw = process.env[varName]!.trim();
  if (!isAddress(raw)) {
    throw new Error(`Invalid address for ${varName}: ${raw}`);
  }
  return getAddress(raw) as `0x${string}`;
}

export interface DeploymentContractEntry {
  name: string;
  /** Fully qualified name for `hardhat verify etherscan --contract` */
  contract: string;
  address: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: number;
  deployer: `0x${string}`;
  /** ISO-8601 timestamp when the deployment tx was written */
  deployedAt: string;
  constructorArgs: readonly unknown[];
}

export interface DeploymentFile {
  network: string;
  chainId: number;
  deployer: `0x${string}`;
  /** Wall-clock time when the deployment record was finalized */
  timestamp: string;
  contracts: DeploymentContractEntry[];
}

export function writeDeploymentFile(data: DeploymentFile): void {
  const dir = getDeploymentsDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${data.network}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n",
    "utf8",
  );
}

export function loadDeploymentFile(network: string): DeploymentFile {
  const filePath = path.join(getDeploymentsDir(), `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No deployment file at ${filePath}. Run deploy for this network first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as DeploymentFile;
}

/** Build a small ESM module for `--constructor-args-path` (Hardhat expects `export default`). */
export function writeConstructorArgsVerifyModule(
  outPath: string,
  args: readonly unknown[],
): void {
  const lines = args.map((a) => `  ${verifyModuleArgLiteral(a)}`).join(",\n");
  fs.writeFileSync(outPath, `/* auto-generated */\nexport default [\n${lines}\n];\n`, "utf8");
}

function verifyModuleArgLiteral(a: unknown): string {
  if (typeof a === "boolean") return String(a);
  if (typeof a === "bigint") return `BigInt("${a.toString()}")`;
  if (typeof a === "number") return `BigInt("${a}")`;
  if (typeof a === "string") {
    if (isAddress(a)) return JSON.stringify(getAddress(a) as `0x${string}`);
    if (/^\d+$/.test(a)) return `BigInt("${a}")`;
    throw new Error(`Cannot serialize constructor arg for verify module: ${a}`);
  }
  throw new Error(`Unsupported constructor arg type: ${typeof a}`);
}
