import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AssetUploadJobResult,
  AutofillJobResult,
  CreateAutofillJobResponse,
  DatasetValue,
} from "../canva/canva-client.js";
import type { TemplateRecord } from "../templates/template-repository.js";
import type { StorageService, StoredObject } from "../../storage/storage-service.js";
import {
  ContentService,
  ContentValidationError,
  type ContentCanvaSource,
  type TemplateLookup,
} from "./content-service.js";
import type {
  ContentAssetRecord,
  ContentCreate,
  ContentRecord,
  ContentRepository,
  FieldValues,
  FinalizeResult,
  TemplateFieldSnapshot,
} from "./content-repository.js";

const FIELDS: TemplateFieldSnapshot[] = [
  { name: "TITLE", type: "text", position: 0 },
  { name: "PHOTO", type: "image", position: 1 },
  { name: "NOTES", type: "chart", position: 2 },
];

const TEMPLATE: TemplateRecord = {
  id: "tpl-1",
  canvaId: "canvaTpl-1",
  title: "Announcement",
  thumbnailKey: null,
  thumbnailContentType: null,
  viewUrl: null,
  createUrl: null,
  canvaCreatedAt: null,
  canvaUpdatedAt: null,
  syncedAt: new Date(),
  fields: FIELDS,
};

class FakeRepository implements ContentRepository {
  readonly records = new Map<string, ContentRecord>();
  readonly created: ContentCreate[] = [];
  readonly finalizeCalls: Array<{ id: string; jobId: string; result: FinalizeResult }> = [];
  readonly assets = new Map<string, ContentAssetRecord>();
  readonly deleted: string[] = [];

  async create(data: ContentCreate): Promise<ContentRecord> {
    this.created.push(data);
    const record: ContentRecord = {
      id: `content-${this.records.size + 1}`,
      status: "UNFINISHED",
      templateCanvaId: data.templateCanvaId,
      templateTitle: data.templateTitle,
      templateFields: data.templateFields,
      fieldValues: {},
      designId: null,
      editUrl: null,
      viewUrl: null,
      thumbnailKey: null,
      thumbnailContentType: null,
      autofillJobId: null,
      autofillStatus: null,
      autofillError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<ContentRecord | null> {
    return this.records.get(id) ?? null;
  }

  async list(): Promise<ContentRecord[]> {
    return [...this.records.values()];
  }

  async updateValues(id: string, fieldValues: FieldValues): Promise<ContentRecord | null> {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }
    record.fieldValues = fieldValues;
    record.status = "DRAFT";
    return { ...record };
  }

  async markReady(id: string): Promise<{ transitioned: boolean; record: ContentRecord | null }> {
    const record = this.records.get(id);
    if (!record) {
      return { transitioned: false, record: null };
    }
    const transitioned = record.status === "UNFINISHED" || record.status === "DRAFT";
    if (transitioned) {
      record.status = "READY";
    }
    return { transitioned, record: { ...record } };
  }

  async startGeneration(id: string, jobId: string): Promise<ContentRecord | null> {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }
    record.autofillJobId = jobId;
    record.autofillStatus = "in_progress";
    return { ...record };
  }

  async finalizeGeneration(
    id: string,
    jobId: string,
    result: FinalizeResult,
  ): Promise<{ transitioned: boolean; record: ContentRecord | null }> {
    const record = this.records.get(id);
    if (!record || record.autofillJobId !== jobId || record.autofillStatus !== "in_progress") {
      return { transitioned: false, record: record ? { ...record } : null };
    }
    this.finalizeCalls.push({ id, jobId, result });
    record.autofillStatus = result.status;
    record.autofillError = result.error ?? null;
    if (result.status === "success" && result.design) {
      record.designId = result.design.designId;
      record.editUrl = result.design.editUrl;
      record.viewUrl = result.design.viewUrl;
      record.thumbnailKey = result.design.thumbnailKey;
      record.thumbnailContentType = result.design.thumbnailContentType;
    }
    return { transitioned: true, record: { ...record } };
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.records.delete(id);
    if (existed) {
      this.deleted.push(id);
    }
    return existed;
  }

  async upsertAsset(
    contentId: string,
    fieldName: string,
    asset: { storageKey: string; contentType: string },
  ): Promise<void> {
    this.assets.set(`${contentId}:${fieldName}`, {
      id: "asset",
      contentId,
      fieldName,
      storageKey: asset.storageKey,
      contentType: asset.contentType,
    });
  }

  async findAsset(contentId: string, fieldName: string): Promise<ContentAssetRecord | null> {
    return this.assets.get(`${contentId}:${fieldName}`) ?? null;
  }

  async listAssets(contentId: string): Promise<ContentAssetRecord[]> {
    return [...this.assets.values()].filter((asset) => asset.contentId === contentId);
  }
}

class FakeCanva implements ContentCanvaSource {
  autofillResult: AutofillJobResult = { job: { id: "job-1", status: "in_progress" } };
  assetResult: AssetUploadJobResult = {
    job: { id: "asset-job-1", status: "success", asset: { id: "A123", type: "image", name: "x.png" } },
  };
  readonly createCalls: Array<{ brandTemplateId: string; data: Record<string, DatasetValue> }> = [];
  readonly uploaded: Array<{ bytes: Uint8Array; name: string }> = [];

  async createAutofillJob(params: {
    brandTemplateId: string;
    data: Record<string, DatasetValue>;
    title?: string;
  }): Promise<CreateAutofillJobResponse> {
    this.createCalls.push(params);
    return { job: { id: "job-1", status: "in_progress" } };
  }

  async getAutofillJob(): Promise<AutofillJobResult> {
    return this.autofillResult;
  }

  async uploadAsset(bytes: Uint8Array, name: string): Promise<CreateAutofillJobResponse> {
    this.uploaded.push({ bytes, name });
    return { job: { id: "asset-job-1", status: "in_progress" } };
  }

  async getAssetUploadJob(): Promise<AssetUploadJobResult> {
    return this.assetResult;
  }
}

class FakeStorage implements StorageService {
  readonly objects = new Map<string, Uint8Array>();

  async write(key: string, content: Uint8Array): Promise<StoredObject> {
    this.objects.set(key, content);
    return { key, size: content.byteLength };
  }

  async read(key: string): Promise<Uint8Array> {
    const value = this.objects.get(key);
    if (!value) {
      throw new Error(`Missing object: ${key}`);
    }
    return value;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

interface Harness {
  repository: FakeRepository;
  canva: FakeCanva;
  storage: FakeStorage;
  service: ContentService;
}

function makeHarness(template: TemplateRecord | null = TEMPLATE): Harness {
  const repository = new FakeRepository();
  const canva = new FakeCanva();
  const storage = new FakeStorage();
  const templates: TemplateLookup = {
    findByCanvaId: async () => template,
  };
  const service = new ContentService(repository, templates, canva, storage);
  return { repository, canva, storage, service };
}

function thumbnailResponse(contentType = "image/png"): Response {
  return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContentService.create", () => {
  it("snapshots template provenance and starts UNFINISHED", async () => {
    const { repository, service } = makeHarness();
    const record = await service.create("canvaTpl-1");

    expect(repository.created).toHaveLength(1);
    expect(repository.created[0]).toMatchObject({
      templateId: "tpl-1",
      templateCanvaId: "canvaTpl-1",
      templateTitle: "Announcement",
    });
    expect(repository.created[0].templateFields).toEqual(FIELDS);
    expect(record.status).toBe("UNFINISHED");
  });

  it("throws when the template is unknown", async () => {
    const { service } = makeHarness(null);
    await expect(service.create("missing")).rejects.toThrow("Template not found");
  });
});

describe("ContentService.saveDraft", () => {
  it("persists values and demotes to DRAFT", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    const values: FieldValues = {
      TITLE: { type: "text", text: "Hello" },
      PHOTO: { type: "image", assetId: "A1" },
    };

    const saved = await service.saveDraft(created.id, values);

    expect(saved.status).toBe("DRAFT");
    expect(saved.fieldValues).toEqual(values);
    expect(repository.records.get(created.id)?.status).toBe("DRAFT");
  });

  it("rejects malformed values", async () => {
    const { service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await expect(
      service.saveDraft(created.id, { TITLE: { type: "text", text: 42 } }),
    ).rejects.toThrow(ContentValidationError);
    await expect(service.saveDraft(created.id, "nope")).rejects.toThrow(ContentValidationError);
  });

  it("throws when the content is unknown", async () => {
    const { service } = makeHarness();
    await expect(service.saveDraft("missing", {})).rejects.toThrow("Content not found");
  });
});

describe("ContentService.saveReady", () => {
  function withValues(id: string, repository: FakeRepository, values: FieldValues): void {
    const record = repository.records.get(id);
    if (!record) {
      throw new Error("missing record");
    }
    record.fieldValues = values;
  }

  it("blocks when a required text field is empty", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    withValues(created.id, repository, { PHOTO: { type: "image", assetId: "A1" } });

    await expect(service.saveReady(created.id)).rejects.toMatchObject({
      name: "ContentReadyError",
      missing: expect.arrayContaining([{ field: "TITLE", reason: "required text field is empty" }]),
    });
  });

  it("blocks when a required image field is missing", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    withValues(created.id, repository, { TITLE: { type: "text", text: "Hello" } });

    await expect(service.saveReady(created.id)).rejects.toMatchObject({
      name: "ContentReadyError",
      missing: expect.arrayContaining([
        { field: "PHOTO", reason: "required image field is missing" },
      ]),
    });
  });

  it("blocks when no design has been generated", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    withValues(created.id, repository, {
      TITLE: { type: "text", text: "Hello" },
      PHOTO: { type: "image", assetId: "A1" },
    });

    await expect(service.saveReady(created.id)).rejects.toMatchObject({
      missing: [{ field: "_design", reason: "no design has been generated" }],
    });
  });

  it("marks READY when all required fields and a design exist", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    withValues(created.id, repository, {
      TITLE: { type: "text", text: "Hello" },
      PHOTO: { type: "image", assetId: "A1" },
    });
    repository.records.get(created.id)!.designId = "design-1";

    const ready = await service.saveReady(created.id);

    expect(ready.status).toBe("READY");
  });
});

describe("ContentService.generate", () => {
  it("sends a converted payload and records the job", async () => {
    const { canva, repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await service.saveDraft(created.id, {
      TITLE: { type: "text", text: "Hello" },
      PHOTO: { type: "image", assetId: "A1" },
      GHOST: { type: "text", text: "not a template field" },
    });

    const result = await service.generate(created.id);

    expect(result.autofillJobId).toBe("job-1");
    expect(canva.createCalls[0].brandTemplateId).toBe("canvaTpl-1");
    // assetId -> asset_id; unknown field dropped; chart/sheet excluded.
    expect(canva.createCalls[0].data).toEqual({
      TITLE: { type: "text", text: "Hello" },
      PHOTO: { type: "image", asset_id: "A1" },
    });
    expect(repository.records.get(created.id)?.autofillStatus).toBe("in_progress");
  });
});

describe("ContentService.reconcileGeneration", () => {
  it("does not finalize while the job is in progress", async () => {
    const { repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await repository.startGeneration(created.id, "job-1");

    const status = await service.reconcileGeneration(created.id);

    expect(status).toEqual({ status: "in_progress" });
    expect(repository.finalizeCalls).toHaveLength(0);
  });

  it("finalizes a successful job and stores the design thumbnail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(thumbnailResponse("image/jpeg")));
    const { canva, repository, service, storage } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await repository.startGeneration(created.id, "job-1");
    canva.autofillResult = {
      job: {
        id: "job-1",
        status: "success",
        result: {
          type: "create_design",
          design: {
            id: "design-1",
            url: "https://www.canva.com/design/design-1/edit",
            urls: {
              edit_url: "https://www.canva.com/api/edit",
              view_url: "https://www.canva.com/design/design-1/view",
            },
            thumbnail: { width: 1, height: 1, url: "https://thumb.example/design-1.png" },
          },
        },
      },
    };

    const status = await service.reconcileGeneration(created.id);
    const record = repository.records.get(created.id)!;

    expect(status.status).toBe("success");
    expect(record.designId).toBe("design-1");
    expect(record.editUrl).toBe("https://www.canva.com/api/edit");
    expect(record.autofillStatus).toBe("success");
    expect(record.thumbnailKey).toBe("thumbnails/design-1");
    expect(storage.objects.has("thumbnails/design-1")).toBe(true);
  });

  it("persists failure without touching the previous design", async () => {
    const { canva, repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await repository.startGeneration(created.id, "job-1");
    repository.records.get(created.id)!.designId = "old-design";
    canva.autofillResult = {
      job: { id: "job-1", status: "failed", error: { code: "autofill_error", message: "boom" } },
    };

    const status = await service.reconcileGeneration(created.id);
    const record = repository.records.get(created.id)!;

    expect(status.status).toBe("failed");
    expect(record.autofillStatus).toBe("failed");
    expect(record.autofillError).toEqual({ code: "autofill_error", message: "boom" });
    expect(record.designId).toBe("old-design");
  });

  it("is idempotent once terminal", async () => {
    const { canva, repository, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await repository.startGeneration(created.id, "job-1");
    canva.autofillResult = {
      job: {
        id: "job-1",
        status: "success",
        result: {
          type: "create_design",
          design: { id: "design-1", urls: { edit_url: "e", view_url: "v" } },
        },
      },
    };

    const first = await service.reconcileGeneration(created.id);
    const second = await service.reconcileGeneration(created.id);

    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    expect(repository.finalizeCalls).toHaveLength(1);
  });
});

describe("ContentService.uploadImage", () => {
  it("rejects uploads for non-image fields", async () => {
    const { service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(
      service.uploadImage(created.id, "TITLE", bytes, "image/png", "x.png"),
    ).rejects.toThrow('"TITLE" is not an image field');
  });

  it("rejects non-image content types", async () => {
    const { service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    await expect(
      service.uploadImage(created.id, "PHOTO", new Uint8Array([1]), "application/pdf", "x.pdf"),
    ).rejects.toThrow(ContentValidationError);
  });

  it("uploads, keeps a local copy and records the asset", async () => {
    const { canva, repository, service, storage } = makeHarness();
    const created = await service.create("canvaTpl-1");
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = await service.uploadImage(created.id, "PHOTO", bytes, "image/png", "pic.png");

    expect(result).toEqual({ assetId: "A123", fieldName: "PHOTO" });
    expect(canva.uploaded[0].name).toBe("pic.png");
    const key = `assets/${created.id}/PHOTO`;
    expect(storage.objects.get(key)).toEqual(bytes);
    expect(repository.assets.get(`${created.id}:PHOTO`)?.storageKey).toBe(key);
  });

  it("surfaces failed uploads", async () => {
    const { canva, service } = makeHarness();
    const created = await service.create("canvaTpl-1");
    canva.assetResult = {
      job: { id: "asset-job-1", status: "failed", error: { code: "import_failed", message: "bad file" } },
    };

    await expect(
      service.uploadImage(created.id, "PHOTO", new Uint8Array([1]), "image/png", "x.png"),
    ).rejects.toThrow("Asset upload failed: bad file");
  });
});

describe("ContentService.delete", () => {
  it("removes the record and cleans up stored objects", async () => {
    const { repository, service, storage } = makeHarness();
    const created = await service.create("canvaTpl-1");
    const record = repository.records.get(created.id)!;
    record.thumbnailKey = "thumbnails/design-1";
    await repository.upsertAsset(created.id, "PHOTO", {
      storageKey: "assets/1/PHOTO",
      contentType: "image/png",
    });
    storage.objects.set("thumbnails/design-1", new Uint8Array([1]));
    storage.objects.set("assets/1/PHOTO", new Uint8Array([2]));

    const deleted = await service.delete(created.id);

    expect(deleted).toBe(true);
    expect(repository.deleted).toContain(created.id);
    expect(storage.objects.has("thumbnails/design-1")).toBe(false);
    expect(storage.objects.has("assets/1/PHOTO")).toBe(false);
  });

  it("returns false for unknown content", async () => {
    const { service } = makeHarness();
    expect(await service.delete("missing")).toBe(false);
  });
});