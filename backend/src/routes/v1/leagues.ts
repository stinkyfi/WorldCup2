import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sendSuccess } from "../../lib/envelope.js";
import { prisma } from "../../db.js";

const createLeagueBody = z.object({
  chainId: z.number().int().positive(),
  title: z.string().min(1).max(2000),
});

/**
 * POST /api/v1/leagues — all string fields validated with Zod; Prisma uses
 * parameterized queries only (no string-concat SQL), satisfying NFR7/NFR8.
 */
export const leagueRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/leagues", async (_request, reply) => {
    const rows = await prisma.league.findMany({ orderBy: { createdAt: "desc" } });
    return sendSuccess(reply, { leagues: rows }, { total: rows.length });
  });

  fastify.post("/leagues", async (request, reply) => {
    const parsed = createLeagueBody.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const { chainId, title } = parsed.data;
    const league = await prisma.league.create({
      data: { chainId, title },
    });
    return sendSuccess(reply, { league }, {}, 201);
  });
};
