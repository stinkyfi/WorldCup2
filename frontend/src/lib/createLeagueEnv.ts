import type { Address } from "viem";
import type { CreateLeagueChainId } from "@/lib/createLeagueChains";

/** Canonical mainnet USDC per chain (matches backend `whitelisted_tokens` seed). */
export const USDC_ADDRESS_BY_CHAIN: Record<CreateLeagueChainId, Address> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  146: "0x29219dd400f2Bf60Ee511d2200D8323dC2ecf2c9",
};

/** Default promotion pricing: $20 USDC per day (6 decimals). */
export const PROMOTION_USDC_PER_DAY = 20n * 1_000_000n;

function parseAddress(raw: string | undefined): Address | undefined {
  if (!raw || !raw.startsWith("0x") || raw.length !== 42) return undefined;
  return raw as Address;
}

/** `VITE_LEAGUE_FACTORY_8453`, `VITE_LEAGUE_FACTORY_1`, `VITE_LEAGUE_FACTORY_146` */
export function leagueFactoryAddress(chainId: CreateLeagueChainId): Address | undefined {
  const key = `VITE_LEAGUE_FACTORY_${chainId}` as const;
  const raw = import.meta.env[key] as string | undefined;
  return parseAddress(typeof raw === "string" ? raw.trim() : undefined);
}

/** Recipient for optional promotion USDC transfer (Story 3.2). */
export function promotionUsdcRecipient(): Address | undefined {
  const raw = import.meta.env.VITE_PROMOTION_RECIPIENT as string | undefined;
  return parseAddress(typeof raw === "string" ? raw.trim() : undefined);
}
