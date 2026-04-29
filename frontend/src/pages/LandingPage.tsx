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
    <div className="flex flex-col">
      {adminAccessDenied ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6">
          <div
            className="flex flex-col gap-2 rounded-xl border border-accent/20 bg-card/50 px-4 py-3 text-sm text-foreground shadow-[0_0_32px_-14px_rgba(104,74,188,0.35)] sm:flex-row sm:items-center sm:justify-between"
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
        </div>
      ) : null}

      <section
        aria-labelledby="hero-heading"
        className="relative isolate w-full overflow-hidden bg-slate-950 bg-[url('/SoccerMatch-HeroSection.png')] bg-cover bg-[center_30%] min-h-[min(72vh,640px)]"
      >
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/88 via-slate-950/72 to-slate-950/92"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-col items-start gap-6 sm:gap-8">
            <Link to="/" className="block shrink-0 transition-opacity hover:opacity-95">
              <img
                src="/DegenDraft.png"
                alt="DegenDraft"
                width={280}
                height={64}
                decoding="async"
                className="h-11 w-auto max-w-[min(100%,14rem)] object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)] sm:h-12 sm:max-w-[16rem] lg:h-14"
              />
            </Link>
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent/95 drop-shadow-sm">
                On-chain prediction leagues
              </p>
              <h1
                id="hero-heading"
                className="font-display mb-4 text-4xl font-bold leading-[1.08] tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-[3.25rem]"
              >
                <span className="text-gradient-brand">Predict the beautiful game</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-white/85 drop-shadow-sm sm:text-lg">
                Live platform activity from the indexer API. Connect a wallet only when you enter or create a league
                (Story 2.2).
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4" aria-label="Primary calls to action">
            <Button type="button" asChild className="min-h-11 w-full shadow-lg sm:w-auto">
              <Link to="/browse">Browse leagues</Link>
            </Button>
            <Button type="button" variant="secondary" asChild className="min-h-11 w-full bg-accent/95 text-black/95 shadow-lg hover:bg-white sm:w-auto">
              <Link to="/create">Create a league</Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6">
      <HeroStats data={statsQuery.data} isLoading={statsQuery.isLoading} isError={statsQuery.isError} />
      </div>
      
    </div>
  );
}
