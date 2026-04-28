import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSiweSession } from "@/lib/siweAuthContext";

/**
 * Story 2.3: `/admin/*` — SIWE required; non-admins redirected home with notice (wrap inside `RequireSiwe`).
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { authStatus, me } = useSiweSession();

  if (authStatus === "loading" || (authStatus === "authenticated" && !me)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted-foreground" role="status">
        Checking admin access…
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  if (me === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted-foreground" role="status">
        Checking admin access…
      </div>
    );
  }

  if (!me.isAdmin) {
    return <Navigate to="/?notice=admin_denied" replace />;
  }

  return <>{children}</>;
}
