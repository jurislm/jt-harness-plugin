# Recover a stalled Codex GitHub review

Use this only when obtaining a Codex review is already within the user's authorized task. Respect an explicit no-retry instruction. Routine recovery needs no additional approval; it does not authorize payment, account changes, broader access, or bypassing a platform denial.

## Establish the actual state

Read the current PR head, review receipts, summary, and all available summary-edit history. Track Code Review and Security Review separately: a security update is not code-review progress. Preserve the original trigger, request/start times, last fresh progress, observed errors or quota messages, and the timestamps of live checks. An edited summary can replace an older request's state; retain each request's evidence before another submission.

If the required review already completed for the current head, use that result. A delayed user reply or automation wakeup does not create a new review request. If no review started, check repository connection, review settings, automatic triggers and the exact `@codex review` command before following the initial-request rule in the main Skill.

Explicit errors, quota limits and finished reviews with no result follow the existing review exceptions. A stale running label establishes neither active execution nor quota exhaustion. Report the recorded times, not an estimated duration without a starting event.

## One bounded recovery

Apply a documented provider recovery window when available. Otherwise, JT's internal default is at least 20 minutes without fresh progress in the unfinished review, confirmed by two live checks at least 5 minutes apart. These are internal detection thresholds, not an OpenAI timeout or SLA. Fresh progress means continue waiting with backed-off checks and independent task work.

Before recovering, reread the current head and results to catch a completion or new commit. Recover only the same unresolved head; a new head requires its own complete review coverage. The recovery budget is one per repository, PR and head, shared by Code Review and Security Review.

Use the PR's linked Linear issue as the canonical recovery record, with the repository/PR/head key and one designated recovery owner. Reconcile that record across chats, turns and automation runs. Establish a single writer or an atomic shared claim before reserving the attempt; separate local records are not shared ownership. If exclusive ownership cannot be verified, continue read-only investigation without submitting concurrently. Reserve the attempt before sending and retain it when submission outcome is unknown.

If the original task can be cancelled through an exposed, authorized control, cancel it and verify the outcome. If cancellation is unavailable, record the unresolved overlap and proceed with the single recovery. Do not claim the old task stopped. Preserve already completed results; request only the unfinished review. If a code-review request automatically starts Security Review too, record that overlap rather than separately requesting it again.

Immediately before submission, reread the head and both review results after any cancellation work. If the head changed or the missing review completed, reconcile the record instead of posting. Otherwise submit `@codex review` for unfinished Code Review or `@codex security review` for unfinished Security Review once, using included capacity. Read back the new accepted request, trigger, actual head and start time before reporting that recovery started. A head change during submission requires reconciling actual coverage, not assuming the earlier head was reviewed. If submission times out, inspect the timeline for acceptance instead of posting again. Keep the original and recovery timestamps separate.

## Finish or identify the remaining failure

Require a completed result covering the current head before treating the review as complete. A request comment is not acceptance, and acceptance is not completion. Continue the existing findings, lint, CI, mergeability and publication checks as soon as their gates pass; routine recovery is not a new human approval gate.

Before declaring a blocker or applying an error exception, reconcile the current head and both original and recovery outcomes. A completed matching result from either request can satisfy that review type. Scope an error or limit to the request, review type and head that produced it: a failed recovery or Security Review does not waive an original Code Review that remains queued or running. Verified cancellation ends that original request; an unsupported cancellation does not.

If no matching completed result exists and recovery meets the same stalled criteria again, or acceptance remains unverified after those checks, stop retrying and report the concrete provider blocker. Apply the existing exceptions only to their evidenced terminal outcomes. Keep other unresolved review coverage unmet, preserve the changes, and continue independent authorized work. Do not turn an unconfirmed running review into Pass or ask for another routine retry approval.

## Official documentation

- [GitHub review setup and troubleshooting](https://learn.chatgpt.com/docs/third-party/github#troubleshoot-code-review): connection, settings, automatic triggers and exact request commands. This page does not specify a fixed stalled-review recovery deadline.
- [Code Review usage](https://learn.chatgpt.com/docs/pricing#what-counts-as-code-review-usage): GitHub reviews and local reviews use different usage categories. Check actual usage and errors instead of inferring quota from elapsed time.
