import type { FastifyPluginAsync } from "fastify";
import { sendSuccess } from "../../lib/envelope.js";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, reply) => {
    return sendSuccess(reply, { status: "ok" }, {});
  });
};
