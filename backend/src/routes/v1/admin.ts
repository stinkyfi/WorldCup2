import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { SESSION_COOKIE_NAME } from "./auth.js";

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
};
