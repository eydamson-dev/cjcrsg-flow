import type { FastifyError, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { PublicationRecord } from "../modules/publication/publication-repository.js";
import {
  PublicationConflictError,
  PublicationNotFoundError,
  type PublicationService,
} from "../modules/publication/publication-service.js";
import type { StorageService } from "../storage/storage-service.js";
import { apiErrorHandler } from "./error-handler.js";

interface PublicationRoutesOptions {
  publications: PublicationService;
  storage: StorageService;
}

function serialize(record: PublicationRecord) {
  return {
    id: record.id,
    contentId: record.contentId,
    status: record.status,
    facebookPageId: record.facebookPageId,
    facebookPageName: record.facebookPageName,
    caption: record.caption,
    designId: record.designId,
    mediaKey: record.mediaKey,
    mediaContentType: record.mediaContentType,
    facebookPostId: record.facebookPostId,
    facebookPhotoId: record.facebookPhotoId,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    errorCode: record.errorCode,
    errorSubcode: record.errorSubcode,
    errorMessage: record.errorMessage,
    fbtraceId: record.fbtraceId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const publicationRoutes: FastifyPluginAsync<PublicationRoutesOptions> = async (
  app,
  options,
) => {
  const { publications, storage } = options;

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof PublicationNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }

    if (error instanceof PublicationConflictError) {
      return reply.status(409).send({ error: error.message });
    }

    return apiErrorHandler(error, request, reply);
  });

  // Immediate publish. A recorded failure is a successful API call: the domain
  // outcome is carried in the response body as status "FAILED" (HTTP 201).
  app.post<{ Params: { id: string }; Body: { pageId?: unknown; caption?: unknown } }>(
    "/content/:id/publish",
    async (request, reply) => {
      const pageId = request.body?.pageId;

      if (typeof pageId !== "string" || pageId.trim() === "") {
        return reply.status(400).send({ error: "pageId is required." });
      }

      const caption = request.body?.caption;

      if (caption !== undefined && typeof caption !== "string") {
        return reply.status(400).send({ error: "caption must be a string." });
      }

      const record = await publications.publish(request.params.id, { pageId, caption });
      return reply.status(201).send(serialize(record));
    },
  );

  app.get<{ Params: { id: string } }>("/content/:id/publications", async (request) => {
    const items = await publications.list(request.params.id);
    return { items: items.map(serialize) };
  });

  app.get<{ Params: { id: string } }>("/publications/:id", async (request, reply) => {
    const record = await publications.get(request.params.id);

    if (!record) {
      return reply.status(404).send({ error: "Publication not found." });
    }

    return serialize(record);
  });

  // Serves the exported media for this publication. This resolves the
  // stored-export read route deferred from MVP 1.
  app.get<{ Params: { id: string } }>("/publications/:id/media", async (request, reply) => {
    const record = await publications.get(request.params.id);

    if (!record?.mediaKey) {
      return reply.status(404).send({ error: "Publication media not found." });
    }

    try {
      const bytes = await storage.read(record.mediaKey);
      return reply
        .header("Content-Type", record.mediaContentType ?? "image/png")
        .header("X-Content-Type-Options", "nosniff")
        .header("Cache-Control", "private, max-age=60")
        .send(Buffer.from(bytes));
    } catch {
      return reply.status(404).send({ error: "Publication media not found." });
    }
  });
};
