import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sendError, sendSuccess } from "../../lib/envelope.js";

/**
 * Story 4.6: Polymarket odds cache.
 *
 * NOTE: This is intentionally a thin proxy + in-memory cache to avoid browser CORS issues when
 * fetching third-party APIs directly from the SPA. Persistence/indexing comes in later epics.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const querySchema = z.object({
  // World Cup group letter (A-L). When provided, we proxy Polymarket Gamma events for that group.
  group: z.string().optional(),
});

type Cached = {
  fetchedAtMs: number;
  asOfIso: string;
  data: unknown;
};

const cacheByGroup = new Map<string, Cached>();

function gammaUrlForGroupLetter(letter: string): string {
  const g = letter.trim().toLowerCase();
  return `https://gamma-api.polymarket.com/events?slug=fifa-world-cup-group-${g}-winner`;
}

async function fetchPolymarketSnapshot(params: { group?: string | null }): Promise<Cached> {
  // If POLYMARKET_ODDS_URL is provided, we will proxy it (legacy/override).
  // Otherwise, if group is provided, proxy the Polymarket Gamma API for that group.
  const urlOverride = process.env.POLYMARKET_ODDS_URL?.trim();
  const now = Date.now();
  if (urlOverride) {
    const r = await fetch(urlOverride, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`Polymarket fetch failed: ${r.status}`);
    const data = (await r.json()) as unknown;
    return { fetchedAtMs: now, asOfIso: new Date(now).toISOString(), data };
  }

  const group = params.group?.trim().toUpperCase() ?? null;
  if (!group) {
    return { fetchedAtMs: now, asOfIso: new Date(now).toISOString(), data: { markets: [] } };
  }
  if (!/^[A-L]$/.test(group)) {
    throw new Error(`Invalid group "${group}"`);
  }

  const url = gammaUrlForGroupLetter(group);
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Polymarket fetch failed: ${r.status}`);
  const data = (await r.json()) as unknown;
  return { fetchedAtMs: now, asOfIso: new Date(now).toISOString(), data };
}

export const polymarketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/polymarket/odds", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query ?? {});
    if (!parsed.success) throw parsed.error;
    const group = parsed.data.group?.trim().toUpperCase() ?? null;
    const cacheKey = group ?? "__default__";

    const now = Date.now();
    const cache = cacheByGroup.get(cacheKey) ?? null;
    if (cache && now - cache.fetchedAtMs < CACHE_TTL_MS) {
      return sendSuccess(reply, { asOf: cache.asOfIso, ttlSeconds: Math.floor(CACHE_TTL_MS / 1000), data: cache.data });
    }

    try {
      const fresh = await fetchPolymarketSnapshot({ group });
      cacheByGroup.set(cacheKey, fresh);
      return sendSuccess(reply, { asOf: fresh.asOfIso, ttlSeconds: Math.floor(CACHE_TTL_MS / 1000), data: fresh.data });
    } catch (e) {
      // If we have stale cache, serve it and mark stale. Otherwise return error.
      if (cache) {
        return sendSuccess(reply, {
          asOf: cache.asOfIso,
          ttlSeconds: Math.floor(CACHE_TTL_MS / 1000),
          stale: true,
          data: cache.data,
        });
      }
      fastify.log.warn({ err: e }, "polymarket odds fetch failed");
      return sendError(reply, 503, "POLYMARKET_UNAVAILABLE", "Polymarket odds are temporarily unavailable.");
    }
  });
};

