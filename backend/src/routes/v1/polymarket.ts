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
  // Placeholder for future: specific market ids, etc.
  group: z.string().optional(),
});

type Cached = {
  fetchedAtMs: number;
  asOfIso: string;
  data: unknown;
};

let cache: Cached | null = null;

async function fetchPolymarketSnapshot(): Promise<Cached> {
  // Default: return empty payload so the widget can hide gracefully until real market mapping is wired.
  // If POLYMARKET_ODDS_URL is provided, we will proxy it and cache the raw JSON.
  const url = process.env.POLYMARKET_ODDS_URL?.trim();
  const now = Date.now();
  if (!url) {
    return { fetchedAtMs: now, asOfIso: new Date(now).toISOString(), data: { markets: [] } };
  }

  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) {
    throw new Error(`Polymarket fetch failed: ${r.status}`);
  }
  const data = (await r.json()) as unknown;
  return { fetchedAtMs: now, asOfIso: new Date(now).toISOString(), data };
}

export const polymarketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/polymarket/odds", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query ?? {});
    if (!parsed.success) throw parsed.error;

    const now = Date.now();
    if (cache && now - cache.fetchedAtMs < CACHE_TTL_MS) {
      return sendSuccess(reply, { asOf: cache.asOfIso, ttlSeconds: Math.floor(CACHE_TTL_MS / 1000), data: cache.data });
    }

    try {
      cache = await fetchPolymarketSnapshot();
      return sendSuccess(reply, { asOf: cache.asOfIso, ttlSeconds: Math.floor(CACHE_TTL_MS / 1000), data: cache.data });
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

