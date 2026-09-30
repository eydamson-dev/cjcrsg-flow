# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 3 — Content Creation & Management** — IN PROGRESS on `milestone/mvp3-content`. Create and manage content generated from Canva templates: dynamic forms from discovered fields (text + image upload), Canva Autofill generation, "Edit in Canva", content persistence, content library, delete, and a content status workflow (Unfinished → Draft → Ready). See `ROADMAP.md` §MVP 3.

Locked decisions (user-approved, do not revisit):
- Image fields via Canva asset upload are IN SCOPE (`asset:write` scope is NOT yet in `oauth.ts` — needs portal enable + re-consent).
- Field values stored as JSONB on Content (shapes mirror Canva DatasetValue).
- Status: UNFINISHED = created-from-template, never saved; DRAFT = any "save draft" (never blocked); READY = explicit "save as ready", guarded (all fields valid + design generated). Status changes only via explicit actions; saving a draft on a READY item demotes to DRAFT.
- Content delete is in scope. Library views: All / Unfinished / Drafts / Ready.
- "Use template" on template detail creates the UNFINISHED record and opens the editor.

## Done

**MVP 2 — Template Management: COMPLETE and merged** (PR #2 into `main`). Templates tagged `flow-template` are pulled from Canva into a local PostgreSQL cache (paginated), the library and detail views render them with thumbnails, and an explicit sync refreshes and prunes the cache. Evidence and reproducible steps in `docs/mvp2-verification.md`.

**MVP 1 — Canva Integration: COMPLETE and merged** (PR #1 into `main`). OAuth (PKCE) → brand templates → dataset field discovery → autofill → export/download via `StorageService`. Evidence in `docs/mvp1-verification.md`.

Foundation in place:
- pnpm workspace: `frontend/` (Next.js 16, React, TypeScript, Tailwind, shadcn/ui) + `backend/` (Fastify, TypeScript).
- Prisma + PostgreSQL (now actively used: `Template`, `TemplateField`), Docker Compose (postgres/backend/frontend), local-filesystem storage behind `StorageService`.
- Backend Canva module (`oauth.ts`, `canva-client.ts`, `token-store.ts`, `canva-service.ts`, `canva-routes.ts`) and Templates module (`template-repository.ts`, `prisma-template-repository.ts`, `template-service.ts`, `template-routes.ts`).

## Next

1. ⏳ API research gate (api-researcher running): Canva asset upload (endpoint/headers/scopes/limits), design thumbnail expiry, partial (omitted-field) autofill behavior.
2. ⏳ Architect (running): content model design — Prisma schema, Content module layout, REST API, JSONB shape, status guards, frontend structure.
3. Review both, then implement MVP 3 milestones 3.1–3.6 per `ROADMAP.md`, verifying each.

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
