import { Prisma, PrismaClient } from "@prisma/client";
import type {
  ContentAssetRecord,
  ContentCreate,
  ContentRecord,
  ContentRepository,
  ContentStatus,
  FieldValues,
  FinalizeResult,
  TemplateFieldSnapshot,
} from "./content-repository.js";

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  );
}

function toRecord(row: {
  id: string;
  status: ContentStatus;
  templateCanvaId: string;
  templateTitle: string;
  templateFields: Prisma.JsonValue;
  fieldValues: Prisma.JsonValue;
  designId: string | null;
  editUrl: string | null;
  viewUrl: string | null;
  thumbnailKey: string | null;
  thumbnailContentType: string | null;
  autofillJobId: string | null;
  autofillStatus: string | null;
  autofillError: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ContentRecord {
  return {
    id: row.id,
    status: row.status,
    templateCanvaId: row.templateCanvaId,
    templateTitle: row.templateTitle,
    templateFields: row.templateFields as unknown as TemplateFieldSnapshot[],
    fieldValues: row.fieldValues as FieldValues,
    designId: row.designId,
    editUrl: row.editUrl,
    viewUrl: row.viewUrl,
    thumbnailKey: row.thumbnailKey,
    thumbnailContentType: row.thumbnailContentType,
    autofillJobId: row.autofillJobId,
    autofillStatus: row.autofillStatus,
    autofillError:
      row.autofillError === null || row.autofillError === undefined
        ? null
        : (row.autofillError as unknown as { code: string; message: string }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const CONTENT_SELECT = {
  id: true,
  status: true,
  templateCanvaId: true,
  templateTitle: true,
  templateFields: true,
  fieldValues: true,
  designId: true,
  editUrl: true,
  viewUrl: true,
  thumbnailKey: true,
  thumbnailContentType: true,
  autofillJobId: true,
  autofillStatus: true,
  autofillError: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: ContentCreate): Promise<ContentRecord> {
    const row = await this.prisma.content.create({
      data: {
        templateId: data.templateId,
        templateCanvaId: data.templateCanvaId,
        templateTitle: data.templateTitle,
        templateFields: data.templateFields as unknown as Prisma.InputJsonValue,
        fieldValues: {},
      },
      select: CONTENT_SELECT,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<ContentRecord | null> {
    const row = await this.prisma.content.findUnique({ where: { id }, select: CONTENT_SELECT });
    return row ? toRecord(row) : null;
  }

  async list(filter?: { status?: ContentStatus }): Promise<ContentRecord[]> {
    const rows = await this.prisma.content.findMany({
      where: filter?.status ? { status: filter.status } : {},
      orderBy: { updatedAt: "desc" },
      select: CONTENT_SELECT,
    });
    return rows.map(toRecord);
  }

  async updateValues(id: string, fieldValues: FieldValues): Promise<ContentRecord | null> {
    try {
      const row = await this.prisma.content.update({
        where: { id },
        data: { status: "DRAFT", fieldValues },
        select: CONTENT_SELECT,
      });
      return toRecord(row);
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async markReady(
    id: string,
  ): Promise<{ transitioned: boolean; record: ContentRecord | null }> {
    const result = await this.prisma.content.updateMany({
      where: { id, status: { in: ["UNFINISHED", "DRAFT"] } },
      data: { status: "READY" },
    });
    const record = await this.findById(id);
    return { transitioned: result.count > 0, record };
  }

  async startGeneration(id: string, jobId: string): Promise<ContentRecord | null> {
    try {
      const row = await this.prisma.content.update({
        where: { id },
        data: {
          autofillJobId: jobId,
          autofillStatus: "in_progress",
          autofillError: Prisma.DbNull,
        },
        select: CONTENT_SELECT,
      });
      return toRecord(row);
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async finalizeGeneration(
    id: string,
    jobId: string,
    result: FinalizeResult,
  ): Promise<{ transitioned: boolean; record: ContentRecord | null }> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const current = await tx.content.findUnique({ where: { id } });

      // Superseded job or already-terminal status: do not clobber newer state.
      if (!current || current.autofillJobId !== jobId || current.autofillStatus !== "in_progress") {
        return { transitioned: false };
      }

      await tx.content.update({
        where: { id },
        data: {
          autofillStatus: result.status,
          autofillError: result.error ?? Prisma.DbNull,
          ...(result.status === "success" && result.design
            ? {
                designId: result.design.designId,
                editUrl: result.design.editUrl,
                viewUrl: result.design.viewUrl,
                thumbnailKey: result.design.thumbnailKey,
                thumbnailContentType: result.design.thumbnailContentType,
              }
            : {}),
        },
      });

      return { transitioned: true };
    });

    const record = await this.findById(id);
    return { transitioned: outcome.transitioned, record };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.content.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }
      throw error;
    }
  }

  async upsertAsset(
    contentId: string,
    fieldName: string,
    asset: { storageKey: string; contentType: string },
  ): Promise<void> {
    await this.prisma.contentAsset.upsert({
      where: { contentId_fieldName: { contentId, fieldName } },
      create: {
        contentId,
        fieldName,
        storageKey: asset.storageKey,
        contentType: asset.contentType,
      },
      update: { storageKey: asset.storageKey, contentType: asset.contentType },
    });
  }

  async findAsset(contentId: string, fieldName: string): Promise<ContentAssetRecord | null> {
    const row = await this.prisma.contentAsset.findUnique({
      where: { contentId_fieldName: { contentId, fieldName } },
    });
    return row ? toAssetRecord(row) : null;
  }

  async listAssets(contentId: string): Promise<ContentAssetRecord[]> {
    const rows = await this.prisma.contentAsset.findMany({ where: { contentId } });
    return rows.map(toAssetRecord);
  }
}

function toAssetRecord(row: {
  id: string;
  contentId: string;
  fieldName: string;
  storageKey: string;
  contentType: string;
}): ContentAssetRecord {
  return {
    id: row.id,
    contentId: row.contentId,
    fieldName: row.fieldName,
    storageKey: row.storageKey,
    contentType: row.contentType,
  };
}