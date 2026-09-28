# MVP 2 Verification

Verification record for **MVP 2 — Template Management**. Branch: `milestone/mvp2-templates`.

## Requirements (Definition of Done)

From `ROADMAP.md` §MVP 2. The application displays Canva templates and understands the fields
required by each template.

Acceptance criteria:

- 2.1 Template Retrieval — retrieve templates from Canva.
- 2.2 Template Library — display template name, thumbnail/preview, and basic metadata.
- 2.3 Template Selection — allow the user to select a template.
- 2.4 Field Discovery — retrieve Autofill fields and their types.
- 2.5 Generic Template Model — store template metadata, field definitions, and Canva identifiers
  without hardcoding content categories.
- 2.6 Template Synchronization — refresh template information from Canva when required.

## API research (hard gate)

Verified against the official Canva REST API reference before implementation:

| Item | Result |
| ---- | ------ |
| `GET /v1/brand-templates` | SUPPORTED. Returns `id`, `title`, `view_url`, `create_url`, `created_at`, `updated_at`, `thumbnail{width,height,url}`; paginated (`continuation`, `limit` max 100). Rate limit **100 req/min per user**. Scope `brandtemplate:meta:read`. |
| `GET /v1/brand-templates/{id}/dataset` | SUPPORTED. Returns `dataset: { fieldName: { type } }` with types `text`, `image`, `chart`, `sheet`. Rate limit **100 req/min per user**. Scope `brandtemplate:content:read`. |
| Autofill usage limits | **No documented usage limit at this time.** The Autofill guide states: "Usage limits will be introduced in the future." (This corrects the earlier "limited development trial quota" note; see `PROJECT.md` §13.) |
| Thumbnail URL lifetime | **15 minutes.** The thumbnail URL is temporary, so a stored-only reference is not viable. Thumbnails are downloaded into `StorageService` during sync and served from the backend. |

## Design decisions

- **Persistence:** thin local cache + explicit sync. Canva remains the source of truth; the
  application stores a local mirror in PostgreSQL (`Template`, `TemplateField`) keyed by Canva ID.
- **Sync:** one "Sync now" action pulls the full template list (paginated) and each template's
  dataset, then upserts the local cache. Fields are replaced per sync to track Canva deletions.
- **Tag filter:** only brand templates carrying the Canva keyword `flow-template` are pulled. Canva
  exposes no dedicated tag filter, so the list request passes `query=flow-template` (full-text
  search matching title and keywords). Templates not returned are pruned from the local cache.
- **Field types:** stored as free-form strings (Canva owns the vocabulary and may add types); a
  TypeScript union documents the known values.
- **Thumbnails:** downloaded to `StorageService` at sync time (`thumbnails/<canvaId>`) and served
  via `GET /templates/:canvaId/thumbnail`, because Canva thumbnail URLs expire after 15 minutes.
  Canva sometimes returns the non-standard `image/jpg`; the route normalizes it to `image/jpeg`.
- **Auth:** template endpoints remain unauthenticated (private-network assumption, deferred from
  MVP 1).

## Prerequisites

- Canva developer app configured as in `docs/mvp1-verification.md` (scopes include
  `brandtemplate:content:read` and `brandtemplate:meta:read`).
- Repo-root `.env` with Canva credentials and a reachable `DATABASE_URL`.
- Node.js 24, pnpm 12, Docker (for PostgreSQL).

## Test steps

### Step 0 — Install and start the database

```sh
pnpm install
docker compose up -d postgres
```

### Step 1 — Apply migrations

Migrations are applied automatically by the Docker backend. For host-based development, run:

```sh
DATABASE_URL='postgresql://cjcrsg_flow:cjcrsg_flow@127.0.0.1:5432/cjcrsg_flow?schema=public' \
  pnpm --filter @cjcrsg-flow/backend exec prisma migrate deploy
```

### Step 2 — Run the app

Option A — local (two terminals):

```sh
pnpm --filter @cjcrsg-flow/backend dev     # http://127.0.0.1:3001
pnpm --filter @cjcrsg-flow/frontend dev    # http://127.0.0.1:3000
```

Option B — Docker:

```sh
docker compose up --build
```

### Step 3 — Connect Canva

1. Open http://127.0.0.1:3000/templates.
2. Click **Connect to Canva** and **Allow** on the consent screen.

### Step 4 — Sync and inspect templates

1. Click **Sync now**. The library shows the templates retrieved from Canva.
2. Click a template to open its detail view: metadata, links, and the discovered Autofill fields
   with their types.

### Step 5 — API checks

```sh
curl http://127.0.0.1:3001/canva/status
curl http://127.0.0.1:3001/templates
curl http://127.0.0.1:3001/templates/EAHWepv4UXY
curl -X POST http://127.0.0.1:3001/templates/sync
curl -s -D - -o /dev/null http://127.0.0.1:3001/templates/EAHWepv4UXY/thumbnail
```

### Step 6 — Automated checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
docker compose config
```

## Test evidence

### Visual evidence

- ![Template library](evidence/mvp2-template-library.png) — `/templates` after a live sync, showing
  both Canva brand templates, downloaded thumbnails, field counts, and field-name badges.
- ![Template detail](evidence/mvp2-template-detail.png) — `/templates/EAHWepv4UXY`, showing
  metadata, Canva links, and the four discovered Autofill fields (`body`, `heading`, `subheading`
  = `text`; `background-image` = `image`).

### Automated tests

```text
 RUN  v3.2.7 /home/eydamson/projects/cjcrsg-flow/backend

 ✓ src/modules/canva/token-store.test.ts (2 tests)
 ✓ src/modules/canva/oauth.test.ts (2 tests)
 ✓ src/storage/local-filesystem-storage.test.ts (2 tests)
 ✓ src/modules/templates/template-service.test.ts (4 tests)

 Test Files  4 passed (4)
      Tests  10 passed (10)
```

`pnpm typecheck`, `pnpm lint`, `pnpm build`, and `docker compose config` all pass.

New unit tests cover the sync service: metadata/field mapping, thumbnail download and storage,
preservation of a cached thumbnail when a download fails, and per-template failure isolation
(skipped count).

### API evidence

`POST /templates/sync` (2.6) — with the `flow-template` filter, the untagged template was pruned:

```json
{"templates":2,"fields":7,"thumbnails":2,"skipped":0,"removed":0}
```

`GET /templates` (2.1, 2.2, 2.5) — only `flow-template`-tagged templates remain:

```json
{
  "items": [
    {
      "canvaId": "EAHWepv4UXY",
      "title": "test-template-1",
      "thumbnailKey": "thumbnails/EAHWepv4UXY",
      "thumbnailContentType": "image/jpg",
      "viewUrl": "https://www.canva.com/brand/brand-templates/EAHWepv4UXY",
      "createUrl": "https://www.canva.com/design?create=true&template=EAHWepv4UXY",
      "canvaCreatedAt": "2026-09-28T10:55:07.000Z",
      "canvaUpdatedAt": "2026-09-28T10:56:19.000Z",
      "syncedAt": "2026-09-28T15:33:08.096Z",
      "fields": [
        { "name": "body", "type": "text", "position": 0 },
        { "name": "heading", "type": "text", "position": 1 },
        { "name": "subheading", "type": "text", "position": 2 },
        { "name": "background-image", "type": "image", "position": 3 }
      ]
    },
    {
      "canvaId": "EAHWgBgslXY",
      "title": "test-template-2",
      "fields": [
        { "name": "text-area", "type": "text", "position": 0 },
        { "name": "heading", "type": "text", "position": 1 },
        { "name": "background-video", "type": "image", "position": 2 }
      ]
    }
  ]
}
```

`GET /templates/EAHWepv4UXY/thumbnail` (2.2) — served from local storage:

```text
HTTP/1.1 200 OK
content-type: image/jpeg
x-content-type-options: nosniff
cache-control: public, max-age=60
content-length: 49736
```

`GET /templates/NOPE` → `404`.

### Database evidence

```text
   canvaId   |       title        | thumb |        syncedAt
-------------+--------------------+-------+-------------------------
 EAHWepv4UXY | test-template-1    | t     | 2026-09-28 15:33:51.865
 EAHWgBgslXY | test-template-2    | t     | 2026-09-28 15:33:52.264

       title      |      name        | type  | position
 -----------------+------------------+-------+----------
 test-template-1 | body             | text  |        0
 test-template-1 | heading          | text  |        1
 test-template-1 | subheading       | text  |        2
 test-template-1 | background-image | image |        3
 test-template-2 | text-area        | text  |        0
 test-template-2 | heading          | text  |        1
 test-template-2 | background-video | image |        2
```

Thumbnails stored via `StorageService` under `backend/data/storage/thumbnails/`.

### Docker evidence

```text
backend-1  | 1 migration found in prisma/migrations
backend-1  | No pending migrations to apply.
backend-1  | {"msg":"Server listening at http://127.0.0.1:3001"}
```

The Docker backend applies migrations on startup and serves the cached templates.

## Known issues / deferred

- Thumbnails are re-downloaded on every sync; orphaned thumbnail files are not pruned when a
  template's thumbnail changes form or the template disappears.
- If a new thumbnail download fails, the previously cached thumbnail is preserved (by design), so
  the preview can be stale until a later successful sync.
- Sync fetches each template's dataset sequentially (N dataset calls per sync). A per-template
  failure is isolated and counted (`skipped`) rather than aborting the sync, but there is no 429
  backoff/retry.
- Brand-template pagination is capped at 20 pages (2,000 templates) as a loop guard; hitting the
  cap is not surfaced.
- Overlapping `POST /templates/sync` requests are not single-flighted; a slower older sync could
  overwrite a newer one.
- Field types remain free-form strings; unknown future Canva types are stored and displayed as-is.
- Template/thumbnail endpoints remain unauthenticated (private-network assumption, deferred).
- The Canva access token is still in-memory only; re-authenticate after a backend restart.
- The tag filter uses Canva's `query` search (no dedicated tag API); if `flow-template` matches a
  template's title or keywords, it is pulled. This is the intended behavior, but the match is
  Canva's search semantics, not an explicit tag lookup.
