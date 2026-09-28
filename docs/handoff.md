# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 2 — Template Management** — NOT STARTED. Make manually created Canva templates usable through the application: template retrieval, template library, template selection, field discovery, a generic template model, and template synchronization. See `ROADMAP.md` §MVP 2.

## Done

**MVP 1 — Canva Integration: COMPLETE and merged** (PR #1 into `main`). The programmatic Canva workflow is established and verified live: Canva developer app → OAuth (Authorization Code + PKCE) → brand template retrieval → Autofill field discovery → design generation → programmatic export and asset download via `StorageService`. Evidence and reproducible steps are in `docs/mvp1-verification.md`.

Foundation established in MVP 1:

- pnpm workspace: `frontend/` (Next.js 16, React, TypeScript, Tailwind) + `backend/` (Fastify, TypeScript).
- Prisma + PostgreSQL, Docker Compose (postgres/backend/frontend), local-filesystem storage behind `StorageService`.
- Backend Canva module: `oauth.ts` (PKCE/token), `canva-client.ts` (typed REST client), `token-store.ts`, `canva-service.ts`, `canva-routes.ts` (`/oauth/*`, `/canva/*`).
- Unit tests (PKCE, authorize URL, token/pending stores, storage traversal) and `docs/evidence/` visual assets.

## Next

1. Create the `milestone/mvp2-templates` branch from `main`.
2. Architect: design the generic template model (Prisma schema — `Template`, `TemplateField`, Canva identifiers) and decide the UI/API surface for the template library.
3. Implement MVP 2 milestones 2.1–2.6 per `ROADMAP.md` (retrieval, library, selection, field discovery, generic model, synchronization), verifying each.

## Constraints

- One milestone at a time; do not skip or auto-start the next MVP.
- API research is a hard gate; never invent endpoints/permissions/behavior.
- Clarify before adding anything not explicitly requested.
- Verification-first; never report completion without evidence.
- Do not hardcode content categories (birthday/announcement/verse/quote); templates and fields are generic.
- Canva design fields and publishing metadata are separate concepts.
- All file access through the storage abstraction.
- Frontend must not hold platform credentials.

## Reminders / Notes

- Backend framework: Fastify. Development ports: frontend `3000`, backend `3001`, PostgreSQL `5432`.
- Canva OAuth callback: `http://127.0.0.1:3001/oauth/callback` (Canva permits `127.0.0.1`; do not use `localhost`).
- Generated design editing/view links expire after 30 days; Canva export download links expire after 24 hours.
- Canva Pro Autofill runs under a limited development trial quota (`SUPPORTED WITH LIMITATIONS`).
- Canva access token is in-memory and lost on restart — re-run OAuth after a backend restart.
- The Canva Connect API uses a unified "app" model: REST API auth lives under Build → Outside Canva → Configuration and Redirect URLs.
- Deferred from MVP 1 (track later): `/canva/*` endpoints are not app-authenticated; in-memory token store; pending-auth TTL; template pagination (first 100); `DatasetValue` lacks chart/sheet; env loading is cwd-fragile; `DATABASE_URL` required but unused; stored exports have no read route (needed for MVP 4 Facebook media).
- The `handoff` skill loads/updates this file; run it on milestone start/finish.
- Obsidian vault has `Projects/CJCRSG-Flow.md` for durable project memory.
- Canva/Facebook capability baseline table is in `PROJECT.md` §13; unverified Facebook capabilities must stay out of committed milestones.
