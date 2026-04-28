import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

/** Epic 8 will replace this with Merkle proof prize claiming. */
export function LeagueClaimPlaceholderPage() {
  const { address = "" } = useParams();
  const valid = isAddress(address);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-3 text-2xl font-semibold text-foreground">Claim prizes</h1>
      <p className="mb-8 text-muted-foreground">
        On-chain prize claims open after Merkle payouts are wired up (Epic 8). You will prove eligibility with your wallet and
        the published payout tree.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="min-h-11" asChild>
          <Link to={valid ? `/league/${address}` : "/browse"}>Back to league</Link>
        </Button>
      </div>
    </div>
  );
}
