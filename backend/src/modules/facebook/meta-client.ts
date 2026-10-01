import { readMetaJson } from "./meta-error.js";
import { FACEBOOK_GRAPH_BASE } from "./oauth.js";

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

export interface PublishedPhoto {
  /** Numeric photo id. */
  id: string;
  /** The Page post id. */
  post_id: string;
}

interface AccountsResponse {
  data?: MetaPage[];
  paging?: { next?: string };
}

export interface PublishPhotoParams {
  pageId: string;
  pageToken: string;
  bytes: Uint8Array;
  contentType: string;
  caption: string;
  published?: boolean;
}

export class MetaGraphClient {
  // Lists every Page the user manages (id, name, access_token, category,
  // tasks). Follows paging.next to a bounded depth.
  async listPages(userToken: string, maxRequests = 10): Promise<MetaPage[]> {
    const pages: MetaPage[] = [];
    let url: string | undefined = `${FACEBOOK_GRAPH_BASE}/me/accounts?fields=id,name,access_token,category,tasks&limit=100`;
    let requests = 0;

    while (url && requests < maxRequests) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data: AccountsResponse = await readMetaJson<AccountsResponse>(response);
      pages.push(...(data.data ?? []));
      url = data.paging?.next;
      requests += 1;
    }

    return pages;
  }

  // Publishes an image as a Page photo via multipart/form-data. The local file
  // is uploaded as raw binary; `caption` carries the text. `published` defaults
  // to true (immediate) on Meta's side; we set it explicitly.
  async publishPhoto(params: PublishPhotoParams): Promise<PublishedPhoto> {
    const form = new FormData();
    form.append("published", params.published === false ? "false" : "true");

    if (params.caption) {
      form.append("caption", params.caption);
    }

    const buffer = new ArrayBuffer(params.bytes.byteLength);
    new Uint8Array(buffer).set(params.bytes);
    form.append("source", new Blob([buffer], { type: params.contentType }), "design");

    const response: Response = await fetch(`${FACEBOOK_GRAPH_BASE}/${params.pageId}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${params.pageToken}` },
      body: form,
    });

    return readMetaJson<PublishedPhoto>(response);
  }

  // The publish response carries no timestamp; read created_time when possible.
  // Best-effort: any failure yields null and the caller falls back to server time.
  async getPostCreatedTime(postId: string, pageToken: string): Promise<string | null> {
    try {
      const url = new URL(`${FACEBOOK_GRAPH_BASE}/${postId}`);
      url.searchParams.set("fields", "created_time");

      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${pageToken}` },
      });
      const data = await readMetaJson<{ created_time?: string }>(response);
      return data.created_time ?? null;
    } catch {
      return null;
    }
  }
}
