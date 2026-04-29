import { useCallback, useEffect, useMemo, useState } from "react";
import { type Address, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordDisputeSettlement, type AdminDisputeReview } from "@/lib/disputeApi";
import { leagueAbi } from "@/lib/leagueAbi";
import { oracleControllerAbi } from "@/lib/oracleControllerAbi";
import { oracleControllerAddressForChain, teamKeyToAddress } from "@/lib/oracleEnv";
import { wagmiConfig } from "@/wagmi";

type AdminChainId = 1 | 8453 | 84532 | 146;

function toAdminChainId(n: number): AdminChainId | null {
  if (n === 1 || n === 8453 || n === 84532 || n === 146) return n;
  return null;
}

function defaultOverrideKeys(review: AdminDisputeReview): [string, string, string, string] {
  const r = review.rankings.referenceTeamKeys ?? review.rankings.oracleTeamKeys;
  if (r && r.length === 4) return [r[0], r[1], r[2], r[3]];
  const gid = review.dispute.groupId;
  const L = String.fromCharCode(65 + gid);
  return [`${L}1`, `${L}2`, `${L}3`, `${L}4`];
}

type Props = {
  review: AdminDisputeReview;
  onSettled: () => void;
};

export function AdminDisputeResolution({ review, onSettled }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [overrideKeys, setOverrideKeys] = useState<[string, string, string, string]>(() =>
    defaultOverrideKeys(review),
  );

  useEffect(() => {
    setOverrideKeys(defaultOverrideKeys(review));
    setErr(null);
    setOk(null);
  }, [review.dispute.id]);

  const targetChain = review.dispute.chainId;
  const adminChain = useMemo(() => toAdminChainId(targetChain), [targetChain]);
  const leagueAddr = useMemo(() => getAddress(review.dispute.leagueAddress as Address), [review.dispute.leagueAddress]);
  const idx = review.resolution.onChainDisputeIndex;
  const idxHint = review.resolution.onChainDisputeIndexHint;

  const controllerAddr = useMemo((): Address | null => {
    if (review.resolution.oracleController) {
      try {
        return getAddress(review.resolution.oracleController as Address);
      } catch {
        /* fall through */
      }
    }
    try {
      return oracleControllerAddressForChain(targetChain);
    } catch {
      return null;
    }
  }, [review.resolution.oracleController, targetChain]);

  const canDismissOnChain =
    idx !== null && idxHint !== "already_settled_on_chain" && idxHint !== "no_matching_open_slot";

  const runLeagueTx = useCallback(
    async (opts: {
      functionName: "dismissDisputeRefundDeposit" | "dismissDisputeConfiscate" | "triggerRefund";
      args?: readonly [bigint];
      kind: "dismiss_refund" | "dismiss_confiscate" | "trigger_refund";
    }) => {
      setErr(null);
      setOk(null);
      if (!isConnected) {
        setErr("Connect the refund authority wallet.");
        return;
      }
      if (!adminChain) {
        setErr(`Unsupported chain ${targetChain} for admin txs.`);
        return;
      }
      if (opts.functionName !== "triggerRefund") {
        if (idx === null || !canDismissOnChain) {
          setErr("Could not resolve on-chain dispute index for this row. Check RPC and league state.");
          return;
        }
      }
      setBusy(true);
      try {
        await switchChainAsync({ chainId: adminChain });
        const hash = await writeContractAsync({
          address: leagueAddr,
          abi: leagueAbi,
          functionName: opts.functionName,
          args: opts.args ?? [],
          chainId: adminChain,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash });
        await recordDisputeSettlement(review.dispute.id, { txHash: hash, kind: opts.kind });
        setOk("Recorded. Refreshing list…");
        onSettled();
      } catch (e) {
        setErr((e as Error)?.message ?? "Transaction failed.");
      } finally {
        setBusy(false);
      }
    },
    [
      adminChain,
      canDismissOnChain,
      idx,
      isConnected,
      leagueAddr,
      onSettled,
      review.dispute.id,
      switchChainAsync,
      targetChain,
      writeContractAsync,
    ],
  );

  const onOverride = useCallback(async () => {
    setErr(null);
    setOk(null);
    if (!isConnected) {
      setErr("Connect the OracleController owner wallet.");
      return;
    }
    if (!adminChain || !controllerAddr) {
      setErr("Oracle controller address is not available for this chain.");
      return;
    }
    const gid = review.dispute.groupId;
    for (const k of overrideKeys) {
      const t = k.trim().toUpperCase();
      if (!/^[A-L][1-4]$/.test(t)) {
        setErr(`Invalid team key "${k}". Use format like A1, B2 (group letter + position).`);
        return;
      }
    }
    setBusy(true);
    try {
      await switchChainAsync({ chainId: adminChain });
      const rankings = overrideKeys.map((k) => teamKeyToAddress(`group:${gid}:${k.trim().toUpperCase()}`)) as unknown as [
        Address,
        Address,
        Address,
        Address,
      ];
      const hash = await writeContractAsync({
        address: controllerAddr,
        abi: oracleControllerAbi,
        functionName: "overrideResults",
        args: [gid, rankings],
        chainId: adminChain,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      await recordDisputeSettlement(review.dispute.id, { txHash: hash, kind: "override_results" });
      setOk("Override recorded. Refreshing…");
      onSettled();
    } catch (e) {
      setErr((e as Error)?.message ?? "Override failed.");
    } finally {
      setBusy(false);
    }
  }, [
    adminChain,
    controllerAddr,
    isConnected,
    onSettled,
    overrideKeys,
    review.dispute.groupId,
    review.dispute.id,
    switchChainAsync,
    writeContractAsync,
  ]);

  const wrongChain = adminChain !== null && chainId !== adminChain;

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">On-chain resolution</p>
      <p className="text-xs text-muted-foreground">
        Your wallet must be the league <span className="font-mono">refundAuthority</span> for dismiss / trigger refund, and
        the <span className="font-mono">OracleController</span> owner for overrides. Switch to chain {targetChain} before
        signing.
      </p>
      {wrongChain ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">Wallet is on chain {chainId}; switch to {targetChain}.</p>
      ) : null}
      {idxHint === "already_settled_on_chain" ? (
        <p className="text-sm text-muted-foreground">
          This slot is already settled on-chain. If the list is stale, record the settlement tx via API or refresh after
          indexer sync.
        </p>
      ) : null}
      {idxHint === "no_matching_open_slot" ? (
        <p className="text-sm text-destructive">
          No open on-chain dispute slot matches this row (RPC scan). Dismiss actions are disabled until the slot matches.
        </p>
      ) : null}
      {idx !== null ? (
        <p className="font-mono text-xs text-muted-foreground">
          On-chain dispute index: {idx}
          {idxHint && idxHint !== "already_settled_on_chain" ? ` · ${idxHint}` : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={busy || !canDismissOnChain}
          onClick={() => runLeagueTx({ functionName: "dismissDisputeRefundDeposit", args: [BigInt(idx!)], kind: "dismiss_refund" })}
        >
          Dismiss — refund deposit
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={busy || !canDismissOnChain || review.dispute.isCreator}
          onClick={() =>
            runLeagueTx({ functionName: "dismissDisputeConfiscate", args: [BigInt(idx!)], kind: "dismiss_confiscate" })
          }
        >
          Dismiss — confiscate
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={busy}
          onClick={() => runLeagueTx({ functionName: "triggerRefund", kind: "trigger_refund" })}
        >
          Trigger league refund
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Override results (OracleController)</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {([0, 1, 2, 3] as const).map((i) => (
            <Input
              key={i}
              className="min-h-11 font-mono text-sm"
              value={overrideKeys[i]}
              onChange={(ev) => {
                const next = [...overrideKeys] as [string, string, string, string];
                next[i] = ev.target.value;
                setOverrideKeys(next);
              }}
              aria-label={`Override rank ${i + 1}`}
            />
          ))}
        </div>
        <Button type="button" className="min-h-11" disabled={busy || !controllerAddr} onClick={() => void onOverride()}>
          Submit overrideResults
        </Button>
        {!controllerAddr ? <p className="text-xs text-destructive">Oracle controller address unavailable.</p> : null}
      </div>

      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-muted-foreground">{ok}</p> : null}
    </div>
  );
}
