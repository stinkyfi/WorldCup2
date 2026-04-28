import "dotenv/config";
import { prisma } from "../db.js";
import { oracleControllerAbi } from "../lib/oracleControllerAbi.js";
import {
  type Address,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  type PrivateKeyAccount,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { pathToFileURL } from "node:url";

type PostMethod = "postResults" | "setResultsForTesting";
type Source = "primary" | "redundant";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function teamKeyToAddress(teamKey: string): Address {
  // Deterministic pseudo-address to represent a team identity on-chain.
  // Not required to be a contract; only used as an identifier for rankings.
  const h = keccak256(toBytes(`dd:${teamKey}`));
  return getAddress(`0x${h.slice(-40)}` as `0x${string}`);
}

type StagingGroup = { groupId: number; rankings: [string, string, string, string] };

function loadStagingGroups(): StagingGroup[] {
  const raw = mustGetEnv("ORACLE_STAGING_GROUPS_JSON");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("ORACLE_STAGING_GROUPS_JSON must be a JSON array");
  const groups: StagingGroup[] = [];
  for (const item of parsed) {
    const o = item as Record<string, unknown>;
    const groupId = Number(o.groupId);
    const rankings = o.rankings as unknown;
    if (!Number.isFinite(groupId) || groupId < 0 || groupId > 11) throw new Error("Invalid groupId in staging groups JSON");
    if (!Array.isArray(rankings) || rankings.length !== 4 || rankings.some((x) => typeof x !== "string")) {
      throw new Error("Invalid rankings in staging groups JSON (must be [string,string,string,string])");
    }
    groups.push({ groupId, rankings: [rankings[0], rankings[1], rankings[2], rankings[3]] as [string, string, string, string] });
  }
  return groups;
}

export async function runOracleCron(params?: { source?: Source; account?: PrivateKeyAccount }): Promise<void> {
  const chainIds = parseCsvInts(mustGetEnv("ORACLE_CHAIN_IDS"));
  const method = (process.env.ORACLE_POST_METHOD ?? "postResults") as PostMethod;
  const source = (params?.source ?? ((process.env.ORACLE_SOURCE ?? "primary") as Source)) as Source;
  const controllerByChain: Record<number, Address> = {};
  for (const cid of chainIds) {
    controllerByChain[cid] = getAddress(mustGetEnv(`ORACLE_CONTROLLER_${cid}`)) as Address;
  }

  const account =
    params?.account ??
    privateKeyToAccount(mustGetEnv("ORACLE_PRIVATE_KEY") as `0x${string}`);

  const groups = loadStagingGroups();
  const groupMap = new Map(groups.map((g) => [g.groupId, g] as const));

  for (const chainId of chainIds) {
    const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
    const oracleController = controllerByChain[chainId]!;
    const transport = http(rpcUrl);

    const publicClient = createPublicClient({ transport });
    const walletClient = createWalletClient({ transport, account });

    for (let groupId = 0; groupId < 12; groupId++) {
      const g = groupMap.get(groupId);
      if (!g) continue;

      try {
        const already = await publicClient.readContract({
          address: oracleController,
          abi: oracleControllerAbi,
          functionName: "hasResultsPosted",
          args: [groupId],
        });
        if (already) continue;

        const rankings = g.rankings.map((k) => teamKeyToAddress(`group:${groupId}:${k}`)) as unknown as [
          Address,
          Address,
          Address,
          Address,
        ];

        const hash = await walletClient.writeContract({
          address: oracleController,
          abi: oracleControllerAbi,
          functionName: method,
          args: [groupId, rankings],
          chain: undefined,
        });
        await publicClient.waitForTransactionReceipt({ hash });

        await prisma.oraclePost.create({
          data: {
            chainId,
            groupId,
            source,
            method,
            txHash: hash,
            success: true,
          },
        });
      } catch (e) {
        const message = (e as Error | null | undefined)?.message ?? "Unknown error";
        await prisma.oracleError.create({
          data: {
            chainId,
            groupId,
            message,
            details: message.slice(0, 2_000),
          },
        });
        await prisma.oraclePost.create({
          data: {
            chainId,
            groupId,
            source,
            method,
            txHash: null,
            success: false,
          },
        });
      }
    }
  }
}

async function main() {
  await runOracleCron();
}

const isEntrypoint = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isEntrypoint) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      const message = (e as Error | null | undefined)?.message ?? String(e);
      await prisma.oracleError
        .create({ data: { chainId: 0, groupId: null, message: "oracleCron fatal", details: message.slice(0, 2_000) } })
        .catch(() => undefined);
      await prisma.$disconnect().catch(() => undefined);
      process.exitCode = 1;
    });
}

