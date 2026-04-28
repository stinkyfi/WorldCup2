import { describe, expect, it } from "vitest";
import { formatTimeToLock, formatTokenWei } from "./leagueDisplay";

describe("formatTimeToLock", () => {
  it("returns Locked when lock is in the past", () => {
    expect(formatTimeToLock("2000-01-01T00:00:00.000Z")).toBe("Locked");
  });

  it("shows days when far in the future", () => {
    const far = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(formatTimeToLock(far)).toMatch(/\d+d/);
  });
});

describe("formatTokenWei", () => {
  it("formats USDC with 6 decimals", () => {
    expect(formatTokenWei("1000000", "USDC")).toContain("USDC");
  });
});
