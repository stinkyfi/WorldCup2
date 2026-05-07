/**
 * Heuristic bytecode analysis for whitelist admin review (Epic 9 / Story 9.3).
 * Not authoritative — flagged tokens still need manual review.
 */

export type TokenBytecodeSurfaceResult = {
  bytecodeLength: number;
  warnings: string[];
  feeOnTransferLikely: boolean;
  rebaseLikely: boolean;
};

/** Standard ERC-7201 / burn-to-dead address pattern in deployed bytecode hex. */
const BURN_DEAD = "000000000000000000000000000000000000dead";

export function analyzeBytecodeHex(bytecodeHex: string): TokenBytecodeSurfaceResult {
  const h = bytecodeHex.replace(/^0x/i, "").toLowerCase();
  const bytecodeLength = h.length / 2;

  const warnings: string[] = [];

  if (h.length <= 10) {
    return { bytecodeLength, warnings: ["Bytecode is unusually small — verify address is an ERC‑20 implementation."], feeOnTransferLikely: false, rebaseLikely: false };
  }

  if (h.includes(BURN_DEAD)) {
    warnings.push(
      "Fee-on-transfer / deflationary hint: bytecode references the standard burn (dead) address. Manual review recommended.",
    );
  }

  /** EIP-1167 minimal-proxy header + implementation slot snippet (common clones). */
  if (h.startsWith("363d3d373d3d3d363d736") || (h.includes("363d3d373d3d3d363d73") && h.includes("5af43"))) {
    warnings.push(
      "EIP-1167 minimal-proxy pattern detected — surface risk depends on implementation; verify ERC‑20 behavior on-chain.",
    );
  }

  /** Weak signal only: snippet search for bytecode patterns that sometimes co-occur with large vault-style ERC-20s (not verified ERC-4626). */
  const selective4626 = ["6e553f65", "079fe6e8", "a9056604"].some((sig) => h.includes(sig));
  if (bytecodeLength > 18_000 && selective4626) {
    warnings.push(
      "Rebase / vault semantics hint: large bytecode with ERC‑4626-like selectors — verify token accounting manually.",
    );
  }

  const feeOnTransferLikely = warnings.some((w) => w.toLowerCase().includes("fee-on-transfer"));
  const rebaseLikely = warnings.some((w) => w.toLowerCase().includes("rebase"));

  return { bytecodeLength, warnings, feeOnTransferLikely, rebaseLikely };
}
