# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 3 — Content Creation & Management** — IMPLEMENTED, awaiting live-Canva verification + review + user verification. Branch `milestone/mvp3-content`. Content created from templates (snapshot provenance), dynamic text/image forms, Autofill generation with poll-driven finalize, "Edit in Canva", status workflow (Unfinished → Draft → Ready), library with filters, delete. Backend + frontend verified (31 unit tests, API lifecycle smoke, browser verification via chrome-devtools MCP — found & fixed two bugs: CORS PUT/DELETE and Fastify 415 on binary uploads).

Locked decisions (user-approved, do not revisit):
- Image fields via Canva asset upload are IN SCOPE (`asset:read` + `asset:write` added to `CANVA_SCOPES`; needs portal enable + one re-auth).
- Field values stored as JSONB on Content; ContentAsset rows store local image copies for preview.
- Status: UNFINISHED = created-from-template, never saved; DRAFT = any "save draft" (never blocked); READY = explicit "save as ready", guarded (all text/image fields valid + design generated). Status changes only via explicit actions; demote READY→DRAFT on save draft.
- Content delete in scope. Library views: All / Unfinished / Drafts / Ready.
- "Use template" on template detail creates the UNFINISHED record and opens the editor.
- Ready-guard treats every text/image field as required; chart/sheet excluded (template default).

## Done

**MVP 3 — Content Creation & Management:** implemented on `milestone/mvp3-content` (3 commits) and browser-verified via chrome-devtools MCP.
- Backend: `Content`/`ContentStatus`/`ContentAsset` models (snapshot provenance), Content module (repository → prisma → service → routes), generation with poll-driven once-guarded finalize + thumbnail storage, raw-binary image upload → Canva asset + local copy, StorageService.delete, shared image content-type helper.
- Research gate (api-researcher): asset upload SUPPORTED (POST /rest/v1/asset-uploads, asset:read+asset:write, 15-min thumbnails, partial autofill keeps template defaults). `PROJECT.md` §13 updated.
- Frontend: `/content` library (filters + delete), `/content/[id]` editor (dynamic form, generate/poll, Edit in Canva, save draft/ready), "Use template" entry, nav link.
- Verification: 31 backend tests (22 new), lint+typecheck clean both apps, production build OK, API lifecycle smoke OK, browser flow OK (create → draft → ready-guard → filter → delete; upload/generate error paths).
- Two bugs found via browser verification and fixed: CORS methods (PUT/DELETE) + Fastify 415 on binary uploads (wildcard parser).

**MVP 2 — Template Management: COMPLETE and merged** (PR #2 into `main`). Templates tagged `flow-template` are pulled from Canva into a local PostgreSQL cache (paginated), the library and detail views render them with thumbnails, and an explicit sync refreshes and prunes the cache. Evidence and reproducible steps in `docs/mvp2-verification.md`.

**MVP 1 — Canva Integration: COMPLETE and merged** (PR #1 into `main`). OAuth (PKCE) → brand templates → dataset field discovery → autofill → export/download via `StorageService`. Evidence in `docs/mvp1-verification.md`.

Foundation in place:
- pnpm workspace: `frontend/` (Next.js 16, React, TypeScript, Tailwind, shadcn/ui) + `backend/` (Fastify, TypeScript).
- Prisma + PostgreSQL (now actively used: `Template`, `TemplateField`), Docker Compose (postgres/backend/frontend), local-filesystem storage behind `StorageService`.
- Backend Canva module (`oauth.ts`, `canva-client.ts`, `token-store.ts`, `canva-service.ts`, `canva-routes.ts`) and Templates module (`template-repository.ts`, `prisma-template-repository.ts`, `template-service.ts`, `template-routes.ts`).

## Next

1. **User action:** enable `asset:read` + `asset:write` in the Canva Developer Portal (Outside Canva > Configuration > Scopes) and re-run "Connect to Canva" once.
2. Live-Canva verification: image upload (asset id + preview), generate design (job poll → design ref + thumbnail → Edit in Canva), mark ready with all fields.
3. Reviewer pass over the Content module + frontend.
4. PR `milestone/mvp3-content` → `main` with acceptance criteria, evidence (`docs/evidence/mvp3-content-*.png`), and `docs/mvp3-verification.md`; hard stop for user verification.

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

## Reminders / Notes

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
