import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type Hex } from "viem";
import { getAddress } from "viem";
import { buildSortedPairMerkleTree, merkleLeafHash, sortedPairHash, verifySortedPairProof } from "../src/lib/merkleOz.js";

describe("merkleOz", () => {
  it("two-leaf root matches manual sorted pair (contracts League.test.ts shape)", () => {
    const a = merkleLeafHash(getAddress("0x1111111111111111111111111111111111111111"), 100n, 0);
    const b = merkleLeafHash(getAddress("0x2222222222222222222222222222222222222222"), 200n, 0);
    const manualRoot = sortedPairHash(a, b);
    const { root, getProof } = buildSortedPairMerkleTree([a, b]);
    assert.equal(root.toLowerCase(), manualRoot.toLowerCase());

    const pA = getProof(a);
    assert.ok(verifySortedPairProof(a, pA, root));
    const pB = getProof(b);
    assert.ok(verifySortedPairProof(b, pB, root));
  });

  it("single-leaf tree root equals leaf", () => {
    const leaf = merkleLeafHash(getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), 55n, 1);
    const { root } = buildSortedPairMerkleTree([leaf]);
    assert.equal(root.toLowerCase(), leaf.toLowerCase());
  });

  it("rejects bogus proof sibling", () => {
    const a = merkleLeafHash(getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), 1n, 0) as Hex;
    const b = merkleLeafHash(getAddress("0xcccccccccccccccccccccccccccccccccccccccc"), 2n, 0) as Hex;
    const { root } = buildSortedPairMerkleTree([a, b]);
    const fake = ("0x" + "ee".repeat(32)) as Hex;
    assert.ok(!verifySortedPairProof(a, [fake], root));
  });
});
