# PROJECT_SPEC.md

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

# 14. MVP Roadmap

# MVP 1 — Canva Integration

Purpose:

Establish the programmatic Canva workflow.

## 1.1 Canva Developer Application

Create and configure the Canva developer application.

## 1.2 Canva Authentication

Authenticate the application with the Canva account.

## 1.3 Canva Template Access

Connect to Canva API and retrieve a test template.

## 1.4 Autofill Field Discovery

Identify fields and their supported types.

## 1.5 Canva Autofill

Submit test data and generate a Canva design.

## 1.6 Design Export

Programmatically export the generated design.

### Definition of Done

The application can:

```text
Manually created Canva template
        ↓
Retrieve template
        ↓
Discover fields
        ↓
Submit Autofill data
        ↓
Generate Canva design
        ↓
Obtain exported asset
```

---

# MVP 2 — Template Management

Purpose:

Make manually created Canva templates usable through the application.

## 2.1 Template Retrieval

Retrieve templates from Canva.

## 2.2 Template Library

Display:

* Template name
* Thumbnail/preview
* Basic metadata

## 2.3 Template Selection

Allow the user to select a template.

## 2.4 Field Discovery

Retrieve Autofill fields and their types.

## 2.5 Generic Template Model

Store:

* Template metadata
* Field definitions
* Canva identifiers

Do not hardcode categories such as:

* Birthday
* Announcement
* Verse
* Quote

## 2.6 Template Synchronization

Refresh template information from Canva when required.

### Definition of Done

The application displays Canva templates and understands the fields required by each template.

---

# MVP 3 — Content Creation & Management

Purpose:

Create and manage content generated from Canva templates.

## 3.1 Content Creation

User can:

1. Select a template.
2. See a dynamically generated form.
3. Enter content.
4. Validate required fields.

## 3.2 Canva Generation

Submit data to Canva Autofill.

Track generation.

Store generated design reference.

## 3.3 Canva Editing

Provide:

* Generated design preview/reference
* "Edit in Canva"
* Optional manual editing in Canva

The application does not need to automatically detect when the user finishes editing in Canva.

## 3.4 Content Persistence

Store:

* Template reference
* Submitted field values
* Canva design reference
* Status
* Timestamps

## 3.5 Content Library

Initial views:

* All
* Drafts
* Unfinished
* Ready

## 3.6 Content Status

Initial workflow:

```text
Unfinished
    ↓
Draft
    ↓
Ready
```

Facebook-specific statuses such as Published, Failed, and Scheduled are introduced by later MVPs.

### Definition of Done

The user can:

```text
Select any Canva template
        ↓
Fill its dynamic fields
        ↓
Generate Canva design
        ↓
Optionally edit in Canva
        ↓
Save content
        ↓
Manage content through Content Library
```

---

# MVP 4 — Facebook Publishing

Purpose:

Publish Ready content immediately to a connected Facebook Page.

## 4.1 Facebook Page Connection

Support:

* Facebook authentication
* Required permissions
* Page identification
* Secure connection

## 4.2 Facebook Publishing Configuration

Support:

* Facebook caption
* Target Facebook Page
* Immediate publishing

Publishing metadata remains separate from Canva design fields.

## 4.3 Prepare Canva Design for Facebook

Programmatically obtain the media required for Facebook publishing.

The user must not manually download the Canva design.

## 4.4 Publish Now

Workflow:

```text
Ready
  ↓
Publishing
  ↓
Published
```

or:

```text
Ready
  ↓
Publishing
  ↓
Failed
```

## 4.5 Publishing Status

Store where available:

* Publication status
* Facebook Post ID
* Publication timestamp
* Failure information

### Definition of Done

A Ready content item can be immediately published to the connected Facebook Page and the application records the result.

---

# MVP 5 — Scheduling & Posting Calendar

Purpose:

Schedule Ready content for future Facebook publication and manage those application-created publications through an application-owned calendar.

## 5.1 Schedule a Post

Schedule information includes:

* Date
* Time
* Facebook Page
* Caption
* Associated content

Scheduling information is stored in the application database.

## 5.2 Facebook Scheduled Publishing

Submit the scheduled publication to Facebook's supported scheduling API.

Facebook handles the scheduled publication when the API supports the requested behavior.

## 5.3 Scheduled Post Status

Track:

* Scheduled
* Published
* Publication time
* Facebook Post ID
* Failure information where available

## 5.4 Posting Calendar

The calendar is based on application-owned records.

Display:

* Date/time
* Content
* Status
* Associated Canva design
* Publication information

Posts created directly on Facebook are not automatically considered application-managed calendar records.

## 5.5 Scheduled Post Management

The user can open an application-managed scheduled post and view:

* Canva design
* Content
* Facebook caption
* Scheduled date
* Scheduled time
* Current status

### Deferred capabilities

The following remain outside the committed MVP until API support is verified:

* Rescheduling Facebook scheduled posts through API
* Cancelling Facebook scheduled posts through API
* Detecting changes made directly on Facebook
* Synchronizing those changes back to the application

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
PROJECT_SPEC.md
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
├── PROJECT_SPEC.md
│
├── .opencode/
│   └── agents/
│       ├── orchestrator.md
│       ├── api-researcher.md
│       ├── architect.md
│       ├── implementer.md
│       └── reviewer.md
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
