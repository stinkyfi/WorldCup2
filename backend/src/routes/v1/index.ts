import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin.js";
import { authRoutes } from "./auth.js";
import { healthRoutes } from "./health.js";
import { leagueRoutes } from "./leagues.js";
import { statsRoutes } from "./stats.js";
import { tokenRoutes } from "./tokens.js";

export const registerV1Routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(tokenRoutes);
  await fastify.register(leagueRoutes);
};
