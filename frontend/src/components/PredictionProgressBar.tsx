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
    <div className={cn("sticky top-16 z-30 border-b border-border bg-surface/95 backdrop-blur", className)}>
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Progress</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

