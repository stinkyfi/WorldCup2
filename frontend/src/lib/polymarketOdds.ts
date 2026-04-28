import { apiUrl } from "@/lib/apiBase";

export type PolymarketOddsResponse = {
  data: {
    asOf: string;
    ttlSeconds: number;
    stale?: boolean;
    data: unknown;
  };
};

export async function fetchPolymarketOdds(signal?: AbortSignal): Promise<PolymarketOddsResponse> {
  const res = await fetch(apiUrl("/api/v1/polymarket/odds"), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Odds request failed: ${res.status}`);
  }
  return (await res.json()) as PolymarketOddsResponse;
}

