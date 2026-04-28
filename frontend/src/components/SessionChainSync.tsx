import { useEffect } from "react";
import { useChainId } from "wagmi";
import { apiUrl } from "@/lib/apiBase";
import { useSiweSession } from "@/lib/siweAuthContext";

/**
 * Story 2.3 (FR5): when the wallet chain changes, re-bind the server session and recompute `isAdmin`
 * for the new chain against the Postgres whitelist.
 */
export function SessionChainSync() {
  const walletChainId = useChainId();
  const { authStatus, me, refreshSession } = useSiweSession();

  useEffect(() => {
    if (authStatus !== "authenticated" || !me) return;
    if (walletChainId === me.chainId) return;

    let cancelled = false;
    void (async () => {
      await fetch(apiUrl("/api/v1/auth/session-chain"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chainId: walletChainId }),
      });
      if (cancelled) return;
      await refreshSession();
    })();

    return () => {
      cancelled = true;
    };
  }, [walletChainId, me, authStatus, refreshSession]);

  return null;
}
