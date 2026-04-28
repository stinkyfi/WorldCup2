import "dotenv/config";
import { prisma } from "../db.js";
import { leagueAbi } from "../lib/leagueAbi.js";
import { oracleControllerAbi } from "../lib/oracleControllerAbi.js";
import { buildSortedPairMerkleTree, merkleLeafHash } from "../lib/merkleOz.js";
import { buildLeaguePayoutLeaves } from "./buildLeaguePayoutLeaves.js";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseAbiItem,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ZERO_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

const resultsPostedEvent = parseAbiItem(
  "event ResultsPosted(uint8 indexed groupId, address[4] rankings)",
);

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function mustGetEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

async function lastResultsPostedTimestamp(
  publicClient: PublicClient,
  oracleController: Address,
): Promise<bigint | null> {
  const latest = await publicClient.getBlockNumber();
  const logs = await publicClient.getLogs({
    address: oracleController,
    event: resultsPostedEvent,
    fromBlock: 0n,
    toBlock: latest,
  });
  if (logs.length === 0) return null;
  const maxBlock = logs.reduce((m, l) => (l.blockNumber > m ? l.blockNumber : m), 0n);
  const block = await publicClient.getBlock({ blockNumber: maxBlock });
  return block.timestamp;
}

async function allStageGroupsPosted(publicClient: PublicClient, oracleController: Address): Promise<boolean> {
  for (let g = 0; g < 12; g++) {
    const posted = await publicClient.readContract({
      address: oracleController,
      abi: oracleControllerAbi,
      functionName: "hasResultsPosted",
      args: [g],
    });
    if (!posted) return false;
  }
  return true;
}

/** Story 8.1 — build payout Merkle tree and post root via devWallet (`setMerkleRoot`). */
export async function runMerkleIndexerOnce(params?: { chainId?: number }): Promise<void> {
  const pkRaw = process.env.MERKLE_POSTER_PRIVATE_KEY?.trim();
  if (!pkRaw) return;

  const posterAccount = privateKeyToAccount(pkRaw as Hex);

  const delaySec = Number(process.env.MERKLE_POST_DELAY_SECONDS ?? "86400");
  const prizeRankLimit = Number(process.env.PRIZE_RANK_LIMIT ?? "10");
  const delaySeconds = Number.isFinite(delaySec) && delaySec >= 0 ? delaySec : 86_400;
  const rankLimit = Number.isFinite(prizeRankLimit) && prizeRankLimit > 0 ? prizeRankLimit : 10;

  const chainIdsAll = parseCsvInts(mustGetEnv("ORACLE_CHAIN_IDS"));
  const chainIds = params?.chainId ? [params.chainId] : chainIdsAll;

  for (const chainId of chainIds) {
    const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ transport });
    const walletClient = createWalletClient({ transport, account: posterAccount });

    const leagues = await prisma.league.findMany({
      where: {
        chainId,
        contractAddress: { not: null },
      },
      select: { contractAddress: true },
    });

    for (const row of leagues) {
      const rawAddr = row.contractAddress;
      if (!rawAddr) continue;
      let leagueAddr: Address;
      try {
        leagueAddr = getAddress(rawAddr);
      } catch {
        continue;
      }

      const leagueAddrLower = leagueAddr.toLowerCase();

      try {
        const [
          rawState,
          merkleRootOnChain,
          creatorAddr,
          devWalletAddr,
          oracleController,
          entryFeeWei,
          totalEntries,
          devFeeBpsOnChain,
          creatorFeeCapOnChain,
        ] = await Promise.all([
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "state",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "merkleRoot",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "creator",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "devWallet",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "oracleController",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "entryFee",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "totalEntries",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "devFeeBps",
          }),
          publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "creatorFeeCap",
          }),
        ]);

        if (rawState !== 0) continue;
        if (merkleRootOnChain !== ZERO_ROOT) continue;

        if (posterAccount.address.toLowerCase() !== devWalletAddr.toLowerCase()) continue;

        const postedAll = await allStageGroupsPosted(publicClient, oracleController);
        if (!postedAll) continue;

        const lastTs = await lastResultsPostedTimestamp(publicClient, oracleController);
        if (lastTs === null) continue;

        const nowSec = BigInt(Math.floor(Date.now() / 1000));
        if (nowSec < lastTs + BigInt(delaySeconds)) continue;

        const entryCount = Number(totalEntries);
        if (!Number.isFinite(entryCount) || entryCount <= 0) continue;

        const leaderboardRows = await prisma.leaderboardRow.findMany({
          where: { chainId, leagueAddress: leagueAddrLower },
          select: { walletAddress: true, rank: true },
        });

        const devFeeBps = Number(devFeeBpsOnChain);
        const creatorFeeBps = Number(creatorFeeCapOnChain);

        const payoutLeaves = buildLeaguePayoutLeaves({
          prizeRankLimit: rankLimit,
          leaderboardRows,
          entryFeeWei,
          entryCount,
          creatorFeeBps,
          devFeeBps,
          creatorAddress: creatorAddr,
          devWalletAddress: devWalletAddr,
        });

        if (payoutLeaves.length === 0) continue;

        const leafHashes = payoutLeaves.map((l) => merkleLeafHash(l.claimant, l.amountWei, l.claimType));
        const { root, getProof } = buildSortedPairMerkleTree(leafHashes);

        const txHash = await walletClient.writeContract({
          address: leagueAddr,
          abi: leagueAbi,
          functionName: "setMerkleRoot",
          args: [root],
          chain: undefined,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        await prisma.$transaction(async (tx) => {
          await tx.merkleClaim.deleteMany({
            where: { chainId, leagueAddress: leagueAddrLower },
          });

          await tx.merkleClaim.createMany({
            data: payoutLeaves.map((leaf, i) => ({
              chainId,
              leagueAddress: leagueAddrLower,
              claimantAddress: leaf.claimant.toLowerCase(),
              amountWei: leaf.amountWei,
              claimType: leaf.claimType,
              proofJson: getProof(leafHashes[i]!),
              leafHex: leafHashes[i]!,
              merkleRootHex: root,
              txHash: receipt.transactionHash,
            })),
          });
        });
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        console.error(`merklePoster skip ${leagueAddrLower}: ${msg}`);
      }
    }
  }
}
