import { useState } from "react";
import { Link } from "react-router-dom";
import { type Address, type Hex } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { leagueAbi } from "@/lib/leagueAbi";
import { apiUrl } from "@/lib/apiBase";
import { wagmiConfig } from "@/wagmi";

type ReportRow = {
  id: string;
  chainId: number;
  leagueAddress: string;
  leagueTitle: string | null;
  reporterWallet: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
};

type ReportsResponse = { data: { reports: ReportRow[] } };

async function fetchReports(): Promise<ReportRow[]> {
  const res = await fetch(apiUrl("/api/v1/admin/reports?status=open"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) throw new Error("Admin session required.");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const body = (await res.json()) as ReportsResponse;
  return body.data.reports;
}

async function patchReport(params: { reportId: string; action: "warn" | "pause" | "refund" | "dismiss" }) {
  const res = await fetch(apiUrl(`/api/v1/admin/reports/${params.reportId}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ action: params.action }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
}

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
  if (m.includes("NotAuthorized")) return "Need the refundAuthority wallet connected for this league.";
  return `Transaction failed: ${m}`;
}

function truncate(s: string, n = 10): string {
  return s.length <= n + 4 ? s : `${s.slice(0, n)}…${s.slice(-4)}`;
}

export function AdminReportsPage() {
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState<{ id: string; url: string } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: fetchReports,
  });

  const mutation = useMutation({
    mutationFn: patchReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setActiveId(null);
    },
  });

  async function handleOnChainAction(
    report: ReportRow,
    fnName: "pauseEntries" | "triggerRefund",
    action: "pause" | "refund",
  ) {
    if (!isConnected) { setWriteError("Connect the refundAuthority wallet first."); return; }
    setWriteError(null);
    setTxMsg(null);
    setActiveId(report.id);
    try {
      await switchChainAsync({ chainId: report.chainId });
      const hash = await writeContractAsync({
        address: report.leagueAddress as Address,
        abi: leagueAbi,
        functionName: fnName,
        chainId: report.chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: report.chainId });
      setTxMsg({ id: report.id, url: txExplorerUrl(report.chainId, hash) });
      mutation.mutate({ reportId: report.id, action });
    } catch (e) {
      setWriteError(mapWriteError((e as Error | null | undefined)?.message ?? "Unknown error"));
      setActiveId(null);
    }
  }

  function handleOffChainAction(reportId: string, action: "warn" | "dismiss") {
    setWriteError(null);
    setTxMsg(null);
    setActiveId(reportId);
    mutation.mutate({ reportId, action }, {
      onError: (e: Error) => { setWriteError(e.message); setActiveId(null); },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin">
          <Button type="button" variant="secondary" className="min-h-11">← Admin home</Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">League reports</h1>
      </div>

      {writeError ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {writeError}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load: {(error as Error).message}
        </div>
      ) : !reports || reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open reports.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const busy = activeId === report.id;
            const hasTx = txMsg?.id === report.id;
            return (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {report.leagueTitle ?? "(untitled league)"}
                    <span className="ml-2 font-normal text-muted-foreground text-xs">
                      chain {report.chainId}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-xs font-mono">
                    <span className="text-muted-foreground">address</span>
                    <span className="break-all">{report.leagueAddress}</span>
                    <span className="text-muted-foreground">reporter</span>
                    <span>{truncate(report.reporterWallet, 8)}</span>
                    <span className="text-muted-foreground">reason</span>
                    <span className="font-semibold">{report.reason}</span>
                    <span className="text-muted-foreground">reported</span>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>

                  {report.description ? (
                    <p className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  ) : null}

                  {hasTx && txMsg ? (
                    <p className="text-xs text-green-600">
                      On-chain tx confirmed.{" "}
                      <a className="underline underline-offset-2" href={txMsg.url} target="_blank" rel="noreferrer">
                        View on explorer
                      </a>
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 text-xs"
                      disabled={busy || mutation.isPending}
                      onClick={() => handleOffChainAction(report.id, "warn")}
                    >
                      {busy && activeId === report.id && mutation.variables?.action === "warn" ? "Saving…" : "Warn Creator"}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-9 text-xs"
                      disabled={busy || mutation.isPending || !isConnected}
                      onClick={() => void handleOnChainAction(report, "pauseEntries", "pause")}
                    >
                      {busy && activeId === report.id ? "Confirming…" : "Pause League"}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-9 bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90"
                      disabled={busy || mutation.isPending || !isConnected}
                      onClick={() => void handleOnChainAction(report, "triggerRefund", "refund")}
                    >
                      {busy && activeId === report.id ? "Confirming…" : "Close & Refund"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 text-xs"
                      disabled={busy || mutation.isPending}
                      onClick={() => handleOffChainAction(report.id, "dismiss")}
                    >
                      {busy && activeId === report.id && mutation.variables?.action === "dismiss" ? "Saving…" : "Dismiss"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
