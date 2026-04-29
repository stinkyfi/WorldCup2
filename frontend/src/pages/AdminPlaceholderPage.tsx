import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Story 2.3 — shell for oracle, disputes, etc. in later epics. */
export function AdminPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-3 text-2xl font-semibold">Admin</h1>
      <p className="mb-8 text-muted-foreground">
        You are signed in as an admin for this network.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" asChild>
          <Link to="/admin/oracle">Oracle actions</Link>
        </Button>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/admin/oracle/health">Oracle health</Link>
        </Button>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/admin/disputes">Disputes</Link>
        </Button>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
