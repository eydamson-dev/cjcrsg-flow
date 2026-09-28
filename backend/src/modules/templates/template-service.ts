import type { StorageService } from "../../storage/storage-service.js";
import type {
  BrandTemplate,
  BrandTemplateDataset,
} from "../canva/canva-client.js";
import type {
  TemplateFieldRecord,
  TemplateRecord,
  TemplateRepository,
} from "./template-repository.js";

const THUMBNAIL_KEY_PREFIX = "thumbnails";

// The subset of the Canva integration the template sync depends on.
export interface BrandTemplateSource {
  listAllBrandTemplates(): Promise<BrandTemplate[]>;
  getBrandTemplateDataset(id: string): Promise<BrandTemplateDataset>;
}

export interface SyncLogger {
  warn(obj: unknown, msg?: string): void;
}

export interface SyncResult {
  templates: number;
  fields: number;
  thumbnails: number;
  skipped: number;
  removed: number;
}

interface StoredThumbnail {
  key: string;
  contentType: string;
}

export class TemplateService {
  constructor(
    private readonly canva: BrandTemplateSource,
    private readonly repository: TemplateRepository,
    private readonly storage: StorageService,
  ) {}

  // Pulls the full template list and each template's Autofill fields from Canva,
  // then upserts a local cache. Canva remains the source of truth.
  // A failure on one template is isolated: it is skipped and counted, and the
  // rest of the sync continues.
  async sync(log?: SyncLogger): Promise<SyncResult> {
    const templates = await this.canva.listAllBrandTemplates();
    const returnedIds = templates.map((template) => template.id);

    let fieldCount = 0;
    let thumbnailCount = 0;
    let skipped = 0;

    for (const template of templates) {
      try {
        const dataset = await this.canva.getBrandTemplateDataset(template.id);
        const fields = mapDatasetFields(dataset.dataset);

        const thumbnail = template.thumbnail?.url
          ? await this.storeThumbnail(template.id, template.thumbnail.url, log)
          : null;

        await this.repository.upsert({
          canvaId: template.id,
          title: template.title,
          ...(thumbnail
            ? { thumbnailKey: thumbnail.key, thumbnailContentType: thumbnail.contentType }
            : {}),
          viewUrl: template.view_url ?? null,
          createUrl: template.create_url ?? null,
          canvaCreatedAt: toDate(template.created_at),
          canvaUpdatedAt: toDate(template.updated_at),
          fields,
        });

        fieldCount += fields.length;
        thumbnailCount += thumbnail ? 1 : 0;
      } catch (error) {
        skipped += 1;
        log?.warn({ canvaId: template.id, error }, "Skipped template during sync.");
      }
    }

    // Remove cached templates that are no longer in the (filtered) Canva list.
    const removed = await this.repository.deleteNotIn(returnedIds);

    return {
      templates: templates.length,
      fields: fieldCount,
      thumbnails: thumbnailCount,
      skipped,
      removed,
    };
  }

  list(): Promise<TemplateRecord[]> {
    return this.repository.list();
  }

  get(canvaId: string): Promise<TemplateRecord | null> {
    return this.repository.findByCanvaId(canvaId);
  }

  private async storeThumbnail(
    canvaId: string,
    url: string,
    log?: SyncLogger,
  ): Promise<StoredThumbnail | null> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        log?.warn({ canvaId, status: response.status }, "Thumbnail download failed; skipping.");
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "image/png";
      const bytes = new Uint8Array(await response.arrayBuffer());
      const key = `${THUMBNAIL_KEY_PREFIX}/${canvaId}`;
      await this.storage.write(key, bytes);

      return { key, contentType };
    } catch (error) {
      // A thumbnail failure must not fail the whole sync.
      log?.warn({ canvaId, error }, "Thumbnail download failed; skipping.");
      return null;
    }
  }
}

function mapDatasetFields(
  dataset: Record<string, { type: string }> | undefined,
): TemplateFieldRecord[] {
  return Object.entries(dataset ?? {}).map(([name, definition], position) => ({
    name,
    type: definition.type,
    position,
  }));
}

function toDate(epochSeconds: number | undefined): Date | null {
  return typeof epochSeconds === "number" ? new Date(epochSeconds * 1000) : null;
}
