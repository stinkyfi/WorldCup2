import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiUrl } from "@/lib/apiBase";
import { AdminDisputeResolution } from "@/components/AdminDisputeResolution";
import { fetchAdminDisputeReview, type AdminDisputeReview } from "@/lib/disputeApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

type Row = {
  id: string;
  chainId: number;
  leagueAddress: string;
  leagueTitle: string;
  txHash: string;
  disputant: string;
  groupId: number;
  isCreator: boolean;
  description: string;
  createdAt: string;
};

async function fetchOpenDisputes(): Promise<{ data: { disputes: Row[] } }> {
  const res = await fetch(apiUrl("/api/v1/admin/disputes"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Admin session required.");
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as { data: { disputes: Row[] } };
}

function RankColumn({ title, subtitle, keys, error }: { title: string; subtitle?: string; keys: string[] | null; error?: string | null }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {keys && !error ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-foreground">
          {keys.map((k, i) => (
            <li key={i} className="font-mono">
              {k}
            </li>
          ))}
        </ol>
      ) : null}
      {!keys && !error ? <p className="mt-2 text-sm text-muted-foreground">—</p> : null}
    </div>
  );
}

function ReviewPanel({
  data,
  onClose,
  onSettled,
}: {
  data: AdminDisputeReview;
  onClose: () => void;
  onSettled: () => void;
}) {
  const { dispute, rankings, deposit, relatedOpenDisputes } = data;
  const refSubtitle =
    rankings.referenceSource === "staging_json" ? "From ORACLE_STAGING_GROUPS_JSON (same as staging oracle)" : undefined;

  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Review: {dispute.groupLabel}</CardTitle>
          <CardDescription className="mt-1">
            {dispute.leagueTitle} · {dispute.leagueAddress} · chain {dispute.chainId}
          </CardDescription>
        </div>
        <Button type="button" variant="secondary" className="min-h-11 shrink-0" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <RankColumn title="Oracle (on-chain)" keys={rankings.oracleTeamKeys} error={rankings.oracleReadError} />
          <RankColumn title="Reference" subtitle={refSubtitle} keys={rankings.referenceTeamKeys} />
        </div>
        {rankings.referenceNote ? <p className="text-sm text-muted-foreground">{rankings.referenceNote}</p> : null}
        {rankings.oracleMatchesReference === false ? (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Oracle and reference rankings differ.</p>
        ) : null}
        {rankings.oracleMatchesReference === true ? (
          <p className="text-sm text-muted-foreground">Oracle matches reference order.</p>
        ) : null}

        <div className="border-t border-border pt-3 text-sm">
          <p>
            <span className="text-muted-foreground">Disputant</span>{" "}
            <span className="font-mono text-xs">{dispute.disputant}</span>
          </p>
          <p className="mt-1">
            <span className="text-muted-foreground">Deposit</span>{" "}
            {deposit.kind === "creator_waived" ? (
              "Creator — no deposit"
            ) : (
              <>
                {deposit.amountWei ?? "?"} wei · token{" "}
                <span className="font-mono text-xs">{deposit.tokenAddress ?? "—"}</span>
              </>
            )}
          </p>
          <p className="mt-2 text-foreground">{dispute.description}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Tx {dispute.txHash}</p>
        </div>

        {relatedOpenDisputes.length > 0 ? (
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Other open disputes on this group</p>
            <ul className="mt-2 space-y-2 text-sm">
              {relatedOpenDisputes.map((r) => (
                <li key={r.id} className="rounded border border-border/80 bg-card/40 px-2 py-2">
                  <span className="font-mono text-xs">{r.disputant}</span>
                  {r.isCreator ? <span className="ml-2 text-xs text-muted-foreground">(creator)</span> : null}
                  <p className="mt-1 text-muted-foreground">{r.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <AdminDisputeResolution review={data} onSettled={onSettled} />
      </CardContent>
    </Card>
  );
}

export function AdminDisputesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-disputes-open"],
    queryFn: () => fetchOpenDisputes(),
    retry: false,
  });

  const reviewQ = useQuery({
    queryKey: ["admin-dispute-review", selectedId],
    queryFn: ({ signal }) => fetchAdminDisputeReview(selectedId!, signal),
    enabled: Boolean(selectedId),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Open disputes</h1>
        <Button type="button" variant="secondary" className="min-h-11" asChild>
          <Link to="/admin">Admin home</Link>
        </Button>
      </div>

      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {q.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {(q.error as Error).message}
        </p>
      ) : null}

      {q.data?.data.disputes.length === 0 ? (
        <p className="rounded-lg border border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No open disputes.
        </p>
      ) : null}

      {q.data?.data.disputes.length ? (
        <ul className="space-y-4">
          {q.data.data.disputes.map((d) => (
            <li key={d.id} className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{d.leagueTitle}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {d.leagueAddress} · chain {d.chainId}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Group {String.fromCharCode(65 + d.groupId)} · {d.isCreator ? "Creator dispute" : "Player dispute"}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{d.description}</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">Tx {d.txHash}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                </div>
                <Button
                  type="button"
                  variant={selectedId === d.id ? "default" : "secondary"}
                  className="min-h-11 shrink-0"
                  onClick={() => setSelectedId((cur) => (cur === d.id ? null : d.id))}
                >
                  {selectedId === d.id ? "Hide review" : "Review"}
                </Button>
              </div>

              {selectedId === d.id ? (
                <div className="mt-4">
                  {reviewQ.isLoading ? <p className="text-sm text-muted-foreground">Loading review…</p> : null}
                  {reviewQ.isError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {(reviewQ.error as Error).message}
                    </p>
                  ) : null}
                  {reviewQ.data?.data ? (
                    <ReviewPanel
                      data={reviewQ.data.data}
                      onClose={() => setSelectedId(null)}
                      onSettled={() => {
                        void q.refetch();
                        void reviewQ.refetch();
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
