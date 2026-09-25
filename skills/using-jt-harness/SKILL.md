---
name: using-jt-harness
description: >
  Use when starting any software engineering task, including implementation, bug fixes, refactoring, code review, pull requests, merges, or deployment.
---

# JT Harness

Apply these delivery rules. Use the relevant `superpowers:*` Skill for engineering methods.

## Linear

Before editing, search for and read the matching Linear issue. If none exists, create a concise issue in the relevant team and attach a project when known. Set it to In Progress and record a concise start note. At completion, record the result, PR, review outcomes, required checks, merge state, and runtime readback when applicable. Mark Done only when the issue's acceptance is verified. Skip per-step status comments.

## Tool routing

- Coolify applications, deployments, logs, and runtime resources: `coolify-plugin:coolify`.
- Hetzner Cloud and Storage Box resources: `hetzner-plugin:hetzner`.

Read the target resource before changes and follow the selected Skill's credential and mutation rules.

## Review and merge

- Use `superpowers:requesting-code-review` for one complete Codex review. If the repository starts a Codex PR review automatically, wait for it to finish and return a result before counting it as that review. If no review starts or it fails before returning a result, use `requesting-code-review` once.
- Use one CodeRabbit review on the PR as its complete review. Treat a queued, running, or completed automatic review as that review; wait for its result instead of also mentioning `@CodeRabbit`. If no automatic review starts, request one with `@CodeRabbit`. If the PR route is limited, try the CodeRabbit CLI once. If both routes are limited, record the limits and rely on the completed Codex review.
- Use `superpowers:receiving-code-review` to assess findings. Resolve actionable findings, verify fixes, and inspect changes since the reviewed head. Do not request a second complete Codex or CodeRabbit review or trigger incremental reviews after new commits.
- For code delivery, check the target repository's merge and approval rules and current review decision. Merge without another approval only when its required approvals are satisfied, findings and review threads are resolved, required checks pass on the current head, and GitHub reports the PR mergeable. If any required gate is unknown or unmet, do not merge. Follow the repository's merge method. Do not merge review-only, draft, or explicitly no-merge work.
