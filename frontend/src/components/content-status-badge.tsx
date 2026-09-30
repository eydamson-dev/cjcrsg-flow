"use client";

import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  UNFINISHED: { label: "Unfinished", variant: "outline" },
  DRAFT: { label: "Draft", variant: "secondary" },
  READY: { label: "Ready", variant: "default" },
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}