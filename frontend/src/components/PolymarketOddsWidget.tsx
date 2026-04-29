import { useQuery } from "@tanstack/react-query";
import { fetchPolymarketOdds } from "@/lib/polymarketOdds";
import { cn } from "@/lib/utils";

function hoursSince(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

export function PolymarketOddsWidget({ className }: { className?: string }) {
  const q = useQuery({
    queryKey: ["polymarket-odds"],
    queryFn: ({ signal }) => fetchPolymarketOdds({ signal }),
    staleTime: 60_000,
    retry: 0,
  });

  if (q.isLoading || q.status === "pending") return null;
  if (q.error) return null; // Hide gracefully

  const asOf = q.data?.data.asOf;
  if (!asOf) return null;

  const ageH = hoursSince(asOf);
  const stale = Boolean(q.data?.data.stale) || (typeof ageH === "number" && ageH > 24);

  return (
    <div className={cn("rounded-lg border border-border bg-card/40 p-4 text-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Polymarket odds</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Data as of <span className="font-mono">{new Date(asOf).toLocaleString()}</span>
          </p>
        </div>
        {stale ? (
          <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
            Stale
          </span>
        ) : (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            Live
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Odds display will be wired to each group once real market/team mapping is connected. If this widget is hidden,
        odds are temporarily unavailable.
      </p>
    </div>
  );
}

