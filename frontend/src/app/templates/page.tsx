"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
import {
  ApiError,
  canvaAuthorizeUrl,
  fetchCanvaStatus,
  listTemplates,
  syncTemplates,
  type Template,
} from "@/lib/api";
import { TemplateThumbnail } from "@/components/template-thumbnail";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [status, items] = await Promise.all([fetchCanvaStatus(), listTemplates()]);
    setAuthenticated(status.authenticated);
    setTemplates(items);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchCanvaStatus(), listTemplates()])
      .then(([status, items]) => {
        if (cancelled) {
          return;
        }
        setAuthenticated(status.authenticated);
        setTemplates(items);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Failed to load templates.");
        setTemplates([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    try {
      const result = await syncTemplates();
      const skipped = result.skipped > 0 ? ` (${result.skipped} skipped)` : "";
      const removed = result.removed > 0 ? `, ${result.removed} removed` : "";
      setSyncMessage(
        `Synced ${result.templates} template(s), ${result.fields} field(s), ${result.thumbnails} thumbnail(s)${skipped}${removed}.`,
      );
      await reload();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthenticated(false);
      }
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canva brand templates and the Autofill fields they define.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={syncing ? "animate-spin" : undefined} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      {authenticated === false && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Connect Canva</CardTitle>
            <CardDescription>
              The application is not authenticated with Canva yet. Connect to retrieve your brand
              templates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={canvaAuthorizeUrl()}>Connect to Canva</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {syncMessage && !error && (
        <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {syncMessage}
        </p>
      )}

      <div className="mt-8">
        {templates === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates yet. Sync to retrieve templates from Canva.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.canvaId} href={`/templates/${template.canvaId}`}>
                <Card
                  size="sm"
                  className="h-full transition-shadow hover:ring-foreground/25"
                >
                  <TemplateThumbnail
                    canvaId={template.canvaId}
                    title={template.title}
                    hasThumbnail={Boolean(template.thumbnailKey)}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <CardHeader>
                    <CardTitle>{template.title}</CardTitle>
                    <CardDescription>
                      {template.fields.length} field{template.fields.length === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {template.fields.slice(0, 4).map((field) => (
                        <Badge key={field.name} variant="secondary">
                          {field.name}
                        </Badge>
                      ))}
                      {template.fields.length > 4 && (
                        <Badge variant="outline">+{template.fields.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
