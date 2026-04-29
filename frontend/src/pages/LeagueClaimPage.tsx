import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatUnits, getAddress, type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Button } from "@/components/ui/button";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTokenWei } from "@/lib/leagueDisplay";
import { leagueAbi } from "@/lib/leagueAbi";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { HttpError } from "@/lib/leagueCompliance";
import { fetchMerklePrizeClaim } from "@/lib/merklePrizeClaim";
import { wagmiConfig } from "@/wagmi";

const ZERO_MERKLE_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function txExplorerUrl(chainId: number, txHash: Hex): string {
  switch (chainId) {
    case 8453:
      return `https://basescan.org/tx/${txHash}`;
    case 84532:
      return `https://sepolia.basescan.org/tx/${txHash}`;
    case 1:
      return `https://etherscan.io/tx/${txHash}`;
    case 146:
      return `https://sonicscan.org/tx/${txHash}`;
    default:
      return `https://sepolia.basescan.org/tx/${txHash}`;
  }
}

function usdApproxLabel(symbol: string, decimals: number, amountWei: bigint): string | null {
  const u = symbol.toUpperCase();
  if (!["USDC", "USDT", "DAI"].includes(u)) return null;
  const v = Number(formatUnits(amountWei, decimals));
  if (!Number.isFinite(v)) return null;
  return `≈ $${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD (1:1 ${u} estimate)`;
}

function claimErrorMessage(m: string): string {
  if (m.includes("AlreadyClaimed")) return "This prize was already claimed.";
  if (m.includes("InvalidProof")) return "The payout proof does not match the on-chain Merkle root.";
  if (m.includes("LeagueNotResolved")) return "This league is not resolved for claims yet.";
  if (m.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
  return "Claim failed. Please try again.";
}

/** Chains configured in `wagmi.ts` — `useReadContract` / `waitForTransactionReceipt` need this literal union. */
type WagmiConfiguredChainId = 1 | 8453 | 84532 | 146;

function toWagmiChainId(n: number | undefined): WagmiConfiguredChainId | undefined {
  if (n === 1 || n === 8453 || n === 84532 || n === 146) return n;
  return undefined;
}

export function LeagueClaimPage() {
  const { address = "" } = useParams();
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const leagueAddr = isValidAddress ? (getAddress(address) as Address) : undefined;

  const { address: walletAddress, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<{
    txHash: Hex;
    amountLabel: string;
    explorerTxUrl: string;
  } | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const leagueQuery = useQuery({
    queryKey: ["league-detail", address],
    queryFn: ({ signal }) => fetchLeagueDetail(address, signal),
    enabled: isValidAddress,
    staleTime: 20_000,
    retry: 1,
  });

  const league = leagueQuery.data?.data.league;
  const leagueChainId = toWagmiChainId(league?.chainId);

  const { data: merkleRoot, isPending: merklePending } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "merkleRoot",
    chainId: leagueChainId,
    query: {
      enabled: Boolean(leagueAddr && leagueChainId && league),
    },
  });

  const resolved =
    merkleRoot !== undefined && merkleRoot !== ZERO_MERKLE_ROOT && Boolean(leagueAddr && leagueChainId);

  const merkleQuery = useQuery({
    queryKey: ["merkle-prize", leagueChainId, leagueAddr, walletAddress],
    queryFn: ({ signal }) =>
      fetchMerklePrizeClaim({
        chainId: leagueChainId!,
        leagueAddress: leagueAddr!,
        walletAddress: walletAddress!,
        signal,
      }),
    enabled: Boolean(resolved && walletAddress && leagueAddr && leagueChainId),
    staleTime: 15_000,
    retry: 1,
  });

  const eligibleData = merkleQuery.data?.data.eligible === true ? merkleQuery.data.data : null;

  const amountWei = useMemo(() => {
    if (!eligibleData) return undefined;
    try {
      return BigInt(eligibleData.amountWei);
    } catch {
      return undefined;
    }
  }, [eligibleData]);

  const amountLabel =
    eligibleData && amountWei !== undefined
      ? formatTokenWei(eligibleData.amountWei, eligibleData.entryTokenSymbol)
      : "—";

  const usdLabel =
    eligibleData && amountWei !== undefined
      ? usdApproxLabel(eligibleData.entryTokenSymbol, eligibleData.entryTokenDecimals, amountWei)
      : null;

  const onClaim = useCallback(async () => {
    setClaimError(null);
    if (!isConnected || !walletAddress) {
      setClaimError("Connect the wallet that won this prize.");
      return;
    }
    if (!eligibleData || !leagueAddr || !leagueChainId || amountWei === undefined) {
      setClaimError("Nothing to claim.");
      return;
    }
    try {
      setClaimBusy(true);
      await switchChainAsync({ chainId: leagueChainId });
      const hash = await writeContractAsync({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "claimPrize",
        args: [amountWei, eligibleData.proof],
        chainId: leagueChainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: leagueChainId });
      setClaimSuccess({
        txHash: hash,
        amountLabel: formatTokenWei(eligibleData.amountWei, eligibleData.entryTokenSymbol),
        explorerTxUrl: txExplorerUrl(leagueChainId, hash),
      });
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      setClaimError(claimErrorMessage(m));
    } finally {
      setClaimBusy(false);
    }
  }, [
    amountWei,
    eligibleData,
    isConnected,
    leagueAddr,
    leagueChainId,
    switchChainAsync,
    walletAddress,
    writeContractAsync,
  ]);

  const onShareSuccess = useCallback(async () => {
    const title = eligibleData?.leagueTitle ?? league?.title ?? "DegenDraft";
    const lines = [
      `${title} — prize claimed`,
      claimSuccess?.amountLabel ?? amountLabel,
      claimSuccess?.txHash ? `Tx: ${claimSuccess.txHash}` : "",
      typeof window !== "undefined" ? window.location.origin : "",
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text });
        setShareHint("Shared.");
        window.setTimeout(() => setShareHint(null), 2500);
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareHint("Copied to clipboard.");
      window.setTimeout(() => setShareHint(null), 2500);
    } catch {
      setShareHint("Could not copy.");
    }
  }, [amountLabel, claimSuccess, eligibleData?.leagueTitle, league?.title]);

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Claim prize</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  if (leagueQuery.isLoading || (league && merklePending)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-muted-foreground" role="status">
        Loading…
      </div>
    );
  }

  if (leagueQuery.error || !league) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Claim prize</h1>
        <p className="mb-8 text-muted-foreground">League not found.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  if (!leagueChainId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Claim prize</h1>
        <p className="mb-8 text-muted-foreground">
          This league&apos;s chain is not supported in this app build for wallet claims.
        </p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to={`/league/${address}`}>Back to league</Link>
        </Button>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Claim prize</h1>
        <p className="mb-8 text-muted-foreground">
          Claims open after the Merkle payout root is posted for this league on {chainLabel(league.chainId)}.
        </p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to={`/league/${address}`}>Back to league</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Claim prize</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{league.title}</span> · {chainLabel(league.chainId)}
          </p>
        </div>
        <Button type="button" variant="secondary" className="min-h-11" asChild>
          <Link to={`/league/${address}`}>League home</Link>
        </Button>
      </div>

      {!isConnected || !walletAddress ? (
        <p className="text-sm text-muted-foreground">Connect the wallet you used to enter this league.</p>
      ) : merkleQuery.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading your payout…
        </p>
      ) : merkleQuery.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {merkleQuery.error instanceof HttpError && merkleQuery.error.status === 404
            ? "League not found."
            : "Could not load claim data."}{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void merkleQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : merkleQuery.data?.data.eligible === false ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          You did not finish in a prize position.
        </div>
      ) : eligibleData && amountWei !== undefined ? (
        <ClaimPanel
          leagueTitle={eligibleData.leagueTitle}
          amountLabel={amountLabel}
          usdApproxLabel={usdLabel}
          busy={claimBusy}
          error={claimError}
          success={claimSuccess}
          onClaim={onClaim}
          onShareSuccess={onShareSuccess}
          shareHint={shareHint}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Unexpected response.</p>
      )}
    </div>
  );
}
