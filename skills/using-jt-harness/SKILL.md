---
name: using-jt-harness
description: >
  Use when starting any software engineering task, including implementation, bug fixes, refactoring, code review, pull requests, merges, or deployment.
---

# JT Harness

Keep JT as the single source of truth for delivery policy. When the official Pstack plugin is available on the current host, prefer it for engineering methods; leave its upstream package unmodified and do not copy its workflow into JT. Use only capabilities exposed by the current host, including its available skills and tools.

## Engineering method

- For a behavior change, bug fix, or refactor with a meaningful local test path, write the focused test before implementation and run it first. Confirm it fails for the intended reason, then make the smallest change and rerun it until it passes. Record the commands and outcomes.
- If a meaningful failing test is impractical, state why and use the closest executable check. Do not weaken an existing assertion to fit the implementation.
- Keep the smallest complete solution. Do not add comments to code, tests, scripts, or configuration in any product; use executable checks or documentation for rationale when needed.
- Read the repository's AGENTS.md and TESTING.md before editing. Follow its exact test, mock, release, and deployment rules; JT does not duplicate project-specific command matrices.
- Use the current host's native delegation tools when available and useful. If they are unavailable, work serially and report the limitation; do not assume tools from another host exist.

## Worktrees

- Make engineering changes in a task-specific branch and isolated worktree. Keep the main/root checkout read-only for task development: when clean and safe, update it with `git pull --ff-only`; do not edit task files, commit task changes, or directly push development changes from it. Reuse only a worktree explicitly attached to this task.
- Prefer the host-managed worktree tool when it supports the repository. If it is unsupported, use native `git worktree add` with a unique branch and path. Confirm the destination does not exist and, if it is inside the repository, is covered by `.gitignore` before creating it.
- If the platform actually denies worktree creation or no usable route exists, stop and report the exact operation. Never fall back to writing in the main/root checkout or bypass platform restrictions.

## Linear

Before editing, search for and read the matching Linear issue. If none exists, create a concise issue in the relevant team and attach a project when known. Set it to In Progress and record a concise start note. At completion, record the result, PR, review outcomes, required checks, merge state, and runtime readback when applicable. Mark Done only when the issue's acceptance is verified. Skip per-step status comments.

## Tool routing

- Coolify applications, deployments, logs, and runtime resources: `coolify-plugin:coolify`.
- Hetzner Cloud and Storage Box resources: `hetzner-plugin:hetzner`.

Read the target resource before changes and follow the selected Skill's credential and mutation rules.

## Review and merge

- Obtain one complete Codex review. If the repository starts a Codex PR review automatically, wait for it to finish and return a result before counting it as that review. If no automatic review starts, request one once. If the review is blocked by an explicitly reported usage or quota limit, record the limit evidence and mark the Codex review requirement as Pass without retrying or requesting a replacement. For any other failure or missing result, record the outcome and do not request a replacement; the Codex review requirement remains unmet. Do not merge while any required review gate is unsatisfied.
- Use one CodeRabbit review on the PR as its complete review. Treat a queued, running, or completed automatic review as that review; wait for its result instead of also mentioning `@CodeRabbit`. If no automatic review starts, request one with `@CodeRabbit`. If the PR route is limited, try the CodeRabbit CLI once. If both routes are limited, record the limits and rely on the satisfied Codex review requirement, including a documented quota-limit Pass.
- Assess review findings directly. Resolve actionable findings, verify fixes, and inspect changes since the reviewed head. Do not request a second complete Codex or CodeRabbit review or trigger incremental reviews after new commits.
- Run the repository's full-project lint locally on the current head before merging. It must pass, including failures already present on main; do not substitute scoped lint or CI for this check.
- Once the review requirements above are satisfied, actionable findings are resolved and fixes verified, full-project lint passes, required checks pass on the current head, and GitHub reports the PR mergeable, merge directly without waiting for additional human approval. For delivery work, mark a draft PR ready before merging. Follow the repository's merge method. Do not add plugin-specific review or merge gates. If GitHub blocks the merge, record the concrete reason without bypassing platform restrictions. Do not merge review-only or explicitly no-merge work.
