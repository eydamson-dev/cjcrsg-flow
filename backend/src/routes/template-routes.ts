import type { FastifyPluginAsync } from "fastify";
import type { TemplateService } from "../modules/templates/template-service.js";
import type { StorageService } from "../storage/storage-service.js";
import { apiErrorHandler } from "./error-handler.js";

interface TemplateRoutesOptions {
  templates: TemplateService;
  storage: StorageService;
}

export const templateRoutes: FastifyPluginAsync<TemplateRoutesOptions> = async (app, options) => {
  const { templates, storage } = options;

  app.setErrorHandler(apiErrorHandler);

  app.post("/templates/sync", async (request) => {
    return templates.sync(request.log);
  });

  app.get("/templates", async () => {
    const items = await templates.list();
    return { items };
  });

  app.get<{ Params: { canvaId: string } }>("/templates/:canvaId", async (request, reply) => {
    const template = await templates.get(request.params.canvaId);

    if (!template) {
      return reply.status(404).send({ error: "Template not found." });
    }

    return template;
  });

  app.get<{ Params: { canvaId: string } }>(
    "/templates/:canvaId/thumbnail",
    async (request, reply) => {
      const template = await templates.get(request.params.canvaId);

      if (!template?.thumbnailKey) {
        return reply.status(404).send({ error: "Thumbnail not found." });
      }

      try {
        const bytes = await storage.read(template.thumbnailKey);
        const contentType = template.thumbnailContentType?.startsWith("image/")
          ? template.thumbnailContentType
          : "image/png";

        return reply
          .header("Content-Type", contentType)
          .header("X-Content-Type-Options", "nosniff")
          .header("Cache-Control", "public, max-age=60")
          .send(Buffer.from(bytes));
      } catch (error) {
        request.log.warn({ error, canvaId: request.params.canvaId }, "Stored thumbnail is missing.");
        return reply.status(404).send({ error: "Thumbnail not found." });
      }
    },
  );
};
