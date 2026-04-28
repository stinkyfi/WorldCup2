import type { FastifyPluginAsync } from "fastify";
import { generateNonce, SiweMessage } from "siwe";
import { getAddress } from "viem";
import { z } from "zod";
import { AppError } from "../../appError.js";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";

/** HTTP-only session cookie (opaque DB id). */
export const SESSION_COOKIE_NAME = "wc_session";

const NONCE_TTL_MS = 5 * 60 * 1000;

const nonceBodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const verifyBodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(2),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/auth/nonce", async (request, reply) => {
    const body = nonceBodySchema.parse(request.body);
    let address: `0x${string}`;
    try {
      address = getAddress(body.address);
    } catch {
      throw new AppError("Invalid wallet address", "INVALID_ADDRESS", 422);
    }

    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
    await prisma.authNonce.deleteMany({ where: { address } });
    await prisma.authNonce.create({
      data: { address, nonce, expiresAt },
    });

    return sendSuccess(reply, { nonce });
  });

  fastify.post("/auth/verify", async (request, reply) => {
    const body = verifyBodySchema.parse(request.body);

    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(body.message);
    } catch {
      return sendError(reply, 400, "INVALID_MESSAGE", "Invalid sign-in message.");
    }

    if (!config.siweAllowedDomains.includes(siweMessage.domain)) {
      return sendError(reply, 400, "INVALID_DOMAIN", "Sign-in domain is not allowed.");
    }

    if (!config.siweAllowedChainIds.includes(siweMessage.chainId)) {
      return sendError(reply, 400, "INVALID_CHAIN", "This network is not supported for sign-in.");
    }

    let addr: `0x${string}`;
    try {
      addr = getAddress(siweMessage.address);
    } catch {
      return sendError(reply, 400, "INVALID_ADDRESS", "Invalid wallet address in message.");
    }

    const nonceRow = await prisma.authNonce.findFirst({
      where: {
        nonce: siweMessage.nonce,
        address: addr,
        expiresAt: { gt: new Date() },
      },
    });
    if (!nonceRow) {
      return sendError(
        reply,
        401,
        "INVALID_NONCE",
        "Sign-in expired or was already used. Request a new sign-in from the wallet menu.",
      );
    }

    const result = await siweMessage.verify({ signature: body.signature }, { suppressExceptions: true });
    if (!result.success) {
      return sendError(reply, 401, "INVALID_SIGNATURE", "Could not verify wallet signature.");
    }

    await prisma.authNonce.delete({ where: { id: nonceRow.id } });

    const expiresAt = new Date(Date.now() + config.sessionMaxAgeMs);
    const session = await prisma.authSession.create({
      data: { address: addr, chainId: siweMessage.chainId, expiresAt },
    });

    const maxAgeSec = Math.floor(config.sessionMaxAgeMs / 1000);
    reply.setCookie(SESSION_COOKIE_NAME, session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      maxAge: maxAgeSec,
    });

    return sendSuccess(reply, { address: addr, chainId: siweMessage.chainId });
  });

  fastify.get("/auth/me", async (request, reply) => {
    const sid = request.cookies[SESSION_COOKIE_NAME];
    if (!sid) {
      return sendSuccess(reply, null);
    }

    const session = await prisma.authSession.findUnique({ where: { id: sid } });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.authSession.delete({ where: { id: sid } }).catch(() => undefined);
      }
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return sendSuccess(reply, null);
    }

    return sendSuccess(reply, { address: session.address, chainId: session.chainId });
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const sid = request.cookies[SESSION_COOKIE_NAME];
    if (sid) {
      await prisma.authSession.deleteMany({ where: { id: sid } });
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return sendSuccess(reply, { ok: true });
  });
};
