---
name: handoff
description: Maintain milestone handoff context for this project. Use when starting or finishing a milestone to record what is done, what is next, active constraints, and reminders/notes.
---

# Milestone Handoff

## What I do

Maintain a single handoff document (`docs/handoff.md`) that captures the working context for the current milestone, so any session can pick up exactly where the last one left off.

## When to use me

- When starting a milestone (load and refresh the handoff).
- When finishing a milestone (update the handoff).
- When the user asks for a status summary or "where are we".

## Workflow

### 1. Gather context

Read, in order:

- `ROADMAP.md` — current milestone and its "Done When"
- `PROJECT.md` — constraints and architecture rules
- `AGENTS.md` — development rules
- `docs/handoff.md` — previous handoff, if present
- `docs/decisions/` — any active decisions
- `git log --oneline` and `git status` — recent state

### 2. Determine state

Identify:

- Current milestone
- What has been completed (verified via code, tests, git history)
- What is in progress
- What is not started

### 3. Write the handoff

Write or update `docs/handoff.md` with these sections:

#### Current Milestone

The milestone identifier and one-line goal.

#### Done

What is implemented and verified, each with a status: `verified` / `partially verified`.

#### Next

The immediate next steps to continue the current milestone, in order.

#### Constraints

Active rules and boundaries that must be respected (from `PROJECT.md`, `AGENTS.md`, and open decisions).

#### Reminders / Notes

Open questions, gotchas, things to watch, and anything left unresolved.

### 4. Keep it accurate

- Only mark something `verified` if it was actually verified (tests, typecheck, manual checklist) — never merely "compiles".
- Distinguish `verified` vs `partially verified` vs `not verified`.
- Update the handoff whenever milestone state changes.

## Rules

- Do not invent progress. Base the handoff on evidence in the repository.
- Keep the handoff concise and current; remove stale notes.
- The handoff is a working document, not a replacement for `PROJECT.md` / `ROADMAP.md`.
