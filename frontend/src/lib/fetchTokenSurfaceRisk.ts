import { apiUrl } from "@/lib/apiBase";

export type TokenSurfaceRiskData = {
  chainId: number;
  token: string;
  bytecodeLength: number;
  warnings: string[];
  feeOnTransferLikely: boolean;
  rebaseLikely: boolean;
};

export type TokenSurfaceRiskEnvelope = {
  data: TokenSurfaceRiskData;
  meta?: Record<string, unknown>;
};

export async function fetchTokenSurfaceRisk(
  chainId: number,
  token: string,
  signal?: AbortSignal,
): Promise<TokenSurfaceRiskEnvelope> {
  const q = new URLSearchParams({ chainId: String(chainId), token });
  const res = await fetch(apiUrl(`/api/v1/admin/token-surface-risk?${q.toString()}`), {
    credentials: "include",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token surface risk request failed: ${res.status} ${text}`.trim());
  }
  return (await res.json()) as TokenSurfaceRiskEnvelope;
}
