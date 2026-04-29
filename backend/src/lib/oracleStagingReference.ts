/** Parse `ORACLE_STAGING_GROUPS_JSON` for a group's canonical team keys (dev/staging reference for disputes). */

export function loadStagingTeamKeysForGroup(groupId: number): readonly [string, string, string, string] | null {
  if (!Number.isFinite(groupId) || groupId < 0 || groupId > 11) return null;
  const raw = process.env.ORACLE_STAGING_GROUPS_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    for (const item of parsed) {
      const o = item as Record<string, unknown>;
      const gid = Number(o.groupId);
      const rankings = o.rankings as unknown;
      if (gid !== groupId) continue;
      if (!Array.isArray(rankings) || rankings.length !== 4 || rankings.some((x) => typeof x !== "string")) {
        return null;
      }
      return [rankings[0], rankings[1], rankings[2], rankings[3]] as [string, string, string, string];
    }
    return null;
  } catch {
    return null;
  }
}
