"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ApiError,
  facebookAuthorizeUrl,
  fetchFacebookStatus,
  listFacebookPages,
  listPublications,
  publishContent,
  publicationMediaUrl,
  type FacebookPage,
  type FacebookStatus,
  type Publication,
  type PublicationStatus,
} from "@/lib/api";

const BADGE: Record<
  PublicationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  PUBLISHING: { label: "Publishing", variant: "secondary" },
  PUBLISHED: { label: "Published", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

interface FacebookPublishCardProps {
  contentId: string;
  canPublish: boolean;
}

export function FacebookPublishCard({ contentId, canPublish }: FacebookPublishCardProps) {
  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchFacebookStatus(), listPublications(contentId)])
      .then(([facebookStatus, existing]) => {
        if (cancelled) {
          return;
        }

        setStatus(facebookStatus);
        setPublication(existing[0] ?? null);

        if (!facebookStatus.connected) {
          return;
        }

        return listFacebookPages().then((available) => {
          if (cancelled) {
            return;
          }

          setPages(available);
          setPageId((current) => current || available[0]?.pageId || "");
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to load Facebook status.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  async function handlePublish() {
    setPublishing(true);
    setError(null);

    try {
      const result = await publishContent(contentId, {
        pageId,
        caption: caption.trim() || undefined,
      });
      setPublication(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  const connected = status?.connected ?? false;
  const canSubmit = canPublish && connected && pageId !== "" && !publishing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish to Facebook</CardTitle>
        <CardDescription>
          Publishes the generated design to the selected Page immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && !status.configured && (
          <p className="text-sm text-muted-foreground">
            Facebook is not configured on the server.
          </p>
        )}

        {status && status.configured && !connected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect a Facebook Page to publish content.
            </p>
            <Button asChild className="w-full">
              <a href={facebookAuthorizeUrl()}>Connect Facebook Page</a>
            </Button>
          </div>
        )}

        {connected && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="facebook-page">
                Page
              </label>
              <select
                id="facebook-page"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={pageId}
                onChange={(event) => setPageId(event.target.value)}
              >
                {pages.map((page) => (
                  <option key={page.pageId} value={page.pageId}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="facebook-caption">
                Caption
              </label>
              <textarea
                id="facebook-caption"
                className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                placeholder="Write a caption…"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
            </div>

            <Button className="w-full" disabled={!canSubmit} onClick={() => void handlePublish()}>
              {publishing ? <Loader2 className="animate-spin" /> : <Send />}
              {publishing ? "Publishing…" : "Publish now"}
            </Button>

            {!canPublish && (
              <p className="text-xs text-muted-foreground">
                Mark this content ready (with a generated design) to publish.
              </p>
            )}
          </>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {publication && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{publication.facebookPageName}</span>
              <Badge variant={BADGE[publication.status].variant}>
                {BADGE[publication.status].label}
              </Badge>
            </div>

            {publication.status === "PUBLISHED" && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {publication.facebookPostId && <p>Post ID: {publication.facebookPostId}</p>}
                {publication.publishedAt && (
                  <p>Published {formatDate(publication.publishedAt)}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {publication.facebookPostId && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://www.facebook.com/${publication.facebookPostId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View post
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm">
                    <a href={publicationMediaUrl(publication.id)} target="_blank" rel="noreferrer">
                      Published image
                      <ExternalLink />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {publication.status === "FAILED" && (
              <div className="space-y-1 text-xs text-destructive">
                <p>{publication.errorMessage ?? "Publishing failed."}</p>
                {publication.errorCode !== null && (
                  <p>
                    Code {publication.errorCode}
                    {publication.errorSubcode !== null ? ` / ${publication.errorSubcode}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
