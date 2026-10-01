import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExportJobResponse } from "../canva/canva-client.js";
import type { ContentRecord } from "../content/content-repository.js";
import type { FacebookPageRecord } from "../facebook/facebook-page-repository.js";
import { MetaApiError } from "../facebook/meta-error.js";
import type { PublishedPhoto } from "../facebook/meta-client.js";
import type { StorageService, StoredObject } from "../../storage/storage-service.js";
import type {
  PublicationCreate,
  PublicationOutcome,
  PublicationRecord,
  PublicationRepository,
} from "./publication-repository.js";
import {
  MAX_FACEBOOK_IMAGE_BYTES,
  PublicationConflictError,
  PublicationNotFoundError,
  PublicationService,
  type PublicationCanvaSource,
  type PublicationContentSource,
  type PublicationFacebookPublisher,
  type PublicationPageSource,
} from "./publication-service.js";

const PAGE: FacebookPageRecord = {
  id: "rec-1",
  pageId: "123",
  name: "My Page",
  accessToken: "TOKEN",
  category: "Business",
  tasks: ["CREATE_CONTENT"],
  connectedAt: new Date(),
  updatedAt: new Date(),
};

function readyContent(overrides: Partial<ContentRecord> = {}): ContentRecord {
  return {
    id: "content-1",
    status: "READY",
    templateCanvaId: "canvaTpl-1",
    templateTitle: "Announcement",
    templateFields: [],
    fieldValues: {},
    designId: "design-1",
    editUrl: null,
    viewUrl: null,
    thumbnailKey: null,
    thumbnailContentType: null,
    autofillJobId: null,
    autofillStatus: null,
    autofillError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakePublicationRepository implements PublicationRepository {
  readonly records = new Map<string, PublicationRecord>();
  private sequence = 0;

  async create(data: PublicationCreate): Promise<PublicationRecord> {
    const record: PublicationRecord = {
      id: `pub-${(this.sequence += 1)}`,
      contentId: data.contentId,
      status: "PUBLISHING",
      facebookPageId: data.facebookPageId,
      facebookPageName: data.facebookPageName,
      caption: data.caption,
      designId: data.designId,
      mediaKey: data.mediaKey,
      mediaContentType: data.mediaContentType,
      facebookPostId: null,
      facebookPhotoId: null,
      publishedAt: null,
      errorCode: null,
      errorSubcode: null,
      errorMessage: null,
      fbtraceId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async finalize(id: string, outcome: PublicationOutcome): Promise<PublicationRecord | null> {
    const record = this.records.get(id);

    if (!record) {
      return null;
    }

    if (outcome.status === "PUBLISHED") {
      record.status = "PUBLISHED";
      record.facebookPostId = outcome.facebookPostId;
      record.facebookPhotoId = outcome.facebookPhotoId;
      record.publishedAt = outcome.publishedAt;
    } else {
      record.status = "FAILED";
      record.errorCode = outcome.errorCode;
      record.errorSubcode = outcome.errorSubcode;
      record.errorMessage = outcome.errorMessage;
      record.fbtraceId = outcome.fbtraceId;
    }

    return { ...record };
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async listByContent(contentId: string): Promise<PublicationRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.contentId === contentId)
      .map((record) => ({ ...record }));
  }

  async findPublishing(contentId: string): Promise<PublicationRecord | null> {
    const record = [...this.records.values()].find(
      (candidate) => candidate.contentId === contentId && candidate.status === "PUBLISHING",
    );
    return record ? { ...record } : null;
  }
}

class FakeCanva implements PublicationCanvaSource {
  createResult: ExportJobResponse = { job: { id: "export-1", status: "in_progress" } };
  exportResult: ExportJobResponse = {
    job: { id: "export-1", status: "success", urls: ["https://export.example/design.png"] },
  };

  async createExportJob(): Promise<ExportJobResponse> {
    return this.createResult;
  }

  async getExportJob(): Promise<ExportJobResponse> {
    return this.exportResult;
  }
}

interface PublishCall {
  pageId: string;
  pageToken: string;
  bytes: Uint8Array;
  contentType: string;
  caption: string;
  published?: boolean;
}

class FakeFacebook implements PublicationFacebookPublisher {
  readonly calls: PublishCall[] = [];
  createdTime: string | null = "2026-10-01T12:00:00+0000";
  error: unknown = null;

  async publishPhoto(params: PublishCall): Promise<PublishedPhoto> {
    this.calls.push(params);

    if (this.error) {
      throw this.error;
    }

    return { id: "789", post_id: "123_456" };
  }

  async getPostCreatedTime(): Promise<string | null> {
    return this.createdTime;
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

function makeHarness(initial: { content?: ContentRecord | null; page?: FacebookPageRecord | null } = {}) {
  const repository = new FakePublicationRepository();
  const canva = new FakeCanva();
  const facebook = new FakeFacebook();
  const storage = new FakeStorage();
  let content = initial.content === undefined ? readyContent() : initial.content;
  let page = initial.page === undefined ? PAGE : initial.page;

  const contentSource: PublicationContentSource = { get: async () => content };
  const pageSource: PublicationPageSource = { getPage: async () => page };
  const service = new PublicationService(
    repository,
    contentSource,
    pageSource,
    canva,
    facebook,
    storage,
  );

  return {
    repository,
    canva,
    facebook,
    storage,
    service,
    setContent: (value: ContentRecord | null) => {
      content = value;
    },
    setPage: (value: FacebookPageRecord | null) => {
      page = value;
    },
  };
}

function stubDownload(bytes = new Uint8Array([1, 2, 3])): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, { status: 200 })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PublicationService.publish preconditions", () => {
  it("rejects unknown content", async () => {
    const h = makeHarness({ content: null });
    await expect(h.service.publish("missing", { pageId: "123" })).rejects.toThrow(
      PublicationNotFoundError,
    );
  });

  it("rejects content that is not READY", async () => {
    const h = makeHarness({ content: readyContent({ status: "DRAFT" }) });
    await expect(h.service.publish("content-1", { pageId: "123" })).rejects.toThrow(
      PublicationConflictError,
    );
  });

  it("rejects content without a generated design", async () => {
    const h = makeHarness({ content: readyContent({ designId: null }) });
    await expect(h.service.publish("content-1", { pageId: "123" })).rejects.toThrow(
      PublicationConflictError,
    );
  });

  it("rejects an unconnected page", async () => {
    const h = makeHarness({ page: null });
    await expect(h.service.publish("content-1", { pageId: "nope" })).rejects.toThrow(
      PublicationNotFoundError,
    );
  });

  it("rejects a second publish while one is in progress", async () => {
    const h = makeHarness();
    await h.repository.create({
      contentId: "content-1",
      facebookPageRecordId: "rec-1",
      facebookPageId: "123",
      facebookPageName: "My Page",
      caption: null,
      designId: "design-1",
      mediaKey: "exports/content-1/design-1.png",
      mediaContentType: "image/png",
    });

    await expect(h.service.publish("content-1", { pageId: "123" })).rejects.toThrow(
      PublicationConflictError,
    );
  });
});

describe("PublicationService.publish success", () => {
  it("exports, stores at a content/design-stable key and records the post", async () => {
    stubDownload(new Uint8Array([9, 8, 7]));
    const h = makeHarness();

    const record = await h.service.publish("content-1", { pageId: "123", caption: "Hello" });

    expect(record.status).toBe("PUBLISHED");
    expect(record.facebookPostId).toBe("123_456");
    expect(record.facebookPhotoId).toBe("789");
    expect(record.publishedAt?.toISOString()).toBe(
      new Date("2026-10-01T12:00:00+0000").toISOString(),
    );
    expect(h.storage.objects.get("exports/content-1/design-1.png")).toEqual(
      new Uint8Array([9, 8, 7]),
    );

    const call = h.facebook.calls[0];
    expect(call).toMatchObject({
      pageId: "123",
      pageToken: "TOKEN",
      caption: "Hello",
      published: true,
      contentType: "image/png",
    });
    expect(call.bytes).toEqual(new Uint8Array([9, 8, 7]));
  });

  it("falls back to server time when created_time is unavailable", async () => {
    stubDownload();
    const h = makeHarness();
    h.facebook.createdTime = null;
    const before = Date.now();

    const record = await h.service.publish("content-1", { pageId: "123" });

    expect(record.status).toBe("PUBLISHED");
    expect(record.publishedAt).not.toBeNull();
    expect(record.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(record.caption).toBeNull();
  });
});

describe("PublicationService.publish failures", () => {
  it("records a FAILED outcome when the Canva export fails", async () => {
    const h = makeHarness();
    h.canva.exportResult = {
      job: { id: "export-1", status: "failed", error: { code: "export_error", message: "export boom" } },
    };

    const record = await h.service.publish("content-1", { pageId: "123" });

    expect(record.status).toBe("FAILED");
    expect(record.errorMessage).toBe("export boom");
    expect(record.errorCode).toBeNull();
    expect(h.facebook.calls).toHaveLength(0);
  });

  it("rejects an export over Facebook's 10 MB limit", async () => {
    stubDownload(new Uint8Array(MAX_FACEBOOK_IMAGE_BYTES + 1));
    const h = makeHarness();

    const record = await h.service.publish("content-1", { pageId: "123" });

    expect(record.status).toBe("FAILED");
    expect(record.errorMessage).toMatch(/10 MB/);
    expect(h.facebook.calls).toHaveLength(0);
  });

  it("captures a structured Meta error", async () => {
    stubDownload();
    const h = makeHarness();
    h.facebook.error = new MetaApiError("Invalid OAuth access token.", {
      code: 190,
      subcode: 460,
      fbtraceId: "trace-1",
    });

    const record = await h.service.publish("content-1", { pageId: "123" });

    expect(record.status).toBe("FAILED");
    expect(record.errorCode).toBe(190);
    expect(record.errorSubcode).toBe(460);
    expect(record.errorMessage).toBe("Invalid OAuth access token.");
    expect(record.fbtraceId).toBe("trace-1");
  });
});
