import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

const prizeQuerySchema = z.object({
  chainId: z.string().regex(/^\d+$/),
  leagueAddress: addressSchema,
  walletAddress: addressSchema,
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

const BYTES32_HEX = /^0x[a-fA-F0-9]{64}$/i;

function isValidProofJson(value: unknown): value is `0x${string}`[] {
  if (!Array.isArray(value)) return false;
  return value.every((x) => typeof x === "string" && BYTES32_HEX.test(x));
}

/** Story 8.2 — public read of stored prize Merkle leaf + proof (claim still requires wallet tx). */
export const merkleClaimRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/merkle-claim/prize", async (request, reply) => {
    const parsed = prizeQuerySchema.safeParse(normalizeQuery(request.query as Record<string, string | string[] | undefined>));
    if (!parsed.success) throw parsed.error;

    const chainId = Number(parsed.data.chainId);
    const leagueAddress = parsed.data.leagueAddress.toLowerCase();
    const walletAddress = parsed.data.walletAddress.toLowerCase();

    const league = await prisma.league.findFirst({
      where: { chainId, contractAddress: { equals: leagueAddress, mode: "insensitive" } },
      select: {
        title: true,
        entryTokenSymbol: true,
        entryTokenDecimals: true,
      },
    });
    if (!league) {
      return sendError(reply, 404, "NOT_FOUND", "League not found");
    }

    const row = await prisma.merkleClaim.findUnique({
      where: {
        chainId_leagueAddress_claimantAddress_claimType: {
          chainId,
          leagueAddress,
          claimantAddress: walletAddress,
          claimType: 0,
        },
      },
    });

    if (!row) {
      return sendSuccess(reply, {
        eligible: false as const,
        reason: "NO_PRIZE_LEAF" as const,
      });
    }

    if (!isValidProofJson(row.proofJson)) {
      return sendError(reply, 500, "INTERNAL_ERROR", "Invalid stored Merkle proof");
    }

    return sendSuccess(reply, {
      eligible: true as const,
      amountWei: row.amountWei.toString(),
      proof: row.proofJson,
      merkleRootHex: row.merkleRootHex,
      leafHex: row.leafHex,
      entryTokenSymbol: league.entryTokenSymbol,
      entryTokenDecimals: league.entryTokenDecimals,
      leagueTitle: league.title,
    });
  });
};
