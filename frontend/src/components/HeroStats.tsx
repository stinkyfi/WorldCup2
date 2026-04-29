import { formatEther } from "viem";
import type { PlatformStatsResponse } from "@/lib/platformStats";

type Props = {
  data: PlatformStatsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

function StatSkeleton({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl border border-border/80 bg-card/50 p-4 shadow-inner shadow-black/20"
      aria-busy="true"
      aria-label={`${label} loading`}
    >
      <div className="mb-2 h-3 w-24 animate-pulse rounded bg-accent/10" />
      <div className="h-8 w-32 animate-pulse rounded bg-primary/15" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="group rounded-xl border border-primary/20 bg-gradient-to-b from-card/90 to-card/40 p-4 shadow-[0_0_36px_-18px_rgba(104,74,188,0.25),inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[border-color,box-shadow] duration-300 hover:border-accent/35 hover:shadow-[0_0_40px_-14px_rgba(10,238,235,0.18)]"
      aria-label={label}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums text-accent">{value}</p>
    </div>
  );
}

export function HeroStats({ data, isLoading, isError }: Props) {
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive shadow-[0_0_28px_-12px_rgba(248,113,113,0.35)]"
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
