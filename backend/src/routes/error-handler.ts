import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  NotAuthenticatedError,
  NotConfiguredError,
} from "../modules/canva/canva-service.js";

export function apiErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof NotConfiguredError) {
    reply.status(400).send({ error: error.message });
    return;
  }

  if (error instanceof NotAuthenticatedError) {
    reply.status(401).send({ error: error.message });
    return;
  }

  // Fastify validation and other client errors carry a 4xx statusCode.
  if (error.validation || (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)) {
    reply.status(error.statusCode ?? 400).send({ error: error.message });
    return;
  }

  request.log.error(error);
  reply.status(500).send({ error: "Internal server error." });
}
