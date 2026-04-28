import { apiUrl } from "@/lib/apiBase";

export type LeaderboardRow = {
  walletAddress: string;
  entryIndex: number;
  totalPoints: number;
  rank: number;
  rankDelta: number;
  /** Same rank number as another row (shared placement — prize split per Epic 8 rules). */
  tied?: boolean;
  updatedAt: string;
};

export type LeaderboardResponse = {
  lastUpdatedAt: string | null;
  rows: LeaderboardRow[];
};

export type LeaderboardBreakdownGroup = {
  groupId: number;
  groupLabel: string;
  status: "posted" | "pending" | "unknown";
  predicted: [string, string, string, string] | null;
  actual: [string | null, string | null, string | null, string | null] | null;
  points: number | null;
  perfectBonus: boolean | null;
};

export type LeaderboardBreakdownResponse = {
  entry: { walletAddress: string; entryIndex: number; tiebreakerTotalGoals: number };
  groups: LeaderboardBreakdownGroup[];
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

export async function fetchLeaderboardBreakdown(params: {
  chainId: number;
  leagueAddress: string;
  walletAddress: string;
  entryIndex: number;
  signal?: AbortSignal;
}): Promise<{ data: LeaderboardBreakdownResponse }> {
  const { chainId, leagueAddress, walletAddress, entryIndex, signal } = params;
  const qs = new URLSearchParams({
    chainId: String(chainId),
    leagueAddress,
    walletAddress,
    entryIndex: String(entryIndex),
  });
  const res = await fetch(apiUrl(`/api/v1/leaderboard/breakdown?${qs.toString()}`), { credentials: "include", signal });
  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error("Could not load score breakdown.");
  return json as { data: LeaderboardBreakdownResponse };
}

