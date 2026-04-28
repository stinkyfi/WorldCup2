import type { LeaderboardBreakdownGroup } from "@/lib/leaderboard";

export function LeaderboardBreakdownGrid(props: {
  tiebreakerTotalGoals: number | null | undefined;
  groups: LeaderboardBreakdownGroup[];
}) {
  const { tiebreakerTotalGoals, groups } = props;

  return (
    <div className="grid gap-2">
      <div className="text-xs text-muted-foreground">
        Tiebreaker total goals:{" "}
        <span className="font-medium text-foreground">{tiebreakerTotalGoals ?? "—"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.groupId} className="rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">{g.groupLabel}</div>
              <div className="text-xs text-muted-foreground">
                {g.status === "pending" ? "Pending" : g.status === "posted" ? "Posted" : "—"}
              </div>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                Predicted:{" "}
                <span className="text-foreground">{g.predicted ? g.predicted.join(", ") : "—"}</span>
              </div>
              <div>
                Actual:{" "}
                <span className="text-foreground">
                  {g.actual ? g.actual.map((x) => x ?? "?").join(", ") : g.status === "pending" ? "Pending" : "—"}
                </span>
              </div>
              <div>
                Points:{" "}
                <span className="text-foreground">
                  {typeof g.points === "number" ? `${g.points}${g.perfectBonus ? " (perfect)" : ""}` : "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
