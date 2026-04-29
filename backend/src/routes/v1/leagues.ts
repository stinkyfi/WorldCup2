import type { FastifyPluginAsync } from "fastify";
import type { League } from "@prisma/client";
import { z } from "zod";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { prisma } from "../../db.js";
import {
  buildLeagueBrowseWhere,
  partitionBrowseRows,
  toBrowseLeaguePublic,
  isSpotlightLeague,
  type BrowseSortKey,
} from "../../lib/leagueBrowse.js";
import { computeFeeBreakdown } from "../../lib/leagueFees.js";
import { SESSION_COOKIE_NAME } from "./auth.js";

const addressParamSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

const createLeagueBody = z.object({
  chainId: z.number().int().positive(),
  title: z.string().min(1).max(2000),
});

const browseQuerySchema = z
  .object({
    chainId: z.string().optional(),
    entryToken: z.string().max(200).optional(),
    sort: z.enum(["createdAt", "poolWei", "entryCount"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
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
    const sort = (o.sort ?? "createdAt") as BrowseSortKey;
    const order = o.order ?? "desc";
    return { chainId, entryToken, sort, order };
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

async function sessionFromRequest(request: { cookies: Record<string, string | undefined> }) {
  const sid = request.cookies[SESSION_COOKIE_NAME];
  if (!sid) return null;
  const session = await prisma.authSession.findUnique({ where: { id: sid } });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.authSession.delete({ where: { id: sid } }).catch(() => undefined);
    }
    return null;
  }
  return session;
}

/**
 * POST /api/v1/leagues — all string fields validated with Zod; Prisma uses
 * parameterized queries only (no string-concat SQL), satisfying NFR7/NFR8.
 */
export const leagueRoutes: FastifyPluginAsync = async (fastify) => {
  // Temporary escape hatch: on some Windows dev setups Prisma client generation can fail due to
  // locked engine DLL files. We keep runtime behavior but avoid TS compile failures when the
  // generated client types are stale.
  const prismaCompat = prisma as unknown as typeof prisma & {
    complianceAcknowledgement: {
      findUnique: (args: unknown) => Promise<{ acknowledgedAt: Date } | null>;
      upsert: (args: unknown) => Promise<{ acknowledgedAt: Date }>;
    };
  };

  fastify.get("/leagues/by-address/:address", async (request, reply) => {
    const parsed = addressParamSchema.safeParse((request.params as { address?: unknown })?.address);
    if (!parsed.success) {
      throw parsed.error;
    }
    const address = parsed.data;
    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: address, mode: "insensitive" } },
    });
    if (!row) {
      return reply.status(404).send({ error: "League not found", code: "NOT_FOUND" });
    }

    const feeBreakdown = computeFeeBreakdown({
      entryFeeWei: row.entryFeeWei,
      creatorFeeBps: row.creatorFeeBps,
      devFeeBps: row.devFeeBps,
    });

    return sendSuccess(reply, {
      league: {
        ...toBrowseLeaguePublic(row),
        creatorAddress: row.creatorAddress,
        creatorDescription: row.creatorDescription,
        revisionPolicy: row.revisionPolicy,
        entryTokenDecimals: row.entryTokenDecimals,
        isFeatured: isSpotlightLeague(row),
        feeBreakdown,
      },
    });
  });

  /** Story 4.1 — compliance ack is stored once per wallet per league. */
  fastify.get("/leagues/by-address/:address/compliance", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    const parsed = addressParamSchema.safeParse((request.params as { address?: unknown })?.address);
    if (!parsed.success) {
      throw parsed.error;
    }
    const address = parsed.data;
    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: address, mode: "insensitive" } },
    });
    if (!row) {
      return reply.status(404).send({ error: "League not found", code: "NOT_FOUND" });
    }
    const ack = await prismaCompat.complianceAcknowledgement.findUnique({
      where: { leagueId_walletAddress: { leagueId: row.id, walletAddress: session.address } },
    });
    return sendSuccess(reply, { acknowledged: Boolean(ack), acknowledgedAt: ack?.acknowledgedAt.toISOString() ?? null });
  });

  fastify.post("/leagues/by-address/:address/compliance", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    const parsed = addressParamSchema.safeParse((request.params as { address?: unknown })?.address);
    if (!parsed.success) {
      throw parsed.error;
    }
    const address = parsed.data;
    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: address, mode: "insensitive" } },
    });
    if (!row) {
      return reply.status(404).send({ error: "League not found", code: "NOT_FOUND" });
    }

    const ack = await prismaCompat.complianceAcknowledgement.upsert({
      where: { leagueId_walletAddress: { leagueId: row.id, walletAddress: session.address } },
      create: { leagueId: row.id, walletAddress: session.address },
      update: {},
    });

    return sendSuccess(reply, { acknowledged: true, acknowledgedAt: ack.acknowledgedAt.toISOString() });
  });

  /** Story 3.4 — creator-only view backing the creator dashboard page. */
  fastify.get("/leagues/by-address/:address/creator", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    const parsed = addressParamSchema.safeParse((request.params as { address?: unknown })?.address);
    if (!parsed.success) {
      throw parsed.error;
    }
    const address = parsed.data;
    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: address, mode: "insensitive" } },
    });
    if (!row) {
      return reply.status(404).send({ error: "League not found", code: "NOT_FOUND" });
    }
    if (!row.creatorAddress || row.creatorAddress.toLowerCase() !== session.address.toLowerCase()) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have access to this league's creator dashboard.");
    }

    return sendSuccess(reply, {
      league: {
        ...toBrowseLeaguePublic(row),
        creatorAddress: row.creatorAddress,
        creatorDescription: row.creatorDescription,
        revisionPolicy: row.revisionPolicy,
        entryTokenDecimals: row.entryTokenDecimals,
        isFeatured: isSpotlightLeague(row),
      },
    });
  });

  /** Story 6.5 — creator-only: reveal all entry predictions after lock time. */
  fastify.get("/leagues/by-address/:address/predictions", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");

    const parsed = addressParamSchema.safeParse((request.params as { address?: unknown })?.address);
    if (!parsed.success) throw parsed.error;
    const address = parsed.data;

    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: address, mode: "insensitive" } },
    });
    if (!row) return reply.status(404).send({ error: "League not found", code: "NOT_FOUND" });

    if (!row.creatorAddress || row.creatorAddress.toLowerCase() !== session.address.toLowerCase()) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have access to this league's predictions.");
    }

    const now = new Date();
    if (row.lockAt > now) {
      return sendSuccess(reply, { locked: false, lockAt: row.lockAt.toISOString(), entries: [] as unknown[] });
    }

    const entries = await prisma.entry.findMany({
      where: { chainId: row.chainId, leagueAddress: address.toLowerCase() },
      orderBy: [{ createdAt: "asc" }],
      select: { walletAddress: true, entryIndex: true, entryId: true, groups: true, tiebreakerTotalGoals: true, createdAt: true },
    });

    return sendSuccess(reply, {
      locked: true,
      lockAt: row.lockAt.toISOString(),
      entries: entries.map((e) => ({
        walletAddress: e.walletAddress,
        entryIndex: e.entryIndex,
        entryId: e.entryId,
        groups: e.groups,
        tiebreakerTotalGoals: e.tiebreakerTotalGoals,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  });

  fastify.get("/leagues/browse", async (request, reply) => {
    const parsed = browseQuerySchema.safeParse(
      normalizeQuery(request.query as Record<string, string | string[] | undefined>),
    );
    if (!parsed.success) {
      throw parsed.error;
    }
    const { chainId, entryToken, sort, order } = parsed.data;
    const where = buildLeagueBrowseWhere({ chainId, entryToken });
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
