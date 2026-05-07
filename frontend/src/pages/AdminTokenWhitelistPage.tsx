import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { whitelistRegistryAddress } from "@/lib/createLeagueEnv";
import { fetchTokenSurfaceRisk } from "@/lib/fetchTokenSurfaceRisk";
import { whitelistRegistryAbi } from "@/lib/whitelistRegistryAbi";
import { wagmiConfig } from "@/wagmi";

type CreateLeagueChainId = 1 | 8453 | 146;

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

export function AdminTokenWhitelistPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [chainIdRaw, setChainIdRaw] = useState<CreateLeagueChainId>(8453);
  const chainId = chainIdRaw;

  const registry = whitelistRegistryAddress(chainId);
  const publicClient = usePublicClient({ chainId });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: Hex; url: string } | null>(null);

  const { data: requestCount } = useReadContract({
    address: registry,
    abi: whitelistRegistryAbi,
    functionName: "requestCount",
    chainId,
    query: { enabled: Boolean(registry) },
  });

  const scanIds = useMemo(() => {
    const n = requestCount !== undefined ? Number(requestCount) : 0;
    const ids: number[] = [];
    const cap = 120;
    for (let i = n - 1; i >= 0 && ids.length < cap; i--) ids.push(i);
    return ids;
  }, [requestCount]);

  const queueQuery = useQuery({
    queryKey: ["admin-whitelist-queue", chainId, registry, scanIds.join(",")],
    queryFn: async () => {
      if (!registry || !publicClient) return [];
      const rows = await Promise.all(
        scanIds.map(async (id) => {
          const req = await publicClient.readContract({
            address: registry,
            abi: whitelistRegistryAbi,
            functionName: "requests",
            args: [BigInt(id)],
          });
          return {
            id,
            token: req[0] as Address,
            requester: req[1] as Address,
            requestedAt: Number(req[2]),
            status: Number(req[3]),
            feeEscrowed: req[4] as bigint,
          };
        }),
      );
      return rows;
    },
    enabled: Boolean(registry && publicClient) && scanIds.length > 0,
    staleTime: 12_000,
    retry: 1,
  });

  const pendingRows = useMemo(() => (queueQuery.data ?? []).filter((r) => r.status === 0), [queueQuery.data]);

  const riskQuery = useQuery({
    queryKey: [
      "admin-token-surface",
      chainId,
      pendingRows.map((r) => `${r.id}:${r.token.toLowerCase()}`).join("|"),
    ],
    queryFn: async ({ signal }) => {
      const out: Record<string, Awaited<ReturnType<typeof fetchTokenSurfaceRisk>>["data"]> = {};
      for (const r of pendingRows) {
        const key = r.token.toLowerCase();
        if (out[key]) continue;
        const env = await fetchTokenSurfaceRisk(chainId, r.token, signal);
        out[key] = env.data;
      }
      return out;
    },
    enabled: pendingRows.length > 0,
    staleTime: 120_000,
    retry: 1,
  });

  const refresh = useCallback(() => {
    void queueQuery.refetch();
    void riskQuery.refetch();
  }, [queueQuery, riskQuery]);

  const onApprove = useCallback(
    async (requestId: number) => {
      setError(null);
      setLastTx(null);
      if (!isConnected || !walletAddress || !registry) {
        setError("Connect an admin wallet.");
        return;
      }
      try {
        setBusyId(`a-${requestId}`);
        await switchChainAsync({ chainId });
        const hash = await writeContractAsync({
          address: registry,
          abi: whitelistRegistryAbi,
          functionName: "approveRequest",
          args: [BigInt(requestId)],
          chainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
        setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
        refresh();
      } catch (e) {
        const m = (e as Error | null | undefined)?.message ?? "";
        setError(m.toLowerCase().includes("user rejected") ? "Transaction rejected in wallet." : "Approve failed.");
      } finally {
        setBusyId(null);
      }
    },
    [chainId, isConnected, refresh, registry, switchChainAsync, walletAddress, writeContractAsync],
  );

  const onReject = useCallback(
    async (requestId: number) => {
      setError(null);
      setLastTx(null);
      if (!isConnected || !walletAddress || !registry) {
        setError("Connect an admin wallet.");
        return;
      }
      try {
        setBusyId(`r-${requestId}`);
        await switchChainAsync({ chainId });
        const hash = await writeContractAsync({
          address: registry,
          abi: whitelistRegistryAbi,
          functionName: "rejectRequest",
          args: [BigInt(requestId)],
          chainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
        setLastTx({ hash, url: txExplorerUrl(chainId, hash) });
        refresh();
      } catch (e) {
        const m = (e as Error | null | undefined)?.message ?? "";
        setError(m.toLowerCase().includes("user rejected") ? "Transaction rejected in wallet." : "Reject failed.");
      } finally {
        setBusyId(null);
      }
    },
    [chainId, isConnected, refresh, registry, switchChainAsync, walletAddress, writeContractAsync],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Token whitelist (admin)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve or reject on-chain requests. Rejections refund the exact fee-token amount escrowed at submission
            (handles fee-on-transfer fee tokens). Bytecode hints are heuristic only.
          </p>
        </div>
        <Button type="button" variant="secondary" className="min-h-11" asChild>
          <Link to="/admin">Admin home</Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Chain</span>
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground"
            value={String(chainIdRaw)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v === 1 || v === 8453 || v === 146) setChainIdRaw(v);
            }}
          >
            <option value="8453">Base</option>
            <option value="1">Ethereum</option>
            <option value="146">Sonic</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => refresh()} disabled={queueQuery.isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      {!registry ? (
        <p className="text-sm text-muted-foreground">Set VITE_WHITELIST_REGISTRY_{chainId} to use this screen.</p>
      ) : queueQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : null}

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

      <div className="space-y-3">
        {pendingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests in the last {scanIds.length} submissions.</p>
        ) : (
          pendingRows.map((r) => {
            const risk = riskQuery.data?.[r.token.toLowerCase()];
            const flagFoT = risk?.feeOnTransferLikely;
            const flagRebase = risk?.rebaseLikely;

            return (
              <div key={r.id} className="rounded-xl border border-accent/15 bg-surface/70 p-4 text-sm backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 font-mono text-xs break-all text-muted-foreground sm:text-sm">
                    <div className="font-semibold text-foreground">Request #{r.id} · Pending</div>
                    <div>Token: {r.token}</div>
                    <div>Requester: {r.requester}</div>
                    <div>Submitted: {new Date(r.requestedAt * 1000).toISOString()}</div>
                    <div>Fee escrowed (wei smallest unit): {r.feeEscrowed.toString()}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      className="min-h-11"
                      disabled={Boolean(busyId) || !isConnected}
                      onClick={() => void onApprove(r.id)}
                    >
                      {busyId === `a-${r.id}` ? "…" : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={Boolean(busyId) || !isConnected}
                      onClick={() => void onReject(r.id)}
                    >
                      {busyId === `r-${r.id}` ? "…" : "Reject"}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-border/60 bg-background/30 px-3 py-2">
                  <div className="text-xs font-semibold text-foreground">Auto risk hints (bytecode)</div>
                  {riskQuery.isLoading ? (
                    <p className="mt-1 text-xs text-muted-foreground">Analyzing…</p>
                  ) : riskQuery.error ? (
                    <p className="mt-1 text-xs text-destructive">Could not load risk hints.</p>
                  ) : (
                    <>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {flagFoT ? (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">Fee-on-transfer likely</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">No burn/fee bytecode flag</span>
                        )}
                        {flagRebase ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">Rebase / vault hint</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">No rebase bytecode flag</span>
                        )}
                      </div>
                      {risk?.warnings?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {risk.warnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
