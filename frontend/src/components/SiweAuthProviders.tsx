import {
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  createAuthenticationAdapter,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiweMessage } from "siwe";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, WagmiProvider } from "wagmi";
import { SessionChainSync } from "@/components/SessionChainSync";
import { apiUrl } from "@/lib/apiBase";
import type { SessionUser } from "@/lib/siweAuthContext";
import { SiweAuthUiContext, SiweSessionContext } from "@/lib/siweAuthContext";
import { wagmiConfig } from "@/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

const broadcastTheme = darkTheme({
  accentColor: "#3b82f6",
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
});

function WalletSessionSync({
  authStatus,
  onSessionCleared,
}: {
  authStatus: "loading" | "unauthenticated" | "authenticated";
  onSessionCleared: () => void;
}) {
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && authStatus === "authenticated") {
      void fetch(apiUrl("/api/v1/auth/logout"), { method: "POST", credentials: "include" })
        .catch(() => undefined)
        .finally(() => {
          onSessionCleared();
        });
    }
  }, [isConnected, authStatus, onSessionCleared]);

  return null;
}

function SiweRainbowKitInner({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [me, setMe] = useState<SessionUser | null>(null);
  const [siweError, setSiweError] = useState<string | null>(null);
  const { address } = useAccount();

  const clearSiweError = useCallback(() => setSiweError(null), []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/auth/me"), { credentials: "include" });
      if (!res.ok) {
        setAuthStatus("unauthenticated");
        setMe(null);
        return;
      }
      const json = (await res.json()) as { data: SessionUser | null };
      if (!json.data) {
        setAuthStatus("unauthenticated");
        setMe(null);
        return;
      }
      setAuthStatus("authenticated");
      setMe(json.data);
    } catch {
      setAuthStatus("unauthenticated");
      setMe(null);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshSession();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshSession]);

  const adapter = useMemo(
    () =>
      createAuthenticationAdapter({
        getNonce: async () => {
          if (!address) {
            throw new Error("Connect a wallet first.");
          }
          const res = await fetch(apiUrl("/api/v1/auth/nonce"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ address }),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? "Could not start sign-in.");
          }
          const json = (await res.json()) as { data: { nonce: string } };
          return json.data.nonce;
        },
        createMessage: ({ nonce, address: msgAddress, chainId }) => {
          const host = typeof window !== "undefined" ? window.location.host : "localhost";
          const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
          return new SiweMessage({
            domain: host,
            address: msgAddress,
            statement: "Sign in with Ethereum to WorldCup2.",
            uri: origin,
            version: "1",
            chainId,
            nonce,
          }).prepareMessage();
        },
        verify: async ({ message, signature }) => {
          setSiweError(null);
          const res = await fetch(apiUrl("/api/v1/auth/verify"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message, signature }),
          });
          if (!res.ok) {
            setSiweError("You must approve the wallet sign-in request to continue.");
            return false;
          }
          await refreshSession();
          return true;
        },
        signOut: async () => {
          setSiweError(null);
          await fetch(apiUrl("/api/v1/auth/logout"), { method: "POST", credentials: "include" });
          setAuthStatus("unauthenticated");
          setMe(null);
        },
      }),
    [address, refreshSession],
  );

  const siweAuthUi = useMemo(() => ({ siweError, clearSiweError }), [siweError, clearSiweError]);
  const sessionValue = useMemo(
    () => ({ authStatus, me, refreshSession }),
    [authStatus, me, refreshSession],
  );

  const onSessionCleared = useCallback(() => {
    setAuthStatus("unauthenticated");
    setMe(null);
  }, []);

  return (
    <SiweSessionContext.Provider value={sessionValue}>
      <SiweAuthUiContext.Provider value={siweAuthUi}>
        <RainbowKitAuthenticationProvider adapter={adapter} status={authStatus} enabled>
          <RainbowKitProvider theme={broadcastTheme}>
            <WalletSessionSync authStatus={authStatus} onSessionCleared={onSessionCleared} />
            <SessionChainSync />
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </SiweAuthUiContext.Provider>
    </SiweSessionContext.Provider>
  );
}

export function SiweAuthProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SiweRainbowKitInner>{children}</SiweRainbowKitInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
