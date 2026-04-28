import { apiUrl } from "@/lib/apiBase";

export type WhitelistedTokenOption = {
  address: string;
  symbol: string;
  decimals: number;
  minEntryWei: string;
};

export type WhitelistedTokensEnvelope = {
  data: { chainId: number; tokens: WhitelistedTokenOption[] };
  meta?: Record<string, unknown>;
};

export async function fetchWhitelistedTokens(
  chainId: number,
  signal?: AbortSignal,
): Promise<WhitelistedTokensEnvelope> {
  const res = await fetch(apiUrl(`/api/v1/tokens/whitelisted?chainId=${chainId}`), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Whitelisted tokens request failed: ${res.status} ${text}`.trim());
  }
  return (await res.json()) as WhitelistedTokensEnvelope;
}
