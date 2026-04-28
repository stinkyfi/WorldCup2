import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { IdentityDisplay } from "@/components/IdentityDisplay";
import { Button } from "@/components/ui/button";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock, formatTokenWei } from "@/lib/leagueDisplay";
import { fetchLeagueDetail } from "@/lib/leagueDetail";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export function LeagueDetailPage() {
  const { address = "" } = useParams();
  const validAddress = useMemo(() => (isAddress(address) ? address : null), [address]);
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const query = useQuery({
    queryKey: ["league-detail", validAddress],
    queryFn: ({ signal }) => fetchLeagueDetail(validAddress!, signal),
    enabled: validAddress !== null,
    staleTime: 20_000,
    retry: 1,
  });

  if (validAddress === null) {
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

  const league = query.data?.data.league;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {query.isLoading ? (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12" role="status">
          Loading league…
        </div>
      ) : null}

      {query.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Couldn’t load this league.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void query.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && league ? (
        <>
          <header className="mb-8 flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">{league.title}</h1>
                  {league.isFeatured ? (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {chainLabel(league.chainId)} • {league.entryTokenSymbol}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    if (!isConnected) {
                      openConnectModal?.();
                      return;
                    }
                    // Entry flow ships later; keep CTA visible per UX-DR5.
                    window.alert("Entry flow ships in a later epic. Your wallet is connected.");
                  }}
                >
                  Enter League
                </Button>
                {!isConnected ? (
                  <p className="text-xs text-muted-foreground">Connect a wallet to proceed.</p>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border bg-background/40 p-4">
                <dt className="text-xs font-medium text-muted-foreground">Entry fee</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {formatTokenWei(league.entryFeeWei, league.entryTokenSymbol)}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <dt className="text-xs font-medium text-muted-foreground">Prize pool</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {formatTokenWei(league.poolWei, league.entryTokenSymbol)}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <dt className="text-xs font-medium text-muted-foreground">Entries</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {league.entryCount} / {league.maxEntries}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <dt className="text-xs font-medium text-muted-foreground">Time to lock</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">{formatTimeToLock(league.lockAt)}</dd>
              </div>
            </dl>
          </header>

          <section className="mb-10 grid gap-6 lg:grid-cols-2" aria-label="League details">
            <div className="rounded-lg border border-border bg-card/40 p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Creator</h2>
              {league.creatorAddress ? (
                <IdentityDisplay address={league.creatorAddress as `0x${string}`} />
              ) : (
                <p className="text-sm text-muted-foreground">Unknown creator</p>
              )}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-foreground">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {league.creatorDescription?.trim() ? league.creatorDescription : "No description provided yet."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/40 p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Revision policy</h2>
              <p className="text-sm text-muted-foreground">{league.revisionPolicy}</p>

              <div className="mt-8">
                <h2 className="mb-3 text-lg font-semibold text-foreground">Fee breakdown</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Exact token amounts are computed per entry fee. No hidden tooltips.
                </p>
                <dl className="grid gap-3">
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
                    <dt className="text-sm text-muted-foreground">
                      Prize pool ({(league.feeBreakdown.prizePoolBps / 100).toFixed(2)}%)
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {formatTokenWei(league.feeBreakdown.prizePoolAmountWei, league.entryTokenSymbol)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
                    <dt className="text-sm text-muted-foreground">
                      Creator fee ({(league.feeBreakdown.creatorFeeBps / 100).toFixed(2)}%)
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {formatTokenWei(league.feeBreakdown.creatorFeeAmountWei, league.entryTokenSymbol)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
                    <dt className="text-sm text-muted-foreground">Dev fee ({(league.feeBreakdown.devFeeBps / 100).toFixed(2)}%)</dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {formatTokenWei(league.feeBreakdown.devFeeAmountWei, league.entryTokenSymbol)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <div className="flex justify-start">
            <Button type="button" variant="secondary" asChild className="min-h-11">
              <Link to="/browse">Back to browse</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

