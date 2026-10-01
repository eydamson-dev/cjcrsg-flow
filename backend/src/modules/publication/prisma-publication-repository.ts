import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  PublicationCreate,
  PublicationOutcome,
  PublicationRecord,
  PublicationRepository,
  PublicationStatus,
} from "./publication-repository.js";

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

const PUBLICATION_SELECT = {
  id: true,
  contentId: true,
  status: true,
  facebookPageId: true,
  facebookPageName: true,
  caption: true,
  designId: true,
  mediaKey: true,
  mediaContentType: true,
  facebookPostId: true,
  facebookPhotoId: true,
  publishedAt: true,
  errorCode: true,
  errorSubcode: true,
  errorMessage: true,
  fbtraceId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toRecord(row: {
  id: string;
  contentId: string;
  status: PublicationStatus;
  facebookPageId: string;
  facebookPageName: string;
  caption: string | null;
  designId: string | null;
  mediaKey: string | null;
  mediaContentType: string | null;
  facebookPostId: string | null;
  facebookPhotoId: string | null;
  publishedAt: Date | null;
  errorCode: number | null;
  errorSubcode: number | null;
  errorMessage: string | null;
  fbtraceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicationRecord {
  return {
    id: row.id,
    contentId: row.contentId,
    status: row.status,
    facebookPageId: row.facebookPageId,
    facebookPageName: row.facebookPageName,
    caption: row.caption,
    designId: row.designId,
    mediaKey: row.mediaKey,
    mediaContentType: row.mediaContentType,
    facebookPostId: row.facebookPostId,
    facebookPhotoId: row.facebookPhotoId,
    publishedAt: row.publishedAt,
    errorCode: row.errorCode,
    errorSubcode: row.errorSubcode,
    errorMessage: row.errorMessage,
    fbtraceId: row.fbtraceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaPublicationRepository implements PublicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: PublicationCreate): Promise<PublicationRecord> {
    const row = await this.prisma.publication.create({
      data: {
        contentId: data.contentId,
        status: "PUBLISHING",
        facebookPageRecordId: data.facebookPageRecordId,
        facebookPageId: data.facebookPageId,
        facebookPageName: data.facebookPageName,
        caption: data.caption,
        designId: data.designId,
        mediaKey: data.mediaKey,
        mediaContentType: data.mediaContentType,
      },
      select: PUBLICATION_SELECT,
    });
    return toRecord(row);
  }

  async finalize(id: string, outcome: PublicationOutcome): Promise<PublicationRecord | null> {
    const data: Prisma.PublicationUpdateInput =
      outcome.status === "PUBLISHED"
        ? {
            status: "PUBLISHED",
            facebookPostId: outcome.facebookPostId,
            facebookPhotoId: outcome.facebookPhotoId,
            publishedAt: outcome.publishedAt,
            errorCode: null,
            errorSubcode: null,
            errorMessage: null,
            fbtraceId: null,
          }
        : {
            status: "FAILED",
            errorCode: outcome.errorCode,
            errorSubcode: outcome.errorSubcode,
            errorMessage: outcome.errorMessage,
            fbtraceId: outcome.fbtraceId,
          };

    try {
      const row = await this.prisma.publication.update({
        where: { id },
        data,
        select: PUBLICATION_SELECT,
      });
      return toRecord(row);
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    const row = await this.prisma.publication.findUnique({
      where: { id },
      select: PUBLICATION_SELECT,
    });
    return row ? toRecord(row) : null;
  }

  async listByContent(contentId: string): Promise<PublicationRecord[]> {
    const rows = await this.prisma.publication.findMany({
      where: { contentId },
      orderBy: { createdAt: "desc" },
      select: PUBLICATION_SELECT,
    });
    return rows.map(toRecord);
  }

  async findPublishing(contentId: string): Promise<PublicationRecord | null> {
    const row = await this.prisma.publication.findFirst({
      where: { contentId, status: "PUBLISHING" },
      orderBy: { createdAt: "desc" },
      select: PUBLICATION_SELECT,
    });
    return row ? toRecord(row) : null;
  }
}
