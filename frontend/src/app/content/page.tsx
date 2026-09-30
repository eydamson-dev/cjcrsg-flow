"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  ApiError,
  deleteContent,
  listContent,
  type ContentRecord,
  type ContentStatus,
} from "@/lib/api";
import { cn } from "cn";

type ContentFilter = "all" | ContentStatus;

const FILTERS: Array<{ key: ContentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "UNFINISHED", label: "Unfinished" },
  { key: "DRAFT", label: "Drafts" },
  { key: "READY", label: "Ready" },
];

export default function ContentLibraryPage() {
  const [items, setItems] = useState<ContentRecord[] | null>(null);
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (active: ContentFilter) => {
    try {
      const result = await listContent(active);
      setItems(result);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load content.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    listContent("all")
      .then((result) => {
        if (!cancelled) {
          setItems(result);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Failed to load content.");
        setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(record: ContentRecord) {
    if (!window.confirm(`Delete "${record.templateTitle}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(record.id);
    setError(null);

    try {
      await deleteContent(record.id);
      await load(filter);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to delete content.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Content created from your Canva templates.
          </p>
        </div>
        <Button asChild>
          <Link href="/templates">
            <Plus />
            New content
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.key}
            variant={filter === option.key ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setFilter(option.key);
              void load(option.key);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8">
        {items === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No content here yet. Choose a template from the Templates page to start.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((record) => (
              <Card key={record.id} className="flex h-full flex-col overflow-hidden">
                <Link href={`/content/${record.id}`} className="flex-1">
                  <ContentThumbnail
                    contentId={record.id}
                    title={record.templateTitle}
                    hasThumbnail={Boolean(record.designId)}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-base">{record.templateTitle}</CardTitle>
                    <CardDescription>Edited {formatDate(record.updatedAt)}</CardDescription>
                  </CardHeader>
                </Link>
                <CardContent className="flex items-center justify-between gap-2">
                  <ContentStatusBadge status={record.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${record.templateTitle}`}
                    disabled={deleting === record.id}
                    className={cn("text-muted-foreground", "hover:text-destructive")}
                    onClick={() => void handleDelete(record)}
                  >
                    <Trash2 />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}