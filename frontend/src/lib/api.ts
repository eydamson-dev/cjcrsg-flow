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
}

export interface CanvaStatus {
  configured: boolean;
  authenticated: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }
    throw new ApiError(response.status, message);
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
