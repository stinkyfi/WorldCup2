import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccount, useBlock, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { formatUnits, getAddress, type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCreatorPredictions } from "@/lib/creatorPredictions";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock } from "@/lib/leagueDisplay";
import { fetchLeagueCreatorDashboard, HttpError } from "@/lib/leagueCreatorDashboard";
import { fetchMerkleFeeClaim } from "@/lib/merkleFeeClaim";
import { leagueAbi } from "@/lib/leagueAbi";
import { wagmiConfig } from "@/wagmi";

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
  const { address: walletAddress, isConnected } = useAccount();
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
  const leagueAddr = useMemo(() => {
    if (!isValidAddress) return undefined;
    try {
      return getAddress(address) as Address;
    } catch {
      return undefined;
    }
  }, [address, isValidAddress]);

  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const ZERO_MERKLE_ROOT =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

  const { data: merkleRoot } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "merkleRoot",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });

  const resolved = merkleRoot !== undefined && (merkleRoot as string) !== ZERO_MERKLE_ROOT;

  const feeQuery = useQuery({
    queryKey: ["merkle-fee", leagueChainId, address, walletAddress],
    queryFn: ({ signal }) =>
      fetchMerkleFeeClaim({
        chainId: leagueChainId!,
        leagueAddress: address,
        walletAddress: walletAddress!,
        signal,
      }),
    enabled: Boolean(resolved && leagueChainId && walletAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const feeEligible = feeQuery.data?.data.eligible === true ? feeQuery.data.data : null;
  const feeAmountWei = useMemo(() => {
    if (!feeEligible) return undefined;
    try {
      return BigInt(feeEligible.amountWei);
    } catch {
      return undefined;
    }
  }, [feeEligible]);

  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState<{ txHash: Hex } | null>(null);

  const feeErrorMessage = useCallback((m: string): string => {
    if (m.includes("AlreadyClaimed")) return "Fee was already claimed.";
    if (m.includes("InvalidProof")) return "The fee proof does not match the on-chain Merkle root.";
    if (m.includes("LeagueNotResolved")) return "This league is not resolved for fee claims yet.";
    if (m.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
    return "Fee claim failed. Please try again.";
  }, []);

  const onClaimFee = useCallback(async () => {
    setFeeError(null);
    if (!isConnected || !walletAddress) {
      setFeeError("Connect the creator wallet to claim your fee.");
      return;
    }
    if (!feeEligible || feeAmountWei === undefined || !leagueAddr || !leagueChainId) {
      setFeeError("Nothing to claim.");
      return;
    }
    try {
      setFeeBusy(true);
      await switchChainAsync({ chainId: leagueChainId });
      const txHash = await writeContractAsync({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "claimFee",
        args: [feeAmountWei, feeEligible.proof],
        chainId: leagueChainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: txHash, chainId: leagueChainId });
      setFeeSuccess({ txHash });
      void feeQuery.refetch();
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      setFeeError(feeErrorMessage(m));
    } finally {
      setFeeBusy(false);
    }
  }, [
    feeAmountWei,
    feeEligible,
    feeErrorMessage,
    feeQuery.refetch,
    isConnected,
    leagueAddr,
    leagueChainId,
    switchChainAsync,
    walletAddress,
    writeContractAsync,
  ]);
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
            <CardTitle>Creator fee claim</CardTitle>
            <CardDescription>Available after the Merkle root is posted for this league.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!resolved ? (
              <p className="text-muted-foreground">Claims open when the league is resolved and the Merkle root is posted.</p>
            ) : !walletAddress ? (
              <p className="text-muted-foreground">Connect your creator wallet to check your fee claim.</p>
            ) : feeQuery.isLoading ? (
              <p className="text-muted-foreground" role="status">
                Loading fee claim…
              </p>
            ) : feeQuery.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Could not load fee claim.{" "}
                <button type="button" className="underline underline-offset-2" onClick={() => void feeQuery.refetch()}>
                  Retry
                </button>
              </div>
            ) : feeQuery.data?.data.eligible === false ? (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-4 text-muted-foreground">
                No fee leaf found for this wallet.
              </div>
            ) : feeEligible && feeAmountWei !== undefined ? (
              <>
                <div className="rounded-md border border-border bg-background/40 px-4 py-3">
                  <div className="text-xs text-muted-foreground">Claimable</div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatUnits(feeAmountWei, feeEligible.entryTokenDecimals)} {feeEligible.entryTokenSymbol}
                  </div>
                </div>
                {feeError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
                    {feeError}
                  </div>
                ) : null}
                {feeSuccess ? (
                  <div className="rounded-md border border-accent/30 bg-primary/10 px-4 py-3 text-foreground">
                    Fee claimed. Tx: <span className="font-mono text-xs">{feeSuccess.txHash}</span>
                  </div>
                ) : null}
                <Button type="button" className="min-h-11" disabled={feeBusy} onClick={() => void onClaimFee()}>
                  {feeBusy ? "Confirm in wallet…" : "Claim fee"}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Unexpected response.</p>
            )}
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

