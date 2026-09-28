# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 2 — Template Management** — implemented and live-verified on `milestone/mvp2-templates`; awaiting independent review, PR, and user verification. Displays Canva templates and the Autofill fields each template requires. See `ROADMAP.md` §MVP 2 and `docs/mvp2-verification.md`.

## Done

**MVP 2 — Template Management: implemented + live-verified (not yet merged).**

- 2.1–2.6 implemented: paginated template retrieval, local template library, template selection/detail, field discovery, generic `Template`/`TemplateField` model, and an explicit sync.
- Backend: `db/prisma.ts`, `modules/templates/` (`template-repository.ts`, `prisma-template-repository.ts`, `template-service.ts`), `routes/template-routes.ts` (`POST /templates/sync`, `GET /templates`, `GET /templates/:canvaId`, `GET /templates/:canvaId/thumbnail`), shared `routes/error-handler.ts`. Canva client/service gained pagination (`listAllBrandTemplates`).
- Prisma migration `20260928151304_init_templates`; Docker backend now runs `prisma migrate deploy` on startup.
- Frontend: shadcn/ui initialized (radix-nova preset; `button`, `card`, `badge`, `skeleton`); `/templates` library and `/templates/[canvaId]` detail pages; header nav.
- Verified: live Canva sync returned 2 templates / 4 fields / 2 thumbnails; library + detail UI rendered (screenshots in `docs/evidence/`); Docker backend started and served cached templates. `pnpm typecheck`, `lint`, `test` (9), `build`, `docker compose config` all pass.
- API research recorded: list + dataset each rate-limited **100 req/min/user**; **thumbnail URLs expire after 15 minutes**; **Autofill has no published quota** (limits "introduced in the future").

**MVP 1 — Canva Integration: COMPLETE and merged** (PR #1 into `main`). OAuth (PKCE) → brand templates → dataset field discovery → autofill → export/download via `StorageService`. Evidence in `docs/mvp1-verification.md`.

## Next

1. Independent review of the MVP 2 diff (correctness, security, scope).
2. Open the MVP 2 PR into `main` with acceptance criteria, known issues, and the visual evidence.
3. User verification, then merge and update docs/Obsidian per Definition of Done.

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

## Reminders / Notes

- Backend framework: Fastify. Ports: frontend `3000`, backend `3001`, PostgreSQL `5432` (this machine uses `POSTGRES_PORT` override — see below).
- **Dev-server caveat:** Brave blocks the Next dev HMR WebSocket on this machine, which prevented client hydration in `next dev`. Verification used the production build (`next build` + `next start` / Docker). A normal browser does not have this issue.
- Postgres host port is configurable via `POSTGRES_PORT` (compose default `5432`; this machine's local `.env` uses `5434` because `5432`/`5433` are taken by other projects). `DATABASE_URL` must match.
- Host-based Prisma commands need `DATABASE_URL` exported explicitly (Prisma does not read the repo-root `.env` from the `backend/` cwd).
- Thumbnails are downloaded into `StorageService` (`thumbnails/<canvaId>`) because Canva thumbnail URLs expire after 15 minutes. Orphan thumbnails are not pruned.
- Sync fetches each template's dataset sequentially; fine at current scale, parallelize later within the 100 req/min limit.
- Canva access token is still in-memory; re-run OAuth after a backend restart.
- Deferred from MVP 1 (still open): `/canva/*` and `/templates/*` are not app-authenticated; in-memory token store; pending-auth TTL; `DatasetValue` lacks chart/sheet; env loading is cwd-fragile; stored exports have no read route (needed for MVP 4 Facebook media).
- Deferred from MVP 2: prune orphaned thumbnails; delete templates no longer returned by Canva.
- `handoff` skill loads/updates this file; run it on milestone start/finish.
- Obsidian vault has `Projects/CJCRSG-Flow.md` for durable project memory (updated with MVP 2 + corrected Autofill quota belief).
- Canva/Facebook capability baseline table is in `PROJECT.md` §13.
