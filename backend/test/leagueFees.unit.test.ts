import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFeeBreakdown } from "../src/lib/leagueFees.js";

test("computeFeeBreakdown: normal split when fees sum <= 10000 bps", () => {
  const r = computeFeeBreakdown({ entryFeeWei: 10_000n, devFeeBps: 200, creatorFeeBps: 300 });
  assert.equal(r.devFeeBps, 200);
  assert.equal(r.creatorFeeBps, 300);
  assert.equal(r.prizePoolBps, 9500);
  assert.equal(r.devFeeAmountWei, "200");
  assert.equal(r.creatorFeeAmountWei, "300");
  assert.equal(r.prizePoolAmountWei, "9500");
});

test("computeFeeBreakdown: proportional scale when dev + creator > 10000 bps", () => {
  const r = computeFeeBreakdown({ entryFeeWei: 10_000n, devFeeBps: 6000, creatorFeeBps: 6000 });
  assert.equal(r.devFeeBps, 5000);
  assert.equal(r.creatorFeeBps, 5000);
  assert.equal(r.prizePoolBps, 0);
  assert.equal(r.devFeeAmountWei, "5000");
  assert.equal(r.creatorFeeAmountWei, "5000");
  assert.equal(r.prizePoolAmountWei, "0");
});

test("computeFeeBreakdown: zero fees yields full prize pool", () => {
  const r = computeFeeBreakdown({ entryFeeWei: 123n, devFeeBps: 0, creatorFeeBps: 0 });
  assert.equal(r.prizePoolBps, 10_000);
  assert.equal(r.prizePoolAmountWei, "123");
  assert.equal(r.devFeeAmountWei, "0");
  assert.equal(r.creatorFeeAmountWei, "0");
});

test("computeFeeBreakdown: amounts always sum to entry (no negative remainder)", () => {
  for (const [d, c] of [
    [10_000, 10_000],
    [7_000, 8_000],
    [1, 9_999],
    [9_999, 9_999],
  ] as const) {
    const entry = 1_000_000_000_000_000_000n; // 1e18 wei
    const r = computeFeeBreakdown({ entryFeeWei: entry, devFeeBps: d, creatorFeeBps: c });
    const sum =
      BigInt(r.devFeeAmountWei) + BigInt(r.creatorFeeAmountWei) + BigInt(r.prizePoolAmountWei);
    assert.equal(sum, entry, `d=${d} c=${c}`);
    assert.ok(BigInt(r.prizePoolAmountWei) >= 0n);
  }
});
