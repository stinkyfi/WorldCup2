import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroStats } from "@/components/HeroStats";
import { fetchPlatformStats } from "@/lib/platformStats";

export function LandingPage() {
  const [search, setSearch] = useSearchParams();
  const adminAccessDenied = search.get("notice") === "admin_denied";

  function dismissAdminNotice() {
    const next = new URLSearchParams(search);
    next.delete("notice");
    setSearch(next, { replace: true });
  }

  const statsQuery = useQuery({
    queryKey: ["platform-stats"],
    queryFn: ({ signal }) => fetchPlatformStats(signal),
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      {adminAccessDenied ? (
        <div
          className="mb-8 flex flex-col gap-2 rounded-xl border border-accent/20 bg-card/50 px-4 py-3 text-sm text-foreground shadow-[0_0_32px_-14px_rgba(104,74,188,0.35)] sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <span>Access denied: this wallet is not an admin for that area on the selected network.</span>
          <button
            type="button"
            className="text-left font-medium text-accent underline underline-offset-2 sm:text-right"
            onClick={() => dismissAdminNotice()}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <section aria-labelledby="hero-heading" className="relative mb-12">
        <div
          className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent/90">DegenDraft</p>
        <h1
          id="hero-heading"
          className="font-display mb-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
        >
          <span className="text-gradient-brand">Predict the beautiful game</span>
        </h1>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Live platform activity from the indexer API. Connect a wallet only when you enter or create a league (Story
          2.2).
        </p>
        <HeroStats data={statsQuery.data} isLoading={statsQuery.isLoading} isError={statsQuery.isError} />
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4" aria-label="Primary calls to action">
        <Button type="button" asChild className="min-h-11 w-full sm:w-auto">
          <Link to="/browse">Browse leagues</Link>
        </Button>
        <Button type="button" variant="secondary" asChild className="min-h-11 w-full sm:w-auto">
          <Link to="/create">Create a league</Link>
        </Button>
      </section>
    </div>
  );
}
