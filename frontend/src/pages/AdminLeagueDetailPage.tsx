import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { type Address, type Hex, isAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { leagueAbi } from "@/lib/leagueAbi";
import { wagmiConfig } from "@/wagmi";

type ChainId = 1 | 8453 | 146;

function txExplorerUrl(chainId: number, txHash: Hex): string {
  switch (chainId) {
    case 8453: return `https://basescan.org/tx/${txHash}`;
    case 1: return `https://etherscan.io/tx/${txHash}`;
    case 146: return `https://sonicscan.org/tx/${txHash}`;
    default: return `https://etherscan.io/tx/${txHash}`;
  }
}

function mapWriteError(m: string): string {
  if (m.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
  if (m.includes("NotAuthorized")) return "Connected wallet is not the refundAuthority for this league.";
  return `Transaction failed: ${m}`;
}

type LastTx = { hash: Hex; url: string };

export function AdminLeagueDetailPage() {
  const { address: addressParam } = useParams<{ address: string }>();
  const [searchParams] = useSearchParams();

  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  // ─── Chain + address state ────────────────────────────────────────────────
  const rawChainParam = searchParams.get("chainId");
  const [chainId, setChainId] = useState<ChainId>(() => {
    const parsed = rawChainParam ? parseInt(rawChainParam, 10) : 8453;
    return ([1, 8453, 146] as ChainId[]).includes(parsed as ChainId)
      ? (parsed as ChainId)
      : 8453;
  });

  const [addressInput, setAddressInput] = useState<string>(addressParam ?? "");
  const leagueAddress = isAddress(addressInput.trim())
    ? (addressInput.trim() as Address)
    : null;

  // ─── Shared feedback state ────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<LastTx | null>(null);

  // ─── On-chain read ────────────────────────────────────────────────────────
  const { data: entriesPaused, refetch: refetchPaused } = useReadContract({
    address: leagueAddress ?? undefined,
    abi: leagueAbi,
    functionName: "entriesPaused",
    chainId,
    query: { enabled: Boolean(leagueAddress) },
  });

  // ─── Pause / resume actions ───────────────────────────────────────────────
  const onTogglePause = useCallback(
    async (pause: boolean) => {
      if (!leagueAddress || !isConnected) {
        setError("Connect the refundAuthority wallet and enter a valid league address.");
        return;
      }
      setError(null);
      setLastTx(null);
      try {
        setBusy(true);
        await switchChainAsync({ chainId });
        const hash = await writeContractAsync({
          address: leagueAddress,
          abi: leagueAbi,
          functionName: pause ? "pauseEntries" : "resumeEntries",
          chainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
        setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
        void refetchPaused();
      } catch (e) {
        setError(mapWriteError((e as Error | null | undefined)?.message ?? "Unknown error"));
      } finally {
        setBusy(false);
      }
    },
    [leagueAddress, isConnected, chainId, switchChainAsync, writeContractAsync, refetchPaused],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/leagues">
          <Button type="button" variant="secondary" className="min-h-11">
            ← Leagues
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">League detail</h1>
      </div>

      {/* Chain + address selectors */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Chain</span>
          <select
            className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={chainId}
            onChange={(e) => {
              setChainId(parseInt(e.target.value, 10) as ChainId);
              setError(null);
              setLastTx(null);
            }}
          >
            <option value="8453">Base</option>
            <option value="1">Ethereum</option>
            <option value="146">Sonic</option>
          </select>
        </label>
        <label className="grid min-w-0 flex-1 gap-1">
          <span className="text-xs font-medium text-muted-foreground">League address</span>
          <input
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              setError(null);
              setLastTx(null);
            }}
            placeholder="0x…"
          />
        </label>
      </div>

      {!leagueAddress ? (
        <p className="mb-6 text-sm text-muted-foreground">
          Enter a valid league contract address above.
        </p>
      ) : null}

      {/* Shared error / last tx */}
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {lastTx ? (
        <div className="mb-4 rounded-md border border-accent/25 bg-accent/10 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Last tx: </span>
          <a className="underline underline-offset-2" href={lastTx.url} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </div>
      ) : null}

      {/* Entry pause card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entry pause</CardTitle>
          <CardDescription>
            Pause or resume new entries to this league on-chain. Requires the{" "}
            <code className="text-xs">refundAuthority</code> wallet to be connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-xs">
            <span className="text-muted-foreground">entriesPaused: </span>
            <span className={entriesPaused ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
              {entriesPaused !== undefined
                ? entriesPaused
                  ? "PAUSED"
                  : "active"
                : leagueAddress
                  ? "loading…"
                  : "—"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={busy || !leagueAddress || !isConnected || entriesPaused !== false}
              onClick={() => void onTogglePause(true)}
            >
              {busy ? "Confirming…" : "Pause new entries"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={busy || !leagueAddress || !isConnected || entriesPaused !== true}
              onClick={() => void onTogglePause(false)}
            >
              {busy ? "Confirming…" : "Resume entries"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
