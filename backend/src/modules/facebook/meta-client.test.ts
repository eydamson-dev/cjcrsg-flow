import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaGraphClient } from "./meta-client.js";
import { MetaApiError } from "./meta-error.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MetaGraphClient.publishPhoto", () => {
  it("posts multipart with caption, source and published=true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "789", post_id: "123_456" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new MetaGraphClient();
    const result = await client.publishPhoto({
      pageId: "123",
      pageToken: "T",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      caption: "Hello",
      published: true,
    });

    expect(result).toEqual({ id: "789", post_id: "123_456" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v26.0/123/photos");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer T");

    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("caption")).toBe("Hello");
    expect(form.get("published")).toBe("true");
    expect(form.get("source")).toBeInstanceOf(Blob);
  });

  it("throws a structured MetaApiError on an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: "boom", code: 190, error_subcode: 460, fbtrace_id: "trace" },
          }),
          { status: 400 },
        ),
      ),
    );

    const client = new MetaGraphClient();

    await expect(
      client.publishPhoto({
        pageId: "1",
        pageToken: "T",
        bytes: new Uint8Array([1]),
        contentType: "image/png",
        caption: "",
      }),
    ).rejects.toMatchObject({
      name: "MetaApiError",
      code: 190,
      subcode: 460,
      fbtraceId: "trace",
      message: "boom",
    });
  });

  it("throws when an HTTP 200 body still carries an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "nope", code: 100 } }), { status: 200 }),
      ),
    );

    const client = new MetaGraphClient();

    await expect(
      client.publishPhoto({
        pageId: "1",
        pageToken: "T",
        bytes: new Uint8Array([1]),
        contentType: "image/png",
        caption: "",
      }),
    ).rejects.toBeInstanceOf(MetaApiError);
  });
});

describe("MetaGraphClient.listPages", () => {
  it("follows paging.next across pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "1", name: "A", access_token: "TA" }],
            paging: { next: "https://graph.facebook.com/v26.0/me/accounts?after=2" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "2", name: "B", access_token: "TB" }] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new MetaGraphClient();
    const pages = await client.listPages("USER");

    expect(pages.map((page) => page.id)).toEqual(["1", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("MetaGraphClient.getPostCreatedTime", () => {
  it("returns created_time", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ created_time: "2026-10-01T12:00:00+0000" }), { status: 200 }),
        ),
    );

    const client = new MetaGraphClient();
    expect(await client.getPostCreatedTime("123_456", "T")).toBe("2026-10-01T12:00:00+0000");
  });

  it("returns null when the lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const client = new MetaGraphClient();
    expect(await client.getPostCreatedTime("123_456", "T")).toBeNull();
  });
});
