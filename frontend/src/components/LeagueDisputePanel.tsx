import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { type Address, erc20Abi, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { fetchDisputeEligibility, recordDisputeMetadata } from "@/lib/disputeApi";
import { leagueAbi } from "@/lib/leagueAbi";
import { useSiweSession } from "@/lib/siweAuthContext";
import { wagmiConfig } from "@/wagmi";
import { cn } from "@/lib/utils";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

type Props = {
  chainId: 1 | 8453 | 84532 | 146;
  leagueAddress: Address;
  /** Creator from indexer (may differ from on-chain if stale); on-chain `creator()` used for tx. */
  creatorAddressFromApi: string | null;
};

export function LeagueDisputePanel({ chainId, leagueAddress, creatorAddressFromApi }: Props) {
  const { address: wallet, isConnected } = useAccount();
  const { authStatus, me } = useSiweSession();
  const { writeContractAsync } = useWriteContract();
  const [groupId, setGroupId] = useState(0);
  const [isCreatorDispute, setIsCreatorDispute] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const elig = useQuery({
    queryKey: ["dispute-eligibility", chainId, leagueAddress],
    queryFn: ({ signal }) => fetchDisputeEligibility(chainId, leagueAddress, signal),
    enabled: Boolean(chainId && leagueAddress),
    staleTime: 30_000,
  });

  const { data: onchainCreator } = useReadContract({
    address: leagueAddress,
    abi: leagueAbi,
    functionName: "creator",
    chainId,
    query: { enabled: Boolean(leagueAddress && chainId) },
  });

  const { data: entryCount } = useReadContract({
    address: leagueAddress,
    abi: leagueAbi,
    functionName: "walletEntryCount",
    args: wallet ? [wallet] : undefined,
    chainId,
    query: { enabled: Boolean(wallet && leagueAddress && chainId) },
  });

  const { data: depToken } = useReadContract({
    address: leagueAddress,
    abi: leagueAbi,
    functionName: "disputeDepositToken",
    chainId,
    query: { enabled: Boolean(leagueAddress && chainId) },
  });

  const { data: depAmount } = useReadContract({
    address: leagueAddress,
    abi: leagueAbi,
    functionName: "disputeDepositAmount",
    chainId,
    query: { enabled: Boolean(leagueAddress && chainId) },
  });

  const creatorLc = useMemo(() => {
    const a = onchainCreator ?? creatorAddressFromApi;
    if (!a || typeof a !== "string") return null;
    try {
      return getAddress(a).toLowerCase();
    } catch {
      return null;
    }
  }, [onchainCreator, creatorAddressFromApi]);

  const walletLc = wallet?.toLowerCase() ?? null;
  const isCreatorWallet = Boolean(creatorLc && walletLc && creatorLc === walletLc);
  const isEntrant = typeof entryCount === "bigint" && entryCount > 0n;
  const canRoleFile = Boolean(walletLc && (isCreatorWallet || isEntrant));

  const eligible = elig.data?.data.eligible === true;
  const showPanel = eligible && canRoleFile;

  async function onSubmit() {
    setMsg(null);
    const d = description.trim();
    if (d.length < 1) {
      setMsg({ kind: "err", text: "Describe your dispute before submitting." });
      return;
    }
    if (isCreatorDispute && !isCreatorWallet) {
      setMsg({ kind: "err", text: "Only the league creator can file a creator dispute." });
      return;
    }
    if (!isCreatorDispute && !isEntrant) {
      setMsg({ kind: "err", text: "Only entrants can file a player dispute (deposit required)." });
      return;
    }
    if (authStatus !== "authenticated" || !me) {
      setMsg({ kind: "err", text: "Sign in with your wallet (SIWE) so the server can attach your description." });
      return;
    }
    if (!wallet) return;

    setBusy(true);
    try {
      if (!isCreatorDispute) {
        const token = depToken as Address | undefined;
        const amt = depAmount as bigint | undefined;
        if (!token || token === "0x0000000000000000000000000000000000000000" || amt === undefined) {
          throw new Error("Dispute deposit is not configured on this league contract.");
        }
        const aHash = await writeContractAsync({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [leagueAddress, amt],
          chainId,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: aHash, chainId });
      }

      const hash = await writeContractAsync({
        address: leagueAddress,
        abi: leagueAbi,
        functionName: "fileDispute",
        args: [groupId, isCreatorDispute],
        chainId,
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
      if (receipt.status !== "success") throw new Error("Dispute transaction failed.");

      await recordDisputeMetadata({
        chainId,
        leagueAddress,
        txHash: hash,
        description: d,
      });

      setMsg({
        kind: "ok",
        text: "Dispute filed on-chain and your description was saved. Reference your transaction in any follow-up with admins.",
      });
      setDescription("");
      void elig.refetch();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not complete dispute flow." });
    } finally {
      setBusy(false);
    }
  }

  if (elig.isLoading) {
    return (
      <section className="mb-10 rounded-lg border border-border bg-card/40 p-6" aria-label="Disputes">
        <p className="text-sm text-muted-foreground">Checking dispute window…</p>
      </section>
    );
  }

  if (elig.isError || !elig.data?.data) {
    return null;
  }

  const d0 = elig.data.data;
  if (!d0.eligible) {
    return (
      <section className="mb-10 rounded-lg border border-border bg-card/40 p-6" aria-label="Disputes">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Disputes</h2>
        <p className="text-sm text-muted-foreground">
          {d0.reason === "dispute_window_closed" && d0.windowEndsAt
            ? `The dispute window closed (${new Date(d0.windowEndsAt).toLocaleString()}).`
            : d0.reason === "predictions_still_open"
              ? "Disputes open after the entry lock passes and oracle results are posted."
              : d0.reason === "league_not_disputable"
                ? "This league is not in a state that accepts new disputes (or payouts are already finalized)."
                : d0.reason === "disputes_disabled_on_contract"
                  ? "This league deployment does not have dispute deposits configured."
                  : "Disputes are not available right now."}
        </p>
      </section>
    );
  }

  if (!showPanel) {
    return (
      <section className="mb-10 rounded-lg border border-border bg-card/40 p-6" aria-label="Disputes">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Disputes</h2>
        <p className="text-sm text-muted-foreground">
          The dispute window is open{d0.windowEndsAt ? ` until ${new Date(d0.windowEndsAt).toLocaleString()}` : ""}.
          Only entrants or the league creator can file from this wallet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-lg border border-accent/20 bg-primary/5 p-6 shadow-[0_0_40px_-18px_rgba(104,74,188,0.25)]" aria-label="File a dispute">
      <h2 className="mb-1 text-lg font-semibold text-foreground">File a dispute</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Challenge posted group results before payouts finalize.{" "}
        {isCreatorWallet
          ? "As creator you may file without a deposit."
          : "A dispute deposit in the configured token is required from your wallet."}
      </p>

      {d0.windowEndsAt ? (
        <p className="mb-4 text-xs text-muted-foreground">Window closes: {new Date(d0.windowEndsAt).toLocaleString()}</p>
      ) : null}

      <div className="mb-4 flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="dispute-group">
          Group
        </label>
        <select
          id="dispute-group"
          className={cn(
            "min-h-11 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm",
            "text-foreground",
          )}
          value={groupId}
          onChange={(e) => setGroupId(Number(e.target.value))}
        >
          {GROUP_LETTERS.map((L, i) => (
            <option key={L} value={i}>
              Group {L}
            </option>
          ))}
        </select>
      </div>

      {isCreatorWallet ? (
        <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-primary"
            checked={isCreatorDispute}
            onChange={(e) => setIsCreatorDispute(e.target.checked)}
          />
          File as league creator (no deposit)
        </label>
      ) : null}

      <label className="mb-4 flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Description</span>
        <textarea
          className={cn(
            "min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
          )}
          placeholder="Explain which results you believe are incorrect and why."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={8000}
        />
      </label>

      {!isConnected ? <p className="mb-3 text-sm text-muted-foreground">Connect your wallet to continue.</p> : null}
      {isConnected && authStatus !== "authenticated" ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Sign in (SIWE) using the wallet menu so the app can store your dispute description with your on-chain filing.
        </p>
      ) : null}

      {!isCreatorDispute && depAmount !== undefined ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Deposit (wei): {depAmount.toString()} — token:{" "}
          <span className="font-mono">{String(depToken).slice(0, 10)}…</span>
        </p>
      ) : null}

      {msg ? (
        <p
          className={cn("mb-4 text-sm", msg.kind === "ok" ? "text-foreground" : "text-destructive")}
          role={msg.kind === "ok" ? "status" : "alert"}
        >
          {msg.text}
        </p>
      ) : null}

      <Button type="button" className="min-h-11" onClick={() => void onSubmit()} disabled={busy || !isConnected}>
        {busy ? "Submitting…" : "Approve (if needed) & file dispute"}
      </Button>
    </section>
  );
}
