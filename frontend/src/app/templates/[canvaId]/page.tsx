"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, createContent, getTemplate, type Template } from "@/lib/api";
import { TemplateThumbnail } from "@/components/template-thumbnail";

export default function TemplateDetailPage() {
  const params = useParams<{ canvaId: string }>();
  const router = useRouter();
  const canvaId = params.canvaId;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!canvaId) {
      return;
    }

    let cancelled = false;

    getTemplate(canvaId)
      .then((result) => {
        if (!cancelled) {
          setTemplate(result);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        if (cause instanceof ApiError && cause.status === 404) {
          setError("This template is not in the local library. Run a sync from the library.");
        } else {
          setError(cause instanceof Error ? cause.message : "Failed to load the template.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canvaId]);

  async function handleUseTemplate() {
    setCreating(true);
    setError(null);

    try {
      const record = await createContent(canvaId);
      router.push(`/content/${record.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create content.");
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/templates">
          <ArrowLeft />
          Back to templates
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="mt-6 h-72 w-full rounded-xl" />
      ) : error ? (
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : template ? (
        <article className="mt-6 grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
          <div>
            <TemplateThumbnail
              canvaId={template.canvaId}
              title={template.title}
              hasThumbnail={Boolean(template.thumbnailKey)}
              className="aspect-[4/3] w-full rounded-xl ring-1 ring-foreground/10"
            />
          </div>

          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {template.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void handleUseTemplate()} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                {creating ? "Creating…" : "Use template"}
              </Button>
              {template.viewUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={template.viewUrl} target="_blank" rel="noreferrer">
                    View in Canva
                    <ExternalLink />
                  </a>
                </Button>
              )}
              {template.createUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={template.createUrl} target="_blank" rel="noreferrer">
                    Create from template
                    <ExternalLink />
                  </a>
                </Button>
              )}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Fields</CardTitle>
                <CardDescription>
                  {template.fields.length === 0
                    ? "This template defines no Autofill fields."
                    : `${template.fields.length} Autofill field${
                        template.fields.length === 1 ? "" : "s"
                      } discovered from Canva.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template.fields.length > 0 && (
                  <ul className="divide-y divide-border">
                    {template.fields.map((field) => (
                      <li
                        key={field.name}
                        className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="font-mono text-sm">{field.name}</span>
                        <Badge variant="secondary">{field.type}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Canva template ID</dt>
              <dd className="font-mono">{template.canvaId}</dd>
              <dt className="text-muted-foreground">Last synced</dt>
              <dd>{formatDate(template.syncedAt)}</dd>
              <dt className="text-muted-foreground">Updated in Canva</dt>
              <dd>{template.canvaUpdatedAt ? formatDate(template.canvaUpdatedAt) : "—"}</dd>
            </dl>
          </div>
        </article>
      ) : null}
    </main>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
