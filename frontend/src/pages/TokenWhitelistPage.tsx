import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAddress, type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { chainLabel } from "@/lib/leagueBrowse";
import { fetchWhitelistedTokens } from "@/lib/fetchWhitelistedTokens";
import { whitelistRegistryAddress } from "@/lib/createLeagueEnv";
import { whitelistRegistryAbi } from "@/lib/whitelistRegistryAbi";
import { wagmiConfig } from "@/wagmi";

type CreateLeagueChainId = 1 | 8453 | 146;

function toCreateLeagueChainId(n: number | undefined): CreateLeagueChainId | undefined {
  if (n === 1 || n === 8453 || n === 146) return n;
  return undefined;
}

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

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

export function TokenWhitelistPage() {
  const { isConnected, address: walletAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [chainIdRaw, setChainIdRaw] = useState<CreateLeagueChainId>(8453);
  const [tokenRaw, setTokenRaw] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: Hex; explorerTxUrl: string } | null>(null);

  const chainId = chainIdRaw;
  const publicClient = usePublicClient({ chainId });
  const isTokenValid = useMemo(() => isAddress(tokenRaw.trim()), [tokenRaw]);
  const tokenAddress = useMemo(() => {
    if (!isTokenValid) return undefined;
    try {
      return getAddress(tokenRaw.trim()) as Address;
    } catch {
      return undefined;
    }
  }, [isTokenValid, tokenRaw]);

  const registry = whitelistRegistryAddress(chainId);

  const whitelistedTokensQuery = useQuery({
    queryKey: ["whitelisted-tokens", chainId],
    queryFn: ({ signal }) => fetchWhitelistedTokens(chainId, signal),
    staleTime: 30_000,
    retry: 1,
  });

  const alreadyWhitelisted = useMemo(() => {
    if (!tokenAddress) return false;
    const tokens = whitelistedTokensQuery.data?.data.tokens ?? [];
    const lower = tokenAddress.toLowerCase();
    return tokens.some((t) => t.address.toLowerCase() === lower);
  }, [tokenAddress, whitelistedTokensQuery.data?.data.tokens]);

  const { data: feeToken } = useReadContract({
    address: registry,
    abi: whitelistRegistryAbi,
    functionName: "requestFeeToken",
    chainId,
    query: { enabled: Boolean(registry) },
  });

  const { data: feeAmount } = useReadContract({
    address: registry,
    abi: whitelistRegistryAbi,
    functionName: "requestFeeAmount",
    chainId,
    query: { enabled: Boolean(registry) },
  });

  const { data: requestCount } = useReadContract({
    address: registry,
    abi: whitelistRegistryAbi,
    functionName: "requestCount",
    chainId,
    query: { enabled: Boolean(registry) },
  });

  const queueLimit = 25;
  const queueIds = useMemo(() => {
    const n = requestCount ? Number(requestCount) : 0;
    const ids: number[] = [];
    const start = Math.max(0, n - queueLimit);
    for (let i = n - 1; i >= start; i--) ids.push(i);
    return ids;
  }, [requestCount]);

  const queueRowsQuery = useQuery({
    queryKey: ["whitelist-queue", chainId, registry, queueIds.join(",")],
    queryFn: async () => {
      if (!registry || !publicClient) return [];
      const rows = await Promise.all(
        queueIds.map(async (id) => {
          const [req, up, down, myVote] = await Promise.all([
            publicClient.readContract({
              address: registry,
              abi: whitelistRegistryAbi,
              functionName: "requests",
              args: [BigInt(id)],
            }),
            publicClient.readContract({
              address: registry,
              abi: whitelistRegistryAbi,
              functionName: "upvotes",
              args: [BigInt(id)],
            }),
            publicClient.readContract({
              address: registry,
              abi: whitelistRegistryAbi,
              functionName: "downvotes",
              args: [BigInt(id)],
            }),
            walletAddress
              ? publicClient.readContract({
                  address: registry,
                  abi: whitelistRegistryAbi,
                  functionName: "voteOf",
                  args: [BigInt(id), walletAddress],
                })
              : Promise.resolve(0n),
          ]);

          return {
            id,
            token: req[0] as Address,
            requester: req[1] as Address,
            requestedAt: Number(req[2]),
            status: Number(req[3]),
            upvotes: Number(up),
            downvotes: Number(down),
            myVote: Number(myVote),
          };
        }),
      );
      return rows;
    },
    enabled: Boolean(registry && publicClient) && queueIds.length > 0,
    staleTime: 10_000,
    retry: 1,
  });

  const [voteBusyId, setVoteBusyId] = useState<number | null>(null);
  const onVote = useCallback(
    async (requestId: number, isUpvote: boolean) => {
      setError(null);
      setSuccess(null);
      if (!isConnected || !walletAddress) return;
      if (!registry) return;
      try {
        setVoteBusyId(requestId);
        await switchChainAsync({ chainId });
        const txHash = await writeContractAsync({
          address: registry,
          abi: whitelistRegistryAbi,
          functionName: "vote",
          args: [BigInt(requestId), isUpvote],
          chainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: txHash, chainId });
        await queueRowsQuery.refetch();
      } catch (e) {
        const m = (e as Error | null | undefined)?.message ?? "";
        if (m.toLowerCase().includes("user rejected")) {
          setError("Transaction rejected in wallet.");
        } else if (m.includes("AlreadyVoted")) {
          setError("You already voted on this request.");
        } else if (m.includes("RequestNotPending")) {
          setError("Voting is only open while the request is pending.");
        } else {
          setError("Vote failed. Please try again.");
        }
      } finally {
        setVoteBusyId(null);
      }
    },
    [
      chainId,
      isConnected,
      queueRowsQuery,
      registry,
      switchChainAsync,
      walletAddress,
      writeContractAsync,
      setError,
      setSuccess,
    ],
  );

  const submitEnabled =
    Boolean(isConnected && registry && tokenAddress) && !busy && !alreadyWhitelisted && !whitelistedTokensQuery.isLoading;

  const onSubmit = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!isConnected) {
      setError("Connect your wallet to submit a whitelist request.");
      return;
    }
    if (!registry) {
      setError(`WhitelistRegistry address is not configured for ${chainLabel(chainId)}.`);
      return;
    }
    if (!tokenAddress) {
      setError("Enter a valid token address.");
      return;
    }
    if (alreadyWhitelisted) {
      setError("This token is already whitelisted on this chain.");
      return;
    }

    try {
      setBusy(true);
      await switchChainAsync({ chainId });
      const txHash = await writeContractAsync({
        address: registry,
        abi: whitelistRegistryAbi,
        functionName: "requestWhitelist",
        args: [tokenAddress],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: txHash, chainId });
      setSuccess({ txHash, explorerTxUrl: txExplorerUrl(chainId, txHash) });
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      if (m.toLowerCase().includes("user rejected")) {
        setError("Transaction rejected in wallet.");
      } else if (m.includes("TokenAlreadyWhitelisted")) {
        setError("This token is already whitelisted on this chain.");
      } else if (m.includes("RequestFeeNotConfigured")) {
        setError("Whitelist request fee is not configured on this chain yet.");
      } else {
        setError("Whitelist request failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }, [alreadyWhitelisted, chainId, isConnected, registry, switchChainAsync, tokenAddress, writeContractAsync]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Token whitelist request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a token for review by paying an on-chain fee. Approved tokens become selectable during league creation.
          </p>
        </div>
        <Button type="button" variant="secondary" className="min-h-11" asChild>
          <Link to="/create">Create a league</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-accent/15 bg-surface/70 p-5 shadow-[0_22px_70px_-44px_rgba(10,238,235,0.28)] backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Chain</span>
            <select
              className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground"
              value={String(chainIdRaw)}
              onChange={(e) => {
                const next = toCreateLeagueChainId(Number(e.target.value));
                if (next) setChainIdRaw(next);
              }}
            >
              <option value="8453">Base</option>
              <option value="1">Ethereum</option>
              <option value="146">Sonic</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Token address</span>
            <input
              className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground sm:text-sm"
              placeholder="0x…"
              value={tokenRaw}
              onChange={(e) => setTokenRaw(e.target.value)}
              spellCheck={false}
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
        </div>

        {alreadyWhitelisted ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This token is already whitelisted on this chain.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Fee:{" "}
            {feeToken && feeAmount !== undefined
              ? `${feeAmount.toString()} (token ${String(feeToken)})`
              : registry
                ? "Loading fee…"
                : "Configure WhitelistRegistry env vars to enable."}
          </div>
          <Button type="button" className="min-h-11" disabled={!submitEnabled} onClick={() => void onSubmit()}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-md border border-accent/25 bg-accent/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Request submitted.</div>
            <div className="mt-1 text-muted-foreground">
              Tx:{" "}
              <a className="underline underline-offset-2" href={success.explorerTxUrl} target="_blank" rel="noreferrer">
                View on explorer
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Recent requests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest submissions on this chain (history + pending). Showing the newest {queueLimit} requests. Community votes
          help admins prioritise review; you can only vote while a request is pending, once per wallet per request.
        </p>

        <div className="mt-4 rounded-xl border border-accent/15 bg-surface/70 p-5 backdrop-blur">
          {queueRowsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading queue…</div>
          ) : queueRowsQuery.data?.length ? (
            <div className="space-y-3">
              {queueRowsQuery.data.map((r) => {
                const statusLabel = r.status === 1 ? "Approved" : r.status === 2 ? "Rejected" : "Pending";
                const hasVoted = r.myVote === 1 || r.myVote === 2;
                const voteOpen = r.status === 0;
                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border/70 bg-background/40 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          #{r.id} · {statusLabel}
                        </div>
                        <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          chain: {chainLabel(chainId)} ({chainId})
                          <br />
                          token: {r.token}
                          <br />
                          requester: {r.requester}
                          <br />
                          submitted: {new Date(r.requestedAt * 1000).toISOString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          ▲ {r.upvotes} · ▼ {r.downvotes}
                        </div>

                        {isConnected && walletAddress ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={r.myVote === 1 ? "default" : "secondary"}
                              size="sm"
                              disabled={!voteOpen || hasVoted || voteBusyId === r.id}
                              onClick={() => void onVote(r.id, true)}
                            >
                              Upvote
                            </Button>
                            <Button
                              type="button"
                              variant={r.myVote === 2 ? "default" : "secondary"}
                              size="sm"
                              disabled={!voteOpen || hasVoted || voteBusyId === r.id}
                              onClick={() => void onVote(r.id, false)}
                            >
                              Downvote
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No requests yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

