# cjcrsg-flow

> Turn Canva templates into published Facebook posts — private and self-hosted.

cjcrsg-flow lets you maintain templates in Canva Pro, fill their Autofill fields through a clean UI, generate designs automatically, and publish them to a Facebook Page — immediately or on a schedule.

## Features

- **Canva-driven forms** — discover a template's Autofill fields and build the input form dynamically. No hardcoded content types.
- **One-click generation** — Autofill produces a Canva design, with an optional "Edit in Canva" step.
- **Publishing metadata, separate from the design** — caption, target page, and schedule live independently of the Canva fields.
- **Application-owned calendar** — see only posts created through cjcrsg-flow, not everything on Facebook.
- **Storage-agnostic** — local filesystem today, S3/R2 tomorrow, behind a single abstraction.
- **Self-hosted** — Dockerized; runs on Coolify now, any Docker host later.

## Tech stack

| Area       | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Frontend   | Next.js · React · TypeScript · Tailwind CSS · shadcn/ui       |
| Backend    | Node.js / TypeScript (API-oriented service)                   |
| Database   | PostgreSQL · Prisma                                           |
| Packaging  | pnpm                                                          |
| Deployment | Docker · Coolify (target, not a dependency)                   |
| Storage    | Local filesystem via a storage abstraction                    |

## How it works

```
Canva template → discover fields → dynamic form → autofill → design → publish
```

Canva remains the source of truth for the design; cjcrsg-flow stores references and submitted content.

## Running locally

Prerequisites: Node.js 24, pnpm 12, and a Canva developer app (`CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI`) in a repo-root `.env` (copy `.env.example`).

```sh
pnpm install

# backend API on http://127.0.0.1:3001
pnpm --filter backend dev

# frontend UI on http://127.0.0.1:3000 (separate terminal)
pnpm --filter frontend dev
```

Or run the full stack with Docker:

```sh
docker compose up --build
```

Open http://127.0.0.1:3000 and click **Connect to Canva** to authorize. See `docs/mvp1-verification.md` for the end-to-end test steps and evidence.

## Roadmap

| MVP | Focus                        | Status      |
| --- | ---------------------------- | ----------- |
| 1   | Canva integration            | Complete    |
| 2   | Template management          | Not started |
| 3   | Content creation & management | Not started |
| 4   | Facebook publishing          | Not started |
| 5   | Scheduling & posting calendar | Not started |

See `ROADMAP.md` for the full implementation sequence.

## Project structure

```
├── frontend/      Next.js app
├── backend/       Node.js / TypeScript API
├── docker/        container definitions
├── docs/          tech-stack, handoff
├── .opencode/     agents and skills
├── AGENTS.md      development rules
├── PROJECT.md     product & architecture
└── ROADMAP.md     implementation sequence
```

## Status

MVP 1 (Canva integration) complete. Template management (MVP 2) is next.

## Documentation

- [`PROJECT.md`](PROJECT.md) — product and architecture source of truth
- [`ROADMAP.md`](ROADMAP.md) — implementation sequence
- [`docs/tech-stack.md`](docs/tech-stack.md) — approved technology choices
- [`docs/handoff.md`](docs/handoff.md) — current milestone working context
- [`AGENTS.md`](AGENTS.md) — development rules and agent workflow

## Non-goals

No public SaaS, multi-tenancy, or user registration. No Instagram or other platforms yet, no n8n as a dependency, no recreating the Canva editor, and no mirroring of every Facebook post.
