import type { FastifyPluginAsync } from "fastify";
import type { League } from "@prisma/client";
import { z } from "zod";
import { sendSuccess } from "../../lib/envelope.js";
import { prisma } from "../../db.js";
import {
  buildLeagueBrowseWhere,
  partitionBrowseRows,
  toBrowseLeaguePublic,
  type BrowseSortKey,
} from "../../lib/leagueBrowse.js";

const createLeagueBody = z.object({
  chainId: z.number().int().positive(),
  title: z.string().min(1).max(2000),
});

const browseQuerySchema = z
  .object({
    chainId: z.string().optional(),
    entryToken: z.string().max(200).optional(),
    minFeeWei: z.string().optional(),
    maxFeeWei: z.string().optional(),
    sort: z.enum(["createdAt", "poolWei", "entryCount"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .superRefine((o, ctx) => {
    for (const key of ["minFeeWei", "maxFeeWei"] as const) {
      const v = o[key];
      if (v !== undefined && v.trim() !== "" && !/^\d+$/.test(v)) {
        ctx.addIssue({ code: "custom", path: [key], message: "Must be decimal digits only" });
      }
    }
  })
  .transform((o) => {
    let chainId: number | undefined;
    if (o.chainId !== undefined && o.chainId.trim() !== "") {
      const n = Number(o.chainId);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
        chainId = undefined;
      } else {
        chainId = n;
      }
    }
    const entryToken = o.entryToken?.trim() === "" ? undefined : o.entryToken?.trim();
    const minFeeWei =
      o.minFeeWei !== undefined && o.minFeeWei.trim() !== "" ? BigInt(o.minFeeWei.trim()) : undefined;
    const maxFeeWei =
      o.maxFeeWei !== undefined && o.maxFeeWei.trim() !== "" ? BigInt(o.maxFeeWei.trim()) : undefined;
    const sort = (o.sort ?? "createdAt") as BrowseSortKey;
    const order = o.order ?? "desc";
    return { chainId, entryToken, minFeeWei, maxFeeWei, sort, order };
  });

function normalizeQuery(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const q: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    q[k] = Array.isArray(v) ? v[0] : v;
  }
  return q;
}

function serializeLeagueRow(l: League) {
  return toBrowseLeaguePublic(l);
}

/**
 * POST /api/v1/leagues — all string fields validated with Zod; Prisma uses
 * parameterized queries only (no string-concat SQL), satisfying NFR7/NFR8.
 */
export const leagueRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/leagues/browse", async (request, reply) => {
    const parsed = browseQuerySchema.safeParse(
      normalizeQuery(request.query as Record<string, string | string[] | undefined>),
    );
    if (!parsed.success) {
      throw parsed.error;
    }
    const { chainId, entryToken, minFeeWei, maxFeeWei, sort, order } = parsed.data;
    const where = buildLeagueBrowseWhere({ chainId, entryToken, minFeeWei, maxFeeWei });
    const rows = await prisma.league.findMany({ where });
    const { featured, leagues } = partitionBrowseRows(rows, sort, order);
    return sendSuccess(
      reply,
      {
        featured: featured.map(serializeLeagueRow),
        leagues: leagues.map(serializeLeagueRow),
      },
      { total: rows.length, featuredCount: featured.length },
    );
  });

  fastify.get("/leagues", async (_request, reply) => {
    const rows = await prisma.league.findMany({ orderBy: { createdAt: "desc" } });
    return sendSuccess(reply, { leagues: rows.map(serializeLeagueRow) }, { total: rows.length });
  });

  fastify.post("/leagues", async (request, reply) => {
    const parsed = createLeagueBody.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const { chainId, title } = parsed.data;
    const league = await prisma.league.create({
      data: {
        chainId,
        title,
        lockAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return sendSuccess(reply, { league: serializeLeagueRow(league) }, {}, 201);
  });
};
