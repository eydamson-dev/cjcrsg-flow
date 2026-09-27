# ROADMAP.md

Implementation sequence for the application. One milestone at a time; do not skip milestones.

See `PROJECT.md` for product/architecture rules and `AGENTS.md` for development rules.

---

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
