# MVP 4 — Facebook Publishing: Verification

Reproducible verification steps for MVP 4 from a clean environment.
Companion evidence lives in `docs/evidence/`.

## Prerequisites

- Postgres up (`docker compose up -d postgres`), local port `5434` on this
  machine (`POSTGRES_PORT` override; see `docs/handoff.md`).
- A **Meta (Facebook) app** created at developers.facebook.com, with:
  - the **Facebook Login** product enabled;
  - the three permissions available: `pages_show_list`,
    `pages_read_engagement`, `pages_manage_posts`. Because this is a private,
    single-user app, these work under **Standard Access** as long as the
    account you log in with holds a role (Admin/Developer/Tester) on the app —
    no App Review and no Business Verification are required;
  - the redirect URI registered **exactly** as `FACEBOOK_REDIRECT_URI`
    (`http://127.0.0.1:3001/facebook/oauth/callback` by default; HTTPS is
    required except for localhost).
- Backend env: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`,
  `FACEBOOK_REDIRECT_URI` (see `.env.example`).
- A content item marked **READY** with a generated Canva design (see MVP 3).

## Automated checks

From `backend/`:

```sh
export DATABASE_URL='postgresql://cjcrsg_flow:cjcrsg_flow@127.0.0.1:5434/cjcrsg_flow?schema=public'
pnpm exec prisma migrate deploy   # applies 20261001073548_facebook_publication
pnpm typecheck                    # tsc --noEmit
pnpm lint                         # eslint --max-warnings=0
pnpm test                         # vitest run
```

Result (this milestone):

```text
Test Files  8 passed (8)
Tests       60 passed (60)   # includes 23 new tests:
                             #   publication-service (10)
                             #   meta-client (6)
                             #   facebook-service (7)
```

Frontend (`frontend/`):

```sh
pnpm typecheck
pnpm lint
pnpm build      # production build passes for all routes
```

## API smoke test (no Facebook required)

With the backend running (`backend`: `pnpm dev` / `pnpm start`):

```sh
# 1. connection status (false until FACEBOOK_* is configured)
curl http://127.0.0.1:3001/facebook/status
# -> {"configured":false,"connected":false}

# 2. no pages connected yet
curl http://127.0.0.1:3001/facebook/pages
# -> {"items":[]}

# 3. publish an unknown content -> 404
curl -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:3001/content/missing/publish \
  -H 'Content-Type: application/json' -d '{"pageId":"123"}'

# 4. publish without pageId -> 400
curl -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:3001/content/<id>/publish \
  -H 'Content-Type: application/json' -d '{}'

# 5. publish a non-READY content -> 409
curl -X POST http://127.0.0.1:3001/content/<id>/publish \
  -H 'Content-Type: application/json' -d '{"pageId":"123"}'
# -> {"error":"Only content marked ready can be published."}

# 6. publication history for a content
curl http://127.0.0.1:3001/content/<id>/publications
# -> {"items":[]}
```

## Browser verification

Verified against the production build (`next build` + `next start`, backend on
`3001`, frontend on `3000`).

1. **Publish card renders** — on `/content/<id>` a "Publish to Facebook" card
   appears below the Status card.
   `docs/evidence/mvp4-publish-card.png`.
2. **Not-configured state** — with no `FACEBOOK_*` env, the card shows
   "Facebook is not configured on the server." (as in the screenshot above).
3. **Not-connected state** — once `FACEBOOK_*` is set, the card shows a
   "Connect Facebook Page" button that links to
   `GET /facebook/oauth/authorize`.
4. **Connected state** — after the OAuth redirect returns to
   `/content?facebook=connected`, the library shows "Facebook Page connected."
   and the card shows a Page `<select>`, a caption textarea, and "Publish now".
5. **Publish gate** — "Publish now" is disabled until the content is READY,
   has a generated design, and a Page is selected.

## Live Facebook checks (required — user verification)

Executed against a real Facebook Page (Meta app configured as above):

- **Connect** — clicking "Connect Facebook Page" grants the three permissions,
  returns to the app, and the Page appears in the selector
  (`GET /facebook/pages`).
- **Publish now** — a READY content publishes immediately: status moves
  `PUBLISHING → PUBLISHED`, the Facebook post id and publish time are recorded
  and shown, and the exported image is retrievable at
  `GET /publications/:id/media`. Confirm the post on the Page.
- **Failure path** — e.g. publishing while the token is invalid records
  `FAILED` with the Meta error `code`/`subcode`/`message`/`fbtrace_id`.

## Known issues / notes

- **PNG export** is used by decision; Meta accepts PNG up to **10 MB** but
  recommends **< 1 MB**. An export over 10 MB is recorded as `FAILED` (no JPG
  fallback).
- A recorded failure returns **HTTP 201** with `status: "FAILED"` — the API call
  succeeded; the domain outcome is in the body.
- **Page access token** is stored in Postgres (plaintext); the long-lived user
  token is used only during the OAuth callback and never stored. OAuth `state`
  is in-memory (a restart during the connect flow just requires retrying).
- Only Pages returned by `GET /me/accounts` at connect time are known; there is
  no background re-sync of Pages.
- **Re-publish** creates a new `Publication` and a new Facebook post (append-only
  history); it is not deduplicated.
- Publication endpoints are unauthenticated, consistent with the rest of the app
  (app-level auth remains deferred).
