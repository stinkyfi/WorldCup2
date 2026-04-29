import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin.js";
import { authRoutes } from "./auth.js";
import { healthRoutes } from "./health.js";
import { entryRoutes } from "./entries.js";
import { leaderboardRoutes } from "./leaderboard.js";
import { leagueRoutes } from "./leagues.js";
import { polymarketRoutes } from "./polymarket.js";
import { merkleClaimRoutes } from "./merkleClaim.js";
import { statsRoutes } from "./stats.js";
import { tokenRoutes } from "./tokens.js";

export const registerV1Routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(tokenRoutes);
  await fastify.register(leagueRoutes);
  await fastify.register(entryRoutes);
  await fastify.register(leaderboardRoutes);
  await fastify.register(merkleClaimRoutes);
  await fastify.register(polymarketRoutes);
};
