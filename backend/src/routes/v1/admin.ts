import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { SESSION_COOKIE_NAME } from "./auth.js";
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
};
