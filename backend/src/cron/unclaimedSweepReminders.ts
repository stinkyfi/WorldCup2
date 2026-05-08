import "dotenv/config";
import { prisma } from "../db.js";
import { leagueAbi } from "../lib/leagueAbi.js";
import { createPublicClient, getAddress, http, type Address } from "viem";

function mustGetEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

const SECONDS_PER_DAY = 86_400n;
const SWEEP_AFTER_DAYS = 90n;
const REMIND_WITHIN_DAYS = 7n;

async function main() {
  const chainIds = parseCsvInts(mustGetEnv("ORACLE_CHAIN_IDS"));
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  for (const chainId of chainIds) {
    const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    const leagues = await prisma.league.findMany({
      where: { chainId, contractAddress: { not: null } },
      select: { id: true, title: true, contractAddress: true },
    });

    for (const row of leagues) {
      const raw = row.contractAddress;
      if (!raw) continue;
      let leagueAddr: Address;
      try {
        leagueAddr = getAddress(raw);
      } catch {
        continue;
      }

      try {
        const [state, merkleRoot, merkleRootSetAt] = await Promise.all([
          publicClient.readContract({ address: leagueAddr, abi: leagueAbi, functionName: "state" }),
          publicClient.readContract({ address: leagueAddr, abi: leagueAbi, functionName: "merkleRoot" }),
          publicClient.readContract({ address: leagueAddr, abi: leagueAbi, functionName: "merkleRootSetAt" }),
        ]);

        // Only care about resolved leagues with a root set timestamp.
        if (state !== 2) continue;
        if (merkleRoot === "0x0000000000000000000000000000000000000000000000000000000000000000") continue;
        if (!merkleRootSetAt || merkleRootSetAt === 0n) continue;

        const sweepAt = merkleRootSetAt + SWEEP_AFTER_DAYS * SECONDS_PER_DAY;
        const remindAt = sweepAt - REMIND_WITHIN_DAYS * SECONDS_PER_DAY;

        if (nowSec >= sweepAt) {
          console.log(
            [
              "DegenDraft sweep reminder",
              `- chainId: ${chainId}`,
              `- league: ${row.title} (${leagueAddr})`,
              `- status: sweep eligible (>= 90d)`,
              `- merkleRootSetAt: ${merkleRootSetAt.toString()}`,
            ].join("\n"),
          );
        } else if (nowSec >= remindAt) {
          const daysLeft = Number((sweepAt - nowSec) / SECONDS_PER_DAY);
          console.log(
            [
              "DegenDraft sweep reminder",
              `- chainId: ${chainId}`,
              `- league: ${row.title} (${leagueAddr})`,
              `- status: approaching sweep eligibility`,
              `- daysLeft: ${daysLeft}`,
              `- merkleRootSetAt: ${merkleRootSetAt.toString()}`,
            ].join("\n"),
          );
        }
      } catch (e) {
        // Log but do not crash; a single bad RPC read should not abort the whole sweep scan.
        console.error(`sweep reminder: skipping ${leagueAddr} (chain ${chainId}): ${(e as Error)?.message ?? String(e)}`);
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
  });

