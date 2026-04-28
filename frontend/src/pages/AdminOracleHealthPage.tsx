import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";

type HealthGroup = {
  groupId: number;
  expectedDeadline: string | null; // unix seconds (stringified bigint)
  posted: boolean | null;
  lastPostedAt: string | null;
  lastSource: string | null;
  lastTxHash: string | null;
};

type HealthChain = {
  chainId: number;
  controller: string;
  asOf: string;
  lastPostedGroupId: number | null;
  lastPostedAt: string | null;
  groups: HealthGroup[];
};

async function fetchOracleHealth(signal?: AbortSignal): Promise<{ data: { chains: HealthChain[] } }> {
  const res = await fetch(apiUrl("/api/v1/admin/oracle/health"), { credentials: "include", signal });
  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error("Could not load oracle health.");
  return json as { data: { chains: HealthChain[] } };
}

function chainLabel(chainId: number): string {
  if (chainId === 84532) return "Base Sepolia";
  if (chainId === 8453) return "Base";
  if (chainId === 1) return "Ethereum";
  if (chainId === 146) return "Sonic";
  return `Chain ${chainId}`;
}

function groupLabel(groupId: number): string {
  const letters = "ABCDEFGHIJKL";
  return groupId >= 0 && groupId < 12 ? letters[groupId]! : String(groupId);
}

export function AdminOracleHealthPage() {
  const query = useQuery({
    queryKey: ["admin-oracle-health"],
    queryFn: ({ signal }) => fetchOracleHealth(signal),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 0,
  });

  const chains = query.data?.data.chains ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Oracle health</h1>
          <p className="mt-1 text-sm text-muted-foreground">Per-chain status for all 12 groups.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to="/admin/oracle">Manual actions</Link>
          </Button>
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to="/admin">Back</Link>
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : query.error ? (
        <div className="text-destructive">Could not load oracle health.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {chains.map((c) => (
          <Card key={c.chainId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{chainLabel(c.chainId)}</CardTitle>
              <CardDescription className="break-all">
                Controller: <code className="rounded bg-muted px-1">{c.controller}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                As of: <span className="text-foreground">{new Date(c.asOf).toLocaleString()}</span>
              </div>
              <div className="text-muted-foreground">
                Last post:{" "}
                {c.lastPostedAt ? (
                  <span className="text-foreground">
                    Group {groupLabel(c.lastPostedGroupId ?? -1)} • {new Date(c.lastPostedAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-foreground">—</span>
                )}
              </div>

              <div className="grid grid-cols-6 gap-2 pt-1">
                {c.groups.map((g) => {
                  const ok = g.posted === true;
                  const label = groupLabel(g.groupId);
                  return (
                    <div
                      key={g.groupId}
                      className={[
                        "rounded-md border px-2 py-2 text-center text-xs",
                        ok ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-200" : "border-destructive/40 bg-destructive/10 text-destructive",
                      ].join(" ")}
                      title={
                        ok
                          ? `Posted${g.lastPostedAt ? ` at ${g.lastPostedAt}` : ""}`
                          : `Missing${g.expectedDeadline ? `; deadline ${g.expectedDeadline}` : ""}`
                      }
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="secondary" className="min-h-11" asChild>
                  <Link to="/admin/oracle">Post / extend</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

