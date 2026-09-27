# Handoff

Working context for the current milestone. Update this file whenever milestone state changes.

## Current Milestone

**MVP 1 — Canva Integration** — NOT STARTED. Establish the programmatic Canva workflow (developer application, authentication, template retrieval, Autofill field discovery, autofill generation, design export). See `ROADMAP.md` §MVP 1.

## Done

No MVP 1 work done yet. Project setup only (all `verified`):

- [verified] `AGENTS.md`, `PROJECT.md`, `ROADMAP.md`, `README.md`, `docs/tech-stack.md`, `docs/handoff.md` created.
- [verified] `.opencode/agents/` — orchestrator, api-researcher, architect, implementer, reviewer.
- [verified] `.opencode/skills/handoff/` and `.opencode/skills/token-efficient/` adopted.
- [verified] Git repo initialized on `main`; remote `git@github.com:eydamson-dev/cjcrsg-flow.git`.

## Next

1. Create the `milestone/mvp1-canva` branch.
2. API research gate: verify MVP 1 Canva capabilities against current official Canva Connect API docs (baseline in `PROJECT.md` §13 marks most as SUPPORTED; re-verify before implementing).
3. Architect: establish frontend/backend scaffold, storage abstraction, Prisma setup, Docker setup.
4. Implement MVP 1 milestones 1.1–1.6 per `ROADMAP.md`.

## Constraints

- One milestone at a time; do not skip or auto-start the next MVP.
- API research is a hard gate; never invent endpoints/permissions/behavior.
- Clarify before adding anything not explicitly requested.
- Verification-first; never report completion without evidence.
- Canva design fields and publishing metadata are separate concepts.
- All file access through the storage abstraction.
- Frontend must not hold platform credentials.

## Reminders / Notes

- `main` is at commit `0b112c4` (initial commit) plus uncommitted setup changes.
- No milestone branch exists yet.
- The `handoff` skill loads/updates this file; run it on milestone start/finish.
- Obsidian vault has `Projects/CJCRSG-Flow.md` for durable project memory; a prior attempt exists at `Projects/CJCRSG-Automation-Hub.md`.
- Canva/Facebook capability baseline table is in `PROJECT.md` §13; unverified Facebook capabilities must stay out of committed milestones.
