import { apiUrl } from "@/lib/apiBase";

export type PolymarketOddsResponse = {
  data: {
    asOf: string;
    ttlSeconds: number;
    stale?: boolean;
    data: unknown;
  };
};

export async function fetchPolymarketOdds(params?: {
  group?: string;
  signal?: AbortSignal;
}): Promise<PolymarketOddsResponse> {
  const qs = new URLSearchParams();
  if (params?.group) qs.set("group", params.group);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(apiUrl(`/api/v1/polymarket/odds${suffix}`), {
    signal: params?.signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Odds request failed: ${res.status}`);
  }
  return (await res.json()) as PolymarketOddsResponse;
}

