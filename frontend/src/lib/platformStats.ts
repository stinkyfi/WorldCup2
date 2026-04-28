import { apiUrl } from "./apiBase.js";

export type PlatformStatsData = {
  totalValueLockedWei: string;
  activeLeagues: number;
  totalPlayerCount: number;
};

export type PlatformStatsResponse = {
  data: PlatformStatsData;
  meta: { lastUpdatedAt: string };
};

export async function fetchPlatformStats(signal?: AbortSignal): Promise<PlatformStatsResponse> {
  const res = await fetch(apiUrl("/api/v1/stats"), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Stats request failed: ${res.status}`);
  }
  return (await res.json()) as PlatformStatsResponse;
}
