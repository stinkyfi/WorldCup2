import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CreatePlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">Create a league</h1>
      <p className="mb-8 text-muted-foreground">
        Creation wizard and SIWE-gated flows ship in Epics 2–3. This route is public for now (no unprompted wallet
        modal).
      </p>
      <Button type="button" variant="secondary" asChild className="min-h-11">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
