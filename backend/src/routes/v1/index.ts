import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./health.js";
import { leagueRoutes } from "./leagues.js";

export const registerV1Routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
  await fastify.register(leagueRoutes);
};
