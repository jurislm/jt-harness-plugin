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

## Review size and coverage

Before the first push or review request, measure the entire actual PR target merge-base to HEAD range, not just the last commit. Use `npm run review:size -- <actual-target-ref> [HEAD]` from this plugin checkout, or run its `scripts/review-size-gate.mjs` by absolute path from the target repository. Resolve the actual PR target explicitly; do not assume main. Missing refs, ambiguous merge-bases, failed or truncated measurement leave the gate unmet.

The local command is manually invoked; no push hook is installed. `npm run validate` runs gate and CI wiring tests, not a size assessment of the current PR. Before measurement, inspect `git status` and include all intended changes in local commits: unstaged, staged-but-uncommitted and untracked files are outside the committed HEAD range. A successful exit certifies only the measured size. Initial external review coverage and subsequent fix verification require separate evidence under Review and merge below; the script does not query or validate them.

This repository's `.github/workflows/review-size.yml` runs the same gate on `pull_request` events using the event's actual base and head SHAs and full Git history. Open, synchronize, reopen, edit (including retarget), and ready-for-review events trigger assessment. Any exceeded limit or measurement error fails the job. It has only `contents: read`, does not persist checkout credentials, and uses no secrets or `pull_request_target`. Remote execution requires the workflow to be present in the remote event revision and Actions to be enabled; local verification is not a remote run. It is not configured as a required check and does not change branch protection. Other repositories must explicitly adopt equivalent CI wiring.

Apply existing stricter repository limits first. Otherwise the internal conservative defaults per PR are **20 changed paths** and **100 KiB (102400 bytes) of text patch**. These are JT internal policy, not vendor caps. Measure and report every added plus deleted line, but do not infer a universal vendor line cap. When a repository defines a line limit, compliance with that limit remains mandatory. Equality passes; exceeding an applicable limit requires smaller PRs. The script accepts a third JSON argument with stricter `changedPaths` or `patchBytes` limits and an explicit repository `changedLines` limit. A size pass never establishes external coverage: require complete initial results and per-path coverage for both reviewers at the submitted head, then use the fix-closure rules below for original findings. If actual size causes a skipped or incomplete review, split independently verifiable functionality and recompute the full PR range. Check separate repository-specific limits as well.

Count all changes without path filters. Measure from isolated Git metadata and an empty working directory, sharing only the source object store for reads, so repository, working-tree, user and system diff attributes cannot hide text content. A rename counts as one changed entry and retains both old and new paths in coverage; deletes count too. Count additions plus deletions for text and the full Git text patch with headers and three context lines in bytes. List every generated file, binary, lockfile and submodule in coverage even where Git has no text line count. Binary markers are not binary-content review. A size pass alone is not review approval. Document each path's review coverage, reviewer, reviewed head and any limitations; unresolved skipped or unsupported content leaves required coverage unmet. Never exclude code, truncate a patch, or pay for more review capacity to pass a gate.

When any limit is exceeded, split PRs by independently acceptable functionality and dependency order. Splitting commits within one oversized PR is insufficient. Record each PR's target, merge-base, HEAD, size and acceptance checks. Recompute after stack rebase, retarget or new commits, and preserve integration validation across the whole stack. Prepare the complete intended scope before the first push to preserve the one-complete-review rule below.

### Vendor evidence checked 2026-10-23

- [CodeRabbit plans](https://docs.coderabbit.ai/management/plans#rate-limits) list per-review file caps of 150 for Free/Essentials, 300 for Team/Advanced/Enterprise, and 100–300 for OSS. Vendor counts apply after path filters; JT still counts and covers all changed paths. No universal LOC, byte or commit cap was found in these sources.
- [CodeRabbit remote CLI](https://docs.coderabbit.ai/cli/index#review-without-a-local-checkout) rejects comparisons with 300 or more changed files because the provider response may be incomplete. This remote-mode boundary is distinct from plan caps and must not be generalized to all local CLI reviews.
- [CodeRabbit rate limits](https://docs.coderabbit.ai/management/rate-limits) explain that a passing “Review rate limited” check can mean no review ran. Inspect the actual complete initial review result and coverage for the submitted head, not merely a green check or approval for another scope. Record subsequent fix verification separately as described below.
- [Codex GitHub review](https://learn.chatgpt.com/docs/third-party/github) and [Codex pricing](https://learn.chatgpt.com/docs/pricing) do not publish a fixed general GitHub review cap for files, lines, bytes, tokens or commits. Unpublished does not mean unlimited. Do not substitute model context limits or Codex Security Review limits for general GitHub review limits.

## Review and merge

- Obtain one complete Codex review. If the repository starts a Codex PR review automatically, wait for it to finish and return a result before counting it as that review. If no automatic review starts, request one once. If the review is blocked by an explicitly reported usage or quota limit, record the limit evidence without retrying or requesting a replacement; the Codex review requirement remains unmet. For any other failure or missing result, record the outcome and do not request a replacement; the Codex review requirement remains unmet. Do not merge while any required review gate is unsatisfied.
- Use one CodeRabbit review on the PR as its complete review. Treat a queued, running, or completed automatic review as that review; wait for its result instead of also mentioning `@CodeRabbit`. If no automatic review starts, request one with `@CodeRabbit`. If the PR route is limited, try the CodeRabbit CLI once. If both routes are limited, record the limits; the CodeRabbit review requirement remains unmet.
- Skipped, incomplete, missing or quota-limited reviews never count as Pass. Require complete initial review coverage of the submitted head from both reviewers before using fix closure. Initially uncovered, skipped or unsupported scope remains unmet; fix verification cannot substitute for a missing initial review. Split oversized scope as described above.
- Assess review findings directly. After complete initial coverage, close original findings with per-finding fix or counterevidence; inspect the exact diff from each reviewed head to the delivery head and run necessary tests and required checks on the delivery head. Record each reviewer's actual reviewed SHA separately from the verified delivery SHA; do not claim external review of a newer head. Unresolved actionable findings or failed required checks still block delivery.
- Do not request a second complete Codex or CodeRabbit review or trigger incremental reviews after new commits. Do not open a replacement PR to evade the per-package review count. New functionality outside the originally reviewed scope requires a separate package and its normal first reviews; ordinary fixes to original findings use evidence closure above.
- Run the repository's full-project lint locally on the current head before merging. It must pass, including failures already present on main; do not substitute scoped lint or CI for this check.
- Once the review requirements above are satisfied, actionable findings are resolved and fixes verified, full-project lint passes, required checks pass on the current head, and GitHub reports the PR mergeable, merge directly without waiting for additional human approval. For delivery work, mark a draft PR ready before merging. Follow the repository's merge method. Do not add plugin-specific review or merge gates beyond this size and coverage policy. If GitHub blocks the merge, record the concrete reason without bypassing platform restrictions. Do not merge review-only or explicitly no-merge work.
