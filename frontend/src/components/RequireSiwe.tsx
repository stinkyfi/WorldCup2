import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useSiweSession } from "@/lib/siweAuthContext";
import { Button } from "@/components/ui/button";

/**
 * Story 2.2: allow children only after SIWE session; otherwise explain + wallet CTA.
 */
export function RequireSiwe({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const { authStatus } = useSiweSession();

  if (authStatus === "loading" || authStatus === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted-foreground" role="status">
        Checking sign-in…
      </div>
    );
  }

  if (authStatus === "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold text-foreground">Sign in required</h1>
      <p className="mb-6 text-muted-foreground">
        {isConnected
          ? "Your wallet is connected. Use the button below and approve the sign-in message to open this area."
          : "Connect your wallet, then approve the sign-in message when prompted."}
      </p>
      <div className="flex flex-col items-center gap-4">
        <ConnectWalletButton />
        {isConnected ? (
          <p className="text-sm text-muted-foreground">
            If you dismissed the signature request, open your wallet menu and choose <strong>Sign in</strong> again.
          </p>
        ) : null}
        <Button type="button" variant="ghost" className="text-muted-foreground" asChild>
          <a href="/">Back to home</a>
        </Button>
      </div>
    </div>
  );
}
