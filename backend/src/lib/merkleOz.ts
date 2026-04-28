import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import { encodePacked, keccak256 as viemKeccak256, type Address, type Hex } from "viem";

/** Leaf hash matching `League` claim verification (OZ `keccak256(abi.encodePacked(...))`). */
export function merkleLeafHash(address: Address, amount: bigint, claimType: 0 | 1): Hex {
  return viemKeccak256(encodePacked(["address", "uint256", "uint8"], [address, amount, claimType]));
}

/**
 * Sorted pair hash (matches OpenZeppelin `MerkleProof.verify` / contracts League tests).
 * See `contracts/test/League.test.ts` (`sortedHash`).
 */
export function sortedPairHash(a: Hex, b: Hex): Hex {
  const ba = Buffer.from(a.slice(2), "hex");
  const bb = Buffer.from(b.slice(2), "hex");
  const first = ba.compare(bb) <= 0 ? ba : bb;
  const second = ba.compare(bb) <= 0 ? bb : ba;
  const packed = Buffer.concat([first, second]);
  return `0x${keccak256(packed).toString("hex")}` as Hex;
}

export function verifySortedPairProof(leaf: Hex, proof: Hex[], root: Hex): boolean {
  let computed = leaf;
  for (const p of proof) {
    computed = sortedPairHash(computed, p);
  }
  return computed.toLowerCase() === root.toLowerCase();
}

export function buildSortedPairMerkleTree(leafHashes: Hex[]): {
  root: Hex;
  getProof(leaf: Hex): Hex[];
} {
  if (leafHashes.length === 0) {
    throw new Error("Merkle tree requires at least one leaf");
  }
  const buffers = leafHashes.map((h) => Buffer.from(h.slice(2), "hex"));
  const tree = new MerkleTree(buffers, keccak256, { sortPairs: true, hashLeaves: false });
  const rootHex = `0x${tree.getRoot().toString("hex")}` as Hex;
  return {
    root: rootHex,
    getProof(leaf: Hex): Hex[] {
      const buf = Buffer.from(leaf.slice(2), "hex");
      const proof = tree.getProof(buf);
      return proof.map((step) => {
        const raw = step.data as Buffer | Uint8Array;
        const bufProof = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        return `0x${bufProof.toString("hex")}` as Hex;
      });
    },
  };
}
