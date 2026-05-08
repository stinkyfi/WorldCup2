import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { type Address, type Hex, isAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { leagueFactoryAddress } from "@/lib/createLeagueEnv";
import { leagueFactoryAbi } from "@/lib/leagueFactoryAbi";
import { wagmiConfig } from "@/wagmi";

type FactoryChainId = 1 | 8453 | 146;

function txExplorerUrl(chainId: number, txHash: Hex): string {
  switch (chainId) {
    case 8453:
      return `https://basescan.org/tx/${txHash}`;
    case 1:
      return `https://etherscan.io/tx/${txHash}`;
    case 146:
      return `https://sonicscan.org/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
}

function parseBigIntInput(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function mapWriteError(m: string, fallback: string): string {
  if (m.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
  if (m.includes("OwnableUnauthorizedAccount")) return "Connected wallet is not the factory owner.";
  return fallback;
}

type LastTx = { hash: Hex; url: string };

export function AdminSettingsPage() {
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [chainIdRaw, setChainIdRaw] = useState<FactoryChainId>(8453);
  const chainId = chainIdRaw;
  const factory = leagueFactoryAddress(chainId);

  // ─── Shared feedback state ────────────────────────────────────────────────
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<LastTx | null>(null);

  // ─── On-chain reads ───────────────────────────────────────────────────────
  const readOpts = { address: factory, abi: leagueFactoryAbi, chainId, query: { enabled: Boolean(factory) } } as const;

  const { data: devFeeBps, refetch: refetchDevFeeBps } = useReadContract({ ...readOpts, functionName: "devFeeBps" });
  const { data: creatorFeeCap, refetch: refetchCreatorFeeCap } = useReadContract({ ...readOpts, functionName: "creatorFeeCap" });
  const { data: minEntryAmount, refetch: refetchMinEntry } = useReadContract({ ...readOpts, functionName: "minEntryAmount" });
  const { data: creationFeeOnChain, refetch: refetchCreationFee } = useReadContract({ ...readOpts, functionName: "creationFee" });
  const { data: creationsPaused, refetch: refetchPaused } = useReadContract({ ...readOpts, functionName: "creationsPaused" });
  const { data: disputeDepositToken, refetch: refetchDisputeToken } = useReadContract({ ...readOpts, functionName: "disputeDepositToken" });
  const { data: disputeDepositAmount, refetch: refetchDisputeAmount } = useReadContract({ ...readOpts, functionName: "disputeDepositAmount" });
  const { data: refundAuthority, refetch: refetchRefundAuth } = useReadContract({ ...readOpts, functionName: "refundAuthority" });

  const refetchAll = useCallback(() => {
    void refetchDevFeeBps();
    void refetchCreatorFeeCap();
    void refetchMinEntry();
    void refetchCreationFee();
    void refetchPaused();
    void refetchDisputeToken();
    void refetchDisputeAmount();
    void refetchRefundAuth();
  }, [
    refetchCreationFee,
    refetchCreatorFeeCap,
    refetchDevFeeBps,
    refetchDisputeAmount,
    refetchDisputeToken,
    refetchMinEntry,
    refetchPaused,
    refetchRefundAuth,
  ]);

  // ─── Section A — global fee params ───────────────────────────────────────
  const [devFeeInput, setDevFeeInput] = useState("");
  const [creatorFeeCapInput, setCreatorFeeCapInput] = useState("");
  const [minEntryInput, setMinEntryInput] = useState("");

  const onSetGlobalParams = useCallback(async () => {
    setError(null);
    setLastTx(null);
    if (!factory || !isConnected) { setError("Connect the factory owner wallet."); return; }
    const devFee = parseBigIntInput(devFeeInput);
    const creatorCap = parseBigIntInput(creatorFeeCapInput);
    const minEntry = parseBigIntInput(minEntryInput);
    if (devFee === null || creatorCap === null || minEntry === null) {
      setError("All three fields must be non-negative integers (basis points / wei).");
      return;
    }
    try {
      setBusyId("global");
      await switchChainAsync({ chainId });
      const hash = await writeContractAsync({
        address: factory,
        abi: leagueFactoryAbi,
        functionName: "setGlobalParams",
        args: [devFee, creatorCap, minEntry],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
      setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
      setDevFeeInput("");
      setCreatorFeeCapInput("");
      setMinEntryInput("");
      refetchAll();
    } catch (e) {
      setError(mapWriteError((e as Error)?.message ?? "", "setGlobalParams failed."));
    } finally {
      setBusyId(null);
    }
  }, [chainId, creatorFeeCapInput, devFeeInput, factory, isConnected, minEntryInput, refetchAll, switchChainAsync, writeContractAsync]);

  // ─── Section B — creation fee ─────────────────────────────────────────────
  const [creationFeeInput, setCreationFeeInput] = useState("");

  const onSetCreationFee = useCallback(async () => {
    setError(null);
    setLastTx(null);
    if (!factory || !isConnected) { setError("Connect the factory owner wallet."); return; }
    const fee = parseBigIntInput(creationFeeInput);
    if (fee === null) { setError("Fee must be a non-negative integer (wei)."); return; }
    try {
      setBusyId("fee");
      await switchChainAsync({ chainId });
      const hash = await writeContractAsync({
        address: factory,
        abi: leagueFactoryAbi,
        functionName: "setCreationFee",
        args: [fee],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
      setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
      setCreationFeeInput("");
      refetchAll();
    } catch (e) {
      setError(mapWriteError((e as Error)?.message ?? "", "setCreationFee failed."));
    } finally {
      setBusyId(null);
    }
  }, [chainId, creationFeeInput, factory, isConnected, refetchAll, switchChainAsync, writeContractAsync]);

  // ─── Section C — creations paused ────────────────────────────────────────
  const onSetPaused = useCallback(async (pause: boolean) => {
    setError(null);
    setLastTx(null);
    if (!factory || !isConnected) { setError("Connect the factory owner wallet."); return; }
    try {
      setBusyId("paused");
      await switchChainAsync({ chainId });
      const hash = await writeContractAsync({
        address: factory,
        abi: leagueFactoryAbi,
        functionName: "setCreationsPaused",
        args: [pause],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
      setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
      refetchAll();
    } catch (e) {
      setError(mapWriteError((e as Error)?.message ?? "", "setCreationsPaused failed."));
    } finally {
      setBusyId(null);
    }
  }, [chainId, factory, isConnected, refetchAll, switchChainAsync, writeContractAsync]);

  // ─── Section D — dispute config ──────────────────────────────────────────
  const [disputeTokenInput, setDisputeTokenInput] = useState("");
  const [disputeAmountInput, setDisputeAmountInput] = useState("");
  const [refundAuthorityInput, setRefundAuthorityInput] = useState("");

  const onSetDisputeConfig = useCallback(async () => {
    setError(null);
    setLastTx(null);
    if (!factory || !isConnected) { setError("Connect the factory owner wallet."); return; }
    const tokenTrimmed = disputeTokenInput.trim();
    const refundTrimmed = refundAuthorityInput.trim();
    const amount = parseBigIntInput(disputeAmountInput);
    const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
    const tokenIsZero = tokenTrimmed === ZERO_ADDR;
    if (!tokenIsZero && !isAddress(tokenTrimmed)) {
      setError("Dispute deposit token must be a valid address (or zero address to disable).");
      return;
    }
    if (amount === null) { setError("Dispute deposit amount must be a non-negative integer (wei)."); return; }
    if (!isAddress(refundTrimmed)) { setError("Refund authority must be a valid address."); return; }
    if (!tokenIsZero && refundTrimmed === ZERO_ADDR) {
      setError("Refund authority cannot be the zero address when a deposit token is set — disputes would be permanently un-settleable.");
      return;
    }
    try {
      setBusyId("dispute");
      await switchChainAsync({ chainId });
      const hash = await writeContractAsync({
        address: factory,
        abi: leagueFactoryAbi,
        functionName: "setDisputeConfig",
        args: [tokenTrimmed as Address, amount, refundTrimmed as Address],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
      setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
      setDisputeTokenInput("");
      setDisputeAmountInput("");
      setRefundAuthorityInput("");
      refetchAll();
    } catch (e) {
      setError(mapWriteError((e as Error)?.message ?? "", "setDisputeConfig failed."));
    } finally {
      setBusyId(null);
    }
  }, [chainId, disputeAmountInput, disputeTokenInput, factory, isConnected, refetchAll, refundAuthorityInput, switchChainAsync, writeContractAsync]);

  const busy = Boolean(busyId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Platform settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read and update global <code className="text-xs">LeagueFactory</code> parameters. All writes require the{" "}
            <strong className="text-foreground">factory owner</strong> wallet — SIWE admin status alone does not grant on-chain powers.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Parameter changes apply only to <span className="text-foreground">new</span> leagues; existing leagues retain the values baked in at creation.
          </p>
        </div>
        <Button type="button" variant="secondary" className="min-h-11 shrink-0" asChild>
          <Link to="/admin">Admin home</Link>
        </Button>
      </div>

      {/* Chain selector + refresh */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Chain</span>
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground"
            value={String(chainIdRaw)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v === 1 || v === 8453 || v === 146) {
                setChainIdRaw(v as FactoryChainId);
                setError(null);
                setLastTx(null);
              }
            }}
          >
            <option value="8453">Base</option>
            <option value="1">Ethereum</option>
            <option value="146">Sonic</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" className="min-h-11" onClick={refetchAll} disabled={busy}>
            Refresh
          </Button>
        </div>
      </div>

      {!factory ? (
        <p className="mb-6 text-sm text-muted-foreground">
          Set <code className="text-xs">VITE_LEAGUE_FACTORY_{chainId}</code> to use this screen.
        </p>
      ) : null}

      {/* Shared error / last tx */}
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}
      {lastTx ? (
        <div className="mb-4 rounded-md border border-accent/25 bg-accent/10 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Last tx: </span>
          <a className="underline underline-offset-2" href={lastTx.url} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Section A — Global fee params */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global fee params</CardTitle>
            <CardDescription>
              Applies to new leagues only via <code className="text-xs">setGlobalParams</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 rounded-md border border-border/60 bg-muted/30 px-4 py-3 font-mono text-xs">
              <span className="text-muted-foreground">devFeeBps</span>
              <span className="text-muted-foreground">creatorFeeCap</span>
              <span className="text-muted-foreground">minEntryAmount</span>
              <span className="text-foreground">{devFeeBps !== undefined ? String(devFeeBps) : "…"}</span>
              <span className="text-foreground">{creatorFeeCap !== undefined ? String(creatorFeeCap) : "…"}</span>
              <span className="text-foreground">{minEntryAmount !== undefined ? String(minEntryAmount) : "…"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "devFee", label: "Dev fee (bps)", value: devFeeInput, set: setDevFeeInput },
                { id: "creatorCap", label: "Creator fee cap (bps)", value: creatorFeeCapInput, set: setCreatorFeeCapInput },
                { id: "minEntry", label: "Min entry amount (wei)", value: minEntryInput, set: setMinEntryInput },
              ].map(({ id, label, value, set }) => (
                <div key={id} className="grid gap-1">
                  <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    id={id}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    inputMode="numeric"
                    placeholder="integer"
                    disabled={busy || !factory}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="min-h-11"
              disabled={busy || !factory || !isConnected}
              onClick={() => void onSetGlobalParams()}
            >
              {busyId === "global" ? "Confirming…" : "Update global params"}
            </Button>
          </CardContent>
        </Card>

        {/* Section B — Creation fee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creation fee</CardTitle>
            <CardDescription>
              Native ETH fee charged per <code className="text-xs">createLeague</code> call (forwarded to devWallet).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 font-mono text-xs">
              <span className="text-muted-foreground">creationFee (wei): </span>
              <span className="text-foreground">{creationFeeOnChain !== undefined ? String(creationFeeOnChain) : "…"}</span>
            </div>
            <div className="grid gap-1 sm:max-w-xs">
              <label htmlFor="creationFee" className="text-xs font-medium text-muted-foreground">New creation fee (wei)</label>
              <input
                id="creationFee"
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                value={creationFeeInput}
                onChange={(e) => setCreationFeeInput(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                disabled={busy || !factory}
              />
            </div>
            <Button
              type="button"
              className="min-h-11"
              disabled={busy || !factory || !isConnected}
              onClick={() => void onSetCreationFee()}
            >
              {busyId === "fee" ? "Confirming…" : "Update creation fee"}
            </Button>
          </CardContent>
        </Card>

        {/* Section C — League creation pause */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">League creation</CardTitle>
            <CardDescription>
              Pause or unpause global league creation via <code className="text-xs">setCreationsPaused</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-xs">
              <span className="text-muted-foreground">creationsPaused: </span>
              <span className={creationsPaused ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                {creationsPaused !== undefined ? (creationsPaused ? "PAUSED" : "active") : "…"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={busy || !factory || !isConnected || creationsPaused !== false}
                onClick={() => void onSetPaused(true)}
              >
                {busyId === "paused" ? "Confirming…" : "Pause new leagues"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={busy || !factory || !isConnected || creationsPaused !== true}
                onClick={() => void onSetPaused(false)}
              >
                {busyId === "paused" ? "Confirming…" : "Unpause new leagues"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section D — Dispute config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispute config</CardTitle>
            <CardDescription>
              Configure dispute deposit for new leagues via <code className="text-xs">setDisputeConfig</code>. Zero token address disables dispute filing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-y-1 rounded-md border border-border/60 bg-muted/30 px-4 py-3 font-mono text-xs">
              <div><span className="text-muted-foreground">disputeDepositToken: </span><span className="break-all text-foreground">{disputeDepositToken !== undefined ? String(disputeDepositToken) : "…"}</span></div>
              <div><span className="text-muted-foreground">disputeDepositAmount: </span><span className="text-foreground">{disputeDepositAmount !== undefined ? String(disputeDepositAmount) : "…"}</span></div>
              <div><span className="text-muted-foreground">refundAuthority: </span><span className="break-all text-foreground">{refundAuthority !== undefined ? String(refundAuthority) : "…"}</span></div>
            </div>
            <div className="grid gap-3">
              {[
                { id: "dToken", label: "Deposit token address (0x… or zero to disable)", value: disputeTokenInput, set: setDisputeTokenInput, mono: true },
                { id: "dAmount", label: "Deposit amount (token wei)", value: disputeAmountInput, set: setDisputeAmountInput, mono: true },
                { id: "dAuthority", label: "Refund authority address (0x…)", value: refundAuthorityInput, set: setRefundAuthorityInput, mono: true },
              ].map(({ id, label, value, set }) => (
                <div key={id} className="grid gap-1">
                  <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    id={id}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder="0x…"
                    disabled={busy || !factory}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="min-h-11"
              disabled={busy || !factory || !isConnected}
              onClick={() => void onSetDisputeConfig()}
            >
              {busyId === "dispute" ? "Confirming…" : "Update dispute config"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
