import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrandTemplate, BrandTemplateDataset } from "../canva/canva-client.js";
import type { StorageService, StoredObject } from "../../storage/storage-service.js";
import {
  TemplateService,
  type BrandTemplateSource,
} from "./template-service.js";
import type {
  TemplateRecord,
  TemplateRepository,
  TemplateUpsert,
} from "./template-repository.js";

class FakeRepository implements TemplateRepository {
  readonly upserts: TemplateUpsert[] = [];
  lastDeleteNotIn: string[] | null = null;

  async upsert(data: TemplateUpsert): Promise<void> {
    this.upserts.push(data);
  }

  async list(): Promise<TemplateRecord[]> {
    return [];
  }

  async findByCanvaId(): Promise<TemplateRecord | null> {
    return null;
  }

  async deleteNotIn(canvaIds: string[]): Promise<number> {
    this.lastDeleteNotIn = canvaIds;
    return 0;
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

function makeSource(
  templates: BrandTemplate[],
  datasets: Record<string, BrandTemplateDataset>,
): BrandTemplateSource {
  return {
    async listAllBrandTemplates() {
      return templates;
    },
    async getBrandTemplateDataset(id: string) {
      return datasets[id] ?? { dataset: {} };
    },
  };
}

function brandTemplate(overrides: Partial<BrandTemplate> = {}): BrandTemplate {
  return {
    id: "TPL1",
    title: "Test Template",
    view_url: "https://www.canva.com/design/TPL1/view",
    create_url: "https://www.canva.com/design/TPL1/remix",
    created_at: 1_700_000_000,
    updated_at: 1_710_000_000,
    ...overrides,
  };
}

function thumbnailResponse(contentType = "image/png"): Response {
  return new Response(new Uint8Array([1, 2, 3, 4]), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TemplateService.sync", () => {
  it("upserts templates with mapped metadata and dataset fields", async () => {
    const repository = new FakeRepository();
    const storage = new FakeStorage();
    const source = makeSource(
      [brandTemplate()],
      {
        TPL1: {
          dataset: {
            heading: { type: "text" },
            "background-image": { type: "image" },
          },
        },
      },
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(thumbnailResponse()));

    const service = new TemplateService(source, repository, storage);
    const result = await service.sync();

    expect(result).toEqual({ templates: 1, fields: 2, thumbnails: 0, skipped: 0, removed: 0 });
    expect(repository.upserts).toHaveLength(1);
    expect(repository.lastDeleteNotIn).toEqual(["TPL1"]);

    const upsert = repository.upserts[0];
    expect(upsert.canvaId).toBe("TPL1");
    expect(upsert.title).toBe("Test Template");
    expect(upsert.viewUrl).toBe("https://www.canva.com/design/TPL1/view");
    expect(upsert.createUrl).toBe("https://www.canva.com/design/TPL1/remix");
    expect(upsert.canvaCreatedAt).toEqual(new Date(1_700_000_000 * 1000));
    expect(upsert.canvaUpdatedAt).toEqual(new Date(1_710_000_000 * 1000));
    expect(upsert.fields).toEqual([
      { name: "heading", type: "text", position: 0 },
      { name: "background-image", type: "image", position: 1 },
    ]);
  });

  it("downloads and stores the thumbnail, recording its key and content type", async () => {
    const repository = new FakeRepository();
    const storage = new FakeStorage();
    const source = makeSource(
      [
        brandTemplate({
          thumbnail: { width: 320, height: 400, url: "https://export.canva.com/thumb.png" },
        }),
      ],
      { TPL1: { dataset: {} } },
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(thumbnailResponse("image/jpeg")));

    const service = new TemplateService(source, repository, storage);
    const result = await service.sync();

    expect(result.thumbnails).toBe(1);
    expect(repository.upserts[0].thumbnailKey).toBe("thumbnails/TPL1");
    expect(repository.upserts[0].thumbnailContentType).toBe("image/jpeg");
    expect(storage.objects.get("thumbnails/TPL1")).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("does not clear a cached thumbnail when a download fails", async () => {
    const repository = new FakeRepository();
    const storage = new FakeStorage();
    const source = makeSource(
      [
        brandTemplate({
          thumbnail: { width: 320, height: 400, url: "https://export.canva.com/thumb.png" },
        }),
      ],
      { TPL1: { dataset: {} } },
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const warnings: unknown[] = [];

    const service = new TemplateService(source, repository, storage);
    const result = await service.sync({ warn: (obj) => warnings.push(obj) });

    expect(result).toEqual({ templates: 1, fields: 0, thumbnails: 0, skipped: 0, removed: 0 });
    // Undefined (not null) tells the repository to leave any existing key intact.
    expect(repository.upserts[0].thumbnailKey).toBeUndefined();
    expect(repository.upserts[0].thumbnailContentType).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("skips a template whose dataset fetch fails and continues the sync", async () => {
    const repository = new FakeRepository();
    const storage = new FakeStorage();
    const source: BrandTemplateSource = {
      async listAllBrandTemplates() {
        return [brandTemplate({ id: "BAD" }), brandTemplate({ id: "GOOD" })];
      },
      async getBrandTemplateDataset(id: string) {
        if (id === "BAD") {
          throw new Error("dataset unavailable");
        }
        return { dataset: { title: { type: "text" } } };
      },
    };
    const warnings: unknown[] = [];

    const service = new TemplateService(source, repository, storage);
    const result = await service.sync({ warn: (obj) => warnings.push(obj) });

    expect(result).toEqual({ templates: 2, fields: 1, thumbnails: 0, skipped: 1, removed: 0 });
    expect(repository.upserts).toHaveLength(1);
    expect(repository.upserts[0].canvaId).toBe("GOOD");
    expect(warnings).toHaveLength(1);
  });
});
