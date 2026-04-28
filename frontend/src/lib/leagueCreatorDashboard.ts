import { apiUrl } from "@/lib/apiBase";
import type { LeagueDetail, LeagueDetailResponse } from "@/lib/leagueDetail";

export type LeagueCreatorDashboardResponse = LeagueDetailResponse;
export type LeagueCreatorDashboardLeague = LeagueDetail;

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchLeagueCreatorDashboard(
  address: string,
  signal?: AbortSignal,
): Promise<LeagueCreatorDashboardResponse> {
  const res = await fetch(apiUrl(`/api/v1/leagues/by-address/${address}/creator`), {
    signal,
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status === 401) throw new HttpError(401, "Sign in required");
  if (res.status === 403) throw new HttpError(403, "Forbidden");
  if (res.status === 404) throw new HttpError(404, "League not found");
  if (!res.ok) throw new HttpError(res.status, `Creator dashboard request failed: ${res.status}`);
  return (await res.json()) as LeagueCreatorDashboardResponse;
}

