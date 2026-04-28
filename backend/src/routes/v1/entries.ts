import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { computePredictionCommitment, type PredictionPayloadV2 } from "../../lib/predictionCommitment.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");
const groupRankingsSchema = z.array(z.string()).length(4);

const createEntryBody = z.object({
  chainId: z.number().int().positive(),
  leagueAddress: addressSchema,
  walletAddress: addressSchema,
  entryIndex: z.number().int().min(0),
  entryId: z.string().min(1).max(200),
  groups: z.record(groupRankingsSchema.transform((x) => [x[0], x[1], x[2], x[3]] as [string, string, string, string])),
  tiebreakerTotalGoals: z.number().int().min(1).max(1000),
  commitment: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid commitment hash"),
});

/** Story 6.1 — store entry prediction preimage for scoring. */
export const entryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/entries", async (request, reply) => {
    const parsed = createEntryBody.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const b = parsed.data;

    const payload: PredictionPayloadV2 = {
      version: 2,
      leagueAddress: b.leagueAddress as `0x${string}`,
      entryId: b.entryId,
      walletAddress: b.walletAddress as `0x${string}`,
      groups: b.groups,
      tiebreakerTotalGoals: b.tiebreakerTotalGoals,
    };

    const expected = computePredictionCommitment(payload);
    if (expected.toLowerCase() !== b.commitment.toLowerCase()) {
      return sendError(reply, 422, "BAD_COMMITMENT", "Commitment hash does not match payload.");
    }

    const row = await prisma.entry.upsert({
      where: {
        chainId_leagueAddress_walletAddress_entryIndex: {
          chainId: b.chainId,
          leagueAddress: b.leagueAddress.toLowerCase(),
          walletAddress: b.walletAddress.toLowerCase(),
          entryIndex: b.entryIndex,
        },
      },
      create: {
        chainId: b.chainId,
        leagueAddress: b.leagueAddress.toLowerCase(),
        walletAddress: b.walletAddress.toLowerCase(),
        entryIndex: b.entryIndex,
        entryId: b.entryId,
        commitment: b.commitment.toLowerCase(),
        groups: b.groups as unknown,
        tiebreakerTotalGoals: b.tiebreakerTotalGoals,
      },
      update: {
        entryId: b.entryId,
        commitment: b.commitment.toLowerCase(),
        groups: b.groups as unknown,
        tiebreakerTotalGoals: b.tiebreakerTotalGoals,
      },
      select: { id: true },
    });

    return sendSuccess(reply, { id: row.id });
  });

  fastify.get("/entries/by-league", async (request, reply) => {
    const q = z
      .object({
        chainId: z.string().regex(/^\\d+$/),
        leagueAddress: addressSchema,
      })
      .safeParse(request.query);
    if (!q.success) throw q.error;
    const chainId = Number(q.data.chainId);
    const leagueAddress = q.data.leagueAddress.toLowerCase();

    const rows = await prisma.entry.findMany({
      where: { chainId, leagueAddress },
      orderBy: [{ walletAddress: "asc" }, { entryIndex: "asc" }],
    });

    return sendSuccess(reply, { entries: rows });
  });
};

