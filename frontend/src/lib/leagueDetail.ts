import { apiUrl } from "@/lib/apiBase";

export type FeeBreakdown = {
  prizePoolBps: number;
  creatorFeeBps: number;
  devFeeBps: number;
  prizePoolAmountWei: string;
  creatorFeeAmountWei: string;
  devFeeAmountWei: string;
};

export type LeagueDetail = {
  id: string;
  contractAddress: string | null;
  chainId: number;
  title: string;
  entryTokenSymbol: string;
  entryTokenAddress: string;
  entryTokenDecimals: number;
  entryFeeWei: string;
  poolWei: string;
  entryCount: number;
  maxEntries: number;
  lockAt: string;
  creatorAddress: string | null;
  creatorDescription: string | null;
  revisionPolicy: string;
  isFeatured: boolean;
  feeBreakdown: FeeBreakdown;
};

export type LeagueDetailResponse = {
  data: { league: LeagueDetail };
  meta?: Record<string, unknown>;
};

export async function fetchLeagueDetail(address: string, signal?: AbortSignal): Promise<LeagueDetailResponse> {
  const res = await fetch(apiUrl(`/api/v1/leagues/by-address/${address}`), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    throw new Error("League not found");
  }
  if (!res.ok) {
    throw new Error(`League request failed: ${res.status}`);
  }
  return (await res.json()) as LeagueDetailResponse;
}

