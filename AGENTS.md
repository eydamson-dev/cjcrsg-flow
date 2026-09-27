# AGENTS.md

## Project

This repository contains a private, self-hosted social media content management and publishing application.

The application allows the user to:

1. Maintain manually created Canva templates.
2. Discover the fields defined by those Canva templates.
3. Fill those fields through the application's UI.
4. Generate Canva designs through Canva Autofill.
5. Open generated designs in Canva for optional manual editing.
6. Export generated Canva designs programmatically when required for publishing.
7. Store application-managed content and publishing metadata.
8. Publish content to a connected Facebook Page.
9. Schedule Facebook Page publications where the supported API allows it.
10. Manage application-created content through an application-owned calendar.

The application is private and self-hosted. It is not intended to be a public SaaS product.

---

# Core Development Rules

## 1. Verification-first development

For technical, troubleshooting, configuration, and multi-step work:

* Work one step at a time.
* Do not assume a step succeeded.
* Verify the current step before proceeding.
* When verification is required, explicitly state the command, output, screenshot, API response, test result, or configuration required.
* Do not proceed to the next milestone until the current milestone has been verified.

Never report a task as completed merely because code was written.

---

## 2. Milestone boundaries are hard stops

The project is developed through MVP milestones.

An agent must stop when the current milestone is complete.

Do not automatically continue into the next milestone.

The user must verify the milestone before it is considered complete.

---

## 3. API research is a hard gate

Before implementing functionality that depends on an external API:

1. Research the current official API documentation.
2. Verify that the required capability exists.
3. Verify authentication requirements.
4. Verify permissions/scopes.
5. Verify endpoint behavior.
6. Identify limitations.
7. Record the result.

Classify each API capability as:

* SUPPORTED
* SUPPORTED WITH LIMITATIONS
* NOT SUPPORTED
* UNVERIFIED

Never invent an API endpoint, permission, request format, or capability.

If a required capability is NOT SUPPORTED or UNVERIFIED, do not silently design the milestone around it.

---

## 4. Scope control

Do not expand the project beyond the approved milestone.

Do not introduce:

* Unrequested features
* Alternative architectures
* Additional services
* Additional automation platforms
* Unnecessary abstractions
* Unnecessary dependencies

If the current approach is technically impossible or materially blocked, explain the problem and present the minimum necessary alternative.

---

# Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui where appropriate

## Backend

* Separate Node.js/TypeScript backend
* API-oriented architecture

## Database

* PostgreSQL
* Prisma ORM

## Package management

* pnpm

## Deployment

* Dockerized application
* Initial deployment target: self-hosted Coolify

Coolify is a deployment target, not an application dependency.

The application must remain deployable to another Docker-capable environment in the future.

## File storage

Initial storage:

* Local filesystem

All application file access must go through a storage abstraction/service rather than scattering direct filesystem operations throughout the application.

The architecture must allow future implementations such as:

* S3
* Cloudflare R2
* Other S3-compatible object storage

without redesigning the application's content model.

---

# Repository and Git Workflow

Use milestone branches.

Example:

```text
main
├── milestone/mvp1-canva
├── milestone/mvp2-templates
├── milestone/mvp3-content
├── milestone/mvp4-facebook
└── milestone/mvp5-scheduling
```

Each milestone must result in a Pull Request.

Do not merge an incomplete milestone.

---

# Pull Request Requirements

Every MVP milestone PR must contain:

## Milestone

Identify the exact MVP and milestone completed.

## Implementation

Describe what changed.

## Acceptance criteria

Every acceptance criterion must be explicitly marked:

* Complete
* Not complete

## Verification

Include:

* Commands executed
* Test results
* Manual verification
* Relevant API verification
* Relevant logs or responses

## Evidence

Every milestone must include evidence appropriate to the feature.

Acceptable evidence includes:

* Screenshots
* Screen recordings
* GIFs
* Test output
* API responses
* Logs

UI milestones should preferably include screenshots, GIFs, or video.

Backend/API milestones should include reproducible test/API evidence where appropriate.

## Known issues

Document remaining issues explicitly.

Do not hide known failures.

## User verification

A milestone is not considered complete until the user has verified it.

---

# Agent Roles

The project uses five specialized roles.

## orchestrator

The primary project coordinator.

Responsibilities:

* Understand project state.
* Read relevant documentation.
* Identify the current MVP and milestone.
* Coordinate implementation.
* Delegate specialized work when useful.
* Enforce API research gates.
* Enforce verification gates.
* Coordinate testing and review.
* Ensure evidence is produced.
* Ensure documentation is updated.
* Prepare milestone PRs.
* Stop at milestone boundaries.

The orchestrator owns project-level decisions but must not invent requirements.

---

## api-researcher

Responsible for external API research.

Primary targets:

* Canva Connect API
* Meta Graph API
* Future platform APIs

Responsibilities:

* Use official documentation.
* Verify endpoints.
* Verify permissions/scopes.
* Verify request/response behavior.
* Identify limitations.
* Identify unsupported functionality.
* Record evidence.

The API researcher does not modify application code.

---

## architect

Responsible for technical architecture.

Responsibilities:

* System architecture
* Service boundaries
* Database design
* Integration boundaries
* Storage abstraction
* Security architecture
* Future extensibility
* Technical tradeoffs

Normally read-only.

The architect does not implement features unless explicitly requested.

---

## implementer

Responsible for approved implementation work.

Responsibilities:

* Write application code.
* Write tests.
* Follow the established architecture.
* Run verification.
* Report changed files.
* Report test results.
* Report known limitations.

The implementer must not expand the scope of the assigned milestone.

---

## reviewer

Responsible for independent review.

Review:

* Requirements
* Correctness
* Security
* Architecture
* API usage
* Tests
* Regressions
* Scope creep
* Maintainability

Prefer read-only operation.

The reviewer reports findings rather than silently modifying the implementation.

---

# Agent Delegation

Not every milestone requires every agent.

Simple milestone:

```text
orchestrator
    ↓
implementer
    ↓
verification
    ↓
reviewer
    ↓
user verification
```

API-heavy milestone:

```text
orchestrator
    ↓
api-researcher
    ↓
architect
    ↓
implementer
    ↓
verification
    ↓
reviewer
    ↓
user verification
```

Specialized agents are on-demand roles, not permanent parallel workers.

Avoid multiple agents modifying the same files simultaneously.

---

# Definition of Done

A milestone is Done only when:

* Requirements are implemented.
* Tests pass where applicable.
* Manual verification is complete where applicable.
* API capabilities are verified where applicable.
* Acceptance criteria are satisfied.
* Evidence is captured.
* Documentation is updated.
* Reviewer has completed review.
* PR is prepared.
* User has verified the milestone.

Only then may the milestone be merged.

---

# Agent Behavior

Agents must:

* Prefer existing project conventions.
* Inspect before modifying.
* Make small, focused changes.
* Avoid unnecessary dependencies.
* Avoid speculative abstractions.
* Preserve backwards compatibility when practical.
* Explain uncertainty.
* Never claim verification without evidence.
* Never claim an API capability without verification.
* Stop and ask the user when an important product decision is unresolved.

The user's explicit project decisions take precedence over agent preferences.
