import { useQueries } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { TeamNameWithFlag } from "@/components/TeamWithFlag";
import { fetchPolymarketOdds } from "@/lib/polymarketOdds";
import { extractPolymarketWinOddsByTeamName, formatPolymarketPercent } from "@/lib/polymarketTeamWinOdds";
import { WORLD_CUP_GROUPS, type WorldCupGroupId } from "@/lib/worldCupGroups";
import { cn } from "@/lib/utils";

export function MarketIntelPanel(props: {
  defaultGroupId?: WorldCupGroupId;
  className?: string;
}) {
  const { defaultGroupId = "A", className } = props;
  const [intelGroupId, setIntelGroupId] = useState<WorldCupGroupId>(defaultGroupId);

  const polymarketQueries = useQueries({
    queries: WORLD_CUP_GROUPS.map((g) => ({
      queryKey: ["polymarket-odds", g.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchPolymarketOdds({ group: g.id, signal }),
      staleTime: 60_000,
      retry: 0,
    })),
  });

  const polymarketByGroupId = useMemo(() => {
    const out = new Map<WorldCupGroupId, { asOf: string; stale: boolean; percentByTeamName: Map<string, number> }>();
    for (let i = 0; i < WORLD_CUP_GROUPS.length; i++) {
      const g = WORLD_CUP_GROUPS[i]!;
      const q = polymarketQueries[i];
      if (!q?.data) continue;
      try {
        out.set(g.id, extractPolymarketWinOddsByTeamName(q.data));
      } catch {
        /* ignore parse errors */
      }
    }
    return out;
  }, [polymarketQueries]);

  const intelGroup = WORLD_CUP_GROUPS.find((g) => g.id === intelGroupId) ?? WORLD_CUP_GROUPS[0]!;
  const intelPolymarket = polymarketByGroupId.get(intelGroupId) ?? null;

  return (
    <div className={cn("border-gradient-brand rounded-xl bg-card/40 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-foreground">Market intel</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Polymarket</span> group winner win % (implied probability).
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <TrendingUp className="size-3.5" />
          Polymarket
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {WORLD_CUP_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setIntelGroupId(g.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              intelGroupId === g.id
                ? "border-accent/40 bg-accent/15 text-foreground"
                : "border-border bg-background/35 text-muted-foreground hover:bg-background/50",
            )}
            title={`View Polymarket odds for ${g.label}`}
          >
            {g.id}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background/35 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{intelGroup.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {intelPolymarket ? (
              <>
                as of <span className="font-mono">{new Date(intelPolymarket.asOf).toLocaleString()}</span>
                {intelPolymarket.stale ? <span className="ml-2 text-destructive">(stale)</span> : null}
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>

        <div className="mt-3 grid gap-2">
          {intelGroup.teams.map((t) => {
            const pct = intelPolymarket?.percentByTeamName.get(t.name);
            const pctNum = typeof pct === "number" && Number.isFinite(pct) ? pct : null;
            return (
              <div key={t.id} className="grid gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground">
                    <TeamNameWithFlag teamName={t.name} />
                  </span>
                  <span className="font-semibold text-foreground">{pctNum !== null ? formatPolymarketPercent(pctNum) : "—"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary/70 via-accent/70 to-accent"
                    style={{ width: `${Math.max(0, Math.min(100, pctNum ?? 0))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

