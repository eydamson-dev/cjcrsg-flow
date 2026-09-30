// Content persistence contracts.
//
// This module intentionally has no Prisma import so the domain/service layer and
// its tests stay independent of the generated database client.

export type ContentStatus = "UNFINISHED" | "DRAFT" | "READY";

// Stored field value; mirrors Canva's DatasetValue (asset_id -> assetId
// camelCase at rest; converted back at the Canva boundary).
export type FieldValue = { type: "text"; text: string } | { type: "image"; assetId: string };

export type FieldValues = Record<string, FieldValue>;

export interface TemplateFieldSnapshot {
  name: string;
  type: string;
  position: number;
}

export interface ContentRecord {
  id: string;
  status: ContentStatus;
  templateCanvaId: string;
  templateTitle: string;
  templateFields: TemplateFieldSnapshot[];
  fieldValues: FieldValues;
  designId: string | null;
  editUrl: string | null;
  viewUrl: string | null;
  thumbnailKey: string | null;
  thumbnailContentType: string | null;
  autofillJobId: string | null;
  autofillStatus: string | null;
  autofillError: { code: string; message: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentAssetRecord {
  id: string;
  contentId: string;
  fieldName: string;
  storageKey: string;
  contentType: string;
}

export interface ContentCreate {
  templateId: string | null;
  templateCanvaId: string;
  templateTitle: string;
  templateFields: TemplateFieldSnapshot[];
}

export interface DesignReference {
  designId: string;
  editUrl: string | null;
  viewUrl: string | null;
  thumbnailKey: string | null;
  thumbnailContentType: string | null;
}

export interface FinalizeResult {
  status: "success" | "failed";
  design?: DesignReference;
  error?: { code: string; message: string };
}

export interface ContentRepository {
  create(data: ContentCreate): Promise<ContentRecord>;
  findById(id: string): Promise<ContentRecord | null>;
  list(filter?: { status?: ContentStatus }): Promise<ContentRecord[]>;
  /** Persist field values and set status to DRAFT (demotes READY). */
  updateValues(id: string, fieldValues: FieldValues): Promise<ContentRecord | null>;
  /** Conditional UNFINISHED|DRAFT -> READY. Returns the record and whether it transitioned. */
  markReady(id: string): Promise<{ transitioned: boolean; record: ContentRecord | null }>;
  /** Record the running Autofill job for the latest generation attempt. */
  startGeneration(id: string, jobId: string): Promise<ContentRecord | null>;
  /**
   * Finalize a generation exactly once. No-ops when the stored job differs
   * (a newer generation superseded it) or the job is already terminal.
   */
  finalizeGeneration(
    id: string,
    jobId: string,
    result: FinalizeResult,
  ): Promise<{ transitioned: boolean; record: ContentRecord | null }>;
  delete(id: string): Promise<boolean>;
  upsertAsset(
    contentId: string,
    fieldName: string,
    asset: { storageKey: string; contentType: string },
  ): Promise<void>;
  findAsset(contentId: string, fieldName: string): Promise<ContentAssetRecord | null>;
  listAssets(contentId: string): Promise<ContentAssetRecord[]>;
}