/** Smallest units: 0.01 whole token (e.g. 0.01 USDC = 10_000 for 6 decimals). Story 3.1 platform minimum for entry fee. */
export function platformMinEntryWeiForDecimals(decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("decimals must be an integer 0–255");
  }
  if (decimals <= 2) return 1n;
  return 10n ** BigInt(decimals - 2);
}
