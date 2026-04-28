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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {adminAccessDenied ? (
        <div
          className="mb-6 flex flex-col gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <span>Access denied: this wallet is not an admin for that area on the selected network.</span>
          <button type="button" className="text-left text-primary underline underline-offset-2 sm:text-right" onClick={() => dismissAdminNotice()}>
            Dismiss
          </button>
        </div>
      ) : null}
      <section aria-labelledby="hero-heading" className="mb-10">
        <h1 id="hero-heading" className="mb-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Predict the beautiful game
        </h1>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Live platform activity from the indexer API. Connect a wallet only when you enter or create a league (Story
          2.2).
        </p>
        <HeroStats
          data={statsQuery.data}
          isLoading={statsQuery.isLoading}
          isError={statsQuery.isError}
        />
      </section>

      <section className="flex flex-col gap-4 sm:flex-row sm:flex-wrap" aria-label="Primary calls to action">
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
