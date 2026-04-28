import { formatEther } from "viem";
import type { PlatformStatsResponse } from "@/lib/platformStats";

type Props = {
  data: PlatformStatsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

function StatSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4" aria-busy="true" aria-label={`${label} loading`}>
      <div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
      <div className="h-8 w-32 animate-pulse rounded bg-muted-foreground/25" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={label}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function HeroStats({ data, isLoading, isError }: Props) {
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-500/30 bg-card p-4 text-sm text-red-400"
      >
        Could not load platform stats. Is the API running?
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
        <StatSkeleton label="Total value locked" />
        <StatSkeleton label="Active leagues" />
        <StatSkeleton label="Total players" />
      </div>
    );
  }

  const tvlEth = formatEther(BigInt(data.data.totalValueLockedWei));

  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
      <StatBlock label="Total value locked" value={`${tvlEth} ETH`} />
      <StatBlock label="Active leagues" value={String(data.data.activeLeagues)} />
      <StatBlock label="Total players" value={String(data.data.totalPlayerCount)} />
    </div>
  );
}
