# CJC-Flow

A private, self-hosted application for creating, managing, scheduling, and publishing social media content using Canva templates and Facebook.

The initial publishing platform is Facebook. Instagram and other platforms may be added later. The application is intended for personal/private use and is not a public SaaS product.

---

## Table of Contents

- [Purpose](#purpose)
- [Product Concept](#product-concept)
- [Core Workflow](#core-workflow)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Content Model Principles](#content-model-principles)
- [Calendar Principles](#calendar-principles)
- [Storage](#storage)
- [Deployment](#deployment)
- [External Integrations](#external-integrations)
- [API Capability Baseline](#api-capability-baseline)
- [MVP Roadmap](#mvp-roadmap)
- [Development Rules](#development-rules)
- [Agent Roles](#agent-roles)
- [Development Workflow](#development-workflow)
- [Git Strategy](#git-strategy)
- [Pull Request Requirements](#pull-request-requirements)
- [Definition of Done](#definition-of-done)
- [Repository Structure](#repository-structure)
- [Explicit Non-Goals](#explicit-non-goals)

---

## Purpose

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

---

## Product Concept

The user manually creates templates in Canva Pro. The application retrieves those templates and discovers their Autofill fields, then dynamically creates a content form based on those fields.

Example template:

```
Birthday Poster

PERSON_NAME
AGE
MESSAGE
PHOTO
```

Another template may contain:

```
Announcement

TITLE
DATE
LOCATION
DESCRIPTION
IMAGE
```

The application **must not hardcode** these content types. Canva template fields define the design-specific input requirements.

---

## Core Workflow

```
Canva Template
      ↓
Template retrieved by application
      ↓
Autofill fields discovered
      ↓
Dynamic form generated
      ↓
User enters content
      ↓
Canva Autofill
      ↓
Generated Canva Design
      ↓
Optional "Edit in Canva"
      ↓
Save/manage content
      ↓
Export when publishing requires media
      ↓
Facebook
```

Canva remains the editable design source of truth. The application stores references (Canva template ID, design ID, design URL, template metadata, submitted field values) and does not attempt to recreate the Canva editor.

Canva design fields and publishing metadata are **separate concepts**:

- **Canva fields** describe the design.
- **Publishing metadata** describes where and how the content is published (Facebook Page, caption, scheduled date/time, publishing status, Facebook Post ID).

---

## Technology Stack

| Layer             | Technology                                        |
| ----------------- | ------------------------------------------------- |
| Frontend          | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend           | Separate Node.js/TypeScript service (API-oriented) |
| Database          | PostgreSQL, Prisma ORM                            |
| Package manager   | pnpm                                               |
| Deployment        | Dockerized application, self-hosted Coolify       |
| File storage      | Local filesystem (behind a storage abstraction)   |

---

## Architecture

### Frontend (Next.js)

- Dashboard
- Template library
- Dynamic template forms
- Content library
- Content detail
- Canva design preview/reference
- "Edit in Canva" action
- Facebook publishing configuration
- Scheduling UI
- Posting calendar

### Backend (Node.js/TypeScript)

- Authentication/session handling
- Canva integration
- Meta integration
- Content management
- Template synchronization
- Autofill generation
- Export processing
- Publishing
- Scheduling
- Database access
- Storage access

The frontend must **not** contain direct external-platform credentials or privileged API operations.

---

## Content Model Principles

- The application owns records for content created through the application.
- The application should not treat Facebook as its complete content database.
- An application-created post remains identifiable even if it is scheduled, published, Facebook later changes its state, or other posts exist on Facebook that were never created by this application.

---

## Calendar Principles

The application's calendar is based on application-owned records.

If Facebook contains posts A (app-created), B (created directly on Facebook), C (app-created), and D (created elsewhere), the application calendar shows only A and C. It is not automatically a mirror of every Facebook post. The application stores the Facebook identifiers necessary to associate its own records with Facebook publications.

---

## Storage

Initial implementation uses local filesystem storage. All application file access must go through a storage abstraction rather than scattering direct filesystem operations throughout the application.

```
Application
    ↓
Storage Service
    ↓
Local Filesystem
```

The interface should make future implementations possible without redesigning the content model:

```
Storage Service
├── Local Filesystem
├── S3
├── Cloudflare R2
└── Other object storage
```

Do not add object storage infrastructure to the MVP unless a concrete requirement emerges.

---

## Deployment

- Initial deployment: **self-hosted Coolify**.
- Coolify is a deployment target, **not** an application dependency.
- Docker remains the deployment boundary, allowing future migration to another Docker-capable platform.
- The application must work locally through Docker before deployment.

Docker architecture:

```
Frontend container
Backend container
PostgreSQL
```

---

## External Integrations

### Canva

Required capabilities:

- Authentication
- Template retrieval
- Template metadata
- Autofill field discovery
- Autofill generation
- Generated design references
- Design export

Uses Canva Pro capabilities available to the user's account.

### Facebook

Initial platform: Facebook Page.

Required capabilities:

- Connect Facebook Page
- Identify target Page
- Publish immediately
- Schedule supported Page publications
- Track application-managed publication status
- Store Facebook identifiers

Facebook scheduling should be delegated to Facebook where the API supports the required behavior. The application should not reproduce platform-native scheduling unnecessarily.

---

## API Capability Baseline

External API capabilities must be verified against current official documentation before implementation.

| Capability                                                       | Status     |
| ---------------------------------------------------------------- | ---------- |
| Canva Pro Autofill                                               | SUPPORTED  |
| Canva Brand Templates                                            | SUPPORTED  |
| Canva template retrieval                                         | SUPPORTED  |
| Canva Autofill field discovery                                   | SUPPORTED  |
| Generate design from Canva template                              | SUPPORTED  |
| Open generated Canva design in Canva                             | SUPPORTED  |
| Export Canva design programmatically                             | SUPPORTED  |
| Facebook Page publishing                                         | SUPPORTED  |
| Facebook scheduled Page publishing                               | SUPPORTED  |
| Facebook scheduled-post status information                       | SUPPORTED  |
| Facebook scheduled-post rescheduling through API                 | UNVERIFIED |
| Facebook scheduled-post cancellation through API                 | UNVERIFIED |
| Detecting direct Facebook-side schedule cancellation/change      | UNVERIFIED |
| Synchronizing those direct Facebook changes into the application | UNVERIFIED |

Unverified capabilities must not become committed milestones until independently verified against current official documentation.

---

## MVP Roadmap

### MVP 1 — Canva Integration

Establish the programmatic Canva workflow:

1. Canva Developer Application
2. Canva Authentication
3. Canva Template Access
4. Autofill Field Discovery
5. Canva Autofill
6. Design Export

**Definition of Done:** manually created Canva template → retrieve template → discover fields → submit Autofill data → generate Canva design → obtain exported asset.

### MVP 2 — Template Management

Make manually created Canva templates usable through the application:

1. Template Retrieval
2. Template Library
3. Template Selection
4. Field Discovery
5. Generic Template Model (no hardcoded categories)
6. Template Synchronization

### MVP 3 — Content Creation & Management

Create and manage content generated from Canva templates:

1. Content Creation (select template → dynamic form → enter content → validate)
2. Canva Generation
3. Canva Editing ("Edit in Canva")
4. Content Persistence
5. Content Library (All, Drafts, Unfinished, Ready)
6. Content Status (`Unfinished → Draft → Ready`)

### MVP 4 — Facebook Publishing

Publish Ready content immediately to a connected Facebook Page:

1. Facebook Page Connection
2. Facebook Publishing Configuration
3. Prepare Canva Design for Facebook
4. Publish Now (`Ready → Publishing → Published` or `Ready → Publishing → Failed`)
5. Publishing Status

### MVP 5 — Scheduling & Posting Calendar

Schedule Ready content and manage publications through an application-owned calendar:

1. Schedule a Post
2. Facebook Scheduled Publishing
3. Scheduled Post Status
4. Posting Calendar
5. Scheduled Post Management

**Deferred** (outside committed MVP until API support is verified): rescheduling/cancelling Facebook scheduled posts through API, detecting direct Facebook changes, and synchronizing those changes back.

---

## Development Rules

### Verification-first development

Work one step at a time. Do not assume a step succeeded. Verify the current step before proceeding. Never report a task as completed merely because code was written.

### Milestone boundaries are hard stops

Stop when the current milestone is complete. Do not automatically continue into the next milestone. The user must verify the milestone before it is considered complete.

### API research is a hard gate

Before implementing functionality that depends on an external API: research current official documentation, verify capability/authentication/permissions/endpoint behavior, identify limitations, and record the result. Classify each capability as `SUPPORTED`, `SUPPORTED WITH LIMITATIONS`, `NOT SUPPORTED`, or `UNVERIFIED`. Never invent an API endpoint, permission, request format, or capability.

### Scope control

Do not expand the project beyond the approved milestone. Do not introduce unrequested features, alternative architectures, additional services, or unnecessary dependencies. If the current approach is technically impossible or materially blocked, explain the problem and present the minimum necessary alternative.

---

## Agent Roles

| Role            | Responsibility                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| orchestrator    | Coordinates project state, milestones, delegation, API research gates, verification, testing, and PRs.       |
| api-researcher  | Verifies external API capabilities (Canva Connect API, Meta Graph API) using official documentation.         |
| architect       | Designs system architecture, service boundaries, database design, storage abstraction, security. (Read-only) |
| implementer     | Writes approved application code, tests, and runs verification.                                              |
| reviewer        | Independently reviews correctness, security, architecture, API usage, tests, regressions. (Read-only)        |

---

## Development Workflow

```
REQUIREMENTS
    ↓
API / TECH RESEARCH
    ↓
PLAN
    ↓
IMPLEMENT
    ↓
TEST
    ↓
CODE REVIEW
    ↓
USER VERIFICATION
    ↓
COMMIT / PR
    ↓
NEXT MILESTONE
```

No automatic progression between milestones.

---

## Git Strategy

One milestone branch per MVP:

```
main
├── milestone/mvp1-canva
├── milestone/mvp2-templates
├── milestone/mvp3-content
├── milestone/mvp4-facebook
└── milestone/mvp5-scheduling
```

Each milestone gets a PR into `main`. A milestone should preferably be represented by focused commits rather than a large collection of unrelated changes. Do not merge an incomplete milestone.

---

## Pull Request Requirements

Every MVP milestone PR must contain:

- **Milestone** — the exact MVP and milestone completed.
- **Implementation** — what changed.
- **Acceptance criteria** — each criterion explicitly marked Complete or Not complete.
- **Verification** — commands executed, test results, manual verification, relevant API verification, logs/responses.
- **Evidence** — screenshots, screen recordings, GIFs, test output, API responses, or logs.
- **Known issues** — remaining issues documented explicitly.
- **User verification** — a milestone is not complete until the user has verified it.

---

## Definition of Done

A milestone is Done only when:

- Requirements are implemented.
- Tests pass where applicable.
- Manual verification is complete where applicable.
- API capabilities are verified where applicable.
- Acceptance criteria are satisfied.
- Evidence is captured.
- Documentation is updated.
- Reviewer has completed review.
- PR is prepared.
- User has verified the milestone.

Only then may the milestone be merged.

---

## Repository Structure

```
project/
├── AGENTS.md
├── PROJECT.md
├── README.md
├── .opencode/
│   └── agents/
│       ├── orchestrator.md
│       ├── api-researcher.md
│       ├── architect.md
│       ├── implementer.md
│       └── reviewer.md
├── frontend/
├── backend/
├── docker/
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

The exact repository structure may be refined during architecture planning.

---

## Explicit Non-Goals

The initial project does not require:

- Public SaaS functionality
- Multi-tenant architecture
- Multiple organizations
- Public user registration
- Instagram publishing
- Other social platforms
- n8n as a core dependency
- Recreating the Canva editor
- App-side image editing
- Automatic detection of manual Canva editing completion
- Mirroring all Facebook posts
- Object storage infrastructure
- Facebook scheduling functionality that has not been API-verified
