"use client";

import { useState } from "react";
import { cn } from "cn";
import { contentThumbnailUrl } from "@/lib/api";

export function ContentThumbnail({
  contentId,
  title,
  hasThumbnail,
  className,
}: {
  contentId: string;
  title: string;
  hasThumbnail: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!hasThumbnail || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-sm text-muted-foreground",
          className,
        )}
      >
        No preview
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={contentThumbnailUrl(contentId)}
      alt={`${title} design preview`}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}