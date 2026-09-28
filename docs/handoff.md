# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 1 — Canva Integration** — IN PROGRESS. Establish the programmatic Canva workflow (developer application, authentication, template retrieval, Autofill field discovery, autofill generation, design export). See `ROADMAP.md` §MVP 1.

## Done

Project setup (all `verified`):

- [verified] `AGENTS.md`, `PROJECT.md`, `ROADMAP.md`, `README.md`, `docs/tech-stack.md`, `docs/handoff.md` created.
- [verified] `.opencode/agents/` — orchestrator, api-researcher, architect, implementer, reviewer.
- [verified] `.opencode/skills/handoff/` and `.opencode/skills/token-efficient/` adopted.
- [verified] Git repo initialized on `main`; remote `git@github.com:eydamson-dev/cjcrsg-flow.git`.
- [verified] `milestone/mvp1-canva` branch created from `main`.
- [verified] Canva Connect API research gate completed against current official documentation.
  - OAuth 2.0 Authorization Code + PKCE, brand template retrieval, field discovery, async autofill generation, and async design export are supported.
  - Required scopes: `brandtemplate:meta:read`, `brandtemplate:content:read`, `design:meta:read`, `design:content:read`, `design:content:write`, and `profile:read`.
  - Canva Pro supports brand templates; Autofill is supported with a limited development trial quota. Treat Autofill as `SUPPORTED WITH LIMITATIONS` until production access is confirmed.
- [verified] Full application scaffold established and validated.
  - pnpm workspace with `frontend/` (Next.js 16, React, TypeScript, Tailwind) and `backend/` (Fastify, TypeScript, Prisma).
  - Docker Compose provisions PostgreSQL 17, backend, frontend, and local storage volume.
  - `StorageService` and traversal-safe `LocalFilesystemStorage` are implemented and covered by two passing tests.
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `docker compose config`, and the running Compose health/UI checks passed.
- [verified] MVP 1.1 — Canva developer app `cjcrsg-flow` created (App ID `AAHOGKxYin8`, Client ID in `.env`), 6 scopes enabled, redirect URL `http://127.0.0.1:3001/oauth/callback` set.
- [verified] MVP 1.2 — OAuth Authorization Code + PKCE flow implemented and exercised live: `/canva/status` returned `authenticated: true` after consent.
- [verified] MVP 1.3 — Brand template retrieval: listed `EAHQ6R8Qfec` "Daniel Faith Tuyor" plus metadata and thumbnail.
- [verified] MVP 1.4 — Field discovery: `EAHWepv4UXY` returned `{ heading, subheading, body: text; background-image: image }`.
- [verified] MVP 1.5 — Autofill generation: async job created design `DAHWepMUQ0c` ("Test Autofill 1") with edit/view URLs and thumbnail.
- [verified] MVP 1.6 — Design export + obtain asset: PNG export job succeeded and was downloaded server-side into storage (`exports/DAHWepMUQ0c.png`, 149610 bytes, 1080×1350 PNG) via `StorageService`.
- Backend Canva module implemented: `oauth.ts` (PKCE/token), `canva-client.ts` (typed REST client), `token-store.ts`, `canva-service.ts`, and routes in `canva-routes.ts` (`/oauth/*`, `/canva/*`, `/canva/exports/:jobId/store`). Tokens currently in-memory (single-user); persistence deferred.

## Next

1. User verifies the milestone.
2. Prepare and merge the MVP 1 PR into `main` (only after user verification and explicit approval to commit/PR).

## Constraints

- One milestone at a time; do not skip or auto-start the next MVP.
- API research is a hard gate; never invent endpoints/permissions/behavior.
- Clarify before adding anything not explicitly requested.
- Verification-first; never report completion without evidence.
- Canva design fields and publishing metadata are separate concepts.
- All file access through the storage abstraction.
- Frontend must not hold platform credentials.

## Reminders / Notes

- Backend framework: Fastify. Development ports: frontend `3000`, backend `3001`, PostgreSQL `5432`.
- Canva OAuth callback: `http://127.0.0.1:3001/oauth/callback` (Canva permits `127.0.0.1`; do not use `localhost`).
- Generated design editing/view links expire after 30 days; Canva export download links expire after 24 hours. Download exports server-side through the storage service.
- Current Autofill API limitation: Canva Pro access is a limited development trial quota; production availability requires confirming Canva's access policy.
- Backend runs locally via `pnpm --filter backend dev` (reads repo-root `.env`; `process.loadEnvFile`). Canva access token is in-memory and lost on restart — re-run OAuth after a restart.
- The Canva Connect API now uses a unified "app" model: connect REST API auth lives under Build → Outside Canva → Configuration (Client ID/secret/scopes) and Redirect URLs, not the legacy "Your integrations" page.
- Independent reviewer (no blockers) found and fixed: token refresh now preserves the refresh token, `isConfigured` checks the redirect URI, error responses no longer leak upstream bodies, and `readJson` tolerates non-JSON error bodies. Added unit tests for PKCE, authorize-URL, and single-use/token stores.
- Known deferred items (acceptable for MVP 1, track later): `/canva/*` endpoints are not app-authenticated (private-network assumption); in-memory token store (re-auth after restart); pending-auth entries have no TTL; brand-template pagination dropped (first 100); `DatasetValue` lacks chart/sheet; env loading is cwd-fragile; `DATABASE_URL` required but unused; stored exports have no read route yet (needed for MVP 3/4 Facebook media).
- The `handoff` skill loads/updates this file; run it on milestone start/finish.
- Obsidian vault has `Projects/CJCRSG-Flow.md` for durable project memory; a prior attempt exists at `Projects/CJCRSG-Automation-Hub.md`.
- Canva/Facebook capability baseline table is in `PROJECT.md` §13; unverified Facebook capabilities must stay out of committed milestones.
