import { describe, expect, it } from "vitest";
import { getWalletInstallGuideUrls, isMobileUserAgent } from "./walletGuideLinks";

describe("isMobileUserAgent", () => {
  it("returns true for common phone UAs", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
  });

  it("returns false for desktop UAs", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(isMobileUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
  });
});

describe("getWalletInstallGuideUrls", () => {
  it("uses download flows for mobile", () => {
    const u = getWalletInstallGuideUrls("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(u.metamask).toBe("https://metamask.io/download/");
    expect(u.coinbase).toBe("https://www.coinbase.com/wallet/downloads");
  });

  it("uses getting-started for desktop Coinbase and universal MetaMask download", () => {
    const u = getWalletInstallGuideUrls("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(u.metamask).toBe("https://metamask.io/download/");
    expect(u.coinbase).toBe("https://www.coinbase.com/wallet/getting-started");
  });

  it("treats missing UA as mobile-safe defaults", () => {
    const u = getWalletInstallGuideUrls(undefined);
    expect(u.coinbase).toContain("downloads");
  });
});
