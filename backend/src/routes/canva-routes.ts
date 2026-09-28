import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { DatasetValue } from "../modules/canva/canva-client.js";
import { CanvaService } from "../modules/canva/canva-service.js";
import type { StorageService } from "../storage/storage-service.js";
import { apiErrorHandler } from "./error-handler.js";

interface CanvaRoutesOptions {
  canva: CanvaService;
  frontendUrl: string;
  storage: StorageService;
}

interface AutofillBody {
  brandTemplateId: string;
  data: Record<string, DatasetValue>;
  title?: string;
}

interface ExportBody {
  designId: string;
  format: "png" | "jpg" | "pdf" | "mp4";
}

const autofillSchema = {
  body: {
    type: "object",
    required: ["brandTemplateId", "data"],
    properties: {
      brandTemplateId: { type: "string" },
      title: { type: "string" },
      data: { type: "object", additionalProperties: true },
    },
  },
} as const;

const exportSchema = {
  body: {
    type: "object",
    required: ["designId", "format"],
    properties: {
      designId: { type: "string" },
      format: { type: "string", enum: ["png", "jpg", "pdf", "mp4"] },
    },
  },
} as const;

export const canvaRoutes: FastifyPluginAsync<CanvaRoutesOptions> = async (app, options) => {
  const { canva, frontendUrl, storage } = options;

  app.setErrorHandler(apiErrorHandler);

  app.get("/oauth/authorize", async (_request, reply) => {
    const state = randomBytes(16).toString("hex");
    return reply.redirect(canva.beginAuthorization(state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/oauth/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect(`${frontendUrl}/templates?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return reply.redirect(`${frontendUrl}/templates?error=missing_code_or_state`);
      }

      try {
        await canva.handleCallback(code, state);
        return reply.redirect(`${frontendUrl}/templates?connected=1`);
      } catch (err) {
        request.log.error(err);
        return reply.redirect(`${frontendUrl}/templates?error=oauth_failed`);
      }
    },
  );

  app.get("/canva/status", async () => ({
    configured: canva.isConfigured(),
    authenticated: canva.isAuthenticated(),
  }));

  app.get("/canva/templates", async () => {
    const items = await canva.listBrandTemplates();
    return { items };
  });

  app.get<{ Params: { id: string } }>("/canva/templates/:id", async (request) => {
    return canva.getBrandTemplate(request.params.id);
  });

  app.get<{ Params: { id: string } }>("/canva/templates/:id/dataset", async (request) => {
    return canva.getBrandTemplateDataset(request.params.id);
  });

  app.post<{ Body: AutofillBody }>("/canva/autofill", { schema: autofillSchema }, async (request) => {
    return canva.createAutofillJob(request.body);
  });

  app.get<{ Params: { jobId: string } }>("/canva/autofill/:jobId", async (request) => {
    return canva.getAutofillJob(request.params.jobId);
  });

  app.post<{ Body: ExportBody }>("/canva/exports", { schema: exportSchema }, async (request) => {
    return canva.createExportJob(request.body.designId, request.body.format);
  });

  app.get<{ Params: { jobId: string } }>("/canva/exports/:jobId", async (request) => {
    return canva.getExportJob(request.params.jobId);
  });

  app.post<{ Params: { jobId: string }; Body?: { key?: string } }>(
    "/canva/exports/:jobId/store",
    async (request, reply) => {
      const job = await canva.getExportJob(request.params.jobId);

      if (job.job.status !== "success" || !job.job.urls?.length) {
        return reply.status(409).send({ error: "Export is not ready for download." });
      }

      const downloadUrl = job.job.urls[0];
      const download = await fetch(downloadUrl);

      if (!download.ok) {
        return reply.status(502).send({ error: `Export download failed (${download.status}).` });
      }

      const bytes = new Uint8Array(await download.arrayBuffer());
      const key = request.body?.key ?? `exports/${request.params.jobId}`;
      const stored = await storage.write(key, bytes);

      return stored;
    },
  );
};
