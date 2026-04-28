import type { DisclaimerComponent } from "@rainbow-me/rainbowkit";
import { getWalletInstallGuideUrls } from "@/lib/walletGuideLinks";

/**
 * Story 2.7 — "Get a Wallet" helper inside the RainbowKit connect modal (FR2, UX-DR5).
 * Shown only when the user opens the modal (e.g. Enter League, Create League, or header Connect).
 */
export const GetWalletDisclaimer: DisclaimerComponent = ({ Text, Link }) => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const { metamask, coinbase } = getWalletInstallGuideUrls(ua);

  return (
    <>
      <Text>
        <strong>Get a Wallet</strong> — Install an EVM wallet to connect and sign in on supported chains (e.g.
        Base Sepolia).
      </Text>
      <Text>
        <Link href={metamask}>MetaMask setup</Link>
        {" · "}
        <Link href={coinbase}>Coinbase Wallet setup</Link>
      </Text>
    </>
  );
};
