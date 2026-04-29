import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type Address, getAddress } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOracleStagingGroups } from "@/lib/adminOracle";
import { oracleControllerAbi } from "@/lib/oracleControllerAbi";
import { oracleControllerAddressForChain, teamKeyToAddress } from "@/lib/oracleEnv";
import { wagmiConfig } from "@/wagmi";

function groupLabel(groupId: number): string {
  const letters = "ABCDEFGHIJKL";
  return groupId >= 0 && groupId < 12 ? `Group ${letters[groupId]}` : `Group ${groupId}`;
}

export function AdminOraclePage() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [groupId, setGroupId] = useState<number>(0);
  const [rankings, setRankings] = useState<[string, string, string, string]>(["A1", "A2", "A3", "A4"]);
  const [txBusy, setTxBusy] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [extendSeconds, setExtendSeconds] = useState<string>("3600");
  const [extendBusy, setExtendBusy] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extendHash, setExtendHash] = useState<`0x${string}` | null>(null);

  const stagingQuery = useQuery({
    queryKey: ["admin-oracle-staging-groups"],
    queryFn: ({ signal }) => fetchOracleStagingGroups(signal),
    staleTime: 10_000,
    retry: 0,
  });

  const stagingGroups = useMemo(() => stagingQuery.data?.data.groups ?? [], [stagingQuery.data]);

  const selectedStaging = useMemo(() => {
    return stagingGroups.find((g) => g.groupId === groupId) ?? null;
  }, [groupId, stagingGroups]);

  const controllerAddress = useMemo(() => {
    try {
      return oracleControllerAddressForChain(chainId);
    } catch {
      return null;
    }
  }, [chainId]);

  const controllerAddr = controllerAddress ? (getAddress(controllerAddress) as Address) : null;
  const supported = [1, 146, 8453, 84532] as const;
  const chainIdTyped = supported.includes(chainId as (typeof supported)[number])
    ? (chainId as 1 | 146 | 8453 | 84532)
    : null;

  const { data: expectedDeadline } = useReadContract({
    address: controllerAddr ?? undefined,
    abi: oracleControllerAbi,
    functionName: "expectedDeadline",
    args: [groupId],
    chainId: chainIdTyped ?? undefined,
    query: { enabled: Boolean(controllerAddr && chainIdTyped) },
  });

  const { data: resultsPosted } = useReadContract({
    address: controllerAddr ?? undefined,
    abi: oracleControllerAbi,
    functionName: "hasResultsPosted",
    args: [groupId],
    chainId: chainIdTyped ?? undefined,
    query: { enabled: Boolean(controllerAddr && chainIdTyped) },
  });

  async function onPrefillFromStaging() {
    if (!selectedStaging) return;
    setRankings(selectedStaging.rankings);
  }

  async function onPostResults() {
    setTxError(null);
    setTxHash(null);
    if (!isConnected) {
      setTxError("Connect a wallet to post results.");
      return;
    }
    if (!controllerAddr) {
      setTxError(`Oracle controller is not configured for chain ${chainId}.`);
      return;
    }
    if (!chainIdTyped) {
      setTxError(`Unsupported chainId ${chainId}.`);
      return;
    }
    if (groupId < 0 || groupId > 11) {
      setTxError("Group id must be 0–11.");
      return;
    }

    try {
      setTxBusy(true);
      await switchChainAsync({ chainId: chainIdTyped });

      const addresses = rankings.map((k) => teamKeyToAddress(`group:${groupId}:${k}`)) as unknown as [
        Address,
        Address,
        Address,
        Address,
      ];

      const hash = await writeContractAsync({
        address: controllerAddr,
        abi: oracleControllerAbi,
        functionName: "postResults",
        args: [groupId, addresses],
        chainId: chainIdTyped,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: chainIdTyped });
      setTxHash(hash);
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      if (m.includes("UnauthorisedOracle")) setTxError("Not authorised to post results on this chain.");
      else if (m.includes("ResultsAlreadyPosted")) setTxError("Results already posted with different data (conflict).");
      else if (m.toLowerCase().includes("rejected")) setTxError("Transaction rejected in wallet.");
      else setTxError("Post failed. Please try again.");
    } finally {
      setTxBusy(false);
    }
  }

  async function onExtendGrace() {
    setExtendError(null);
    setExtendHash(null);
    if (!isConnected) {
      setExtendError("Connect a wallet to extend grace period.");
      return;
    }
    if (!controllerAddr) {
      setExtendError(`Oracle controller is not configured for chain ${chainId}.`);
      return;
    }
    if (!chainIdTyped) {
      setExtendError(`Unsupported chainId ${chainId}.`);
      return;
    }
    const trimmed = extendSeconds.trim();
    if (!/^\d+$/.test(trimmed)) {
      setExtendError("Additional seconds must be a whole number.");
      return;
    }
    const sec = BigInt(trimmed);
    if (sec <= 0n) {
      setExtendError("Additional seconds must be > 0.");
      return;
    }
    try {
      setExtendBusy(true);
      await switchChainAsync({ chainId: chainIdTyped });
      const hash = await writeContractAsync({
        address: controllerAddr,
        abi: oracleControllerAbi,
        functionName: "extendGracePeriod",
        args: [groupId, sec],
        chainId: chainIdTyped,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: chainIdTyped });
      setExtendHash(hash);
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      if (m.toLowerCase().includes("rejected")) setExtendError("Transaction rejected in wallet.");
      else setExtendError("Extend grace period failed. Please try again.");
    } finally {
      setExtendBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Oracle admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manually post group results on-chain.</p>
        </div>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/admin">Back</Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Select group</CardTitle>
          <CardDescription>Groups A–L map to ids 0–11.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-48">
            <label className="text-sm font-medium text-foreground" htmlFor="groupId">
              Group
            </label>
            <select
              id="groupId"
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={String(groupId)}
              onChange={(e) => setGroupId(Number(e.target.value))}
            >
              {Array.from({ length: 12 }).map((_, idx) => (
                <option key={idx} value={String(idx)}>
                  {groupLabel(idx)} ({idx})
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={!selectedStaging || stagingQuery.isLoading}
            onClick={() => void onPrefillFromStaging()}
            title={!selectedStaging ? "No staging groups available for this group id." : undefined}
          >
            Prefill
          </Button>

          {stagingQuery.error ? (
            <p className="text-sm text-muted-foreground">
              Prefill unavailable (configure backend `ORACLE_STAGING_GROUPS_JSON`).
            </p>
          ) : null}

          <div className="w-full pt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">On-chain status:</span>{" "}
            {typeof resultsPosted === "boolean" ? (resultsPosted ? "posted" : "missing") : "—"} •{" "}
            <span className="font-medium text-foreground">Expected deadline:</span>{" "}
            {typeof expectedDeadline !== "undefined" ? expectedDeadline.toString() : "—"}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Grace period</CardTitle>
          <CardDescription>Extend the expected deadline for this group (owner only).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-48">
            <label className="text-sm font-medium text-foreground" htmlFor="extendSeconds">
              Additional seconds
            </label>
            <input
              id="extendSeconds"
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={extendSeconds}
              onChange={(e) => setExtendSeconds(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 3600"
            />
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={!controllerAddr || extendBusy}
            onClick={() => void onExtendGrace()}
          >
            {extendBusy ? "Extending…" : "Extend grace"}
          </Button>
          {extendHash ? (
            <div className="dd-callout w-full p-3">
              Grace extended. Tx: <code className="rounded bg-muted px-1">{extendHash}</code>
            </div>
          ) : null}
          {extendError ? <p className="w-full text-sm text-destructive">{extendError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rankings</CardTitle>
          <CardDescription>Enter 4 team keys (dev/staging). These are mapped to deterministic pseudo-addresses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor={`r${i}`}>
                  Position {i + 1}
                </label>
                <input
                  id={`r${i}`}
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={rankings[i] ?? ""}
                  onChange={(e) => {
                    const next = [...rankings] as [string, string, string, string];
                    next[i] = e.target.value;
                    setRankings(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled={txBusy || !controllerAddr} onClick={() => void onPostResults()}>
              {txBusy ? "Posting…" : "Post results"}
            </Button>
            {!controllerAddr ? (
              <p className="text-sm text-muted-foreground">
                Configure <code className="rounded bg-muted px-1">VITE_ORACLE_CONTROLLER_{chainId}</code> to enable posting.
              </p>
            ) : null}
          </div>

          {txHash ? (
            <div className="dd-callout p-3">
              Posted. Tx: <code className="rounded bg-muted px-1">{txHash}</code>
            </div>
          ) : null}
          {txError ? <p className="text-sm text-destructive">{txError}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

