---
name: milestone-pr
description: Prepare a milestone PR description with inline verification steps and embedded evidence images. Use when finishing a milestone and creating or updating its pull request, so the user can test and verify directly from the PR page.
---

# Milestone PR

## What I do

Produce a pull-request description the user can verify from the PR page alone — inline step-by-step instructions, expected results, and the evidence screenshots embedded as images. I do not merge; the user verifies and merges.

## When to use me

- When opening a milestone PR (or updating an existing one before user verification).
- When the user says the PR is missing steps or images.

## Rules that must hold (AGENTS.md "Pull Request Requirements")

- Every acceptance criterion is marked **Complete** or **Not complete**.
- The verification steps are written **inline in the PR description** — commands, exact click-through (URLs, buttons, expected results), and API `curl` commands with expected status codes/output.
- Evidence images are **embedded in the PR body** as rendered images, not just linked or referenced.
- A reproducible guide is also committed as `docs/<milestone>-verification.md`, but it is a supplement, never a substitute for the inline PR steps.
- Known issues are listed explicitly.
- The PR is not merged by the agent; stop for user verification.

## Workflow

### 1. Match the established format

Read the last merged milestone PR for the house style:

```sh
gh pr view <prev-pr-number> --json body --jq '.body'
```

(As of MVP 3, the shape is: `## Milestone`, `## Implementation`, `## Acceptance criteria` (table with Complete/Not complete), `## How to verify this milestone` (prerequisites, automated checks, API smoke, manual walkthrough), `## Evidence`, `## Reviewer`, `## Known issues`.)

### 2. Assemble the evidence

- Commit every screenshot/GIF to `docs/evidence/` under a clear name (`<milestone>-<what>.png`).
- Push the branch so the raw URLs resolve.

### 3. Embed images in the PR body

Use the branch raw-URL form (matches previous PRs):

```markdown
![New editor with dynamic form](https://github.com/<owner>/<repo>/raw/<branch>/docs/evidence/<file>.png)
```

- Put the most meaningful screenshots inline at the matching walkthrough step, plus a final `## Evidence` section listing any remaining ones.
- Verify the files are actually on the pushed branch before referencing:

```sh
git ls-tree -r --name-only origin/<branch> docs/evidence/
curl -s -o /dev/null -w "%{http_code}\n" "https://github.com/<owner>/<repo>/raw/<branch>/docs/evidence/<file>.png"   # expect 200 or 302
```

### 4. Write the verification steps inline

Give the user a script they can follow without opening another file:

- **Prerequisites** — services to start, credentials/scopes, a synced template.
- **Automated checks** — exact `pnpm` commands and the expected test output.
- **API smoke** — `curl` commands with expected status codes.
- **Manual walkthrough** — numbered browser steps with exact URLs/buttons and the expected result at each step, with screenshots inline.

### 5. Open / update the PR and stop

```sh
gh pr create --base main --head <branch> --title "<MVP N — Name>" --body-file /tmp/<milestone>-pr-body.md
# or, to update:
gh pr edit <pr-number> --body-file /tmp/<milestone>-pr-body.md
```

Then report the PR URL and wait for the user to verify and merge. Do not merge.

## Common failure to avoid

Referencing `docs/<milestone>-verification.md` instead of writing the steps inline. The doc exists for clean-environment re-verification; the PR body is what the user actually reads and tests from.
