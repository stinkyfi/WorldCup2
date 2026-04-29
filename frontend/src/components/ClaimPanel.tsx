import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Story 8.2 — prize claim UI (Merkle proof claim on-chain). */
export function ClaimPanel(props: {
  leagueTitle: string;
  amountLabel: string;
  usdApproxLabel: string | null;
  busy: boolean;
  error: string | null;
  success: { txHash: `0x${string}`; amountLabel: string; explorerTxUrl: string } | null;
  onClaim: () => void;
  onShareSuccess: () => void;
  shareHint: string | null;
}) {
  const {
    leagueTitle,
    amountLabel,
    usdApproxLabel,
    busy,
    error,
    success,
    onClaim,
    onShareSuccess,
    shareHint,
  } = props;

  if (success) {
    return (
      <Card className="border-border bg-card/40">
        <CardHeader>
          <CardTitle>Prize claimed</CardTitle>
          <CardDescription>
            {leagueTitle} — you received <span className="font-medium text-foreground">{success.amountLabel}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-primary/20 to-accent/10 px-4 py-3 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <p className="font-semibold text-accent">Share your win</p>
            <p className="mt-1 text-xs text-muted-foreground">Copy a short card you can paste into Discord or X.</p>
          </div>
          {shareHint ? <p className="text-xs text-muted-foreground">{shareHint}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={() => void onShareSuccess()}>
              Copy claim card
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" asChild>
              <a href={success.explorerTxUrl} target="_blank" rel="noreferrer">
                View transaction
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/40">
      <CardHeader>
        <CardTitle>Claim prize</CardTitle>
        <CardDescription>Merkle-verified payout from {leagueTitle}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-md border border-border bg-background/40 px-4 py-3">
          <div className="text-xs text-muted-foreground">Claimable</div>
          <div className="text-lg font-semibold text-foreground">{amountLabel}</div>
          {usdApproxLabel ? <p className="mt-1 text-xs text-muted-foreground">{usdApproxLabel}</p> : null}
        </div>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>
        ) : null}
        <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={() => void onClaim()}>
          {busy ? "Confirm in wallet…" : "Claim prize"}
        </Button>
      </CardContent>
    </Card>
  );
}
