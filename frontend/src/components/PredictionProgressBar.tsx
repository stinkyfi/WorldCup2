import { cn } from "@/lib/utils";

export function PredictionProgressBar({
  completedGroups,
  totalGroups,
  tiebreakerFilled,
  className,
}: {
  completedGroups: number;
  totalGroups: number;
  tiebreakerFilled: boolean;
  className?: string;
}) {
  const groupsOk = Math.min(totalGroups, Math.max(0, completedGroups));
  const pct = totalGroups > 0 ? Math.round((groupsOk / totalGroups) * 100) : 0;
  const label = `${groupsOk} / ${totalGroups} groups${tiebreakerFilled ? " + tiebreaker ✓" : ""}`;

  return (
    <div
      className={cn(
        "sticky top-16 z-30 border-b border-accent/15 bg-surface/95 shadow-[0_8px_32px_-20px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" />
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Progress</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="ml-auto h-2.5 w-44 overflow-hidden rounded-full border border-border/60 bg-muted/80 p-px shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

