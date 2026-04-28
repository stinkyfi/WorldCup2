import { apiUrl } from "@/lib/apiBase";

export type OracleStagingGroup = { groupId: number; rankings: [string, string, string, string] };

export async function fetchOracleStagingGroups(signal?: AbortSignal): Promise<{
  data: { groups: OracleStagingGroup[] };
}> {
  const res = await fetch(apiUrl("/api/v1/admin/oracle/staging-groups"), {
    method: "GET",
    credentials: "include",
    signal,
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) {
    throw new Error("Could not load staging oracle groups.");
  }
  return json as { data: { groups: OracleStagingGroup[] } };
}

