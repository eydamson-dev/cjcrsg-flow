import type { PrismaClient } from "@prisma/client";
import type {
  TemplateRecord,
  TemplateRepository,
  TemplateUpsert,
} from "./template-repository.js";

export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: TemplateUpsert): Promise<void> {
    const metadata = {
      title: data.title,
      viewUrl: data.viewUrl,
      createUrl: data.createUrl,
      canvaCreatedAt: data.canvaCreatedAt,
      canvaUpdatedAt: data.canvaUpdatedAt,
    };

    await this.prisma.$transaction(async (tx) => {
      const template = await tx.template.upsert({
        where: { canvaId: data.canvaId },
        create: {
          canvaId: data.canvaId,
          ...metadata,
          thumbnailKey: data.thumbnailKey ?? null,
          thumbnailContentType: data.thumbnailContentType ?? null,
        },
        update: {
          ...metadata,
          syncedAt: new Date(),
          // Leave an existing thumbnail untouched when no new one was downloaded.
          ...(data.thumbnailKey !== undefined
            ? {
                thumbnailKey: data.thumbnailKey,
                thumbnailContentType: data.thumbnailContentType ?? null,
              }
            : {}),
        },
      });

      await tx.templateField.deleteMany({ where: { templateId: template.id } });

      if (data.fields.length > 0) {
        await tx.templateField.createMany({
          data: data.fields.map((field) => ({
            templateId: template.id,
            name: field.name,
            type: field.type,
            position: field.position,
          })),
        });
      }
    });
  }

  async list(): Promise<TemplateRecord[]> {
    const rows = await this.prisma.template.findMany({
      orderBy: { title: "asc" },
      select: {
        canvaId: true,
        title: true,
        thumbnailKey: true,
        thumbnailContentType: true,
        viewUrl: true,
        createUrl: true,
        canvaCreatedAt: true,
        canvaUpdatedAt: true,
        syncedAt: true,
        fields: {
          orderBy: { position: "asc" },
          select: { name: true, type: true, position: true },
        },
      },
    });

    return rows;
  }

  async findByCanvaId(canvaId: string): Promise<TemplateRecord | null> {
    return this.prisma.template.findUnique({
      where: { canvaId },
      select: {
        canvaId: true,
        title: true,
        thumbnailKey: true,
        thumbnailContentType: true,
        viewUrl: true,
        createUrl: true,
        canvaCreatedAt: true,
        canvaUpdatedAt: true,
        syncedAt: true,
        fields: {
          orderBy: { position: "asc" },
          select: { name: true, type: true, position: true },
        },
      },
    });
  }

  async deleteNotIn(canvaIds: string[]): Promise<number> {
    const { count } = await this.prisma.template.deleteMany({
      where: { canvaId: { notIn: canvaIds } },
    });
    return count;
  }
}
