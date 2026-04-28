import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { config } from "./config.js";
import { ZodError } from "zod";
import { AppError } from "./appError.js";
import { prisma } from "./db.js";
import { sendError } from "./lib/envelope.js";
import { leagueOgHtmlPlugin } from "./routes/leagueOgHtml.js";
import { registerV1Routes } from "./routes/v1/index.js";

export async function createApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await fastify.register(cookie);
  await fastify.register(cors, {
    credentials: true,
    origin(origin, cb) {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, config.corsOrigins.includes(origin));
    },
  });
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  fastify.setErrorHandler((err, _request, reply) => {
    if (err instanceof ZodError) {
      const detail = err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return sendError(reply, 422, "VALIDATION_ERROR", detail || "Validation failed");
    }
    if (err instanceof AppError) {
      return sendError(reply, err.statusCode, err.code, err.message);
    }
    fastify.log.error(err);
    return sendError(reply, 500, "INTERNAL_ERROR", "Internal server error");
  });

  await fastify.register(leagueOgHtmlPlugin);
  await fastify.register(registerV1Routes, { prefix: "/api/v1" });

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return fastify;
}
