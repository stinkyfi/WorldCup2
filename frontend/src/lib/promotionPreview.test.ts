import { describe, expect, it } from "vitest";
import { PROMOTION_USDC_PER_DAY } from "./createLeagueEnv";
import { formatUsdc6, promotionUsdcTotalWei } from "./promotionPreview";

describe("promotionUsdcTotalWei", () => {
  it("returns 0 for non-positive days", () => {
    expect(promotionUsdcTotalWei(0)).toBe(0n);
    expect(promotionUsdcTotalWei(-1)).toBe(0n);
  });

  it("multiplies daily rate by whole days", () => {
    expect(promotionUsdcTotalWei(3)).toBe(PROMOTION_USDC_PER_DAY * 3n);
  });
});

describe("formatUsdc6", () => {
  it("formats 6 decimals", () => {
    expect(formatUsdc6(1_500_000n)).toBe("1.5");
  });
});
