const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

export interface TemplateField {
  name: string;
  type: string;
  position: number;
}

export interface Template {
  canvaId: string;
  title: string;
  thumbnailKey: string | null;
  thumbnailContentType: string | null;
  viewUrl: string | null;
  createUrl: string | null;
  canvaCreatedAt: string | null;
  canvaUpdatedAt: string | null;
  syncedAt: string;
  fields: TemplateField[];
}

export interface SyncResult {
  templates: number;
  fields: number;
  thumbnails: number;
  skipped: number;
  removed: number;
}

export interface CanvaStatus {
  configured: boolean;
  authenticated: boolean;
}

export type ContentStatus = "UNFINISHED" | "DRAFT" | "READY";

export type ContentFieldValue =
  | { type: "text"; text: string }
  | { type: "image"; assetId: string };

export interface ContentRecord {
  id: string;
  status: ContentStatus;
  templateCanvaId: string;
  templateTitle: string;
  templateFields: TemplateField[];
  fieldValues: Record<string, ContentFieldValue>;
  designId: string | null;
  editUrl: string | null;
  viewUrl: string | null;
  thumbnailKey: string | null;
  autofillJobId: string | null;
  autofillStatus: string | null;
  autofillError: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationStatus {
  status: "none" | "in_progress" | "success" | "failed";
  design?: {
    designId: string;
    editUrl: string | null;
    viewUrl: string | null;
    thumbnailKey: string | null;
  } | null;
  error?: { code: string; message: string } | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let body: unknown = undefined;
    try {
      body = await response.json();
      const parsed = body as { error?: string };
      if (parsed.error) {
        message = parsed.error;
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchCanvaStatus(): Promise<CanvaStatus> {
  return request<CanvaStatus>("/canva/status");
}

export async function listTemplates(): Promise<Template[]> {
  const { items } = await request<{ items: Template[] }>("/templates");
  return items;
}

export function getTemplate(canvaId: string): Promise<Template> {
  return request<Template>(`/templates/${encodeURIComponent(canvaId)}`);
}

export function syncTemplates(): Promise<SyncResult> {
  return request<SyncResult>("/templates/sync", { method: "POST" });
}

export function thumbnailUrl(canvaId: string): string {
  return `${API_URL}/templates/${encodeURIComponent(canvaId)}/thumbnail`;
}

export function canvaAuthorizeUrl(): string {
  return `${API_URL}/oauth/authorize`;
}

// --- Content ---

export async function listContent(status?: "all" | ContentStatus): Promise<ContentRecord[]> {
  const query = status && status !== "all" ? `?status=${status.toLowerCase()}` : "";
  const { items } = await request<{ items: ContentRecord[] }>(`/content${query}`);
  return items;
}

export function getContent(id: string): Promise<ContentRecord> {
  return request<ContentRecord>(`/content/${encodeURIComponent(id)}`);
}

export function createContent(templateCanvaId: string): Promise<ContentRecord> {
  return request<ContentRecord>("/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateCanvaId }),
  });
}

export function saveContentDraft(
  id: string,
  fieldValues: Record<string, ContentFieldValue>,
): Promise<ContentRecord> {
  return request<ContentRecord>(`/content/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fieldValues }),
  });
}

export function markContentReady(id: string): Promise<ContentRecord> {
  return request<ContentRecord>(`/content/${encodeURIComponent(id)}/ready`, { method: "POST" });
}

export function generateContentDesign(id: string): Promise<{ autofillJobId: string; autofillStatus: string }> {
  return request(`/content/${encodeURIComponent(id)}/generate`, { method: "POST" });
}

export function pollContentGeneration(id: string): Promise<GenerationStatus> {
  return request<GenerationStatus>(`/content/${encodeURIComponent(id)}/generation`);
}

export function deleteContent(id: string): Promise<void> {
  return request<void>(`/content/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function contentThumbnailUrl(id: string): string {
  return `${API_URL}/content/${encodeURIComponent(id)}/thumbnail`;
}

export function contentAssetUrl(id: string, fieldName: string): string {
  return `${API_URL}/content/${encodeURIComponent(id)}/assets/${encodeURIComponent(fieldName)}`;
}

export async function uploadContentAsset(
  id: string,
  fieldName: string,
  file: File,
): Promise<{ assetId: string }> {
  const response = await fetch(
    `${API_URL}/content/${encodeURIComponent(id)}/assets/${encodeURIComponent(fieldName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    },
  );

  if (!response.ok) {
    let message = `Upload failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the default message.
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<{ assetId: string }>;
}
