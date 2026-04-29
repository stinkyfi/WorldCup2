import { apiUrl } from "@/lib/apiBase";
import { HttpError } from "@/lib/leagueCompliance";

export type MerklePrizeEligible = {
  eligible: true;
  amountWei: string;
  proof: `0x${string}`[];
  merkleRootHex: string;
  leafHex: string;
  entryTokenSymbol: string;
  entryTokenDecimals: number;
  leagueTitle: string;
};

export type MerklePrizeIneligible = {
  eligible: false;
  reason: "NO_PRIZE_LEAF";
};

export type MerklePrizeClaimResponse = {
  data: MerklePrizeEligible | MerklePrizeIneligible;
};

export async function fetchMerklePrizeClaim(params: {
  chainId: number;
  leagueAddress: string;
  walletAddress: string;
  signal?: AbortSignal;
}): Promise<MerklePrizeClaimResponse> {
  const q = new URLSearchParams({
    chainId: String(params.chainId),
    leagueAddress: params.leagueAddress,
    walletAddress: params.walletAddress,
  });
  const res = await fetch(apiUrl(`/api/v1/merkle-claim/prize?${q.toString()}`), {
    signal: params.signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new HttpError(404, "League not found");
  if (!res.ok) throw new HttpError(res.status, `Merkle claim request failed: ${res.status}`);
  return (await res.json()) as MerklePrizeClaimResponse;
}
