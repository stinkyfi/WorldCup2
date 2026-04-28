import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function MyLeaguesPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">My leagues</h1>
      <p className="mb-8 text-muted-foreground">
        Authenticated creator/player dashboards ship in later stories. Visit without a wallet is allowed for this
        placeholder.
      </p>
      <Button type="button" variant="secondary" asChild className="min-h-11">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
