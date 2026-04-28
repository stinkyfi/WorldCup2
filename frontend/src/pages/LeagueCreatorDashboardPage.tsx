import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccount, useBlock } from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCreatorPredictions } from "@/lib/creatorPredictions";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock } from "@/lib/leagueDisplay";
import { fetchLeagueCreatorDashboard, HttpError } from "@/lib/leagueCreatorDashboard";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function buildReferralLink(origin: string, leagueAddress: string, ref: string | null | undefined) {
  const url = new URL(`/league/${leagueAddress}`, origin);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

function buildShareText(platform: "x" | "telegram" | "discord", leagueTitle: string, link: string) {
  if (platform === "x") return `Join my league: ${leagueTitle}\n${link}`;
  if (platform === "telegram") return `Join my league: ${leagueTitle}\n${link}`;
  return `Join my league: ${leagueTitle}\n${link}`;
}

export function LeagueCreatorDashboardPage() {
  const { address = "" } = useParams();
  const navigate = useNavigate();
  const { address: walletAddress } = useAccount();
  const [copied, setCopied] = useState<string | null>(null);

  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const validAddress = isValidAddress ? address : null;

  const query = useQuery({
    queryKey: ["league-creator-dashboard", validAddress],
    queryFn: ({ signal }) => fetchLeagueCreatorDashboard(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: (count, err) => {
      if (err instanceof HttpError && (err.status === 401 || err.status === 403 || err.status === 404)) return false;
      return count < 1;
    },
  });

  const league = query.data?.data.league;
  const leagueChainId = league?.chainId as 1 | 146 | 8453 | 84532 | undefined;
  const { data: latestBlock } = useBlock({
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueChainId) },
  });
  const lockAtSec =
    league?.lockAt ? BigInt(Math.floor(new Date(league.lockAt).getTime() / 1000)) : null;
  const locked = typeof latestBlock?.timestamp !== "undefined" && lockAtSec !== null ? latestBlock.timestamp >= lockAtSec : false;

  const predictionsQuery = useQuery({
    queryKey: ["creator-predictions", validAddress],
    queryFn: ({ signal }) => fetchCreatorPredictions({ leagueAddress: validAddress!, signal }),
    enabled: Boolean(validAddress && locked),
    staleTime: 30_000,
    retry: 0,
  });

  // Redirect non-creators back to public league page.
  if (query.error instanceof HttpError && query.error.status === 403 && validAddress) {
    void navigate(`/league/${validAddress}`);
  }

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Creator dashboard</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  if (query.isLoading || query.status === "pending") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground" role="status">
        Loading creator dashboard…
      </div>
    );
  }

  if (query.error) {
    const msg =
      query.error instanceof HttpError && query.error.status === 401
        ? "Sign in required."
        : query.error instanceof HttpError && query.error.status === 404
          ? "League not found."
          : "Could not load creator dashboard.";
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Creator dashboard</h1>
        <p className="mb-8 text-muted-foreground">{msg}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
          <Button type="button" onClick={() => void query.refetch()} className="min-h-11">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground" role="status">
        Creator dashboard unavailable.
      </div>
    );
  }

  const origin = window.location.origin;
  const referralLink = buildReferralLink(origin, address, walletAddress);
  const discordText = buildShareText("discord", league.title ?? "League", referralLink);
  const telegramText = buildShareText("telegram", league.title ?? "League", referralLink);
  const xText = buildShareText("x", league.title ?? "League", referralLink);

  const usdEstimate =
    league.entryTokenSymbol?.toUpperCase() === "USDC"
      ? `${formatUnits(BigInt(league.poolWei), league.entryTokenDecimals)} USD`
      : "—";

  async function onCopy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((v) => (v === key ? null : v)), 1200);
    } catch {
      setCopied("error");
      window.setTimeout(() => setCopied((v) => (v === "error" ? null : v)), 1500);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Creator dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <>
              <span className="font-medium text-foreground">{league.title}</span> • {chainLabel(league.chainId)} • Locks{" "}
              {formatTimeToLock(league.lockAt)}
            </>
          </p>
        </div>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to={`/league/${address}`}>View public page</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Key stats</CardTitle>
            <CardDescription>Refreshes automatically every 30s.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Entries</span>
              <span className="font-medium text-foreground">
                {league.entryCount} / {league.maxEntries}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prize pool</span>
              <span className="font-medium text-foreground">
                {formatUnits(BigInt(league.poolWei), league.entryTokenDecimals)} {league.entryTokenSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">USD estimate</span>
              <span className="font-medium text-foreground">{usdEstimate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral link</CardTitle>
            <CardDescription>Use this link when sharing to track your referrals later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <code className="break-all">{referralLink}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onCopy("link", referralLink)}>
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onCopy("discord", discordText)}>
                {copied === "discord" ? "Copied" : "Copy Discord"}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onCopy("telegram", telegramText)}>
                {copied === "telegram" ? "Copied" : "Copy Telegram"}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onCopy("x", xText)}>
                {copied === "x" ? "Copied" : "Copy X"}
              </Button>
              {copied === "error" ? <span className="self-center text-xs text-destructive">Copy failed.</span> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>View all predictions</CardTitle>
            <CardDescription>
              {locked ? "Predictions are revealed after lock time." : "Predictions are hidden until the league locks."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!locked ? (
              <p className="text-muted-foreground">Locked at {new Date(league.lockAt).toLocaleString()}.</p>
            ) : predictionsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading predictions…</p>
            ) : predictionsQuery.isError ? (
              <p className="text-destructive">Could not load predictions.</p>
            ) : (
              <>
                <p className="text-muted-foreground">{predictionsQuery.data?.data.entries.length ?? 0} entries</p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-medium">Wallet</th>
                        <th className="px-4 py-3 text-left font-medium">Entry</th>
                        <th className="px-4 py-3 text-left font-medium">Tiebreaker</th>
                        <th className="px-4 py-3 text-left font-medium">Predictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(predictionsQuery.data?.data.entries ?? []).map((e) => (
                        <tr key={`${e.walletAddress}-${e.entryIndex}`} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{e.walletAddress}</td>
                          <td className="px-4 py-3 text-foreground">#{e.entryIndex}</td>
                          <td className="px-4 py-3 text-foreground">{e.tiebreakerTotalGoals}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {Object.entries(e.groups)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([k, v]) => `${k}: ${v.join(", ")}`)
                              .join(" • ")}
                          </td>
                        </tr>
                      ))}
                      {(predictionsQuery.data?.data.entries ?? []).length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                            No stored predictions yet. Players must submit their payloads to the backend for reveal/scoring.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

