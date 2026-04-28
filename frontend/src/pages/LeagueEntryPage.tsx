import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { type Address, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { LeaderboardBreakdownGrid } from "@/components/LeaderboardBreakdownGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock, formatTokenWei } from "@/lib/leagueDisplay";
import { erc20Abi } from "@/lib/erc20Abi";
import { leagueAbi } from "@/lib/leagueAbi";
import { fetchLeaderboard, fetchLeaderboardBreakdown } from "@/lib/leaderboard";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { fetchComplianceStatus, HttpError, postComplianceAck } from "@/lib/leagueCompliance";
import {
  computePredictionCommitment,
  getEntryIndexFromStorage,
  loadPredictionFromStorage,
  migrateLegacyV1IfPresent,
  setEntryIndexInStorage,
} from "@/lib/predictionCommitment";
import { wagmiConfig } from "@/wagmi";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

const ZERO_MERKLE_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

/** Until Epic 8 exposes Merkle eligibility, show Claim CTA for ranks in this band (inclusive). */
const PLACEHOLDER_PRIZE_RANK_CAP = 10;

function ResolvedEntrySection(props: {
  leagueAddressRaw: string;
  leagueChainId: number;
  leagueTitle: string;
  entryId: string | null;
}) {
  const { leagueAddressRaw, leagueChainId, leagueTitle, entryId } = props;
  const { address: walletAddress } = useAccount();

  const lbQuery = useQuery({
    queryKey: ["leaderboard", leagueChainId, leagueAddressRaw],
    queryFn: ({ signal }) =>
      fetchLeaderboard({ chainId: leagueChainId, leagueAddress: leagueAddressRaw, signal }),
    enabled: Boolean(walletAddress && leagueChainId && leagueAddressRaw),
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const rowsMine = useMemo(() => {
    const rows = lbQuery.data?.data.rows ?? [];
    const w = walletAddress?.toLowerCase();
    if (!w) return [];
    return rows.filter((r) => r.walletAddress.toLowerCase() === w);
  }, [lbQuery.data?.data.rows, walletAddress]);

  const defaultEntryIndex = useMemo(() => {
    if (!walletAddress || rowsMine.length === 0) return null;
    const sid = entryId
      ? getEntryIndexFromStorage({ leagueAddress: leagueAddressRaw, walletAddress, entryId })
      : null;
    if (sid !== null && rowsMine.some((r) => r.entryIndex === sid)) return sid;
    return rowsMine.reduce((min, r) => Math.min(min, r.entryIndex), rowsMine[0].entryIndex);
  }, [rowsMine, entryId, leagueAddressRaw, walletAddress]);

  const [manualEntryIndex, setManualEntryIndex] = useState<number | null>(null);

  useEffect(() => {
    setManualEntryIndex(null);
  }, [entryId, leagueAddressRaw, walletAddress]);

  const effectiveEntryIndex = manualEntryIndex ?? defaultEntryIndex;

  const breakdownQuery = useQuery({
    queryKey: ["leaderboard-breakdown", leagueChainId, leagueAddressRaw, walletAddress, effectiveEntryIndex],
    queryFn: ({ signal }) =>
      fetchLeaderboardBreakdown({
        chainId: leagueChainId,
        leagueAddress: leagueAddressRaw,
        walletAddress: walletAddress!,
        entryIndex: effectiveEntryIndex!,
        signal,
      }),
    enabled: Boolean(walletAddress && effectiveEntryIndex !== null && leagueChainId),
    staleTime: 10_000,
    retry: 0,
  });

  const rowForEntry = rowsMine.find((r) => r.entryIndex === effectiveEntryIndex);

  const [shareHint, setShareHint] = useState<string | null>(null);

  async function onShareResult() {
    const rank = rowForEntry?.rank;
    const score = rowForEntry?.totalPoints;
    const url = `${window.location.origin}/league/${leagueAddressRaw}/enter${
      entryId ? `?entryId=${encodeURIComponent(entryId)}` : ""
    }`;
    const lines = [
      `DegenDraft — ${leagueTitle}`,
      typeof rank === "number" && typeof score === "number" ? `#${rank} · ${score} pts` : "",
      url,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: leagueTitle, text, url });
        setShareHint("Shared.");
        window.setTimeout(() => setShareHint(null), 2500);
        return;
      }
    } catch {
      /* user cancelled native share */
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareHint("Copied to clipboard.");
      window.setTimeout(() => setShareHint(null), 2500);
    } catch {
      setShareHint("Could not share or copy.");
    }
  }

  const showClaimCta =
    typeof rowForEntry?.rank === "number" &&
    rowForEntry.rank >= 1 &&
    rowForEntry.rank <= PLACEHOLDER_PRIZE_RANK_CAP;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Your results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{leagueTitle}</span> — Merkle root is posted; payouts follow Epic
            8.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="min-h-11" asChild>
            <Link to={`/league/${leagueAddressRaw}`}>League home</Link>
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" asChild>
            <Link to={`/league/${leagueAddressRaw}/leaderboard`}>Leaderboard</Link>
          </Button>
        </div>
      </div>

      {!walletAddress ? (
        <p className="text-sm text-muted-foreground">Connect the wallet you used to enter this league to load your scores.</p>
      ) : lbQuery.isLoading ? (
        <div className="text-sm text-muted-foreground" role="status">
          Loading your score…
        </div>
      ) : lbQuery.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load leaderboard.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void lbQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : rowsMine.length === 0 ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          No entry found for your wallet in this league (or scores are still being indexed).
        </div>
      ) : (
        <Card className="border-border bg-card/40">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Final score breakdown</CardTitle>
              <CardDescription>Predicted vs actual groups, points, and tiebreaker.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onShareResult()}>
                Share result
              </Button>
              {showClaimCta ? (
                <Button type="button" className="min-h-11" asChild>
                  <Link to={`/league/${leagueAddressRaw}/claim`}>Claim prize</Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {shareHint ? <p className="text-xs text-muted-foreground">{shareHint}</p> : null}

            <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-background/40 px-4 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Rank</div>
                <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
                  <span>{rowForEntry?.rank ?? "—"}</span>
                  {rowForEntry?.tied ? (
                    <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                      Tied
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-lg font-semibold text-foreground">{rowForEntry?.totalPoints ?? "—"}</div>
              </div>
              {rowsMine.length > 1 ? (
                <label className="ml-auto flex flex-col gap-1 text-xs text-muted-foreground sm:min-w-[180px]">
                  Entry slot
                  <select
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                    value={effectiveEntryIndex ?? ""}
                    onChange={(e) => setManualEntryIndex(Number(e.target.value))}
                  >
                    {rowsMine.map((r) => (
                      <option key={r.entryIndex} value={r.entryIndex}>
                        Entry #{r.entryIndex}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {breakdownQuery.isLoading ? (
              <div className="text-muted-foreground" role="status">
                Loading breakdown…
              </div>
            ) : breakdownQuery.isError ? (
              <div className="text-destructive">Could not load score breakdown.</div>
            ) : (
              <LeaderboardBreakdownGrid
                tiebreakerTotalGoals={breakdownQuery.data?.data.entry.tiebreakerTotalGoals}
                groups={breakdownQuery.data?.data.groups ?? []}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function LeagueEntryPage() {
  const { address = "" } = useParams();
  const [search] = useSearchParams();
  const entryId = search.get("entryId");
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const validAddress = isValidAddress ? address : null;
  const { isConnected, address: walletAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [ackChecked, setAckChecked] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryBusy, setEntryBusy] = useState<null | "approving" | "entering">(null);
  const [entrySuccess, setEntrySuccess] = useState<{ commitmentHash: `0x${string}` } | null>(null);

  const leagueQuery = useQuery({
    queryKey: ["league-detail", validAddress],
    queryFn: ({ signal }) => fetchLeagueDetail(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 20_000,
    retry: 1,
  });

  const complianceQuery = useQuery({
    queryKey: ["league-compliance", validAddress],
    queryFn: ({ signal }) => fetchComplianceStatus(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 5_000,
    retry: (count, err) => {
      if (err instanceof HttpError && (err.status === 401 || err.status === 404)) return false;
      return count < 1;
    },
  });

  const ackMutation = useMutation({
    mutationFn: async () => postComplianceAck(validAddress!),
    onSuccess: async () => {
      setAckError(null);
      await complianceQuery.refetch();
    },
    onError: (e) => {
      if (e instanceof HttpError && e.status === 401) setAckError("Sign in required.");
      else setAckError("Could not save acknowledgement. Please try again.");
    },
  });

  const league = leagueQuery.data?.data.league;
  const compliance = complianceQuery.data?.data;
  const acknowledged = compliance?.acknowledged === true;

  const leagueChainId = league?.chainId as 1 | 146 | 8453 | 84532 | undefined;
  const leagueAddr = isValidAddress ? (getAddress(address) as Address) : undefined;
  const tokenAddr = league?.entryTokenAddress ? (getAddress(league.entryTokenAddress) as Address) : undefined;
  let entryFeeWei: bigint | undefined;
  try {
    entryFeeWei = league?.entryFeeWei ? BigInt(league.entryFeeWei) : undefined;
  } catch {
    entryFeeWei = undefined;
  }

  const { data: allowance } = useReadContract({
    address: tokenAddr,
    abi: erc20Abi,
    functionName: "allowance",
    args: walletAddress && leagueAddr ? [walletAddress, leagueAddr] : undefined,
    chainId: leagueChainId,
    query: {
      enabled: Boolean(isConnected && walletAddress && tokenAddr && leagueAddr && leagueChainId),
      refetchInterval: 15_000,
    },
  });

  const { data: walletEntryCountBefore } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "walletEntryCount",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: leagueChainId,
    query: {
      enabled: Boolean(isConnected && walletAddress && leagueAddr && leagueChainId),
      staleTime: 5_000,
    },
  });

  const allowanceEnough = typeof allowance !== "undefined" && typeof entryFeeWei !== "undefined" ? allowance >= entryFeeWei : false;
  const prediction = useMemo(() => {
    if (!isValidAddress || !walletAddress) return null;
    migrateLegacyV1IfPresent(address, walletAddress);
    return loadPredictionFromStorage(address, walletAddress, entryId);
  }, [address, entryId, isValidAddress, walletAddress]);
  const predictionReady = Boolean(prediction?.payload);

  const { data: merkleRoot, isPending: merklePending } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "merkleRoot",
    chainId: leagueChainId,
    query: {
      enabled: Boolean(leagueAddr && leagueChainId && league),
    },
  });

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  if (leagueQuery.isLoading || complianceQuery.isLoading || (league && merklePending)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground" role="status">
        Loading entry…
      </div>
    );
  }

  if (leagueQuery.error || complianceQuery.error) {
    const msg =
      complianceQuery.error instanceof HttpError && complianceQuery.error.status === 401
        ? "Sign in required."
        : leagueQuery.error
          ? "Could not load league."
          : complianceQuery.error
            ? "Could not load compliance status."
            : "Could not load entry page.";
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">{msg}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              void leagueQuery.refetch();
              void complianceQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">League not found.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  const resolved =
    merkleRoot !== undefined && merkleRoot !== ZERO_MERKLE_ROOT;

  if (resolved) {
    return (
      <ResolvedEntrySection
        leagueAddressRaw={address}
        leagueChainId={league.chainId}
        leagueTitle={league.title}
        entryId={entryId}
      />
    );
  }

  async function ensureChain() {
    if (!leagueChainId) return;
    await switchChainAsync({ chainId: leagueChainId });
  }

  async function onEnter() {
    setEntryError(null);
    if (!isConnected || !walletAddress) {
      setEntryError("Connect a wallet to continue.");
      return;
    }
    if (!acknowledged) {
      setEntryError("Acknowledge compliance to continue.");
      return;
    }
    if (!prediction?.payload) {
      setEntryError("Make predictions before entering (or pick an entry slot).");
      return;
    }
    if (!leagueChainId || !leagueAddr || !tokenAddr) {
      setEntryError("League is missing chain or contract details.");
      return;
    }
    if (typeof entryFeeWei === "undefined") {
      setEntryError("Could not determine entry fee.");
      return;
    }

    try {
      await ensureChain();

      if (!allowanceEnough) {
        setEntryBusy("approving");
        const approveHash = await writeContractAsync({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "approve",
          args: [leagueAddr, entryFeeWei],
          chainId: leagueChainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash, chainId: leagueChainId });
      }

      setEntryBusy("entering");
      const commitmentHash = computePredictionCommitment(prediction.payload);

      const enterHash = await writeContractAsync({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "enter",
        args: [commitmentHash],
        chainId: leagueChainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: enterHash, chainId: leagueChainId });

      if (entryId && typeof walletEntryCountBefore !== "undefined") {
        const idx = Number(walletEntryCountBefore) /* before tx */; // next index equals previous count
        if (Number.isFinite(idx) && idx >= 0) {
          setEntryIndexInStorage({ leagueAddress: address, walletAddress, entryId, entryIndex: idx });
        }
      }

      setEntrySuccess({ commitmentHash });
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      if (m.includes("LeagueLocked")) setEntryError("League is locked. Entries are closed.");
      else if (m.includes("MaxEntriesReached")) setEntryError("This league is full.");
      else if (m.includes("MaxEntriesPerWalletReached")) setEntryError("You reached the max entries per wallet.");
      else if (m.toLowerCase().includes("user rejected") || m.toLowerCase().includes("rejected")) setEntryError("Transaction rejected in wallet.");
      else setEntryError("Entry failed. Please try again.");
    } finally {
      setEntryBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Enter league</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{league.title}</span> • {chainLabel(league.chainId)} • Locks{" "}
          {formatTimeToLock(league.lockAt)}
        </p>
      </div>

      {!acknowledged ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Compliance acknowledgment</CardTitle>
            <CardDescription>You must acknowledge once per league before entering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-4 text-muted-foreground">
              <p className="text-foreground font-medium">Jurisdiction self-certification</p>
              <p className="mt-2">
                By continuing, you confirm you are permitted to participate where you are located, and you understand this
                is a prediction game with an on-chain entry fee.
              </p>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={ackChecked}
                onChange={(e) => {
                  setAckError(null);
                  setAckChecked(e.target.checked);
                }}
              />
              <span className="text-muted-foreground">
                I confirm I am eligible to participate and I agree to proceed.
              </span>
            </label>

            {ackError ? <p className="text-sm text-destructive">{ackError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={!ackChecked || ackMutation.isPending}
                onClick={() => {
                  if (!ackChecked) {
                    setAckError("Please check the box to continue.");
                    return;
                  }
                  ackMutation.mutate();
                }}
              >
                {ackMutation.isPending ? "Saving…" : "Acknowledge & continue"}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" asChild>
                <Link to={`/league/${address}`}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className={!acknowledged ? "opacity-50 pointer-events-none select-none" : undefined}>
        <CardHeader>
          <CardTitle>Fee review</CardTitle>
          <CardDescription>Review fees and submit your entry transaction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!predictionReady ? (
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Predictions not found for this league. Create predictions first, then come back here to enter.
              <div className="mt-3">
                <Button type="button" variant="secondary" className="min-h-11" asChild>
                  <Link to={`/league/${address}/predict`}>Make predictions</Link>
                </Button>
              </div>
            </div>
          ) : null}
          <dl className="grid gap-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Entry fee</dt>
              <dd className="text-sm font-semibold text-foreground">{formatTokenWei(league.entryFeeWei, league.entryTokenSymbol)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Prize pool (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.prizePoolAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Creator fee (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.creatorFeeAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Dev fee (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.devFeeAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
          </dl>

          {entrySuccess ? (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-4 text-sm">
              <p className="font-medium text-foreground">Entry submitted</p>
              <p className="mt-1 text-muted-foreground">
                Commitment hash: <code className="rounded bg-muted px-1">{entrySuccess.commitmentHash}</code>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="min-h-11" asChild>
                  <Link to={`/league/${address}/predict`}>Make predictions</Link>
                </Button>
                <Button type="button" variant="secondary" className="min-h-11" asChild>
                  <Link to={`/league/${address}/predict`}>Add another entry</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {entryError ? <p className="text-sm text-destructive">{entryError}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={!acknowledged || !predictionReady || entryBusy !== null || Boolean(entrySuccess)}
              onClick={() => void onEnter()}
            >
              {entryBusy === "approving"
                ? "Approving…"
                : entryBusy === "entering"
                  ? "Entering…"
                  : entrySuccess
                    ? "Entered"
                    : allowanceEnough
                      ? "Enter league"
                      : "Approve & enter"}
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" asChild>
              <Link to={`/league/${address}`}>Back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

