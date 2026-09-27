---
name: token-efficient
description: Reduce token and context waste during coding work. Use when reading files, searching the codebase, running shell commands, or validating changes to consume minimum sufficient context, batch tool calls, filter output, and validate progressively without sacrificing correctness or quality.
---

# Token Efficiency

Standing guidance to remove token waste without reducing engineering quality. Apply it implicitly; it is not a task to execute.

## Priority order

1. Correctness
2. Required context
3. Appropriate validation
4. Efficiency

Optimize for total expected work, not per-action tokens. Reading architecture before a major refactor, all call sites before changing an API, schema/migrations before changing database behavior, or existing tests before implementing behavior can cost tokens now and save more later.

Never sacrifice the first three to save tokens: no guessing instead of inspecting, no skipping necessary investigation or tests, no ignoring architecture or existing patterns, no weakening error handling, no omitting required documentation, no hiding uncertainty.

## Context: minimum sufficient

Use minimum sufficient context, not minimum possible.

- Locate code with `rg`, symbol search, and `rg --files` before opening files; read only files relevant to the task.
- In a monorepo, identify the relevant app/package first and scope searches to that subtree with path/glob filters.
- Read relevant line ranges; expand the range when surrounding context is needed.
- Do not re-read files or re-establish facts already in the current context or in prior tool output; re-read only when a fact is no longer available (e.g., after compaction).
- Skip generated files, lockfiles, build artifacts, caches, and unrelated source unless required.
- Prefer a targeted glob or search over reading a whole directory.
- Expand incrementally only when current context is insufficient.

Project-mandated context (`AGENTS.md`, `PROJECT.md`, `ROADMAP.md`, handoff) takes precedence: read it when the project requires it, but do not re-read it within the same session.

## Tool calls

- Batch independent calls you will actually use; do not speculatively fetch files "just in case".
- Prefer precise commands over exploratory command chains.
- Filter large outputs before consuming them; run the smallest relevant command first.
- Avoid re-checking information that is already known.
- Use the minimum number of calls that provides sufficient evidence.

## Output

- Do not narrate actions, restate the request, or repeat information already in the conversation or in project docs.
- Do not dump large code blocks or reproduce complete tool output.
- Keep progress updates and final summaries concise; add detail only when it materially helps.

## Validation

Validate progressively; do not run the full suite for every change.

1. Review the diff.
2. Run the smallest relevant test, typecheck, or lint.
3. Run a targeted integration test if warranted.
4. Broaden only when justified.

Broaden when the change is cross-cutting or touches shared infrastructure, public APIs, schemas, auth, config, or build tooling.

## Plan and build

When planning, identify the relevant subsystem first and avoid exhaustive exploration unless architecture requires it. Inspect enough to produce a reliable plan, record discoveries clearly so they are not rediscovered, and keep the plan concise without speculative details.

When building, reuse the plan and conversation context; do not rediscover what is already established unless verification is required. Inspect only the additional context needed, make coherent changes rather than artificially minimizing file count, review the diff, and run targeted validation, broadening when the change is cross-cutting or risky.

## When stuck

1. Identify the exact blocker and what information is missing.
2. Search specifically for that information.
3. Inspect the smallest additional context that resolves it.
4. Reassess; do not repeat failed approaches without new evidence.
5. Avoid expanding into unrelated code.

If uncertainty remains, state it instead of inventing an answer.
