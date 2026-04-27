import type { FastifyReply } from "fastify";

/** Success envelope — architecture NFR */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  meta: Record<string, unknown> = {},
  statusCode = 200,
): FastifyReply {
  return reply.status(statusCode).send({ data, meta });
}

/** Error envelope — architecture NFR */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  error: string,
): FastifyReply {
  return reply.status(statusCode).send({ error, code });
}
