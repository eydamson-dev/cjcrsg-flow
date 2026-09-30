import type {
  AssetUploadJobResult,
  AutofillJobResult,
  CreateAssetUploadJobResponse,
  CreateAutofillJobResponse,
  DatasetValue,
} from "../canva/canva-client.js";
import type { TemplateRecord } from "../templates/template-repository.js";
import type { StorageService } from "../../storage/storage-service.js";
import type {
  ContentAssetRecord,
  ContentRecord,
  ContentRepository,
  ContentStatus,
  DesignReference,
  FieldValues,
  TemplateFieldSnapshot,
} from "./content-repository.js";

const THUMBNAIL_KEY_PREFIX = "thumbnails";
const ASSET_KEY_PREFIX = "assets";
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const ASSET_POLL_ATTEMPTS = 30;
const ASSET_POLL_INTERVAL_MS = 1_000;
const ASSET_NAME_MAX_LENGTH = 50;

export class ContentNotFoundError extends Error {
  constructor(message = "Content not found.") {
    super(message);
    this.name = "ContentNotFoundError";
  }
}

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

export class ContentReadyError extends Error {
  constructor(
    message: string,
    readonly missing: Array<{ field: string; reason: string }>,
    readonly record: ContentRecord,
  ) {
    super(message);
    this.name = "ContentReadyError";
  }
}

// The subset of the templates module the content service depends on.
export interface TemplateLookup {
  findByCanvaId(canvaId: string): Promise<TemplateRecord | null>;
}

// The subset of the Canva integration the content service depends on.
export interface ContentCanvaSource {
  createAutofillJob(params: {
    brandTemplateId: string;
    data: Record<string, DatasetValue>;
    title?: string;
  }): Promise<CreateAutofillJobResponse>;
  getAutofillJob(jobId: string): Promise<AutofillJobResult>;
  uploadAsset(bytes: Uint8Array, name: string): Promise<CreateAssetUploadJobResponse>;
  getAssetUploadJob(jobId: string): Promise<AssetUploadJobResult>;
}

export interface GenerationStatus {
  status: "none" | "in_progress" | "success" | "failed";
  design?: DesignReference;
  error?: { code: string; message: string };
}

interface StoredImage {
  storageKey: string;
  contentType: string;
}

export class ContentService {
  constructor(
    private readonly repository: ContentRepository,
    private readonly templates: TemplateLookup,
    private readonly canva: ContentCanvaSource,
    private readonly storage: StorageService,
  ) {}

  async create(templateCanvaId: string): Promise<ContentRecord> {
    const template = await this.templates.findByCanvaId(templateCanvaId);

    if (!template) {
      throw new ContentNotFoundError("Template not found.");
    }

    return this.repository.create({
      templateId: template.id,
      templateCanvaId: template.canvaId,
      templateTitle: template.title,
      templateFields: template.fields,
    });
  }

  async list(status?: ContentStatus): Promise<ContentRecord[]> {
    return this.repository.list(status ? { status } : undefined);
  }

  async get(id: string): Promise<ContentRecord | null> {
    return this.repository.findById(id);
  }

  // Save draft: values are persisted as-is (partial data allowed), never
  // blocked; status becomes DRAFT (demoting READY back to draft).
  async saveDraft(id: string, fieldValues: unknown): Promise<ContentRecord> {
    const normalized = normalizeFieldValues(fieldValues);
    const record = await this.repository.updateValues(id, normalized);

    if (!record) {
      throw new ContentNotFoundError();
    }

    return record;
  }

  // Save as ready: guarded by valid required fields AND a generated design.
  async saveReady(id: string): Promise<ContentRecord> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ContentNotFoundError();
    }

    const missing = validateRequiredFields(record.templateFields, record.fieldValues);

    if (missing.length > 0) {
      throw new ContentReadyError("Complete all required fields before marking ready.", missing, record);
    }

    if (!record.designId) {
      throw new ContentReadyError(
        "Generate a design before marking ready.",
        [{ field: "_design", reason: "no design has been generated" }],
        record,
      );
    }

    const { record: ready } = await this.repository.markReady(id);
    return ready ?? record;
  }

  // Starts an Autofill job with the currently persisted values. Partial data is
  // fine: omitted fields fall back to the template's default value.
  async generate(id: string): Promise<{ autofillJobId: string; autofillStatus: string }> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ContentNotFoundError();
    }

    const data = toAutofillData(record.templateFields, record.fieldValues);
    const response = await this.canva.createAutofillJob({
      brandTemplateId: record.templateCanvaId,
      data,
    });

    await this.repository.startGeneration(id, response.job.id);

    return { autofillJobId: response.job.id, autofillStatus: response.job.status };
  }

  // Poll-driven finalize: checks the Canva job when a job is in progress and
  // persists the terminal result once. Idempotent for terminal states.
  async reconcileGeneration(id: string): Promise<GenerationStatus> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ContentNotFoundError();
    }

    if (!record.autofillJobId || !record.autofillStatus) {
      return { status: "none" };
    }

    if (record.autofillStatus !== "in_progress") {
      return {
        status: record.autofillStatus as "success" | "failed",
        design: toDesignReference(record),
        error: record.autofillError ?? undefined,
      };
    }

    const job = await this.canva.getAutofillJob(record.autofillJobId);
    const jobStatus = job.job.status;

    if (jobStatus === "in_progress") {
      return { status: "in_progress" };
    }

    if (jobStatus === "success") {
      const design = job.job.result?.design;
      const designId = design?.id;

      if (!designId) {
        const error = { code: "missing_design", message: "Autofill job succeeded without a design id." };
        await this.finalize(id, record.autofillJobId, { status: "failed", error });
        return { status: "failed", error };
      }

      const thumbnail = await this.storeDesignThumbnail(designId, design?.thumbnail?.url);
      await this.removeOldThumbnail(record, thumbnail?.storageKey ?? null);
      await this.finalize(id, record.autofillJobId, {
        status: "success",
        design: {
          designId,
          editUrl: design?.urls?.edit_url ?? design?.url ?? null,
          viewUrl: design?.urls?.view_url ?? design?.url ?? null,
          thumbnailKey: thumbnail?.storageKey ?? null,
          thumbnailContentType: thumbnail?.contentType ?? null,
        },
      });

      const updated = await this.repository.findById(id);
      return {
        status: "success",
        design: updated ? toDesignReference(updated) : undefined,
      };
    }

    const error = job.job.error ?? { code: "autofill_failed", message: "Autofill job failed." };
    await this.finalize(id, record.autofillJobId, { status: "failed", error });
    return { status: "failed", error };
  }

  // Uploads an image for an image-typed field: forwards the bytes to Canva
  // (creating an asset), retains a local copy for preview, and returns the
  // Canva asset id the form stores in fieldValues.
  async uploadImage(
    id: string,
    fieldName: string,
    bytes: Uint8Array,
    contentType: string,
    filename: string,
  ): Promise<{ assetId: string; fieldName: string }> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ContentNotFoundError();
    }

    const field = record.templateFields.find((candidate) => candidate.name === fieldName);

    if (!field || field.type !== "image") {
      throw new ContentValidationError(`"${fieldName}" is not an image field.`);
    }

    if (!contentType.startsWith("image/") || contentType.toLowerCase().includes("svg")) {
      throw new ContentValidationError("Only image files can be uploaded.");
    }

    if (bytes.byteLength === 0) {
      throw new ContentValidationError("Uploaded file is empty.");
    }

    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new ContentValidationError(`File exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024} MB limit.`);
    }

    const name = sanitizeAssetName(filename, fieldName);
    const job = await this.canva.uploadAsset(bytes, name);
    const result = await this.pollAssetUpload(job.job.id);

    if (result.job.status !== "success" || !result.job.asset?.id) {
      const error = result.job.error ?? { code: "upload_failed", message: "Asset upload failed." };
      throw new ContentValidationError(`Asset upload failed: ${error.message}`);
    }

    const stored = await this.storeImageBytes(id, fieldName, bytes, contentType);

    // Replacing an image orphans the previous local copy; drop it best-effort.
    const previous = await this.repository.findAsset(id, fieldName);
    if (previous && previous.storageKey !== stored.storageKey) {
      await this.storage.delete(previous.storageKey).catch(() => undefined);
    }

    await this.repository.upsertAsset(id, fieldName, stored);

    return { assetId: result.job.asset.id, fieldName };
  }

  async getAsset(id: string, fieldName: string): Promise<ContentAssetRecord | null> {
    return this.repository.findAsset(id, fieldName);
  }

  async delete(id: string): Promise<boolean> {
    const record = await this.repository.findById(id);

    if (!record) {
      return false;
    }

    const assets = await this.repository.listAssets(id);
    const keys = [
      record.thumbnailKey,
      ...assets.map((asset) => asset.storageKey),
    ].filter((key): key is string => Boolean(key));

    const deleted = await this.repository.delete(id);

    if (deleted) {
      // Best-effort cleanup; a storage miss must never block deletion.
      for (const key of keys) {
        await this.storage.delete(key).catch(() => undefined);
      }
    }

    return deleted;
  }

  private async pollAssetUpload(jobId: string): Promise<AssetUploadJobResult> {
    let attempts = ASSET_POLL_ATTEMPTS;

    while (attempts > 0) {
      const result = await this.canva.getAssetUploadJob(jobId);

      if (result.job.status !== "in_progress") {
        return result;
      }

      attempts -= 1;
      await sleep(ASSET_POLL_INTERVAL_MS);
    }

    throw new ContentValidationError("Asset upload timed out.");
  }

  private async storeDesignThumbnail(
    designId: string,
    url: string | undefined,
  ): Promise<StoredImage | null> {
    if (!url) {
      return null;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "image/png";
      const bytes = new Uint8Array(await response.arrayBuffer());
      const storageKey = `${THUMBNAIL_KEY_PREFIX}/${designId}`;
      await this.storage.write(storageKey, bytes);

      return { storageKey, contentType };
    } catch {
      return null;
    }
  }

  private async storeImageBytes(
    contentId: string,
    fieldName: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredImage> {
    const storageKey = `${ASSET_KEY_PREFIX}/${contentId}/${sanitizeKey(fieldName)}`;
    await this.storage.write(storageKey, bytes);
    return { storageKey, contentType };
  }

  private async removeOldThumbnail(record: ContentRecord, newKey: string | null): Promise<void> {
    if (record.thumbnailKey && record.thumbnailKey !== newKey) {
      await this.storage.delete(record.thumbnailKey).catch(() => undefined);
    }
  }

  private async finalize(
    id: string,
    jobId: string,
    result: { status: "success" | "failed"; design?: DesignReference; error?: { code: string; message: string } },
  ): Promise<void> {
    await this.repository.finalizeGeneration(id, jobId, result);
  }
}

function toDesignReference(record: ContentRecord): DesignReference | undefined {
  if (!record.designId) {
    return undefined;
  }

  return {
    designId: record.designId,
    editUrl: record.editUrl,
    viewUrl: record.viewUrl,
    thumbnailKey: record.thumbnailKey,
    thumbnailContentType: record.thumbnailContentType,
  };
}

// Accepts only well-formed text/image values; anything else is a client error.
// Unknown field names are tolerated (persisted) to stay forward-compatible.
export function normalizeFieldValues(input: unknown): FieldValues {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ContentValidationError("fieldValues must be an object.");
  }

  const normalized: FieldValues = {};

  for (const [name, value] of Object.entries(input)) {
    if (!isRecord(value)) {
      throw new ContentValidationError(`Invalid value for field "${name}".`);
    }

    if (value.type === "text") {
      if (typeof value.text !== "string") {
        throw new ContentValidationError(`Invalid text value for field "${name}".`);
      }
      normalized[name] = { type: "text", text: value.text };
      continue;
    }

    if (value.type === "image") {
      if (typeof value.assetId !== "string" || value.assetId === "") {
        throw new ContentValidationError(`Invalid image value for field "${name}".`);
      }
      normalized[name] = { type: "image", assetId: value.assetId };
      continue;
    }

    throw new ContentValidationError(`Unsupported value type for field "${name}".`);
  }

  return normalized;
}

// Required for READY: every text and image field in the (snapshotted) template
// has a value. chart/sheet fields are Canva-owned and not fillable here, so
// they are excluded and the template's default value applies.
export function validateRequiredFields(
  templateFields: TemplateFieldSnapshot[],
  fieldValues: FieldValues,
): Array<{ field: string; reason: string }> {
  const missing: Array<{ field: string; reason: string }> = [];

  for (const field of templateFields) {
    if (field.type !== "text" && field.type !== "image") {
      continue;
    }

    const value = fieldValues[field.name];

    if (field.type === "text") {
      if (!value || value.type !== "text" || value.text.trim() === "") {
        missing.push({ field: field.name, reason: "required text field is empty" });
      }
    } else if (!value || value.type !== "image" || value.assetId === "") {
      missing.push({ field: field.name, reason: "required image field is missing" });
    }
  }

  return missing;
}

// Builds the Canva Autofill payload from persisted values. Only well-formed
// text/image values are forwarded; malformed or unsupported fields are dropped.
function toAutofillData(
  templateFields: TemplateFieldSnapshot[],
  fieldValues: FieldValues,
): Record<string, DatasetValue> {
  const data: Record<string, DatasetValue> = {};
  const names = new Set(templateFields.map((field) => field.name));

  for (const [name, value] of Object.entries(fieldValues)) {
    if (!names.has(name)) {
      continue;
    }

    if (value.type === "text") {
      data[name] = { type: "text", text: value.text };
    } else if (value.type === "image" && value.assetId !== "") {
      data[name] = { type: "image", asset_id: value.assetId };
    }
  }

  return data;
}

// Storage keys: assets/<contentId>/<sanitizedFieldName>, thumbnails/<designId>.
function sanitizeKey(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_");
}

function sanitizeAssetName(name: string, fallback: string): string {
  const clean = name.trim().split("/").pop() ?? fallback;
  const safe = clean.replace(/[^\w.\- ]/g, "_").slice(0, ASSET_NAME_MAX_LENGTH);
  return safe.length > 0 ? safe : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}