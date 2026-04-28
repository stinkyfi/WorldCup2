import { apiUrl } from "@/lib/apiBase";

export type CreatorPredictionEntry = {
  walletAddress: string;
  entryIndex: number;
  entryId: string;
  groups: Record<string, [string, string, string, string]>;
  tiebreakerTotalGoals: number;
  createdAt: string;
};

export async function fetchCreatorPredictions(params: {
  leagueAddress: string;
  signal?: AbortSignal;
}): Promise<{ data: { locked: boolean; lockAt: string; entries: CreatorPredictionEntry[] } }> {
  const { leagueAddress, signal } = params;
  const res = await fetch(apiUrl(`/api/v1/leagues/by-address/${leagueAddress}/predictions`), {
    credentials: "include",
    signal,
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error("Could not load predictions.");
  return json as { data: { locked: boolean; lockAt: string; entries: CreatorPredictionEntry[] } };
}

