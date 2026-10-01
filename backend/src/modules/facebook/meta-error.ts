// Meta Graph API returns errors as { error: { message, type, code,
// error_subcode, fbtrace_id } }, and can do so with an HTTP 200 status. This
// normalizes that shape into a typed error so callers can persist structured
// failure info on a Publication.

export interface MetaApiErrorOptions {
  code?: number | null;
  subcode?: number | null;
  fbtraceId?: string | null;
  type?: string | null;
}

export class MetaApiError extends Error {
  readonly code: number | null;
  readonly subcode: number | null;
  readonly fbtraceId: string | null;
  readonly type: string | null;

  constructor(message: string, options: MetaApiErrorOptions = {}) {
    super(message);
    this.name = "MetaApiError";
    this.code = options.code ?? null;
    this.subcode = options.subcode ?? null;
    this.fbtraceId = options.fbtraceId ?? null;
    this.type = options.type ?? null;
  }
}

export function parseMetaError(payload: unknown): MetaApiError {
  const error =
    isRecord(payload) && isRecord(payload.error) ? (payload.error as Record<string, unknown>) : undefined;

  if (!error) {
    return new MetaApiError("Facebook API request failed.");
  }

  return new MetaApiError(typeof error.message === "string" ? error.message : "Facebook API request failed.", {
    code: toInteger(error.code),
    subcode: toInteger(error.error_subcode),
    fbtraceId: typeof error.fbtrace_id === "string" ? error.fbtrace_id : null,
    type: typeof error.type === "string" ? error.type : null,
  });
}

// Reads a Graph API JSON response, throwing MetaApiError for both non-2xx
// statuses and the "HTTP 200 with an error body" case.
export async function readMetaJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (isRecord(data) && data.error !== undefined) {
    throw parseMetaError(data);
  }

  if (!response.ok) {
    throw new MetaApiError(`Facebook API request failed (${response.status}).`);
  }

  return data as T;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
