import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import hre from "hardhat";
import { loadChainFamilyDotenv } from "./boot-env.js";
import {
  CONTRACTS_ROOT,
  REMOTE_NETWORKS,
  loadDeploymentFile,
  requireEnv,
  writeConstructorArgsVerifyModule,
} from "./helpers.js";

function isSonic(network: string): boolean {
  return network === "sonic-testnet" || network === "sonic-mainnet";
}

async function main(): Promise<void> {
  const connection = await hre.network.getOrCreate();
  const network = connection.networkName;
  loadChainFamilyDotenv(network);

  if (!REMOTE_NETWORKS.has(network)) {
    throw new Error(
      `Explorer verification is only configured for remote HTTP networks; got "${network}".`,
    );
  }

  if (isSonic(network)) {
    requireEnv(["SONICSCAN_API_KEY"]);
  } else {
    requireEnv(["ETHERSCAN_API_KEY"]);
  }

  const dep = loadDeploymentFile(network);

  const base = path.join(CONTRACTS_ROOT, "deployments", ".verify-temp");
  fs.mkdirSync(base, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(base, "args-"));

  try {
    for (const c of dep.contracts) {
      const argsFile = path.join(tmpDir, `${c.name.replace(/\s+/g, "_")}-args.mjs`);
      writeConstructorArgsVerifyModule(argsFile, c.constructorArgs);
      const relArgs = path.relative(CONTRACTS_ROOT, argsFile).split(path.sep).join("/");

      const env = { ...process.env };
      if (isSonic(network)) {
        env.ETHERSCAN_API_KEY = process.env.SONICSCAN_API_KEY;
      }

      const shq = (s: string) => (/[^\w@%+=:,./-]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
      const cmd = `npx hardhat verify etherscan ${shq(c.address)} --network ${shq(network)} --contract ${shq(c.contract)} --constructor-args-path ${shq(relArgs)}`;
      execSync(cmd, { cwd: CONTRACTS_ROOT, stdio: "inherit", env, shell: true });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
