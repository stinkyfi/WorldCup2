import { formatUnits } from "viem";
import { PROMOTION_USDC_PER_DAY } from "@/lib/createLeagueEnv";

export function promotionUsdcTotalWei(days: number): bigint {
  if (!Number.isFinite(days) || days <= 0) return 0n;
  return PROMOTION_USDC_PER_DAY * BigInt(Math.floor(days));
}

/** Human USDC (6 decimals) string for UI. */
export function formatUsdc6(wei: bigint): string {
  return formatUnits(wei, 6);
}
