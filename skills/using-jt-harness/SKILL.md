---
name: using-jt-harness
description: >
  Use when starting any software engineering task, including implementation, bug fixes, refactoring, code review, pull requests, merges, or deployment.
---

# JT Harness

Keep JT as the single source of truth for delivery policy. Use the official Pstack plugin for engineering methods. Every review requires its `interrogate` and `no-comments` skills; if Pstack is not installed on the current host, record that review gate as unmet and stop delivery instead of skipping it. Leave its upstream package unmodified and do not copy its workflow into JT. Use only capabilities exposed by the current host, including its available skills and tools.

## Engineering method

- For a behavior change, bug fix, or refactor with a meaningful local test path, write the focused test before implementation and run it first. Confirm it fails for the intended reason, then make the smallest change and rerun it until it passes. Record the commands and outcomes.
- If a meaningful failing test is impractical, state why and use the closest executable check. Do not weaken an existing assertion to fit the implementation.
- Keep the smallest complete solution. Do not add comments to code, tests, scripts, or configuration in any product; use executable checks or documentation for rationale when needed.
- Read the repository's AGENTS.md and TESTING.md before editing. Follow its exact test, mock, release, and deployment rules; JT does not duplicate project-specific command matrices.
- Use the current host's native delegation tools when available and useful. If they are unavailable, work serially and report the limitation; do not assume tools from another host exist.

## Worktrees

- Make engineering changes in a task-specific branch and isolated worktree. Keep the main/root checkout read-only for task development: when clean and safe, update it with `git pull --ff-only`; do not edit task files, commit task changes, or directly push development changes from it. Reuse only a worktree explicitly attached to this task.
- Create every worktree under the current repository's `.worktree/` directory, including worktrees created by host-managed tools; never create one outside the repository. Prefer the host-managed worktree tool only when it can place the worktree there; otherwise use native `git worktree add .worktree/<branch-slug> -b <branch>` with a unique branch. Before creating it, confirm `.worktree/` is listed in `.gitignore` and the destination does not exist.
- If the platform actually denies worktree creation or no usable route exists, stop and report the exact operation. Never fall back to writing in the main/root checkout or bypass platform restrictions.

## Linear

### Issue and spec workflow (JT Harness team convention)

Follow this convention based on [Linear's issue-writing and project-planning guidance](https://linear.app/method/write-issues-not-user-stories); it is a team choice, not a Linear-mandated template. The canonical policy and official references are in the [JT Harness project overview](https://linear.app/jurislm/project/jt-harness-plugin-1d6000794746).

- **Small bugs and tasks:** Keep the problem, scope, how to address it, acceptance conditions, and final result on the issue. Do not create a separate spec by default.
- **Features spanning issues:** Keep shared behavior, boundaries, and decisions in one canonical spec. Use the existing project overview as a shared entry point; link the canonical spec and the relevant section from each actionable issue. A detailed spec may live in issue Resources when that is the right home. Do not require every spec to live on a project or create duplicate specs.
- **Changes to existing product rules:** Discuss and settle the change first, then update the canonical spec and affected issues together, with links in both directions. Do not defer the agreed spec update until issue closure.
- **Completion:** Check the implementation, issue acceptance, and spec for consistency. Update the spec when shared behavior changed; do not force a document change for an implementation-only task. Avoid duplicate specs and documentation without useful content.

Before editing, search for and read the matching Linear issue. If none exists, create a concise issue in the relevant team and attach a project when known. Set it to In Progress and record a concise start note. At completion, record the result, PR, review outcomes, required checks, merge state, and runtime readback when applicable. Mark Done only when the issue's acceptance is verified. Skip per-step status comments.

## Tool routing

- Coolify applications, deployments, logs, and runtime resources: `coolify-plugin:coolify`.
- Hetzner Cloud and Storage Box resources: `hetzner-plugin:hetzner`.

Read the target resource before changes and follow the selected Skill's credential and mutation rules.

## Review size and coverage

Before the first push or review request, measure the entire actual PR target merge-base to HEAD range, not just the last commit. Use `npm run review:size -- <actual-target-ref> [HEAD]` from this plugin checkout, or run its `scripts/review-size-gate.mjs` by absolute path from the target repository. Resolve the actual PR target explicitly; do not assume main. Missing refs, ambiguous merge-bases, failed or truncated measurement leave the gate unmet.

The local command is manually invoked; no push hook is installed. `npm run validate` runs gate and CI wiring tests, not a size assessment of the current PR. Before measurement, inspect `git status` and include all intended changes in local commits: unstaged, staged-but-uncommitted and untracked files are outside the committed HEAD range. A successful exit certifies only the measured size. Current-HEAD external review status and per-path review coverage require separate evidence; the script does not query or validate them.

This repository's `.github/workflows/review-size.yml` runs the same gate on `pull_request` events using the event's actual base and head SHAs and full Git history. Open, synchronize, reopen, edit (including retarget), and ready-for-review events trigger assessment. Any exceeded limit or measurement error fails the job. It has only `contents: read`, does not persist checkout credentials, and uses no secrets or `pull_request_target`. Remote execution requires the workflow to be present in the remote event revision and Actions to be enabled; local verification is not a remote run. It is not configured as a required check and does not change branch protection. Other repositories must explicitly adopt equivalent CI wiring.

Apply existing stricter repository limits first. Otherwise the internal conservative defaults per PR are **20 changed paths** and **100 KiB (102400 bytes) of text patch**. These are JT internal policy, not vendor caps. Measure and report every added plus deleted line, but do not infer a universal vendor line cap. When a repository defines a line limit, compliance with that limit remains mandatory. Equality passes; exceeding an applicable limit requires smaller PRs. The script accepts a third JSON argument with stricter `changedPaths` or `patchBytes` limits and an explicit repository `changedLines` limit. A size pass never establishes external coverage: require the complete current-HEAD result and per-path coverage from each of Codex and CodeRabbit that is not ignored under the review exceptions below. If actual size causes a skipped or incomplete review, split independently verifiable functionality and recompute the full PR range. Check separate repository-specific limits as well.

Count all changes without path filters. Measure from isolated Git metadata and an empty working directory, sharing only the source object store for reads, so repository, working-tree, user and system diff attributes cannot hide text content. A rename counts as one changed entry and retains both old and new paths in coverage; deletes count too. Count additions plus deletions for text and the full Git text patch with headers and three context lines in bytes. List every generated file, binary, lockfile and submodule in coverage even where Git has no text line count. Binary markers are not binary-content review. A size pass alone is not review approval. Document each path's review coverage, reviewer, reviewed head and any limitations. For code and reviewable text, unresolved skipped or unsupported content leaves required coverage unmet. For non-code media, use the media acceptance below instead of requiring a code reviewer to interpret the binary. Never exclude code, truncate a patch, or pay for more review capacity to pass a gate.

### Media acceptance

For non-executable audio, video and raster image assets, review code references, paths, schemas and player configuration with the code reviewers. Verify the assets themselves through metadata, decoding, rendered images or representative video frames, and actual audio/video playback, pause and seeking as applicable. Active content such as scripts, HTML and executable SVG still requires code review. Check that the content matches its intended source and that dimensions, language and rendered layout satisfy the task. Record the asset paths, hashes or reviewed commit, checks and limitations beside the code-review coverage.

A code reviewer's unsupported-media exclusion is not a failed code review when the applicable media acceptance is complete. Do not request additional approval solely because a code tool cannot inspect media. A failed or missing media check remains unresolved; it does not waive code review, CI, user authorization or deployment acceptance.

When any limit is exceeded, split PRs by independently acceptable functionality and dependency order. Splitting commits within one oversized PR is insufficient. Record each PR's target, merge-base, HEAD, size and acceptance checks. Recompute after stack rebase, retarget or new commits, and preserve integration validation across the whole stack. Prepare the complete intended scope before the first push to preserve the one-complete-review rule below.

### Vendor evidence checked 2026-10-23

- [CodeRabbit plans](https://docs.coderabbit.ai/management/plans#rate-limits) list per-review file caps of 150 for Free/Essentials, 300 for Team/Advanced/Enterprise, and 100–300 for OSS. Vendor counts apply after path filters; JT still counts and covers all changed paths. No universal LOC, byte or commit cap was found in these sources.
- [CodeRabbit remote CLI](https://docs.coderabbit.ai/cli/index#review-without-a-local-checkout) rejects comparisons with 300 or more changed files because the provider response may be incomplete. This remote-mode boundary is distinct from plan caps and must not be generalized to all local CLI reviews.
- [CodeRabbit rate limits](https://docs.coderabbit.ai/management/rate-limits) explain that a passing “Review rate limited” check can mean no review ran. Inspect the actual complete review result and coverage for current HEAD, not merely a green check or older approval.
- [Codex GitHub review](https://learn.chatgpt.com/docs/third-party/github) and [Codex pricing](https://learn.chatgpt.com/docs/pricing) do not publish a fixed general GitHub review cap for files, lines, bytes, tokens or commits. Unpublished does not mean unlimited. Do not substitute model context limits or Codex Security Review limits for general GitHub review limits.

## Review and merge

- Delivery PRs should not be opened as drafts; open them ready for review (`gh pr create` without `--draft`), because draft PRs do not trigger automatic Codex or CodeRabbit reviews. If a delivery PR is already a draft, mark it ready immediately so the reviews start; do not wait until just before merging.
- Obtain one complete Codex review. If the repository starts a Codex PR review automatically, wait for it to finish and return a result before counting it as that review. If no automatic review starts, request one once. If Codex reports a rate or usage limit, or returns no result, record the outcome without retrying or requesting a replacement; the pstack review below still runs.
- Use one CodeRabbit review on the PR as its complete review. Treat a queued, running, or completed automatic review as that review; wait for its result instead of also mentioning `@CodeRabbit`. If no automatic review starts, request one with `@CodeRabbit`. If CodeRabbit reports a rate or usage limit, or returns no result, record the outcome without retrying or requesting a replacement; the pstack review below still runs.
- On every review submission, in addition to CodeRabbit and Codex, run the pstack code review on the current head: `interrogate` for multi-model adversarial review, plus `no-comments` as required by the pstack opening-a-pr playbook. Resolve or explicitly reject their actionable findings before merging.
- Codex, CodeRabbit, and the pstack review are independent of each other. Ignore only whichever of Codex or CodeRabbit reports a rate or usage limit or returns no result; the other still needs its complete review. The pstack review (`interrogate` plus `no-comments`) runs every time, regardless of Codex or CodeRabbit. Otherwise, skipped, incomplete, missing or quota-limited reviews never count as Pass. Require a complete result covering current HEAD. After fixing findings, retain unchanged-path coverage by verified content identity and obtain one focused verification of the entire correction delta from each reviewer that is not ignored. Record the original reviewed head, current head, changed paths and verification result; an author's reply alone is not reviewer verification. If a provider cannot verify the delta and current coverage remains unavailable, record the unmet gate and stop delivery instead of silently counting an older result.
- If Codex and CodeRabbit are both ignored under these exceptions, a completed pstack review on the current head satisfies the review gate; lint, required checks and mergeability below still apply.
- A review returns no result only when the reviewer explicitly reports an error or a rate or usage limit, or the review has finished without producing any result. A queued or running review is not a missing result; wait for it to finish.
- When a Codex review remains queued or running without fresh progress, follow [autonomous recovery](references/stalled-codex-review.md). Authorization to obtain the review includes that bounded recovery; do not wait for separate retry approval. Preserve the original and recovery timelines. For other reviewers, inspect live status and errors, back off unchanged polling, and retain the one-request rule.
- Assess review findings directly. Resolve actionable findings, verify fixes, and inspect changes since the reviewed head. Do not request a second complete Codex or CodeRabbit review of the unchanged PR scope, except for the bounded Codex recovery described above. Authorization to resolve findings includes a focused follow-up for the correction delta at its new head without separate approval. Use the existing review conversation or the provider's scoped follow-up, include every unreviewed correction, and retain the quota exceptions. New feature scope is not a correction delta. Do not repeat requests for an unchanged head except for the bounded Codex recovery described above.
- Run the repository's full-project lint locally on the current head before merging. It must pass, including failures already present on main; do not substitute scoped lint or CI for this check.
- Once the review requirements above are satisfied, actionable findings are resolved and fixes verified, full-project lint passes, required checks pass on the current head, and GitHub reports the PR mergeable, merge directly without waiting for additional human approval. A delivery PR must already be ready for review (see above); if automatic reviews still did not start, request them as described above. Follow the repository's merge method. Do not add plugin-specific review or merge gates beyond this size, coverage and pstack review policy. If GitHub blocks the merge, record the concrete reason without bypassing platform restrictions. Do not merge review-only or explicitly no-merge work.
