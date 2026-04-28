import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chainLabel } from "@/lib/leagueBrowse";
import { formatTimeToLock, formatTokenWei } from "@/lib/leagueDisplay";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { fetchComplianceStatus, HttpError, postComplianceAck } from "@/lib/leagueCompliance";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export function LeagueEntryPage() {
  const { address = "" } = useParams();
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const validAddress = isValidAddress ? address : null;

  const [ackChecked, setAckChecked] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  const leagueQuery = useQuery({
    queryKey: ["league-detail", validAddress],
    queryFn: ({ signal }) => fetchLeagueDetail(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 20_000,
    retry: 1,
  });

  const complianceQuery = useQuery({
    queryKey: ["league-compliance", validAddress],
    queryFn: ({ signal }) => fetchComplianceStatus(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 5_000,
    retry: (count, err) => {
      if (err instanceof HttpError && (err.status === 401 || err.status === 404)) return false;
      return count < 1;
    },
  });

  const ackMutation = useMutation({
    mutationFn: async () => postComplianceAck(validAddress!),
    onSuccess: async () => {
      setAckError(null);
      await complianceQuery.refetch();
    },
    onError: (e) => {
      if (e instanceof HttpError && e.status === 401) setAckError("Sign in required.");
      else setAckError("Could not save acknowledgement. Please try again.");
    },
  });

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  const league = leagueQuery.data?.data.league;
  const compliance = complianceQuery.data?.data;
  const acknowledged = compliance?.acknowledged === true;

  if (leagueQuery.isLoading || complianceQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground" role="status">
        Loading entry…
      </div>
    );
  }

  if (leagueQuery.error || complianceQuery.error) {
    const msg =
      complianceQuery.error instanceof HttpError && complianceQuery.error.status === 401
        ? "Sign in required."
        : leagueQuery.error
          ? "Could not load league."
          : complianceQuery.error
            ? "Could not load compliance status."
            : "Could not load entry page.";
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">{msg}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              void leagueQuery.refetch();
              void complianceQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Enter league</h1>
        <p className="mb-8 text-muted-foreground">League not found.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Enter league</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{league.title}</span> • {chainLabel(league.chainId)} • Locks{" "}
          {formatTimeToLock(league.lockAt)}
        </p>
      </div>

      {!acknowledged ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Compliance acknowledgment</CardTitle>
            <CardDescription>You must acknowledge once per league before entering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-4 text-muted-foreground">
              <p className="text-foreground font-medium">Jurisdiction self-certification</p>
              <p className="mt-2">
                By continuing, you confirm you are permitted to participate where you are located, and you understand this
                is a prediction game with an on-chain entry fee.
              </p>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={ackChecked}
                onChange={(e) => {
                  setAckError(null);
                  setAckChecked(e.target.checked);
                }}
              />
              <span className="text-muted-foreground">
                I confirm I am eligible to participate and I agree to proceed.
              </span>
            </label>

            {ackError ? <p className="text-sm text-destructive">{ackError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={!ackChecked || ackMutation.isPending}
                onClick={() => {
                  if (!ackChecked) {
                    setAckError("Please check the box to continue.");
                    return;
                  }
                  ackMutation.mutate();
                }}
              >
                {ackMutation.isPending ? "Saving…" : "Acknowledge & continue"}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" asChild>
                <Link to={`/league/${address}`}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className={!acknowledged ? "opacity-50 pointer-events-none select-none" : undefined}>
        <CardHeader>
          <CardTitle>Fee review</CardTitle>
          <CardDescription>Review fees before entering. Entry transaction ships in the next story.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Entry fee</dt>
              <dd className="text-sm font-semibold text-foreground">{formatTokenWei(league.entryFeeWei, league.entryTokenSymbol)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Prize pool (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.prizePoolAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Creator fee (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.creatorFeeAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Dev fee (per entry)</dt>
              <dd className="text-sm font-semibold text-foreground">
                {formatTokenWei(league.feeBreakdown.devFeeAmountWei, league.entryTokenSymbol)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled>
              Continue to entry
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" asChild>
              <Link to={`/league/${address}`}>Back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

