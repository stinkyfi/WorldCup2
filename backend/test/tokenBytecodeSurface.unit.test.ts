import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeBytecodeHex } from "../src/lib/tokenBytecodeSurface.js";

test("analyzeBytecodeHex: burn-dead substring flags fee-on-transfer hint", () => {
  const burnDead = "000000000000000000000000000000000000dead";
  const fake = (`0xff${burnDead}aabb`.repeat(8)) as `0x${string}`;
  const r = analyzeBytecodeHex(fake);
  assert.equal(r.feeOnTransferLikely, true);
  assert.ok(r.warnings.length >= 1);
});

test("analyzeBytecodeHex: tiny bytecode stays low-signal", () => {
  const r = analyzeBytecodeHex("0x1234");
  assert.equal(r.bytecodeLength, 2);
  assert.equal(r.feeOnTransferLikely, false);
});
