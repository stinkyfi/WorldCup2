import { apiUrl } from "@/lib/apiBase";

export type BrowseLeague = {
  id: string;
  contractAddress: string | null;
  chainId: number;
  title: string;
  entryTokenSymbol: string;
  entryTokenAddress: string;
  entryFeeWei: string;
  poolWei: string;
  entryCount: number;
  maxEntries: number;
  lockAt: string;
  featured: boolean;
  promotedUntil: string | null;
  createdAt: string;
};

export type LeagueBrowseResponse = {
  data: { featured: BrowseLeague[]; leagues: BrowseLeague[] };
  meta: { total: number; featuredCount: number };
};

/** Chains we label in the UI; unknown IDs fall back to "Chain {id}". */
export const CHAIN_LABELS: Record<number, string> = {
  1: "Ethereum",
  146: "Sonic",
  8453: "Base",
  84532: "Base Sepolia",
};

export function chainLabel(chainId: number): string {
  return CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

export function browseChainsForFilter(): { id: number | ""; label: string }[] {
  const ids = Object.keys(CHAIN_LABELS)
    .map(Number)
    .sort((a, b) => a - b);
  return [{ id: "", label: "All chains" }, ...ids.map((id) => ({ id, label: CHAIN_LABELS[id]! }))];
}

export async function fetchLeagueBrowse(params: URLSearchParams, signal?: AbortSignal): Promise<LeagueBrowseResponse> {
  const qs = params.toString();
  const path = qs ? `/api/v1/leagues/browse?${qs}` : "/api/v1/leagues/browse";
  const res = await fetch(apiUrl(path), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Browse request failed: ${res.status}`);
  }
  return (await res.json()) as LeagueBrowseResponse;
}
