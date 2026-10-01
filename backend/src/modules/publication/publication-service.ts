import type { ExportJobResponse } from "../canva/canva-client.js";
import type { ContentRecord } from "../content/content-repository.js";
import type { FacebookPageRecord } from "../facebook/facebook-page-repository.js";
import { MetaApiError } from "../facebook/meta-error.js";
import type { PublishedPhoto } from "../facebook/meta-client.js";
import type { StorageService } from "../../storage/storage-service.js";
import type {
  PublicationOutcome,
  PublicationRecord,
  PublicationRepository,
} from "./publication-repository.js";

// Facebook's /photos endpoint accepts PNG up to 10 MB. A Canva poster PNG may
// exceed that; an oversize export is recorded as FAILED rather than silently
// re-encoded (no JPG fallback by decision).
export const EXPORT_FORMAT = "png" as const;
export const EXPORT_CONTENT_TYPE = "image/png";
export const MAX_FACEBOOK_IMAGE_BYTES = 10 * 1024 * 1024;

export type ExportFormat = "png" | "jpg" | "pdf" | "mp4";

const EXPORT_POLL_ATTEMPTS = 60;
const EXPORT_POLL_INTERVAL_MS = 1_000;

export class PublicationNotFoundError extends Error {
  constructor(message = "Publication not found.") {
    super(message);
    this.name = "PublicationNotFoundError";
  }
}

export class PublicationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationConflictError";
  }
}

export class PublicationExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationExportError";
  }
}

// Narrow dependency interfaces, mirroring ContentCanvaSource.
export interface PublicationContentSource {
  get(id: string): Promise<ContentRecord | null>;
}

export interface PublicationPageSource {
  getPage(pageId: string): Promise<FacebookPageRecord | null>;
}

export interface PublicationCanvaSource {
  createExportJob(designId: string, format: ExportFormat): Promise<ExportJobResponse>;
  getExportJob(jobId: string): Promise<ExportJobResponse>;
}

export interface PublicationFacebookPublisher {
  publishPhoto(params: {
    pageId: string;
    pageToken: string;
    bytes: Uint8Array;
    contentType: string;
    caption: string;
    published?: boolean;
  }): Promise<PublishedPhoto>;
  getPostCreatedTime(postId: string, pageToken: string): Promise<string | null>;
}

export class PublicationService {
  constructor(
    private readonly repository: PublicationRepository,
    private readonly content: PublicationContentSource,
    private readonly pages: PublicationPageSource,
    private readonly canva: PublicationCanvaSource,
    private readonly facebook: PublicationFacebookPublisher,
    private readonly storage: StorageService,
  ) {}

  // Publishes a READY content's generated design to a Facebook Page. The flow
  // is synchronous: export -> store -> upload -> finalize. A PUBLISHING row is
  // written first so an interrupted publish remains visible.
  async publish(
    contentId: string,
    params: { pageId: string; caption?: string },
  ): Promise<PublicationRecord> {
    const content = await this.content.get(contentId);

    if (!content) {
      throw new PublicationNotFoundError("Content not found.");
    }

    if (content.status !== "READY") {
      throw new PublicationConflictError("Only content marked ready can be published.");
    }

    const designId = content.designId;

    if (!designId) {
      throw new PublicationConflictError("Generate a Canva design before publishing.");
    }

    const page = await this.pages.getPage(params.pageId);

    if (!page) {
      throw new PublicationNotFoundError("Facebook Page is not connected.");
    }

    if (await this.repository.findPublishing(contentId)) {
      throw new PublicationConflictError("A publish is already in progress.");
    }

    const caption = params.caption?.trim() ?? "";
    const mediaKey = buildMediaKey(contentId, designId);

    const publication = await this.repository.create({
      contentId,
      facebookPageRecordId: page.id,
      facebookPageId: page.pageId,
      facebookPageName: page.name,
      caption: caption.length > 0 ? caption : null,
      designId,
      mediaKey,
      mediaContentType: EXPORT_CONTENT_TYPE,
    });

    let bytes: Uint8Array;

    try {
      bytes = await this.exportDesign(designId, mediaKey);
    } catch (error) {
      return this.recordFailure(publication.id, error);
    }

    try {
      const published = await this.facebook.publishPhoto({
        pageId: page.pageId,
        pageToken: page.accessToken,
        bytes,
        contentType: EXPORT_CONTENT_TYPE,
        caption,
        published: true,
      });

      const createdAt = published.post_id
        ? await this.facebook.getPostCreatedTime(published.post_id, page.accessToken)
        : null;

      const finalized = await this.repository.finalize(publication.id, {
        status: "PUBLISHED",
        facebookPostId: published.post_id,
        facebookPhotoId: published.id,
        publishedAt: parseDate(createdAt) ?? new Date(),
      });

      return finalized ?? publication;
    } catch (error) {
      return this.recordFailure(publication.id, error);
    }
  }

  list(contentId: string): Promise<PublicationRecord[]> {
    return this.repository.listByContent(contentId);
  }

  get(id: string): Promise<PublicationRecord | null> {
    return this.repository.findById(id);
  }

  private async exportDesign(designId: string, mediaKey: string): Promise<Uint8Array> {
    const job = await this.canva.createExportJob(designId, EXPORT_FORMAT);
    const completed = await this.pollExport(job.job.id);
    const url = completed.job.urls?.[0];

    if (!url) {
      throw new PublicationExportError("Canva export produced no file.");
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new PublicationExportError(`Export download failed (${response.status}).`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength === 0) {
      throw new PublicationExportError("Exported file is empty.");
    }

    if (bytes.byteLength > MAX_FACEBOOK_IMAGE_BYTES) {
      throw new PublicationExportError(
        `Exported image is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over Facebook's 10 MB limit.`,
      );
    }

    await this.storage.write(mediaKey, bytes);
    return bytes;
  }

  private async pollExport(jobId: string): Promise<ExportJobResponse> {
    let attempts = EXPORT_POLL_ATTEMPTS;

    while (attempts > 0) {
      const job = await this.canva.getExportJob(jobId);

      if (job.job.status === "failed") {
        throw new PublicationExportError(job.job.error?.message ?? "Canva export failed.");
      }

      if (job.job.status === "success") {
        return job;
      }

      attempts -= 1;
      await sleep(EXPORT_POLL_INTERVAL_MS);
    }

    throw new PublicationExportError("Canva export timed out.");
  }

  // Records a terminal FAILED outcome. If the row is gone, rethrows the cause.
  private async recordFailure(id: string, cause: unknown): Promise<PublicationRecord> {
    const outcome = toFailureOutcome(cause);
    const updated = await this.repository.finalize(id, outcome);

    if (updated) {
      return updated;
    }

    throw cause instanceof Error ? cause : new Error(outcome.errorMessage);
  }
}

// Storage keys are content/design-stable so a re-publish overwrites in place.
function buildMediaKey(contentId: string, designId: string): string {
  return `exports/${contentId}/${designId}.${EXPORT_FORMAT}`;
}

function toFailureOutcome(cause: unknown): Extract<PublicationOutcome, { status: "FAILED" }> {
  if (cause instanceof MetaApiError) {
    return {
      status: "FAILED",
      errorCode: cause.code,
      errorSubcode: cause.subcode,
      errorMessage: cause.message,
      fbtraceId: cause.fbtraceId,
    };
  }

  return {
    status: "FAILED",
    errorCode: null,
    errorSubcode: null,
    errorMessage: cause instanceof Error ? cause.message : "Publishing failed.",
    fbtraceId: null,
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
