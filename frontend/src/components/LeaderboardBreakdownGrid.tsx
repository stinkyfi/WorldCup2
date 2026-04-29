import type { LeaderboardBreakdownGroup } from "@/lib/leaderboard";
import { TeamKeyWithFlag } from "@/components/TeamWithFlag";

function InlineTeamList(props: { teamKeys: readonly (string | null)[] }) {
  const { teamKeys } = props;
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {teamKeys.map((k, i) =>
        k ? (
          <TeamKeyWithFlag key={`${k}-${i}`} teamKey={k} />
        ) : (
          <span key={`unknown-${i}`} className="text-muted-foreground">
            ?
          </span>
        ),
      )}
    </span>
  );
}

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
          <div
            key={g.groupId}
            className="rounded-lg border border-border/80 bg-card/30 p-3 shadow-inner shadow-black/10 transition-colors hover:border-accent/20"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{g.groupLabel}</div>
              <div className="text-xs font-medium text-muted-foreground">
                {g.status === "pending" ? (
                  <span className="text-muted-foreground">Pending</span>
                ) : g.status === "posted" ? (
                  <span className="text-accent">Posted</span>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                Predicted:{" "}
                <span className="text-foreground">
                  {g.predicted ? <InlineTeamList teamKeys={g.predicted} /> : "—"}
                </span>
              </div>
              <div>
                Actual:{" "}
                <span className="text-foreground">
                  {g.actual ? (
                    <InlineTeamList teamKeys={g.actual} />
                  ) : g.status === "pending" ? (
                    "Pending"
                  ) : (
                    "—"
                  )}
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
