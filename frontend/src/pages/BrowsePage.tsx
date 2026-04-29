import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LeagueCard } from "@/components/LeagueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browseChainsForFilter, fetchLeagueBrowse } from "@/lib/leagueBrowse";

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-surface/90 px-3 text-sm text-foreground shadow-inner shadow-black/20 transition-colors focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function browseParamsFromSearch(search: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams();
  const chainId = search.get("chainId");
  if (chainId && chainId.trim() !== "") p.set("chainId", chainId.trim());
  const entryToken = search.get("entryToken");
  if (entryToken && entryToken.trim() !== "") p.set("entryToken", entryToken.trim());
  const minFeeWei = search.get("minFeeWei");
  if (minFeeWei && minFeeWei.trim() !== "") p.set("minFeeWei", minFeeWei.trim());
  const maxFeeWei = search.get("maxFeeWei");
  if (maxFeeWei && maxFeeWei.trim() !== "") p.set("maxFeeWei", maxFeeWei.trim());
  const sort = search.get("sort");
  if (sort && sort !== "createdAt") p.set("sort", sort);
  const order = search.get("order");
  if (order && order !== "desc") p.set("order", order);
  return p;
}

export function BrowsePage() {
  const [search, setSearch] = useSearchParams();
  const apiParams = useMemo(() => browseParamsFromSearch(search), [search]);

  const query = useQuery({
    queryKey: ["league-browse", apiParams.toString()],
    queryFn: ({ signal }) => fetchLeagueBrowse(apiParams, signal),
    staleTime: 20_000,
    retry: 1,
  });

  const setFields = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      setSearch(next, { replace: true });
    },
    [search, setSearch],
  );

  const hasActiveFilters =
    Boolean(search.get("chainId")) ||
    Boolean(search.get("entryToken")?.trim()) ||
    Boolean(search.get("minFeeWei")?.trim()) ||
    Boolean(search.get("maxFeeWei")?.trim());

  const featured = query.data?.data.featured ?? [];
  const leagues = query.data?.data.leagues ?? [];
  const isEmpty = !query.isLoading && !query.isError && featured.length === 0 && leagues.length === 0;

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
          Public leagues from the indexer API. Filter by chain, entry token, and fee; sort by date, pool size, or
          entries. No wallet required.
        </p>
      </header>

      <section
        aria-label="Filters"
        className="mb-10 flex flex-col gap-4 rounded-xl border border-border/80 bg-card/50 p-4 shadow-[0_0_40px_-18px_rgba(104,74,188,0.2)] backdrop-blur-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Chain
            <select
              className={selectClass}
              value={search.get("chainId") ?? ""}
              onChange={(e) => setFields({ chainId: e.target.value || undefined })}
            >
              {browseChainsForFilter().map((c) => (
                <option key={c.id === "" ? "all" : String(c.id)} value={c.id === "" ? "" : String(c.id)}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            Entry token (symbol or 0x address)
            <Input
              className="min-h-11"
              placeholder="e.g. USDC"
              value={search.get("entryToken") ?? ""}
              onChange={(e) => setFields({ entryToken: e.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Min fee (wei)
            <Input
              className="min-h-11 font-mono text-sm"
              inputMode="numeric"
              placeholder="0"
              value={search.get("minFeeWei") ?? ""}
              onChange={(e) => setFields({ minFeeWei: e.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Max fee (wei)
            <Input
              className="min-h-11 font-mono text-sm"
              inputMode="numeric"
              placeholder="optional"
              value={search.get("maxFeeWei") ?? ""}
              onChange={(e) => setFields({ maxFeeWei: e.target.value || undefined })}
            />
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
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setSearch({}, { replace: true })}>
              Clear filters
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
          <p className="text-lg font-medium text-foreground">No leagues match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try choosing &quot;All chains&quot;, removing the token filter, or widening the fee range.
          </p>
          {hasActiveFilters ? (
            <Button type="button" className="mt-6 min-h-11" variant="secondary" onClick={() => setSearch({}, { replace: true })}>
              Reset filters
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
