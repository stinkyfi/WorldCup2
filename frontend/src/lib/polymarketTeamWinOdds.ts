import type { PolymarketOddsResponse } from "@/lib/polymarketOdds";
import { WORLD_CUP_GROUPS } from "@/lib/worldCupGroups";

function normalizeLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Canonicalize Polymarket outcome labels -> our team names.
// This is intentionally conservative and can be extended as we see real payloads.
const TEAM_NAME_ALIASES: Record<string, string> = {
  // Common naming differences
  "united states": "USA",
  usa: "USA",
  "united states of america": "USA",

  turkey: "Türkiye",
  turkiye: "Türkiye",

  curacao: "Curaçao",

  "ivory coast": "Côte d'Ivoire",
  "cote d ivoire": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",

  iran: "IR Iran",
  "iran islamic republic": "IR Iran",
  "iran (ir)": "IR Iran",

  "new zealand": "New Zealand",

  "bosnia and herzegovina": "Bosnia-Herzegovina",

  "south korea": "Korea Republic",
  "korea republic": "Korea Republic",
  "republic of korea": "Korea Republic",

  "cape verde": "Cabo Verde",
  "cabo verde": "Cabo Verde",

  drc: "Congo DR",
  "dr congo": "Congo DR",
  "congo dr": "Congo DR",
  "democratic republic of the congo": "Congo DR",

  england: "England",
  scotland: "Scotland",
};

const CANONICAL_TEAM_NAME_BY_NORMALIZED = new Map<string, string>(
  WORLD_CUP_GROUPS.flatMap((g) => g.teams.map((t) => [normalizeLabel(t.name), t.name] as const)),
);

function canonicalizeTeamName(label: string): string {
  const n = normalizeLabel(label);
  return TEAM_NAME_ALIASES[n] ?? CANONICAL_TEAM_NAME_BY_NORMALIZED.get(n) ?? label.trim();
}

function coerceProbToPercent(p: unknown): number | null {
  if (typeof p === "number" && Number.isFinite(p)) {
    // accept 0..1 or 0..100
    if (p >= 0 && p <= 1) return p * 100;
    if (p >= 0 && p <= 100) return p;
  }
  if (typeof p === "string") {
    const s = p.trim();
    if (!s) return null;
    const asNum = Number(s.endsWith("%") ? s.slice(0, -1) : s);
    if (!Number.isFinite(asNum)) return null;
    if (s.endsWith("%")) return asNum;
    if (asNum >= 0 && asNum <= 1) return asNum * 100;
    if (asNum >= 0 && asNum <= 100) return asNum;
  }
  return null;
}

/**
 * Attempt to extract winner odds from the proxied Polymarket payload.
 *
 * Supported shapes (best-effort):
 * - { markets: [{ outcomes: [{ name, probability|probabilityPercent|p|price }, ...] }, ...] }
 * - { markets: [{ outcomes: ["USA", "Brazil"], outcomePrices: ["0.12", "0.08"] }] } (common Polymarket API style)
 * - { data: { markets: ... } } etc.
 */
export function extractPolymarketWinOddsByTeamName(
  res: PolymarketOddsResponse,
): { asOf: string; stale: boolean; percentByTeamName: Map<string, number> } {
  const asOf = res.data.asOf;
  const stale = Boolean(res.data.stale);
  const raw = res.data.data as any;

  const markets: any[] = [];
  const pushMarkets = (xs: any[]) => {
    for (const x of xs) markets.push(x);
  };

  // Polymarket Gamma "events" API: returns array of events, each with `markets: [...]`.
  if (Array.isArray(raw)) {
    for (const ev of raw) {
      if (Array.isArray(ev?.markets)) pushMarkets(ev.markets);
    }
    // If the array already looks like markets, we will also process the array itself below.
    pushMarkets(raw);
  } else if (Array.isArray(raw?.markets)) {
    pushMarkets(raw.markets);
  } else if (Array.isArray(raw?.data?.markets)) {
    pushMarkets(raw.data.markets);
  }

  const out = new Map<string, number>();

  for (const m of markets) {
    // Gamma group-winner markets: use groupItemTitle + outcomePrices[0] ("Yes") as probability.
    if (typeof m?.groupItemTitle === "string" && typeof m?.outcomePrices === "string") {
      try {
        const prices = JSON.parse(m.outcomePrices) as unknown;
        if (Array.isArray(prices) && prices.length >= 1) {
          const pct = coerceProbToPercent(prices[0]);
          if (pct !== null) out.set(canonicalizeTeamName(m.groupItemTitle), pct);
        }
      } catch {
        /* ignore */
      }
      continue;
    }

    // shape: outcomes: [{ name, ... }]
    if (Array.isArray(m?.outcomes) && m.outcomes.length && typeof m.outcomes[0] === "object") {
      for (const o of m.outcomes) {
        const name = typeof o?.name === "string" ? o.name : typeof o?.title === "string" ? o.title : null;
        if (!name) continue;
        const pct =
          coerceProbToPercent(o?.probability) ??
          coerceProbToPercent(o?.probabilityPercent) ??
          coerceProbToPercent(o?.p) ??
          coerceProbToPercent(o?.price);
        if (pct === null) continue;
        out.set(canonicalizeTeamName(name), pct);
      }
      continue;
    }

    // shape: outcomes: string[], outcomePrices: string[]
    if (Array.isArray(m?.outcomes) && m.outcomes.length && typeof m.outcomes[0] === "string") {
      const names = m.outcomes as string[];
      const prices = (Array.isArray(m?.outcomePrices) ? m.outcomePrices : Array.isArray(m?.prices) ? m.prices : null) as
        | unknown[]
        | null;
      if (!prices || prices.length !== names.length) continue;
      for (let i = 0; i < names.length; i++) {
        const pct = coerceProbToPercent(prices[i]);
        if (pct === null) continue;
        out.set(canonicalizeTeamName(names[i]!), pct);
      }
    }
  }

  return { asOf, stale, percentByTeamName: out };
}

export function formatPolymarketPercent(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

