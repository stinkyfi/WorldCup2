import { describe, expect, it } from "vitest";
import { isPastSweepWindow } from "@/lib/sweepWindow";

describe("isPastSweepWindow", () => {
  it("false when merkleRootSetAtSec <= 0", () => {
    expect(isPastSweepWindow({ merkleRootSetAtSec: 0n, nowSec: 1n })).toBe(false);
  });

  it("false just before 90 days", () => {
    const setAt = 1000n;
    const ninetyDays = 90n * 86_400n;
    expect(isPastSweepWindow({ merkleRootSetAtSec: setAt, nowSec: setAt + ninetyDays - 1n })).toBe(false);
  });

  it("true at 90 days", () => {
    const setAt = 1000n;
    const ninetyDays = 90n * 86_400n;
    expect(isPastSweepWindow({ merkleRootSetAtSec: setAt, nowSec: setAt + ninetyDays })).toBe(true);
  });
});

