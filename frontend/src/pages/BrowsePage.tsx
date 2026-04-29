import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useChainId } from "wagmi";
import { LeagueCard } from "@/components/LeagueCard";
import { Button } from "@/components/ui/button";
import { CREATE_LEAGUE_CHAINS } from "@/lib/createLeagueChains";
import {
  buildLeagueBrowseSearchParams,
  chainLabel,
  fetchLeagueBrowse,
} from "@/lib/leagueBrowse";
import { fetchWhitelistedTokens } from "@/lib/fetchWhitelistedTokens";

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-surface/90 px-3 text-sm text-foreground shadow-inner shadow-black/20 transition-colors focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const WHITELIST_QUERY_CHAIN_IDS = new Set<number>(CREATE_LEAGUE_CHAINS.map((c) => c.chainId));

export function BrowsePage() {
  const chainId = useChainId();
  const [search, setSearch] = useSearchParams();
  const prevChainId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prevChainId.current !== undefined && prevChainId.current !== chainId) {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("entryToken");
          return next;
        },
        { replace: true },
      );
    }
    prevChainId.current = chainId;
  }, [chainId, setSearch]);

  useEffect(() => {
    if (WHITELIST_QUERY_CHAIN_IDS.has(chainId)) return;
    setSearch(
      (prev) => {
        if (!prev.get("entryToken")) return prev;
        const next = new URLSearchParams(prev);
        next.delete("entryToken");
        return next;
      },
      { replace: true },
    );
  }, [chainId, setSearch]);

  const filters = useMemo(
    () => ({
      entryToken: search.get("entryToken") ?? undefined,
      sort: search.get("sort") ?? undefined,
      order: search.get("order") ?? undefined,
    }),
    [search],
  );

  const apiParams = useMemo(() => buildLeagueBrowseSearchParams(chainId, filters), [chainId, filters]);

  const query = useQuery({
    queryKey: ["league-browse", chainId, filters.entryToken ?? "", filters.sort ?? "", filters.order ?? ""],
    queryFn: ({ signal }) => fetchLeagueBrowse(apiParams, signal),
    staleTime: 20_000,
    retry: 1,
  });

  const tokensQuery = useQuery({
    queryKey: ["whitelisted-tokens", chainId, "browse"],
    queryFn: ({ signal }) => fetchWhitelistedTokens(chainId, signal),
    enabled: WHITELIST_QUERY_CHAIN_IDS.has(chainId),
    staleTime: 60_000,
  });

  const setFields = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearch],
  );

  const hasActiveFilters = Boolean(search.get("entryToken")?.trim());

  const featured = query.data?.data.featured ?? [];
  const leagues = query.data?.data.leagues ?? [];
  const isEmpty = !query.isLoading && !query.isError && featured.length === 0 && leagues.length === 0;

  const tokenOptions = tokensQuery.data?.data.tokens ?? [];
  const selectedToken = search.get("entryToken")?.trim() ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="relative mb-10">
        <div
          className="pointer-events-none absolute -left-8 -top-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <h1 className="font-display relative text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Browse leagues
        </h1>
        <p className="relative mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Public leagues from the indexer for <span className="font-medium text-foreground">{chainLabel(chainId)}</span>
          . Switch your wallet network to change chain. Sort by date, pool size, or entries.
        </p>
      </header>

      <section
        aria-label="Filters"
        className="mb-10 flex flex-col gap-4 rounded-xl border border-border/80 bg-card/50 p-4 shadow-[0_0_40px_-18px_rgba(104,74,188,0.2)] backdrop-blur-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            Entry token
            <select
              className={selectClass}
              value={selectedToken}
              onChange={(e) => setFields({ entryToken: e.target.value || undefined })}
              disabled={
                !WHITELIST_QUERY_CHAIN_IDS.has(chainId) || tokensQuery.isLoading || tokensQuery.isError
              }
            >
              <option value="">All tokens</option>
              {tokenOptions.map((t) => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
            </select>
            {tokensQuery.isError ? (
              <span className="text-xs text-destructive">{(tokensQuery.error as Error).message}</span>
            ) : null}
            {!WHITELIST_QUERY_CHAIN_IDS.has(chainId) ? (
              <span className="text-xs text-muted-foreground">
                Per-token filter uses the curated list on Base, Ethereum, and Sonic mainnet.
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Sort by
            <select
              className={selectClass}
              value={search.get("sort") ?? "createdAt"}
              onChange={(e) => setFields({ sort: e.target.value })}
            >
              <option value="createdAt">Date created</option>
              <option value="poolWei">Total pool</option>
              <option value="entryCount">Entry count</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Order
            <select
              className={selectClass}
              value={search.get("order") ?? "desc"}
              onChange={(e) => setFields({ order: e.target.value })}
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>
          </label>
        </div>
        {hasActiveFilters ? (
          <div>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setFields({ entryToken: undefined })}>
              Clear token filter
            </Button>
          </div>
        ) : null}
      </section>

      {query.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading leagues">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-primary/10 bg-gradient-to-b from-muted/50 to-muted/20"
            />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Something went wrong loading leagues. Check your connection and try again.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void query.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-xl border border-border/80 bg-card/40 px-6 py-12 text-center shadow-inner shadow-black/20">
          <p className="text-lg font-medium text-foreground">No leagues on {chainLabel(chainId)} match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">Try clearing the token filter or switching network if you expected other leagues.</p>
          {hasActiveFilters ? (
            <Button type="button" className="mt-6 min-h-11" variant="secondary" onClick={() => setFields({ entryToken: undefined })}>
              Clear token filter
            </Button>
          ) : null}
        </div>
      ) : null}

      {!query.isLoading && !query.isError && !isEmpty ? (
        <>
          {featured.length > 0 ? (
            <section className="mb-10" aria-labelledby="featured-heading">
              <h2
                id="featured-heading"
                className="font-display mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
              >
                <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent" aria-hidden />
                Featured
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                {featured.map((league) => (
                  <div key={league.id} className="min-w-[min(100%,20rem)] shrink-0 sm:min-w-0">
                    <LeagueCard league={league} spotlight />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {leagues.length > 0 ? (
            <section aria-labelledby="all-heading">
              <h2
                id="all-heading"
                className="font-display mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
              >
                <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-primary" aria-hidden />
                {featured.length > 0 ? "All leagues" : "Leagues"}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {leagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
