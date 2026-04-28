import { describe, expect, it } from "vitest";
import { entryFeeMinimumError, parseEntryFeeWei, parsePositiveInt } from "./createWizardFee";

describe("parseEntryFeeWei", () => {
  it("parses valid USDC amount", () => {
    const r = parseEntryFeeWei("10.5", 6);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.wei).toBe(10_500_000n);
  });

  it("rejects empty", () => {
    const r = parseEntryFeeWei("  ", 6);
    expect(r.ok).toBe(false);
  });
});

describe("entryFeeMinimumError", () => {
  it("returns null when at minimum", () => {
    const err = entryFeeMinimumError(10_000n, {
      symbol: "USDC",
      decimals: 6,
      minEntryWei: "10000",
    });
    expect(err).toBeNull();
  });

  it("returns message when below minimum", () => {
    const err = entryFeeMinimumError(100n, {
      symbol: "USDC",
      decimals: 6,
      minEntryWei: "10000",
    });
    expect(err).toMatch(/Minimum entry fee/);
  });
});

describe("parsePositiveInt", () => {
  it("accepts optional empty", () => {
    const r = parsePositiveInt("Min players", "", { required: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeUndefined();
  });

  it("rejects invalid digit strings", () => {
    const r = parsePositiveInt("Max total entries", "12a", { required: true });
    expect(r.ok).toBe(false);
  });
});
