import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { analyzeBytecodeHex } from "../../lib/tokenBytecodeSurface.js";
import { SESSION_COOKIE_NAME } from "./auth.js";
import { LEAGUE_CREATION_CHAIN_IDS } from "./tokens.js";
import { type Address, createPublicClient, getAddress, http } from "viem";
import { oracleControllerAbi } from "../../lib/oracleControllerAbi.js";

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

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeQuery(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const q: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    q[k] = Array.isArray(v) ? v[0] : v;
  }
  return q;
}

const adminTokenSurfaceQuerySchema = z.object({
  chainId: z.coerce
    .number()
    .int()
    .positive()
    .refine((n) => (LEAGUE_CREATION_CHAIN_IDS as readonly number[]).includes(n), {
      message: `chainId must be one of: ${LEAGUE_CREATION_CHAIN_IDS.join(", ")}`,
    }),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid token address"),
});

/** Story 2.3 — minimal admin-gated endpoint to enforce server-side `isAdmin`. */
export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/admin/health", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    if (!session.isAdmin) {
      return sendError(
        reply,
        403,
        "FORBIDDEN",
        "You do not have admin access for the network your session is bound to.",
      );
    }
    return sendSuccess(reply, { ok: true });
  });

  /** Story 5.3 — admin helper for dev/staging: return standings payload from env. */
  fastify.get("/admin/oracle/staging-groups", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have admin access for the network your session is bound to.");
    }
    const raw = process.env.ORACLE_STAGING_GROUPS_JSON ?? "";
    if (!raw.trim()) {
      return sendError(reply, 404, "NOT_FOUND", "No staging groups configured.");
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return sendSuccess(reply, { groups: parsed });
    } catch {
      return sendError(reply, 500, "BAD_STAGING_GROUPS_JSON", "ORACLE_STAGING_GROUPS_JSON is not valid JSON.");
    }
  });

  /** Story 5.6 — per-chain oracle health (expected deadlines + posted status + last successful post). */
  fastify.get("/admin/oracle/health", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have admin access for the network your session is bound to.");
    }

    const chainIds = parseCsvInts(process.env.ORACLE_CHAIN_IDS ?? "");
    if (chainIds.length === 0) return sendSuccess(reply, { chains: [] as unknown[] });

    const nowIso = new Date().toISOString();
    const chains = await Promise.all(
      chainIds.map(async (chainId) => {
        try {
          const controller = getAddress(mustGetEnv(`ORACLE_CONTROLLER_${chainId}`)) as Address;
          const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
          const publicClient = createPublicClient({ transport: http(rpcUrl) });

          const groups = await Promise.all(
            Array.from({ length: 12 }).map(async (_, groupId) => {
              let expectedDeadline: string | null = null;
              let posted: boolean | null = null;
              try {
                const d = await publicClient.readContract({
                  address: controller,
                  abi: oracleControllerAbi,
                  functionName: "expectedDeadline",
                  args: [groupId],
                });
                expectedDeadline = d.toString();
                posted = await publicClient.readContract({
                  address: controller,
                  abi: oracleControllerAbi,
                  functionName: "hasResultsPosted",
                  args: [groupId],
                });
              } catch {
                // keep nulls
              }

              const last = await prisma.oraclePost.findFirst({
                where: { chainId, groupId, success: true },
                orderBy: { postedAt: "desc" },
                select: { postedAt: true, source: true, txHash: true },
              });

              return {
                groupId,
                expectedDeadline,
                posted,
                lastPostedAt: last?.postedAt.toISOString() ?? null,
                lastSource: last?.source ?? null,
                lastTxHash: last?.txHash ?? null,
              };
            }),
          );

          const lastOverall = groups
            .filter((g) => g.lastPostedAt)
            .sort((a, b) => String(b.lastPostedAt).localeCompare(String(a.lastPostedAt)))[0];

          return {
            chainId,
            controller,
            asOf: nowIso,
            lastPostedGroupId: lastOverall?.groupId ?? null,
            lastPostedAt: lastOverall?.lastPostedAt ?? null,
            groups,
            error: null as string | null,
          };
        } catch (e) {
          return {
            chainId,
            controller: null,
            asOf: nowIso,
            lastPostedGroupId: null,
            lastPostedAt: null,
            groups: [] as unknown[],
            error: (e as Error | null | undefined)?.message ?? "Health check failed.",
          };
        }
      }),
    );

    return sendSuccess(reply, { chains });
  });

  /** Story 10.2 — toggle featured flag on a league row by chain + contract address. */
  fastify.patch("/admin/leagues/featured", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have admin access.");
    }

    const bodySchema = z.object({
      chainId: z.number().int().positive(),
      leagueAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid league address"),
      featured: z.boolean(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;

    const { chainId, leagueAddress, featured } = parsed.data;

    const result = await prisma.league.updateMany({
      where: {
        chainId,
        contractAddress: { equals: leagueAddress, mode: "insensitive" },
      },
      data: { featured },
    });

    if (result.count === 0) {
      return sendError(reply, 404, "NOT_FOUND", "No league found for the given chainId + address.");
    }

    return sendSuccess(reply, { featured, updated: result.count });
  });

  /** Story 10.3 — list league reports for admin review (FR57). */
  fastify.get("/admin/reports", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) return sendError(reply, 403, "FORBIDDEN", "You do not have admin access.");

    const q = normalizeQuery(request.query as Record<string, string | string[] | undefined>);
    const statusFilter = q.status === "all" ? undefined : (q.status ?? "open");

    const reports = await prisma.leagueReport.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with league title (best-effort — null if not indexed).
    const enriched = await Promise.all(
      reports.map(async (r) => {
        const league = await prisma.league.findFirst({
          where: { chainId: r.chainId, contractAddress: { equals: r.leagueAddress, mode: "insensitive" } },
          select: { title: true },
        });
        return {
          id: r.id,
          chainId: r.chainId,
          leagueAddress: r.leagueAddress,
          leagueTitle: league?.title ?? null,
          reporterWallet: r.reporterWallet,
          reason: r.reason,
          description: r.description,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    );

    return sendSuccess(reply, { reports: enriched }, { total: enriched.length });
  });

  /** Story 10.3 — admin actions a report: warn / pause / refund / dismiss (FR57). */
  fastify.patch("/admin/reports/:reportId", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) return sendError(reply, 403, "FORBIDDEN", "You do not have admin access.");

    const reportId = (request.params as Record<string, string>).reportId;
    if (!reportId) return sendError(reply, 400, "INVALID_PARAM", "reportId is required.");

    const bodySchema = z.object({
      action: z.enum(["warn", "pause", "refund", "dismiss"]),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const { action } = parsed.data;

    const report = await prisma.leagueReport.findUnique({ where: { id: reportId } });
    if (!report) return sendError(reply, 404, "NOT_FOUND", "Report not found.");
    if (report.status !== "open") {
      return sendError(reply, 409, "ALREADY_ACTIONED", `Report is already in '${report.status}' status.`);
    }

    const statusMap: Record<string, string> = {
      warn: "warned",
      pause: "paused",
      refund: "refunded",
      dismiss: "dismissed",
    };
    const newStatus = statusMap[action];

    await prisma.leagueReport.update({ where: { id: reportId }, data: { status: newStatus } });

    if (action === "warn") {
      await prisma.league.updateMany({
        where: {
          chainId: report.chainId,
          contractAddress: { equals: report.leagueAddress, mode: "insensitive" },
        },
        data: { warnedAt: new Date() },
      });
    }

    return sendSuccess(reply, { status: newStatus });
  });

  /** Epic 9 — bytecode heuristics for admin whitelist review (FR53). */
  fastify.get("/admin/token-surface-risk", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "You do not have admin access for the network your session is bound to.");
    }

    const parsed = adminTokenSurfaceQuerySchema.safeParse(normalizeQuery(request.query as Record<string, string | string[] | undefined>));
    if (!parsed.success) {
      throw parsed.error;
    }
    const chainId = parsed.data.chainId;
    const token = getAddress(parsed.data.token.toLowerCase());

    let bytecode: `0x${string}` | undefined;
    try {
      const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
      const publicClient = createPublicClient({ transport: http(rpcUrl) });
      bytecode = await publicClient.getBytecode({ address: token as Address });
    } catch (e) {
      return sendError(reply, 502, "RPC_ERROR", (e as Error | null | undefined)?.message ?? "RPC read failed.");
    }

    const bc = bytecode ?? "0x";
    const analyzed = analyzeBytecodeHex(bc);
    return sendSuccess(reply, {
      chainId,
      token,
      ...analyzed,
    });
  });
};
