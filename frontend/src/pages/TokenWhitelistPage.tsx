import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAddress, type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
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
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [chainIdRaw, setChainIdRaw] = useState<CreateLeagueChainId>(8453);
  const [tokenRaw, setTokenRaw] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: Hex; explorerTxUrl: string } | null>(null);

  const chainId = chainIdRaw;
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
    </div>
  );
}

