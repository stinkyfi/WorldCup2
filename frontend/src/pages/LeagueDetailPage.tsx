import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { type Address, formatUnits, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  useAccount,
  useBlock,
  useReadContract,
  useSimulateContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { IdentityDisplay } from "@/components/IdentityDisplay";
import { Button } from "@/components/ui/button";
import { leagueAbi } from "@/lib/leagueAbi";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock, formatTokenWei } from "@/lib/leagueDisplay";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { wagmiConfig } from "@/wagmi";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export function LeagueDetailPage() {
  const { address = "" } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const created = search.get("created") === "1";
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const validAddress = isValidAddress ? address : null;
  const { isConnected, address: walletAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [refundToast, setRefundToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [refundBusy, setRefundBusy] = useState<null | "checking" | "claiming">(null);

  const query = useQuery({
    queryKey: ["league-detail", validAddress],
    queryFn: ({ signal }) => fetchLeagueDetail(validAddress!, signal),
    enabled: isValidAddress,
    staleTime: 20_000,
    retry: 1,
  });

  const league = query.data?.data.league;
  const leagueChainId = league?.chainId as 1 | 146 | 8453 | 84532 | undefined;
  const leagueAddr = isValidAddress ? (getAddress(address) as Address) : undefined;

  const { data: latestBlock } = useBlock({
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueChainId) },
  });

  const { data: onchainState } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "state",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });
  const { data: minThreshold } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "minThreshold",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });
  const { data: totalEntries } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "totalEntries",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });
  const { data: lockTime } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "lockTime",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });
  const { data: entryFee } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "entryFee",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });

  const state =
    typeof onchainState === "bigint"
      ? onchainState
      : typeof onchainState === "number"
        ? BigInt(onchainState)
        : undefined;

  const isRefunding = state === 1n;
  const canCheckThreshold =
    state === 0n &&
    typeof minThreshold !== "undefined" &&
    typeof totalEntries !== "undefined" &&
    typeof lockTime !== "undefined" &&
    typeof latestBlock?.timestamp !== "undefined" &&
    minThreshold > 0n &&
    totalEntries < minThreshold &&
    latestBlock.timestamp >= lockTime;

  const claimSim = useSimulateContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "claimRefund",
    chainId: leagueChainId,
    account: walletAddress,
    query: { enabled: Boolean(isConnected && walletAddress && leagueAddr && leagueChainId && isRefunding) },
  });

  const claimErrorText = useMemo(() => {
    const e = claimSim.error as Error | null | undefined;
    if (!e) return null;
    const m = e.message ?? "";
    if (m.includes("AlreadyClaimed")) return "Refund already claimed for this wallet.";
    if (m.includes("NoRefundDue")) return "No refund due for this wallet.";
    if (m.includes("LeagueNotRefunding")) return "League is not in refunding state.";
    return "Refund not available.";
  }, [claimSim.error]);

  async function ensureChain() {
    if (!leagueChainId) return;
    try {
      await switchChainAsync({ chainId: leagueChainId });
    } catch {
      throw new Error("Please switch your wallet to the league’s chain and try again.");
    }
  }

  const onCheckThreshold = async () => {
    if (!leagueAddr || !leagueChainId) return;
    setRefundToast(null);
    setRefundBusy("checking");
    try {
      await ensureChain();
      const hash = await writeContractAsync({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "checkThreshold",
        chainId: leagueChainId,
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: leagueChainId });
      if (receipt.status !== "success") throw new Error("Threshold check failed.");
      setRefundToast({ kind: "success", text: "Threshold checked. If the league was underfilled, it is now refunding." });
      void query.refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not check threshold.";
      setRefundToast({ kind: "error", text: msg });
    } finally {
      setRefundBusy(null);
    }
  };

  const onClaimRefund = async () => {
    if (!claimSim.data?.request || !leagueChainId) return;
    setRefundToast(null);
    setRefundBusy("claiming");
    try {
      await ensureChain();
      const hash = await writeContractAsync(claimSim.data.request);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: leagueChainId });
      if (receipt.status !== "success") throw new Error("Refund transaction failed.");
      setRefundToast({ kind: "success", text: "Refund claimed." });
      void query.refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not claim refund.";
      setRefundToast({ kind: "error", text: msg });
    } finally {
      setRefundBusy(null);
    }
  };

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {refundToast ? (
        <div
          className={
            refundToast.kind === "success"
              ? "mb-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground"
              : "mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
          role="status"
        >
          {refundToast.text}
        </div>
      ) : null}

      {created && validAddress && !query.isLoading && !query.isError ? (
        <div className="mb-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground" role="status">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">League created</p>
              <p className="mt-0.5 text-muted-foreground">
                Shareable link:{" "}
                <code className="rounded bg-muted px-1">{`${window.location.origin}/league/${validAddress}`}</code>
                {copyMsg ? <span className="ml-2 text-foreground">({copyMsg})</span> : null}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(`${window.location.origin}/league/${validAddress}`)
                  .then(() => setCopyMsg("Copied"))
                  .catch(() => setCopyMsg("Copy failed"))
              }
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      {isRefunding && league ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-foreground" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-destructive">Refunding</p>
              <p className="mt-1 text-muted-foreground">
                This league did not meet its minimum player threshold by lock time. Entrants can claim a full refund of their entry fees.
              </p>
              {typeof minThreshold !== "undefined" && typeof totalEntries !== "undefined" ? (
                <p className="mt-2 text-muted-foreground">
                  Entries: <span className="font-medium text-foreground">{totalEntries.toString()}</span> /{" "}
                  <span className="font-medium text-foreground">{minThreshold.toString()}</span>
                </p>
              ) : null}
              {typeof entryFee !== "undefined" ? (
                <p className="mt-1 text-muted-foreground">
                  Entry fee:{" "}
                  <span className="font-medium text-foreground">
                    {formatUnits(entryFee, league.entryTokenDecimals)} {league.entryTokenSymbol}
                  </span>
                </p>
              ) : null}
              {claimErrorText ? <p className="mt-2 text-xs text-muted-foreground">{claimErrorText}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {!isConnected ? (
                <Button type="button" onClick={() => openConnectModal?.()}>
                  Connect wallet
                </Button>
              ) : null}
              {isConnected && claimSim.isSuccess ? (
                <Button type="button" onClick={() => void onClaimRefund()} disabled={refundBusy !== null}>
                  {refundBusy === "claiming" ? "Claiming refund…" : "Claim refund"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

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
                {canCheckThreshold ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => void onCheckThreshold()}
                    disabled={refundBusy !== null}
                  >
                    {refundBusy === "checking" ? "Checking threshold…" : "Check threshold"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    void navigate(`/league/${address}/enter`);
                  }}
                >
                  Enter League
                </Button>
                {!isConnected ? (
                  <p className="text-xs text-muted-foreground">
                    You’ll be prompted to connect and sign in on the next screen.
                  </p>
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

