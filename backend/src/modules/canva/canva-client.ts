export const CANVA_API_BASE = "https://api.canva.com/rest/v1";

export interface BrandTemplateThumbnail {
  width: number;
  height: number;
  url: string;
}

export interface BrandTemplate {
  id: string;
  title: string;
  view_url: string;
  create_url: string;
  created_at: number;
  updated_at: number;
  thumbnail?: BrandTemplateThumbnail;
}

export interface ListBrandTemplatesResponse {
  items: BrandTemplate[];
  continuation?: string;
}

export interface BrandTemplateDataset {
  dataset: Record<string, { type: "image" | "text" | "chart" | "sheet" }>;
}

export type DatasetValue =
  | { type: "text"; text: string }
  | { type: "image"; asset_id: string }
  | { type: "video"; asset_id: string };

export interface CreateAutofillJobResponse {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
  };
}

export interface AutofillJobResult {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    result?: {
      type: "create_design" | "update_design";
      design: {
        id: string;
        title?: string;
        url?: string;
        urls?: { edit_url: string; view_url: string };
        thumbnail?: BrandTemplateThumbnail;
        created_at?: number;
        updated_at?: number;
      };
    };
    error?: { code: string; message: string };
  };
}

export interface ExportJobResponse {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    urls?: string[];
    error?: { code: string; message: string };
  };
}

export interface CreateAssetUploadJobResponse {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
  };
}

export interface AssetUploadJobResult {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    asset?: {
      id: string;
      type: string;
      name: string;
      thumbnail?: BrandTemplateThumbnail;
      created_at?: number;
      updated_at?: number;
    };
    error?: { code: string; message: string };
  };
}

export class CanvaClient {
  async listBrandTemplates(
    accessToken: string,
    continuation?: string,
    query?: string,
  ): Promise<ListBrandTemplatesResponse> {
    const url = new URL(`${CANVA_API_BASE}/brand-templates`);
    url.searchParams.set("limit", "100");
    if (continuation) {
      url.searchParams.set("continuation", continuation);
    }
    if (query) {
      url.searchParams.set("query", query);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<ListBrandTemplatesResponse>(response);
  }

  async getBrandTemplate(accessToken: string, id: string): Promise<BrandTemplate> {
    const response = await fetch(`${CANVA_API_BASE}/brand-templates/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<{ brand_template: BrandTemplate }>(response).then((r) => r.brand_template);
  }

  async getBrandTemplateDataset(
    accessToken: string,
    id: string,
  ): Promise<BrandTemplateDataset> {
    const response = await fetch(`${CANVA_API_BASE}/brand-templates/${id}/dataset`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<BrandTemplateDataset>(response);
  }

  async createAutofillJob(
    accessToken: string,
    params: { brandTemplateId: string; data: Record<string, DatasetValue>; title?: string },
  ): Promise<CreateAutofillJobResponse> {
    const response = await fetch(`${CANVA_API_BASE}/autofills`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "create_from_brand_template",
        brand_template_id: params.brandTemplateId,
        data: params.data,
        title: params.title,
      }),
    });
    return this.readJson<CreateAutofillJobResponse>(response);
  }

  async getAutofillJob(accessToken: string, jobId: string): Promise<AutofillJobResult> {
    const response = await fetch(`${CANVA_API_BASE}/autofills/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<AutofillJobResult>(response);
  }

  async createExportJob(
    accessToken: string,
    designId: string,
    format: "png" | "jpg" | "pdf" | "mp4",
  ): Promise<ExportJobResponse> {
    const response = await fetch(`${CANVA_API_BASE}/exports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ design_id: designId, format: { type: format } }),
    });
    return this.readJson<ExportJobResponse>(response);
  }

  async getExportJob(accessToken: string, jobId: string): Promise<ExportJobResponse> {
    const response = await fetch(`${CANVA_API_BASE}/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<ExportJobResponse>(response);
  }

  // Asset upload mirrors Canva's own API: a raw binary body plus an
  // Asset-Upload-Metadata header carrying the base64-encoded name.
  async createAssetUploadJob(
    accessToken: string,
    params: { bytes: Uint8Array; name: string },
  ): Promise<CreateAssetUploadJobResponse> {
    const response = await fetch(`${CANVA_API_BASE}/asset-uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Asset-Upload-Metadata": JSON.stringify({
          name_base64: Buffer.from(params.name).toString("base64"),
        }),
      },
      body: Buffer.from(params.bytes),
    });
    return this.readJson<CreateAssetUploadJobResponse>(response);
  }

  async getAssetUploadJob(accessToken: string, jobId: string): Promise<AssetUploadJobResult> {
    const response = await fetch(`${CANVA_API_BASE}/asset-uploads/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return this.readJson<AssetUploadJobResult>(response);
  }

  private async readJson<T>(response: Response): Promise<T> {
    const text = await response.text();

    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
          : text;
      throw new Error(`Canva API request failed (${response.status}): ${message}`);
    }

    return data as T;
  }
}
