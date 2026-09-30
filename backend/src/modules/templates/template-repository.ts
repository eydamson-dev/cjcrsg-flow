// Template persistence contracts.
//
// This module intentionally has no Prisma import so the domain/service layer and
// its tests stay independent of the generated database client.
//
// Field types are owned by Canva (currently text, image, chart, sheet) and are
// stored as free-form strings so new upstream types do not require a migration.

export interface TemplateFieldRecord {
  name: string;
  type: string;
  position: number;
}

export interface TemplateRecord {
  id: string;
  canvaId: string;
  title: string;
  thumbnailKey: string | null;
  thumbnailContentType: string | null;
  viewUrl: string | null;
  createUrl: string | null;
  canvaCreatedAt: Date | null;
  canvaUpdatedAt: Date | null;
  syncedAt: Date;
  fields: TemplateFieldRecord[];
}

export interface TemplateUpsert {
  canvaId: string;
  title: string;
  // Omitted when no new thumbnail was downloaded, so an existing cached
  // thumbnail is preserved rather than cleared on a transient failure.
  thumbnailKey?: string;
  thumbnailContentType?: string;
  viewUrl: string | null;
  createUrl: string | null;
  canvaCreatedAt: Date | null;
  canvaUpdatedAt: Date | null;
  fields: TemplateFieldRecord[];
}

export interface TemplateRepository {
  upsert(data: TemplateUpsert): Promise<void>;
  list(): Promise<TemplateRecord[]>;
  findByCanvaId(canvaId: string): Promise<TemplateRecord | null>;
  deleteNotIn(canvaIds: string[]): Promise<number>;
}
