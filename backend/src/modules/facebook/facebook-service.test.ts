import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../../config/env.js";
import type {
  FacebookPageRecord,
  FacebookPageRepository,
  FacebookPageUpsert,
} from "./facebook-page-repository.js";
import type { MetaPage } from "./meta-client.js";
import {
  FacebookNotConfiguredError,
  FacebookOAuthError,
  FacebookService,
  type FacebookGraphSource,
} from "./facebook-service.js";
import { PendingFacebookAuthStore } from "./pending-auth-store.js";

const CONFIG: AppConfig = {
  NODE_ENV: "test",
  PORT: 3001,
  HOST: "0.0.0.0",
  CORS_ORIGIN: "http://127.0.0.1:3000",
  DATABASE_URL: "postgresql://cjcrsg_flow:cjcrsg_flow@127.0.0.1:5434/cjcrsg_flow?schema=public",
  STORAGE_PATH: "./data/storage",
  CANVA_CLIENT_ID: undefined,
  CANVA_CLIENT_SECRET: undefined,
  CANVA_REDIRECT_URI: undefined,
  FACEBOOK_APP_ID: "app-id",
  FACEBOOK_APP_SECRET: "app-secret",
  FACEBOOK_REDIRECT_URI: "http://127.0.0.1:3001/facebook/oauth/callback",
};

class FakeRepository implements FacebookPageRepository {
  readonly records = new Map<string, FacebookPageRecord>();
  readonly upserts: FacebookPageUpsert[] = [];

  async upsert(data: FacebookPageUpsert): Promise<void> {
    this.upserts.push(data);
    const existing = this.records.get(data.pageId);
    this.records.set(data.pageId, {
      id: existing?.id ?? `rec-${this.records.size + 1}`,
      pageId: data.pageId,
      name: data.name,
      accessToken: data.accessToken,
      category: data.category,
      tasks: data.tasks,
      connectedAt: existing?.connectedAt ?? new Date(),
      updatedAt: new Date(),
    });
  }

  async list(): Promise<FacebookPageRecord[]> {
    return [...this.records.values()];
  }

  async findByPageId(pageId: string): Promise<FacebookPageRecord | null> {
    return this.records.get(pageId) ?? null;
  }

  async deleteByPageId(pageId: string): Promise<boolean> {
    return this.records.delete(pageId);
  }
}

class FakeGraph implements FacebookGraphSource {
  pages: MetaPage[] = [];

  async listPages(): Promise<MetaPage[]> {
    return this.pages;
  }
}

function makeHarness(config: AppConfig = CONFIG) {
  const repository = new FakeRepository();
  const graph = new FakeGraph();
  const pending = new PendingFacebookAuthStore();
  const service = new FacebookService(config, repository, pending, graph);
  return { repository, graph, pending, service };
}

function tokenResponse(token: string): Response {
  return new Response(JSON.stringify({ access_token: token }), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FacebookService configuration", () => {
  it("reports not configured and refuses to authorize without credentials", () => {
    const h = makeHarness({ ...CONFIG, FACEBOOK_APP_ID: undefined });

    expect(h.service.isConfigured()).toBe(false);
    expect(() => h.service.beginAuthorization("state")).toThrow(FacebookNotConfiguredError);
  });

  it("builds an authorize URL with the three required permissions", () => {
    const h = makeHarness();
    const url = new URL(h.service.beginAuthorization("state-1"));

    expect(url.searchParams.get("scope")).toBe(
      "pages_show_list,pages_read_engagement,pages_manage_posts",
    );
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe(CONFIG.FACEBOOK_REDIRECT_URI);
  });
});

describe("FacebookService.handleCallback", () => {
  it("rejects an unrecognized state without calling Facebook", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const h = makeHarness();

    await expect(h.service.handleCallback("code", "bogus")).rejects.toThrow(FacebookOAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exchanges tokens and persists the Pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("SHORT_TOKEN"))
      .mockResolvedValueOnce(tokenResponse("LONG_TOKEN"));
    vi.stubGlobal("fetch", fetchMock);

    const h = makeHarness();
    h.graph.pages = [
      {
        id: "1",
        name: "Page One",
        access_token: "PAGE_TOKEN",
        category: "Business",
        tasks: ["CREATE_CONTENT"],
      },
    ];
    h.service.beginAuthorization("state-1");

    const count = await h.service.handleCallback("code-1", "state-1");

    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(h.repository.upserts[0]).toMatchObject({
      pageId: "1",
      name: "Page One",
      accessToken: "PAGE_TOKEN",
      category: "Business",
      tasks: ["CREATE_CONTENT"],
    });
  });

  it("fails when no Pages are returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse("SHORT")).mockResolvedValueOnce(tokenResponse("LONG")),
    );
    const h = makeHarness();
    h.graph.pages = [];
    h.service.beginAuthorization("state-1");

    await expect(h.service.handleCallback("code", "state-1")).rejects.toThrow(FacebookOAuthError);
  });
});

describe("FacebookService pages", () => {
  it("lists summaries without tokens and reports connection state", async () => {
    const h = makeHarness();
    await h.repository.upsert({
      pageId: "1",
      name: "Page One",
      accessToken: "SECRET",
      category: null,
      tasks: null,
    });

    expect(await h.service.isConnected()).toBe(true);
    const pages = await h.service.listPages();
    expect(pages).toEqual([{ pageId: "1", name: "Page One", category: null }]);
    expect(JSON.stringify(pages)).not.toContain("SECRET");
  });

  it("disconnects a page", async () => {
    const h = makeHarness();
    await h.repository.upsert({
      pageId: "1",
      name: "Page One",
      accessToken: "SECRET",
      category: null,
      tasks: null,
    });

    expect(await h.service.disconnect("1")).toBe(true);
    expect(await h.service.isConnected()).toBe(false);
    expect(await h.service.disconnect("1")).toBe(false);
  });
});
