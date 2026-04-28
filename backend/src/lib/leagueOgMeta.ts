import type { League } from "@prisma/client";
import { getAddress } from "viem";

const OG_MARKER = "<!--worldcup2-ssr-og-->";

/** Max grapheme-ish units for Open Graph / Twitter card fields (after truncation, before HTML escape). */
export const OG_TITLE_MAX_LEN = 70;
export const OG_DESCRIPTION_MAX_LEN = 200;

function truncateOgField(s: string, maxLen: number): string {
  const chars = [...s];
  if (chars.length <= maxLen) return s;
  if (maxLen < 2) return chars.slice(0, maxLen).join("");
  return `${chars.slice(0, maxLen - 1).join("")}\u2026`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chainLabel(chainId: number): string {
  const map: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    84532: "Base Sepolia",
    146: "Sonic",
    11155111: "Sepolia",
  };
  return map[chainId] ?? `Chain ${chainId}`;
}

/** Human-readable token amount from wei + decimals (trim trailing zeros in fractional part). */
export function formatTokenWeiHuman(wei: bigint, decimals: number, symbol: string): string {
  if (decimals < 0 || decimals > 36) return `${wei.toString()} ${symbol}`;
  const base = 10n ** BigInt(decimals);
  const whole = wei / base;
  const frac = wei % base;
  if (frac === 0n) return `${whole.toString()} ${symbol}`;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  if (fracStr === "") return `${whole.toString()} ${symbol}`;
  return `${whole.toString()}.${fracStr} ${symbol}`;
}

export function buildLeagueOgDescription(row: League): string {
  const entry = formatTokenWeiHuman(row.entryFeeWei, row.entryTokenDecimals, row.entryTokenSymbol);
  const pool = formatTokenWeiHuman(row.poolWei, row.entryTokenDecimals, row.entryTokenSymbol);
  const chain = chainLabel(row.chainId);
  return `Entry ${entry} · Pool ${pool} · ${chain}`;
}

export function buildOgMetaSnippet(input: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  siteName?: string;
}): string {
  const site = input.siteName ?? "WorldCup2";
  const title = escapeHtml(truncateOgField(input.title, OG_TITLE_MAX_LEN));
  const description = escapeHtml(truncateOgField(input.description, OG_DESCRIPTION_MAX_LEN));
  const url = escapeHtml(input.canonicalUrl);
  const image = escapeHtml(input.imageUrl);
  const siteEsc = escapeHtml(site);
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${siteEsc}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

export function injectOgIntoIndexHtml(html: string, ogSnippet: string): string {
  if (html.includes(OG_MARKER)) {
    return html.replace(OG_MARKER, ogSnippet);
  }
  return html.replace("</head>", `    ${ogSnippet}\n  </head>`);
}

export function checksummedLeaguePathAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  try {
    return getAddress(trimmed);
  } catch {
    return null;
  }
}

export { OG_MARKER };
