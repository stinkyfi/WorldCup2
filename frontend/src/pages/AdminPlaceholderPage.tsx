import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Story 2.3 — shell for oracle, disputes, etc. in later epics. */
export function AdminPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-3 text-2xl font-semibold">Admin</h1>
      <p className="mb-8 text-muted-foreground">
        You are signed in as an admin for this network. Manual oracle, disputes, and other controls land in later
        stories.
      </p>
      <Button type="button" variant="secondary" asChild className="min-h-11">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
