import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IdentityDisplay } from "@/components/IdentityDisplay";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { fetchLeaderboard } from "@/lib/leaderboard";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function formatDelta(delta: number): string {
  if (!Number.isFinite(delta) || delta === 0) return "—";
  return delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`;
}

export function LeagueLeaderboardPage() {
  const { address = "" } = useParams();
  const valid = useMemo(() => (isAddress(address) ? address : null), [address]);

  const leagueQuery = useQuery({
    queryKey: ["league-detail", valid],
    queryFn: ({ signal }) => fetchLeagueDetail(valid!, signal),
    enabled: Boolean(valid),
    staleTime: 20_000,
    retry: 1,
  });

  const league = leagueQuery.data?.data.league;
  const chainId = league?.chainId;

  const lbQuery = useQuery({
    queryKey: ["leaderboard", chainId, valid],
    queryFn: ({ signal }) => fetchLeaderboard({ chainId: chainId!, leagueAddress: valid!, signal }),
    enabled: Boolean(valid && chainId),
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (valid === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Invalid league address</h1>
        <p className="mb-8 text-muted-foreground">Check the URL and try again.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Back to browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-foreground">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {league?.title ? <span className="text-foreground">{league.title}</span> : "Loading league…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${valid}`}>Back</Link>
          </Button>
        </div>
      </div>

      {lbQuery.isLoading ? (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-sm text-muted-foreground" role="status">
          Loading leaderboard…
        </div>
      ) : null}

      {lbQuery.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Couldn’t load leaderboard.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void lbQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!lbQuery.isLoading && !lbQuery.isError ? (
        <div className="rounded-lg border border-border bg-card/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Updated:{" "}
              <span className="text-foreground">
                {lbQuery.data?.data.lastUpdatedAt ? new Date(lbQuery.data.data.lastUpdatedAt).toLocaleString() : "—"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{lbQuery.data?.data.rows.length ?? 0} entries</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Rank</th>
                  <th className="px-5 py-3 text-left font-medium">Player</th>
                  <th className="px-5 py-3 text-right font-medium">Score</th>
                  <th className="px-5 py-3 text-right font-medium">Δ</th>
                </tr>
              </thead>
              <tbody>
                {(lbQuery.data?.data.rows ?? []).map((r) => (
                  <tr key={`${r.walletAddress}-${r.entryIndex}`} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 font-medium text-foreground">{r.rank}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <IdentityDisplay address={r.walletAddress as `0x${string}`} />
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">#{r.entryIndex}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{r.totalPoints}</td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">{formatDelta(r.rankDelta)}</td>
                  </tr>
                ))}

                {(lbQuery.data?.data.rows ?? []).length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-muted-foreground" colSpan={4}>
                      No leaderboard data yet. Once results are posted and the indexer runs, scores will appear here.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

