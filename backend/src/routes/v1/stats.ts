import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../db.js";
import { sendSuccess } from "../../lib/envelope.js";

/**
 * GET /api/v1/stats — FR61 platform stats (TVL, active leagues, player count).
 *
 * TVL / player count: returned from Postgres aggregates; until the indexer
 * persists entry flows, `totalValueLockedWei` is `"0"` and `totalPlayerCount` is `0`.
 * `activeLeagues` is the count of indexed `leagues` rows (proxy for “on-platform leagues”).
 */
export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/stats", async (_request, reply) => {
    const activeLeagues = await prisma.league.count();
    const totalPlayerCount = 0;
    const totalValueLockedWei = "0";

    return sendSuccess(
      reply,
      {
        totalValueLockedWei,
        activeLeagues,
        totalPlayerCount,
      },
      { lastUpdatedAt: new Date().toISOString() },
    );
  });
};
