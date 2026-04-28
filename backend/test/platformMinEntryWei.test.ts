import assert from "node:assert/strict";
import { test } from "node:test";
import { platformMinEntryWeiForDecimals } from "../src/lib/platformMinEntryWei.js";

test("platformMinEntryWeiForDecimals — 6 decimals → 0.01 token = 10_000", () => {
  assert.equal(platformMinEntryWeiForDecimals(6), 10_000n);
});

test("platformMinEntryWeiForDecimals — 18 decimals → 0.01 token = 10^16", () => {
  assert.equal(platformMinEntryWeiForDecimals(18), 10n ** 16n);
});

test("platformMinEntryWeiForDecimals — small decimals floor", () => {
  assert.equal(platformMinEntryWeiForDecimals(2), 1n);
});
