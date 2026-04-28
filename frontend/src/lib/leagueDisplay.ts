import { formatUnits } from "viem";

const STABLE = new Set(["USDC", "USDT", "DAI"]);

export function entryTokenDecimals(symbol: string): number {
  return STABLE.has(symbol.toUpperCase()) ? 6 : 18;
}

/** Human-readable entry fee / pool using heuristics for stablecoin decimals. */
export function formatTokenWei(wei: string, symbol: string): string {
  const d = entryTokenDecimals(symbol);
  const v = formatUnits(BigInt(wei), d);
  const n = Number(v);
  if (!Number.isFinite(n)) return `${wei} wei`;
  if (n >= 1_000_000) return `${n.toExponential(2)} ${symbol}`;
  if (n >= 1) return `${n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 })} ${symbol}`;
  return `${n.toFixed(4)} ${symbol}`;
}

export function formatTimeToLock(isoLock: string): string {
  const end = new Date(isoLock).getTime();
  const now = Date.now();
  if (end <= now) return "Locked";
  const ms = end - now;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
