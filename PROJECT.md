# PROJECT.md

# 1. Project Overview

## Purpose

Build a private, self-hosted application for creating, managing, scheduling, and publishing social media content using Canva templates and Facebook.

The initial platform is Facebook.

Instagram and other platforms may be added later.

The application is intended for personal/private use and will initially be self-hosted.

---

# 2. Product Concept

The user manually creates templates in Canva Pro.

The application retrieves those templates and discovers their Autofill fields.

The application dynamically creates a content form based on those fields.

Example:

```text
Birthday Poster

PERSON_NAME
AGE
MESSAGE
PHOTO
```

Another template may contain:

```text
Announcement

TITLE
DATE
LOCATION
DESCRIPTION
IMAGE
```

The application must not hardcode these content types.

Canva template fields define the design-specific input requirements.

---

# 3. Canva Workflow

The intended workflow is:

```text
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

Canva remains the editable design source of truth.

The application stores references such as:

* Canva template ID
* Canva design ID
* Canva design URL
* Template metadata
* Submitted field values

The application does not attempt to recreate the Canva editor.

---

# 4. Publishing Metadata

Canva design fields and publishing metadata are separate concepts.

Canva fields describe the design.

Publishing metadata describes where and how the content is published.

Example publishing metadata:

```text
Facebook Page
Facebook caption
Scheduled date/time
Publishing status
Facebook Post ID
```

The application's content model must not assume that Facebook is the only future platform.

---

# 5. Content Model Principles

The application owns records for content created through the application.

The application should not treat Facebook as the application's complete content database.

An application-created post should remain identifiable even if:

* It is scheduled.
* It is published.
* Facebook later changes its state.
* Other posts exist on Facebook that were never created by this application.

---

# 6. Calendar Principles

The application's calendar is based on application-owned records.

Example:

Facebook contains:

```text
A — created through application
B — created directly on Facebook
C — created through application
D — created elsewhere
```

The application calendar shows:

```text
A
C
```

It does not automatically become a mirror of every Facebook post.

The application stores the Facebook identifiers necessary to associate its own records with Facebook publications.

---

# 7. Architecture

## Frontend

Separate Next.js application.

Responsibilities:

* Dashboard
* Template library
* Dynamic template forms
* Content library
* Content detail
* Canva design preview/reference
* Edit in Canva action
* Facebook publishing configuration
* Scheduling UI
* Posting calendar

## Backend

Separate Node.js/TypeScript service.

Responsibilities:

* Authentication/session handling
* Canva integration
* Meta integration
* Content management
* Template synchronization
* Autofill generation
* Export processing
* Publishing
* Scheduling
* Database access
* Storage access

The frontend must not contain direct external-platform credentials or privileged API operations.

---

# 8. Database

Use:

* PostgreSQL
* Prisma ORM

The database is the source of truth for application-managed data.

The exact schema should be designed during the architecture milestone and must not be invented prematurely.

Expected conceptual entities include:

```text
Template
TemplateField
Content
ContentFieldValue
CanvaDesignReference
FacebookPage
Publication
Schedule
StorageObject
```

The final schema may differ after architectural review.

---

# 9. Storage

Initial implementation uses local filesystem storage.

The backend must access storage through a storage abstraction.

Conceptually:

```text
Application
    ↓
Storage Service
    ↓
Local Filesystem
```

The interface should make future implementations possible:

```text
Storage Service
├── Local Filesystem
├── S3
├── Cloudflare R2
└── Other object storage
```

Do not add object storage infrastructure to the MVP unless a concrete requirement emerges.

---

# 10. Docker

The application must be Dockerized.

The Docker architecture should support:

```text
Frontend container
Backend container
PostgreSQL
```

Additional infrastructure may be introduced only when required.

The application should work locally through Docker before deployment.

---

# 11. Deployment

Initial deployment:

**Self-hosted Coolify**

Coolify is the initial deployment platform.

The application must not become dependent on Coolify-specific application behavior.

Docker remains the deployment boundary.

This allows future migration to another Docker-capable platform.

---

# 12. External Integrations

## Canva

Required capabilities:

* Authentication
* Template retrieval
* Template metadata
* Autofill field discovery
* Autofill generation
* Generated design references
* Design export

The application uses Canva Pro capabilities available to the user's account.

---

## Facebook

Initial platform:

Facebook Page.

Required capabilities:

* Connect Facebook Page
* Identify target Page
* Publish immediately
* Schedule supported Page publications
* Track application-managed publication status
* Store Facebook identifiers

Facebook scheduling should be delegated to Facebook where the API supports the required behavior.

The application should not reproduce platform-native scheduling unnecessarily.

---

# 13. API Capability Rules

External API capabilities must be verified against current official documentation before implementation.

Current project baseline:

| Capability                                                       | Status     |
| ---------------------------------------------------------------- | ---------- |
| Canva Pro Autofill                                               | SUPPORTED WITH LIMITATIONS |
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

Canva Pro users can access Autofill. As of the current official Canva documentation, **there is no usage quota or rate limit published for the Autofill APIs** — Canva states that "usage limits will be introduced in the future." Canva reserves the right to add limits later, so this should be re-checked before relying on high volumes.

Canva brand-template **thumbnail URLs expire after 15 minutes**; the application downloads thumbnails into storage during sync rather than storing the temporary URL.

---

# 14. MVP Roadmap

The implementation sequence lives in `ROADMAP.md`.

One milestone at a time; do not skip milestones.

---

# 15. n8n

n8n is not a core component of the MVP architecture.

Platform-native scheduling should be used where available.

n8n may be introduced later only when there is a concrete external automation requirement that the application or platform APIs do not adequately handle.

Do not add n8n simply to reproduce native Facebook scheduling.

---

# 16. Agentic Development Workflow

The development lifecycle is:

```text
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

# 17. Milestone Evidence

Every milestone requires evidence.

For UI functionality:

* Screenshot
* GIF
* Screen recording

For backend/API functionality:

* Automated test output
* API response
* Logs
* Screenshots where useful

The PR must contain enough evidence for someone to understand that the acceptance criteria were actually exercised.

---

# 18. Git Strategy

Use one milestone branch per MVP.

Example:

```text
milestone/mvp1-canva
milestone/mvp2-templates
milestone/mvp3-content
milestone/mvp4-facebook
milestone/mvp5-scheduling
```

Each milestone gets a PR into `main`.

A milestone should preferably be represented by focused commits rather than a large collection of unrelated changes.

---

# 19. Codex + OpenCode

The repository is the shared source of truth.

Both Codex and OpenCode should follow:

```text
AGENTS.md
PROJECT.md
```

OpenCode-specific agent configuration lives under:

```text
.opencode/
└── agents/
```

The project defines agent responsibilities independently from the specific coding tool or model.

Codex and OpenCode should therefore be able to work on the same repository without maintaining separate project specifications.

Do not place model-specific assumptions in the core project specification.

---

# 20. Initial Repository Structure

The intended initial structure is approximately:

```text
project/
├── AGENTS.md
├── PROJECT.md
├── ROADMAP.md
│
├── .opencode/
│   ├── agents/
│   │   ├── orchestrator.md
│   │   ├── api-researcher.md
│   │   ├── architect.md
│   │   ├── implementer.md
│   │   └── reviewer.md
│   └── skills/
│       ├── handoff/
│       └── token-efficient/
│
├── docs/
│   ├── tech-stack.md
│   └── handoff.md
│
├── frontend/
│
├── backend/
│
├── docker/
│
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

The exact repository structure may be refined during architecture planning.

---

# 21. Explicit Non-Goals

The initial project does not require:

* Public SaaS functionality
* Multi-tenant architecture
* Multiple organizations
* Public user registration
* Instagram publishing
* Other social platforms
* n8n as a core dependency
* Recreating the Canva editor
* App-side image editing
* Automatic detection of manual Canva editing completion
* Mirroring all Facebook posts
* Object storage infrastructure
* Facebook scheduling functionality that has not been API-verified
