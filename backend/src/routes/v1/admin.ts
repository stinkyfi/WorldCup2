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
};
