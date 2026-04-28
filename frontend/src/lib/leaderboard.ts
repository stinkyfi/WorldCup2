import { apiUrl } from "@/lib/apiBase";

export type LeaderboardRow = {
  walletAddress: string;
  entryIndex: number;
  totalPoints: number;
  rank: number;
  rankDelta: number;
  updatedAt: string;
};

export type LeaderboardResponse = {
  lastUpdatedAt: string | null;
  rows: LeaderboardRow[];
};

export async function fetchLeaderboard(params: {
  chainId: number;
  leagueAddress: string;
  signal?: AbortSignal;
}): Promise<{ data: LeaderboardResponse }> {
  const { chainId, leagueAddress, signal } = params;
  const qs = new URLSearchParams({ chainId: String(chainId), leagueAddress });
  const res = await fetch(apiUrl(`/api/v1/leaderboard?${qs.toString()}`), { credentials: "include", signal });
  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error("Could not load leaderboard.");
  return json as { data: LeaderboardResponse };
}

