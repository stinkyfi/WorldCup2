import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sendSuccess } from "../../lib/envelope.js";
import { prisma } from "../../db.js";
import { platformMinEntryWeiForDecimals } from "../../lib/platformMinEntryWei.js";

/** Base, Ethereum, Sonic mainnet — league creation targets (Epic 3 / Story 3.1). */
export const LEAGUE_CREATION_CHAIN_IDS = [8453, 1, 146] as const;
export type LeagueCreationChainId = (typeof LEAGUE_CREATION_CHAIN_IDS)[number];

const whitelistedQuerySchema = z.object({
  chainId: z.coerce
    .number()
    .int()
    .positive()
    .refine((n): n is LeagueCreationChainId => (LEAGUE_CREATION_CHAIN_IDS as readonly number[]).includes(n), {
      message: `chainId must be one of: ${LEAGUE_CREATION_CHAIN_IDS.join(", ")}`,
    }),
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

export const tokenRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /tokens/whitelisted?chainId=
   * Indexer-backed list for the create-league wizard (FR12). Tokens are curated in `whitelisted_tokens`;
   * production indexers typically sync from on-chain WhitelistRegistry.
   */
  fastify.get("/tokens/whitelisted", async (request, reply) => {
    const parsed = whitelistedQuerySchema.safeParse(normalizeQuery(request.query as Record<string, string | string[] | undefined>));
    if (!parsed.success) {
      throw parsed.error;
    }
    const { chainId } = parsed.data;

    const rows = await prisma.whitelistedToken.findMany({
      where: { chainId },
      orderBy: [{ sortOrder: "asc" }, { symbol: "asc" }],
    });

    const tokens = rows.map((r) => {
      const minEntryWei = platformMinEntryWeiForDecimals(r.decimals);
      return {
        address: r.address,
        symbol: r.symbol,
        decimals: r.decimals,
        minEntryWei: minEntryWei.toString(),
      };
    });

    return sendSuccess(reply, {
      chainId,
      tokens,
    });
  });
};
