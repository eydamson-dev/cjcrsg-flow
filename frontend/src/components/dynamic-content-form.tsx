"use client";

import { ChangeEvent, useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contentAssetUrl, type ContentFieldValue, type TemplateField } from "@/lib/api";

interface DynamicContentFormProps {
  contentId: string;
  fields: TemplateField[];
  values: Record<string, ContentFieldValue>;
  onChange: (fieldName: string, value: ContentFieldValue | null) => void;
  onUploadImage: (fieldName: string, file: File) => Promise<void>;
  uploading: Set<string>;
  errorFor: (fieldName: string) => string | null;
}

export function DynamicContentForm({
  contentId,
  fields,
  values,
  onChange,
  onUploadImage,
  uploading,
  errorFor,
}: DynamicContentFormProps) {
  const sorted = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-5">
      {sorted.map((field) => {
        const error = errorFor(field.name);

        if (field.type === "chart" || field.type === "sheet") {
          return (
            <div key={field.name} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm">{field.name}</p>
                <p className="text-xs text-muted-foreground">
                  {field.type} fields are filled from the template default in Canva.
                </p>
              </div>
              <Badge variant="outline">{field.type}</Badge>
            </div>
          );
        }

        if (field.type === "image") {
          return (
            <ImageField
              key={field.name}
              field={field}
              value={values[field.name]}
              contentId={contentId}
              uploading={uploading.has(field.name)}
              error={error}
              onChange={onChange}
              onUploadImage={onUploadImage}
            />
          );
        }

        const fieldValue = values[field.name];
        const textValue = fieldValue?.type === "text" ? fieldValue.text : "";

        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`field-${field.name}`}>
              <span className="font-mono">{field.name}</span>
              {field.type !== "text" && (
                <Badge variant="outline" className="ml-1">
                  {field.type}
                </Badge>
              )}
            </Label>
            <Input
              id={`field-${field.name}`}
              value={textValue}
              aria-invalid={Boolean(error)}
              onChange={(event) =>
                onChange(field.name, { type: "text", text: event.target.value })
              }
            />
            {error && <FieldError message={error} />}
          </div>
        );
      })}
    </div>
  );
}

function ImageField({
  field,
  value,
  contentId,
  uploading,
  error,
  onChange,
  onUploadImage,
}: {
  field: TemplateField;
  value: ContentFieldValue | undefined;
  contentId: string;
  uploading: boolean;
  error: string | null;
  onChange: (fieldName: string, value: ContentFieldValue | null) => void;
  onUploadImage: (fieldName: string, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await onUploadImage(field.name, file);
  }

  const hasImage = value?.type === "image" && value.assetId !== "";

  return (
    <div className="space-y-1.5">
      <Label>
        <span className="font-mono">{field.name}</span>
        <Badge variant="outline" className="ml-1">
          image
        </Badge>
      </Label>
      <div className="flex items-start gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={`Upload image for ${field.name}`}
          onChange={handleChange}
          disabled={uploading}
        />
        <div className="flex-1 space-y-2">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contentAssetUrl(contentId, field.name)}
              alt={`${field.name} preview`}
              className="max-h-40 w-40 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              {uploading ? <Loader2 className="animate-spin" /> : "No image"}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {uploading ? "Uploading…" : hasImage ? "Replace" : "Choose image"}
            </Button>
            {hasImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange(field.name, null)}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs text-destructive">{message}</p>;
}