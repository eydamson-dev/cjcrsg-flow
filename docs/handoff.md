# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 4 — Facebook Publishing** — IMPLEMENTED on `milestone/mvp4-facebook`; PR prepared, awaiting user verification. Publish Ready content immediately to a connected Facebook Page: Facebook page connection (auth + permissions + page identification), publishing configuration (caption + target page + immediate publish), programmatic preparation of the generated Canva design as media (no manual download), and a Ready → Publishing → Published/Failed status workflow that records the Facebook Post ID, timestamp, and failure info. See `ROADMAP.md` §MVP 4.

**API research gate COMPLETE** (Meta Graph API v26.0, verified against official docs). **Architecture DESIGNED** and implemented. Locked decisions: separate `Publication` record (Content stays `READY`); append-only (multiple posts per Content); **synchronous** publish; export **PNG**; failed attempts return `201` with `status: "FAILED"`. **Live Facebook publish is NOT yet exercised** — this environment has no Meta app configured; user verification is the remaining step.

## Done

**MVP 4 — Facebook Publishing: RESEARCH + ARCHITECTURE COMPLETE** (implementation NOT STARTED).
- Research gate (api-researcher, Meta Graph API v26.0): scopes `pages_show_list` / `pages_read_engagement` / `pages_manage_posts`; page token via `GET /me/accounts`; long-lived user token (`fb_exchange_token`) → **non-expiring** long-lived Page token; publish a local image with `POST /{page-id}/photos` (multipart binary) + `caption` (`message`/`name` deprecated; `/feed` cannot ingest a local image); `published=true` default; success returns `{ id, post_id }` with no timestamp (`created_time` via GET); error object (`code`/`error_subcode`/`message`/`fbtrace_id`); photos ≤ 10 MB (PNG < 1 MB recommended). **Standard Access suffices** for a private single-user app whose user holds a role on the Meta app (no App Review / Business Verification). Scheduling supported (`scheduled_publish_time`, 10 min–75 days) but deferred to MVP 5; reschedule/cancel remain UNVERIFIED.
- `PROJECT.md` §13 updated with the verified Facebook capability table + notes (18 rows).
- Architecture (architect): `FacebookPage` (persisted non-expiring Page token) + `Publication` (append-only; `PUBLISHING`/`PUBLISHED`/`FAILED`, page snapshot, caption, designId, mediaKey, post id/photo id, publishedAt, structured error); `modules/facebook` + `modules/publication`; synchronous `POST /content/:id/publish` = export PNG → durable key `exports/<contentId>/<designId>.png` → multipart `/photos` → `created_time`; `GET /publications/:id/media` resolves the MVP 1 stored-export read deferral; frontend "Publish to Facebook" card in `/content/[id]`; new env `FACEBOOK_APP_ID`/`_SECRET`/`_REDIRECT_URI`; no new npm deps.
- Implementation COMPLETE (`milestone/mvp4-facebook`, **PR #4** open — awaiting user verification): Prisma `PublicationStatus`/`FacebookPage`/`Publication` + migration `20261001073548_facebook_publication`; backend `modules/facebook` (`oauth.ts`, `meta-error.ts`, `meta-client.ts`, `pending-auth-store.ts`, `facebook-page-repository.ts` + Prisma impl, `facebook-service.ts`) and `modules/publication` (`publication-repository.ts` + Prisma impl, `publication-service.ts`); routes `facebook-routes.ts` + `publication-routes.ts`; `env.ts` + `docker-compose.yml` + `.env.example` + `app.ts` wiring; frontend `lib/api.ts`, `facebook-publish-card.tsx`, editor integration, `/content` OAuth banner. 60 backend tests (23 new), lint/typecheck/build clean both apps, API smoke OK, publish card rendered (`docs/evidence/mvp4-publish-card.png`). Guide: `docs/mvp4-verification.md`.

**MVP 3 — Content Creation & Management: COMPLETE and merged** (PR #3 into `main`).
- Backend: `Content`/`ContentStatus`/`ContentAsset` models (snapshot provenance), Content module (repository → prisma → service → routes), generation with poll-driven once-guarded finalize + thumbnail storage, raw-binary image upload → Canva asset + local copy, StorageService.delete, shared image content-type helper.
- Research gate (api-researcher): asset upload SUPPORTED (POST /rest/v1/asset-uploads, asset:read+asset:write, 15-min thumbnails, partial autofill keeps template defaults). `PROJECT.md` §13 updated.
- Frontend: `/content` library (filters + delete), `/content/[id]` editor (dynamic form, generate/poll, Edit in Canva, save draft/ready), "Use template" entry, nav link.
- Verification: 37 backend tests (27 new), lint+typecheck clean both apps, production build OK, API lifecycle smoke OK, browser flow OK (create → draft → ready-guard → filter → delete; upload/generate error paths). **Live Canva verification COMPLETE**: real image upload → asset + preview; Autofill generation → design reference + thumbnail + Edit/View in Canva; all fields + design → READY. Evidence in `docs/evidence/mvp3-content-*.png`.
- Two bugs found via browser verification and fixed: CORS methods (PUT/DELETE) + Fastify 415 on binary uploads (wildcard parser).

**MVP 2 — Template Management: COMPLETE and merged** (PR #2 into `main`). Templates tagged `flow-template` are pulled from Canva into a local PostgreSQL cache (paginated), the library and detail views render them with thumbnails, and an explicit sync refreshes and prunes the cache. Evidence and reproducible steps in `docs/mvp2-verification.md`.

**MVP 1 — Canva Integration: COMPLETE and merged** (PR #1 into `main`). OAuth (PKCE) → brand templates → dataset field discovery → autofill → export/download via `StorageService`. Evidence in `docs/mvp1-verification.md`.

Foundation in place:
- pnpm workspace: `frontend/` (Next.js 16, React, TypeScript, Tailwind, shadcn/ui) + `backend/` (Fastify, TypeScript).
- Prisma + PostgreSQL (now actively used: `Template`, `TemplateField`), Docker Compose (postgres/backend/frontend), local-filesystem storage behind `StorageService`.
- Backend Canva module (`oauth.ts`, `canva-client.ts`, `token-store.ts`, `canva-service.ts`, `canva-routes.ts`) and Templates module (`template-repository.ts`, `prisma-template-repository.ts`, `template-service.ts`, `template-routes.ts`).

## Next

1. **User verification (blocking):** configure a Meta app (three permissions under Standard Access + exact redirect URI) and `FACEBOOK_*` env, connect a Page, then publish a READY content from `/content/[id]`; confirm the Facebook post id/timestamp and a failure path. Review the PR with its inline steps + evidence.
2. After sign-off: merge the PR, then update this handoff and the Obsidian vault (Definition of Done) and begin MVP 5 planning.
3. If a live publish surfaces a defect, fix on `milestone/mvp4-facebook` and re-verify before merging.

## Constraints

- One milestone at a time; do not skip or auto-start the next MVP.
- API research is a hard gate; never invent endpoints/permissions/behavior.
- Clarify before adding anything not explicitly requested.
- Verification-first; never report completion without evidence.
- Do not hardcode content categories; templates and fields are generic.
- Field types are Canva-owned → stored as free-form strings (no enum).
- Canva remains the source of truth; the app stores a synced local cache.
- All file access through the storage abstraction.
- Frontend must not hold platform credentials.
- Only templates tagged `flow-template` are pulled (Canva `query` search; no dedicated tag API).
- Facebook publish exports **PNG**; enforce a hard ≤ 10 MB guard before upload (Meta recommends PNG < 1 MB; oversize → recorded FAILED, no JPG fallback).
- Meta setup prerequisite (not code): the app must hold `pages_show_list`/`pages_read_engagement`/`pages_manage_posts` under Standard Access and the sole user must hold an Admin/Developer/Tester role on the Meta app; `FACEBOOK_REDIRECT_URI` registered exactly (HTTPS required except localhost).

## Reminders / Notes

- **File-upload UX gotcha (chrome-devtools MCP):** in a tab driven by the MCP, an earlier automated `upload_file` call enables file-chooser interception, so the native OS file picker stops appearing for real human clicks in that tab (symptom: click does nothing, no console error; the click still focuses the input). Test real user clicks in a fresh tab/window — not the tab the agent drove. The image input uses a `<label htmlFor>` + `sr-only` input (robust + fixes the label a11y warning).

- **PR descriptions must carry the verification steps inline** (commands, click-through, expected results) and the evidence links — the user verifies directly from the PR page. A linked `docs/<milestone>-verification.md` is a supplement, not a substitute. AGENTS.md now says so explicitly.

- Backend framework: Fastify. Ports: frontend `3000`, backend `3001`, PostgreSQL `5432` (this machine uses `POSTGRES_PORT` override — see below).
- **Dev-server caveat:** Brave blocks the Next dev HMR WebSocket on this machine, which prevented client hydration in `next dev`. Verification used the production build (`next build` + `next start` / Docker). A normal browser does not have this issue.
- Postgres host port is configurable via `POSTGRES_PORT` (compose default `5432`; this machine's local `.env` uses `5434` because `5432`/`5433` are taken by other projects). `DATABASE_URL` must match.
- Host-based Prisma commands need `DATABASE_URL` exported explicitly (Prisma does not read the repo-root `.env` from the `backend/` cwd).
- Thumbnails are downloaded into `StorageService` (`thumbnails/<canvaId>`) because Canva thumbnail URLs expire after 15 minutes. Orphan thumbnails are not pruned.
- Sync fetches each template's dataset sequentially; fine at current scale, parallelize later within the 100 req/min limit.
- Canva access token is still in-memory; re-run OAuth after a backend restart.
- Autofill has **no published usage quota** today (Canva: "usage limits will be introduced in the future") — re-check before high volumes.
- Deferred from MVP 1 (still open): `/canva/*` and `/templates/*` are not app-authenticated; in-memory token store; pending-auth TTL; `DatasetValue` lacks chart/sheet; env loading is cwd-fragile; stored exports have no read route (needed for MVP 4 Facebook media).
- Deferred from MVP 2: prune orphaned thumbnails; overlapping syncs are not single-flighted; pagination cap not surfaced.
- `handoff` skill loads/updates this file; run it on milestone start/finish.
- Obsidian vault has `Projects/CJCRSG-Flow.md` for durable project memory.
- Canva/Facebook capability baseline table is in `PROJECT.md` §13.
- MVP 4 architecture decisions (locked): separate `Publication` record (Content stays `READY`); append-only multi-post; **synchronous** publish (`POST /content/:id/publish` runs export+upload inline); export **PNG**; failures return `201` + `status: "FAILED"`. Page token persisted in Postgres (plaintext); user token used only during callback and discarded; OAuth `state` in-memory.
- MVP 4 design details (interfaces, routes, storage key scheme, error mapping, frontend card) are captured in the Obsidian vault `Projects/CJCRSG-Flow.md`.
