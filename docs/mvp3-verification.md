# MVP 3 — Content Creation & Management: Verification

Reproducible verification steps for MVP 3 from a clean environment.
Companion evidence lives in `docs/evidence/`.

## Prerequisites

- Postgres up (`docker compose up -d postgres`), local port `5434` on this
  machine (`POSTGRES_PORT` override; see `docs/handoff.md`).
- Canva app configured with `asset:read` + `asset:write` scopes enabled in the
  Developer Portal and re-authorized once (required for image upload/live
  generation — the app requests these in `CANVA_SCOPES`).
- A brand template tagged `flow-template` synced via "Sync now" on `/templates`.

## Automated checks

From `backend/`:

```sh
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint --max-warnings=0
pnpm test        # vitest run
```

Result (this milestone):

```text
Test Files  5 passed (5)
Tests       31 passed (31)   # includes 22 new Content module tests
```

Frontend (`frontend/`):

```sh
pnpm typecheck
pnpm lint
pnpm build      # production build passes for all routes
```

## API lifecycle smoke test (no Canva required)

With the backend running (`backend`: `pnpm dev`):

```sh
# 1. create content from a template (201, UNFINISHED + template snapshot)
curl -X POST http://127.0.0.1:3001/content \
  -H 'Content-Type: application/json' \
  -d '{"templateCanvaId":"<canvaId>"}'

# 2. save draft (200, status DRAFT; partial data allowed)
curl -X PUT http://127.0.0.1:3001/content/<id> \
  -H 'Content-Type: application/json' \
  -d '{"fieldValues":{"TITLE":{"type":"text","text":"Hello"}}}'

# 3. status filter
curl "http://127.0.0.1:3001/content?status=draft"

# 4. ready guard (422 + missing list; no design has been generated)
curl -X POST http://127.0.0.1:3001/content/<id>/ready

# 5. delete (204, row + stored objects removed)
curl -X DELETE http://127.0.0.1:3001/content/<id>
```

## Browser verification (chrome-devtools MCP)

Verified against the production build (`next build` + `next start`, backend on
`3001`, frontend on `3000`) — see `docs/handoff.md` for the Brave/HMR caveat.

1. **Library empty state** — `/content` shows the four filter tabs and the
   empty-state message. `docs/evidence/mvp3-content-library.png` (with an item).
2. **Use template** — `/templates/<canvaId>` → "Use template" creates an
   UNFINISHED record and opens the editor.
3. **Dynamic form** — text field renders an input; image field renders a file
   picker + "No image" placeholder; unsupported types (chart/sheet) show a
   read-only note.
4. **Save draft** — status becomes DRAFT, notice "Draft saved." appears, values
   persist across reload.
5. **Save as ready (guard)** — with a required field empty, the UI shows
   "Complete all required fields before marking ready." and an inline
   "required image field is missing" under the field, while status stays DRAFT.
   `docs/evidence/mvp3-content-editor-ready-guard.png`.
6. **Generation guard (no auth)** — "Generate design" with Canva
   disconnected shows "Not authenticated with Canva. Reconnect from the
   Templates page." `docs/evidence/mvp3-content-editor-errors.png`.
7. **Image upload guard (no auth)** — choosing a file shows
   "Not authenticated with Canva." and does not set the value (proves the
   upload reaches the service; success path requires a live Canva token).
8. **Library filter + delete** — item appears under All/Drafts; delete asks for
   confirmation and removes the record.

## Live Canva checks (pending user action)

Requires the Canva authorization renewal described above:

- Upload a real image for an image field → asset id stored, preview served
  from `GET /content/:id/assets/:fieldName`.
- Generate a design → job polled to success → design reference + thumbnail
  persisted → "Edit in Canva" link opens the editor.
- Mark ready after generation + all fields → status READY.

## Known issues / notes

- Canva token is in-memory (`TokenStore`); after a backend restart the user
  must re-authorize once. The new `asset:read`/`asset:write` scopes are why a
  re-authorization is needed at all.
- Omitted Autofill fields use the template's default value (verified against
  Canva docs); the UI notes this on the editor.
- Design thumbnail URLs expire after 15 minutes, so thumbnails are downloaded
  into local storage at generation time.
- Ready-guard treats every text/image field as required (no per-field "optional"
  flag yet); chart/sheet fields are excluded (template default applies).
- Template-field changes after content creation do not retro-update existing
  content (provenance is snapshotted).
- Server-side polling for asset upload and generation; a stuck `in_progress`
  finalizes when the editor is reopened (`GET /content/:id`).