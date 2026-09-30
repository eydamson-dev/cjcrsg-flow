"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Play, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentStatusBadge } from "@/components/content-status-badge";
import { ContentThumbnail } from "@/components/content-thumbnail";
import { DynamicContentForm } from "@/components/dynamic-content-form";
import {
  ApiError,
  deleteContent,
  generateContentDesign,
  getContent,
  markContentReady,
  pollContentGeneration,
  saveContentDraft,
  uploadContentAsset,
  type ContentFieldValue,
  type ContentRecord,
} from "@/lib/api";

export default function ContentEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [content, setContent] = useState<ContentRecord | null>(null);
  const [values, setValues] = useState<Record<string, ContentFieldValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [missing, setMissing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    getContent(id)
      .then((record) => {
        if (!cancelled) {
          setContent(record);
          setValues(record.fieldValues ?? {});
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Failed to load content.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleFieldChange(fieldName: string, value: ContentFieldValue | null) {
    setValues((previous) => {
      const next = { ...previous };

      if (value === null) {
        delete next[fieldName];
      } else {
        next[fieldName] = value;
      }

      return next;
    });
  }

  async function handleUploadImage(fieldName: string, file: File) {
    setUploading((previous) => new Set(previous).add(fieldName));
    setError(null);

    try {
      const { assetId } = await uploadContentAsset(id, fieldName, file);
      setValues((previous) => ({ ...previous, [fieldName]: { type: "image", assetId } }));
      setMissing((previous) => {
        if (!(fieldName in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[fieldName];
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading((previous) => {
        const next = new Set(previous);
        next.delete(fieldName);
        return next;
      });
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    setNotice(null);
    setMissing({});

    try {
      const updated = await saveContentDraft(id, values);
      setContent(updated);
      setNotice("Draft saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReady() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      // Persist the latest values first; the ready guard then validates them.
      await saveContentDraft(id, values);
      const updated = await markContentReady(id);
      setContent(updated);
      setMissing({});
      setNotice("Content is ready.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        const body = cause.body as { missing?: Array<{ field: string; reason: string }> };
        const entries = body.missing ?? [];
        const fieldMissing = entries.filter((entry) => !entry.field.startsWith("_"));

        setMissing(Object.fromEntries(fieldMissing.map((entry) => [entry.field, entry.reason])));

        const designMissing = entries.find((entry) => entry.field === "_design");
        setError(
          designMissing
            ? "A design has not been generated yet. Generate one before marking ready."
            : fieldMissing.length > 0
              ? "Complete all required fields before marking ready."
              : "This content cannot be marked ready yet.",
        );
      } else {
        setError(cause instanceof Error ? cause.message : "Failed to mark content ready.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!content) {
      return;
    }

    setGenerating(true);
    setError(null);
    setNotice(null);
    setGenerationError(null);

    try {
      // Generation uses the persisted values, so save first.
      await saveContentDraft(id, values);
      await generateContentDesign(id);

      for (;;) {
        const status = await pollContentGeneration(id);

        if (status.status === "in_progress") {
          await delay(2000);
          continue;
        }

        if (status.status === "failed") {
          setGenerationError(status.error?.message ?? "Generation failed.");
        }

        const fresh = await getContent(id);
        setContent(fresh);
        setValues(fresh.fieldValues);
        setNotice(status.status === "success" ? "Design generated." : null);
        break;
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setGenerationError("Not authenticated with Canva. Reconnect from the Templates page.");
      } else {
        setGenerationError(cause instanceof Error ? cause.message : "Generation failed.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${content?.templateTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteContent(id);
      router.push("/content");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to delete content.");
    }
  }

  function errorFor(fieldName: string): string | null {
    return missing[fieldName] ?? null;
  }

  const designId = content?.designId ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/content">
          <ArrowLeft />
          Back to content
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="mt-6 h-96 w-full rounded-xl" />
      ) : error && !content ? (
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : content ? (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {content.templateTitle}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <ContentStatusBadge status={content.status} />
                <span>Updated {formatDate(content.updatedAt)}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => void handleDelete()}>
              <Trash2 />
              Delete
            </Button>
          </div>

          {error && !missing && (
            <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {error && Object.keys(missing).length > 0 && (
            <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Card>
              <CardHeader>
                <CardTitle>Content fields</CardTitle>
                <CardDescription>
                  Values are submitted to Canva Autofill. Omitted fields keep the template default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicContentForm
                  contentId={content.id}
                  fields={content.templateFields}
                  values={values}
                  onChange={handleFieldChange}
                  onUploadImage={handleUploadImage}
                  uploading={uploading}
                  errorFor={errorFor}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Design</CardTitle>
                  <CardDescription>
                    Generated from this content with Canva Autofill.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ContentThumbnail
                    contentId={content.id}
                    title={content.templateTitle}
                    hasThumbnail={Boolean(designId)}
                    className="aspect-[4/3] w-full rounded-xl ring-1 ring-foreground/10"
                  />

                  <Button
                    onClick={() => void handleGenerate()}
                    disabled={generating || saving}
                    className="w-full"
                  >
                    {generating ? <Loader2 className="animate-spin" /> : <Play />}
                    {generating ? "Generating…" : designId ? "Regenerate design" : "Generate design"}
                  </Button>

                  {generationError && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {generationError}
                    </p>
                  )}

                  {designId && (
                    <div className="flex flex-wrap gap-2">
                      {content.editUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a href={content.editUrl} target="_blank" rel="noreferrer">
                            Edit in Canva
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                      {content.viewUrl && (
                        <Button asChild variant="ghost" size="sm">
                          <a href={content.viewUrl} target="_blank" rel="noreferrer">
                            View in Canva
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                      {!content.editUrl && (
                        <p className="text-xs text-muted-foreground">
                          Design generated — open it from your Canva library.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current status</span>
                    <ContentStatusBadge status={content.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saving a draft keeps the content editable. Marking it ready locks it for
                    publishing (MVP 4).
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" disabled={saving || generating} onClick={() => void handleSaveDraft()}>
                      <Save />
                      {saving ? "Saving…" : "Save draft"}
                    </Button>
                    <Button className="flex-1" disabled={saving || generating} onClick={() => void handleSaveReady()}>
                      <Sparkles />
                      Save as ready
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load content.
        </p>
      )}
    </main>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}