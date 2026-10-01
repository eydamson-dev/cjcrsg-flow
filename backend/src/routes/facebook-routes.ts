import { randomBytes } from "node:crypto";
import type { FastifyError, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  FacebookNotConfiguredError,
  FacebookOAuthError,
  type FacebookService,
} from "../modules/facebook/facebook-service.js";
import { apiErrorHandler } from "./error-handler.js";

interface FacebookRoutesOptions {
  facebook: FacebookService;
  frontendUrl: string;
}

export const facebookRoutes: FastifyPluginAsync<FacebookRoutesOptions> = async (app, options) => {
  const { facebook, frontendUrl } = options;

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof FacebookNotConfiguredError || error instanceof FacebookOAuthError) {
      return reply.status(400).send({ error: error.message });
    }

    return apiErrorHandler(error, request, reply);
  });

  app.get("/facebook/status", async () => ({
    configured: facebook.isConfigured(),
    connected: await facebook.isConnected(),
  }));

  app.get("/facebook/oauth/authorize", async (_request, reply) => {
    const state = randomBytes(16).toString("hex");
    return reply.redirect(facebook.beginAuthorization(state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/facebook/oauth/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code || !state) {
        return reply.redirect(`${frontendUrl}/content?facebook=error`);
      }

      try {
        await facebook.handleCallback(code, state);
        return reply.redirect(`${frontendUrl}/content?facebook=connected`);
      } catch (cause) {
        request.log.error(cause);
        return reply.redirect(`${frontendUrl}/content?facebook=error`);
      }
    },
  );

  // Connection summaries for the UI — access tokens are never serialized.
  app.get("/facebook/pages", async () => {
    const items = await facebook.listPages();
    return { items };
  });

  app.delete<{ Params: { pageId: string } }>("/facebook/pages/:pageId", async (request, reply) => {
    const removed = await facebook.disconnect(request.params.pageId);

    if (!removed) {
      return reply.status(404).send({ error: "Facebook Page is not connected." });
    }

    return reply.status(204).send();
  });
};
