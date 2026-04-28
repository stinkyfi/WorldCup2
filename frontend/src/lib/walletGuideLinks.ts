/**
 * Story 2.7: URLs for MetaMask / Coinbase Wallet onboarding (EVM).
 * Mobile → store / universal download pages; desktop → MetaMask download hub + Coinbase getting started.
 */
export function isMobileUserAgent(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export function getWalletInstallGuideUrls(userAgent: string | undefined): {
  metamask: string;
  coinbase: string;
} {
  const ua = userAgent ?? "";
  if (!ua || isMobileUserAgent(ua)) {
    return {
      metamask: "https://metamask.io/download/",
      coinbase: "https://www.coinbase.com/wallet/downloads",
    };
  }
  return {
    metamask: "https://metamask.io/download/",
    coinbase: "https://www.coinbase.com/wallet/getting-started",
  };
}
