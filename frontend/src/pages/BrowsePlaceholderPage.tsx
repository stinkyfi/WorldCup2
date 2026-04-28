import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BrowsePlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">Browse leagues</h1>
      <p className="mb-8 text-muted-foreground">
        League list, filters, and sort ship in Story 2.4. No wallet required to view this page.
      </p>
      <Button type="button" variant="secondary" asChild className="min-h-11">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
