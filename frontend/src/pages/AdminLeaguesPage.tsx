import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";

type LeagueRow = {
  id: string;
  chainId: number;
  title: string;
  contractAddress: string | null;
  featured: boolean;
};

type LeaguesResponse = { data: { leagues: LeagueRow[] } };

async function fetchAllLeagues(): Promise<LeagueRow[]> {
  const res = await fetch(apiUrl("/api/v1/leagues"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) throw new Error("Admin session required.");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const body = (await res.json()) as LeaguesResponse;
  return body.data.leagues;
}

async function patchFeatured(params: { chainId: number; leagueAddress: string; featured: boolean }) {
  const res = await fetch(apiUrl("/api/v1/admin/leagues/featured"), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
}

export function AdminLeaguesPage() {
  const queryClient = useQueryClient();
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const { data: leagues, isLoading, error } = useQuery({
    queryKey: ["admin-leagues"],
    queryFn: fetchAllLeagues,
  });

  const mutation = useMutation({
    mutationFn: patchFeatured,
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
      setFeedbackId(vars.leagueAddress);
      setFeedbackMsg(vars.featured ? "Marked as featured." : "Removed from featured.");
      setTimeout(() => {
        setFeedbackId(null);
        setFeedbackMsg(null);
      }, 3000);
    },
    onError: (err: Error, vars) => {
      setFeedbackId(vars.leagueAddress);
      setFeedbackMsg(`Error: ${err.message}`);
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin">
          <Button type="button" variant="secondary" className="min-h-11">
            ← Admin home
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Leagues</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading leagues…</p>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load leagues: {(error as Error).message}
        </div>
      ) : !leagues || leagues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leagues found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All leagues ({leagues.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {leagues.map((league) => {
                const addr = league.contractAddress ?? "";
                const isBusy = mutation.isPending && mutation.variables?.leagueAddress === addr;
                const isThisRow = feedbackId === addr;
                return (
                  <div
                    key={league.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{league.title || "(untitled)"}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        chain {league.chainId} · {addr || "no address"}
                      </p>
                      {isThisRow && feedbackMsg ? (
                        <p
                          className={`mt-1 text-xs ${feedbackMsg.startsWith("Error") ? "text-destructive" : "text-green-600"}`}
                        >
                          {feedbackMsg}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {league.featured ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 text-xs"
                          disabled={isBusy || !addr}
                          onClick={() =>
                            mutation.mutate({ chainId: league.chainId, leagueAddress: addr, featured: false })
                          }
                        >
                          {isBusy ? "Saving…" : "Unfeature"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="min-h-9 text-xs"
                          disabled={isBusy || !addr}
                          onClick={() =>
                            mutation.mutate({ chainId: league.chainId, leagueAddress: addr, featured: true })
                          }
                        >
                          {isBusy ? "Saving…" : "Feature"}
                        </Button>
                      )}
                      {addr ? (
                        <Link to={`/admin/leagues/${addr}?chainId=${league.chainId}`}>
                          <Button type="button" variant="secondary" className="min-h-9 text-xs">
                            Detail →
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
