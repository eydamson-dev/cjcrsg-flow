import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  FacebookPageRecord,
  FacebookPageRepository,
  FacebookPageUpsert,
} from "./facebook-page-repository.js";

function toRecord(row: {
  id: string;
  pageId: string;
  name: string;
  accessToken: string;
  category: string | null;
  tasks: Prisma.JsonValue;
  connectedAt: Date;
  updatedAt: Date;
}): FacebookPageRecord {
  return {
    id: row.id,
    pageId: row.pageId,
    name: row.name,
    accessToken: row.accessToken,
    category: row.category,
    tasks: Array.isArray(row.tasks) ? (row.tasks as string[]) : null,
    connectedAt: row.connectedAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaFacebookPageRepository implements FacebookPageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: FacebookPageUpsert): Promise<void> {
    const shared = {
      name: data.name,
      accessToken: data.accessToken,
      category: data.category,
      // Leave existing tasks untouched when Meta returns none.
      ...(data.tasks ? { tasks: data.tasks } : {}),
    };

    await this.prisma.facebookPage.upsert({
      where: { pageId: data.pageId },
      create: { pageId: data.pageId, ...shared },
      update: shared,
    });
  }

  async list(): Promise<FacebookPageRecord[]> {
    const rows = await this.prisma.facebookPage.findMany({ orderBy: { name: "asc" } });
    return rows.map(toRecord);
  }

  async findByPageId(pageId: string): Promise<FacebookPageRecord | null> {
    const row = await this.prisma.facebookPage.findUnique({ where: { pageId } });
    return row ? toRecord(row) : null;
  }

  async deleteByPageId(pageId: string): Promise<boolean> {
    const { count } = await this.prisma.facebookPage.deleteMany({ where: { pageId } });
    return count > 0;
  }
}
