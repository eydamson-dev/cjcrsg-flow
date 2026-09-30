import type { FastifyError, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  ContentNotFoundError,
  ContentReadyError,
  ContentValidationError,
  MAX_IMAGE_BYTES,
  type ContentService,
} from "../modules/content/content-service.js";
import {
  NotAuthenticatedError,
  NotConfiguredError,
} from "../modules/canva/canva-service.js";
import type { ContentRecord, ContentStatus } from "../modules/content/content-repository.js";
import type { StorageService } from "../storage/storage-service.js";
import { apiErrorHandler } from "./error-handler.js";
import { normalizeImageContentType } from "./image-content-type.js";

interface ContentRoutesOptions {
  content: ContentService;
  storage: StorageService;
}

interface StatusFilter {
  valid: boolean;
  status?: ContentStatus;
}

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  switch (value) {
    case undefined:
    case "":
    case "all":
      return { valid: true };
    case "unfinished":
      return { valid: true, status: "UNFINISHED" };
    case "draft":
      return { valid: true, status: "DRAFT" };
    case "ready":
      return { valid: true, status: "READY" };
    default:
      return { valid: false };
  }
}

function serialize(record: ContentRecord) {
  return {
    id: record.id,
    status: record.status,
    templateCanvaId: record.templateCanvaId,
    templateTitle: record.templateTitle,
    templateFields: record.templateFields,
    fieldValues: record.fieldValues,
    designId: record.designId,
    editUrl: record.editUrl,
    viewUrl: record.viewUrl,
    thumbnailKey: record.thumbnailKey,
    autofillJobId: record.autofillJobId,
    autofillStatus: record.autofillStatus,
    autofillError: record.autofillError,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const contentRoutes: FastifyPluginAsync<ContentRoutesOptions> = async (app, options) => {
  const { content, storage } = options;

  // Image uploads ship as raw bytes with a content type such as image/png or
  // application/octet-stream. Fastify 5 rejects unregistered content types with
  // 415, so accept any type that is not already handled (JSON keeps its own
  // exact parser) and hand through the raw Buffer.
  app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ContentNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }

    if (error instanceof ContentValidationError) {
      return reply.status(400).send({ error: error.message });
    }

    if (error instanceof ContentReadyError) {
      return reply.status(422).send({
        error: error.message,
        missing: error.missing,
        content: serialize(error.record),
      });
    }

    if (error instanceof NotConfiguredError) {
      return reply.status(400).send({ error: error.message });
    }

    if (error instanceof NotAuthenticatedError) {
      return reply.status(401).send({ error: error.message });
    }

    return apiErrorHandler(error, request, reply);
  });

  app.post<{ Body: { templateCanvaId?: unknown } }>("/content", async (request, reply) => {
    const templateCanvaId = request.body?.templateCanvaId;

    if (typeof templateCanvaId !== "string" || templateCanvaId.trim() === "") {
      return reply.status(400).send({ error: "templateCanvaId is required." });
    }

    const record = await content.create(templateCanvaId);
    return reply.status(201).send(serialize(record));
  });

  app.get<{ Querystring: { status?: string } }>("/content", async (request, reply) => {
    const filter = normalizeStatusFilter(request.query.status);

    if (!filter.valid) {
      return reply.status(400).send({ error: "status must be one of: all, unfinished, draft, ready." });
    }

    const items = await content.list(filter.status);
    return { items: items.map(serialize) };
  });

  app.get<{ Params: { id: string } }>("/content/:id", async (request, reply) => {
    const record = await content.get(request.params.id);

    if (!record) {
      return reply.status(404).send({ error: "Content not found." });
    }

    return serialize(record);
  });

  app.put<{ Params: { id: string }; Body: { fieldValues?: unknown } }>(
    "/content/:id",
    async (request, reply) => {
      const fieldValues = request.body?.fieldValues;

      if (fieldValues === undefined) {
        return reply.status(400).send({ error: "fieldValues is required." });
      }

      const record = await content.saveDraft(request.params.id, fieldValues);
      return serialize(record);
    },
  );

  app.post<{ Params: { id: string } }>("/content/:id/ready", async (request) => {
    const record = await content.saveReady(request.params.id);
    return serialize(record);
  });

  app.post<{ Params: { id: string } }>("/content/:id/generate", async (request) => {
    return content.generate(request.params.id);
  });

  app.get<{ Params: { id: string } }>("/content/:id/generation", async (request) => {
    return content.reconcileGeneration(request.params.id);
  });

  // Image upload: raw binary body with metadata headers, mirroring Canva's own
  // asset-upload API (no multipart dependency). File name travels in X-File-Name.
  app.post<{ Params: { id: string; fieldName: string } }>(
    "/content/:id/assets/:fieldName",
    { bodyLimit: MAX_IMAGE_BYTES + 1024 },
    async (request, reply) => {
      const body = request.body;

      if (!(body instanceof Uint8Array)) {
        return reply.status(400).send({ error: "Expected a binary body." });
      }

      const contentType =
        typeof request.headers["content-type"] === "string"
          ? request.headers["content-type"]
          : "application/octet-stream";
      const rawName = request.headers["x-file-name"];
      const name =
        typeof rawName === "string" ? safeDecodeComponent(rawName) : request.params.fieldName;

      const result = await content.uploadImage(
        request.params.id,
        request.params.fieldName,
        body,
        contentType,
        name,
      );

      return reply.status(201).send(result);
    },
  );

  app.get<{ Params: { id: string; fieldName: string } }>(
    "/content/:id/assets/:fieldName",
    async (request, reply) => {
      const asset = await content.getAsset(request.params.id, request.params.fieldName);

      if (!asset) {
        return reply.status(404).send({ error: "Asset not found." });
      }

      try {
        const bytes = await storage.read(asset.storageKey);
        return reply
          .header("Content-Type", normalizeImageContentType(asset.contentType))
          .header("X-Content-Type-Options", "nosniff")
          .header("Cache-Control", "public, max-age=60")
          .send(Buffer.from(bytes));
      } catch {
        return reply.status(404).send({ error: "Asset not found." });
      }
    },
  );

  app.get<{ Params: { id: string } }>("/content/:id/thumbnail", async (request, reply) => {
    const record = await content.get(request.params.id);

    if (!record?.thumbnailKey) {
      return reply.status(404).send({ error: "Thumbnail not found." });
    }

    try {
      const bytes = await storage.read(record.thumbnailKey);
      return reply
        .header("Content-Type", normalizeImageContentType(record.thumbnailContentType))
        .header("X-Content-Type-Options", "nosniff")
        .header("Cache-Control", "public, max-age=60")
        .send(Buffer.from(bytes));
    } catch {
      return reply.status(404).send({ error: "Thumbnail not found." });
    }
  });

  app.delete<{ Params: { id: string } }>("/content/:id", async (request, reply) => {
    const deleted = await content.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send({ error: "Content not found." });
    }

    return reply.status(204).send();
  });
};

function safeDecodeComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}