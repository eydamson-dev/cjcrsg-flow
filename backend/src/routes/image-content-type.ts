// Canva sometimes returns the non-standard "image/jpg"; normalize to a valid
// MIME type so browsers (especially under nosniff) render it correctly.
export function normalizeImageContentType(contentType: string | null): string {
  const normalized = contentType?.toLowerCase();

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return normalized && normalized.startsWith("image/") ? normalized : "image/png";
}