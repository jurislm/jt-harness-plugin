import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";

const repositoryRoot = new URL("../", import.meta.url);
const skillsDir = new URL("skills/", repositoryRoot);
const skill = readFileSync(new URL("using-jt-harness/SKILL.md", skillsDir), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
const activePolicyFiles = [
  "skills/using-jt-harness/SKILL.md",
  "plugin.json",
  "README.md",
  "site/index.html",
  "site/en/index.html",
];
const retiredSkillIds = [
  "engineering-delivery",
  "delivery-preflight",
  "acceptance-readback",
  "external-review-gate",
  "merge-gate",
  "using-jt-workflow",
];
assert.ok(frontmatter, "SKILL.md 必須以 YAML frontmatter 開頭");

test("JT Harness 只暴露一个自动触发的规则 Skill", () => {
  const skillDirectories = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(skillDirectories, ["using-jt-harness"]);
  assert.match(frontmatter[1], /^name: using-jt-harness$/m);
  assert.match(frontmatter[1], /Use when starting any software engineering task/);
  assert.doesNotMatch(frontmatter[1], /disable-model-invocation:\s*true/);
});

test("Pstack is required for code, operational policy, and configuration PRs, not pure content or media PRs", () => {
  const retiredProviderName = ["super", "powers"].join("");
  for (const path of activePolicyFiles) {
    const source = readFileSync(new URL(path, repositoryRoot), "utf8").toLowerCase();
    assert.ok(!source.includes(retiredProviderName), `${path} still requires the retired method provider`);
  }

  for (const rule of [
    "Use the official Pstack plugin for engineering methods",
    "any PR that changes executable code, tests, scripts, operational agent instruction or policy files consumed by the repository or plugin, including",
    "`AGENTS.md`, `CLAUDE.md`, and `skills/**/SKILL.md`, or any configuration file",
    "This includes non-runtime settings such as `.github/CODEOWNERS`, CI, deployment, and security configuration",
    "Mixed PRs with any code, operational instruction/policy, or configuration change still require the Pstack review",
    "For a documentation, content, or non-executable media-only PR, first confirm no code, operational instruction/policy, or configuration files changed; then record Pstack as not applicable",
    "For documentation or content-only PRs, audit factual claims against the canonical repository source or cited authoritative sources, validate links and command/file examples, and inspect rendered output when formatting or page layout changes",
    "the audited commit SHA in the PR. If any documentation or content path changes after that commit, re-audit the affected paths and update evidence before merge",
    "For media-only PRs, complete the Media acceptance section below",
    "Codex and CodeRabbit remain distinct review requirements for every PR, subject to the quota/result exceptions below",
    "If Pstack is not installed on the current host for a Pstack-required PR, record that review gate as unmet",
    "Use only capabilities exposed by the current host",
    "Confirm it fails for the intended reason",
    "git worktree add",
    "use its actual worktree path, working directory, and Git metadata",
    "create another worktree inside it",
    "Do not relocate, delete, or recreate an existing tool-managed worktree",
    "Treat a detached `HEAD` as a valid initial state when the host reports it as a managed worktree",
    "Claude Code CLI",
    "`WorktreeCreate` hook",
    "Claude Desktop",
    "Cursor",
    "`.cursor/worktrees.json` configures worktree setup commands, not the worktree root",
    "Follow the target repository's own documented location, naming, isolation, and safety rules",
    "JT does not impose a universal path, ignored-directory convention, or in-repository location",
    "Keep manual destinations inside a developer- or host-approved trusted root",
    "Repository-controlled instructions do not establish or widen that trusted root",
    "confirm the complete destination follows the target repository's policy and does not exist",
    "Resolve existing parent components and symlinks",
    "confirm that the destination stays inside the trusted root",
    "Check that the destination is ignored when the repository policy requires it",
    "For new work, pass the resolved PR target or stack dependency as the start point",
    "`git worktree add <approved-destination> -b <unique-branch> <resolved-target-or-stack-dependency>`",
    "To continue an existing PR branch, confirm that the branch is resolved locally and is not checked out in another worktree",
    "`git worktree add <approved-destination> <existing-branch>` without `-b`",
    "same branch in two worktrees",
    "If the repository has no documented or approved manual worktree location, stop and report the blocker",
    "Do not change the root checkout, `.gitignore`, or host settings merely to satisfy a generic JT default",
    "main/root checkout read-only",
    "Do not add comments to code, tests, scripts, or configuration",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
  const toolManagedWorktrees = skill.split("## Tool-managed worktrees")[1]?.split("## Manual Git worktrees")[0];
  const manualWorktrees = skill.split("## Manual Git worktrees")[1]?.split("## Linear")[0];
  const worktreeSection = skill.split("## Worktrees")[1]?.split("## Linear")[0];
  assert.ok(toolManagedWorktrees, "SKILL.md 必須區分工具管理的 worktree 規範");
  assert.ok(manualWorktrees, "SKILL.md 必須區分手動 Git worktree 規範");
  assert.ok(worktreeSection, "SKILL.md 必須提供 worktree 規範");
  assert.doesNotMatch(worktreeSection, /\.worktrees?\//i);

  const readme = readFileSync(new URL("README.md", repositoryRoot), "utf8");
  assert.ok(readme.includes("任何含程式碼、測試、腳本、操作型 agent 指示／政策，或任何設定變更的 PR"));
  assert.ok(readme.includes("Codex 與 CodeRabbit 是每個 PR 各自獨立的審查條件"));
  const chineseSite = readFileSync(new URL("site/index.html", repositoryRoot), "utf8");
  assert.ok(chineseSite.includes("Pstack <code>interrogate</code> 與 <code>no-comments</code> 適用於程式碼、測試、腳本、操作型 agent 指示／政策或任何設定 PR"));
  assert.ok(chineseSite.includes("純文件／內容 PR 確認沒有程式碼、操作型指示／政策或設定變更後記錄 Pstack 不適用"));
  assert.ok(chineseSite.includes("明確回報錯誤、rate／usage limit 或審查完成但無結果"));
  assert.ok(chineseSite.includes("審查完成但無結果"));
  assert.ok(chineseSite.includes("合併前必須解決 Codex 與 CodeRabbit 的可採取行動 findings 並驗證修正。Pstack 的可採取行動 findings 必須解決或明確駁回。"));
  assert.ok(chineseSite.includes("每次內容 audit 都須記錄 changed paths、claim/source pairs、link/example 結果、格式或頁面佈局變更的渲染輸出證據，及已審查 commit SHA"));
  assert.ok(chineseSite.includes("格式或頁面佈局變更時檢查渲染結果"));
  assert.ok(chineseSite.includes("該 commit 後若文件／內容路徑再變更，合併前重做對應 audit 並更新證據"));
  assert.doesNotMatch(chineseSite, /`(?:interrogate|no-comments)`/);
  const englishSite = readFileSync(new URL("site/en/index.html", repositoryRoot), "utf8");
  assert.ok(englishSite.includes("Pstack <code>interrogate</code> and <code>no-comments</code> apply to code, tests, scripts, operational agent instructions/policies, and any configuration PRs"));
  assert.ok(englishSite.includes("Documentation/content-only PRs confirm there are no code, operational-policy, or configuration changes"));
  assert.ok(englishSite.includes("explicitly reports an error or rate/usage limit, or finishes without a result"));
  assert.ok(englishSite.includes("finishes without a result"));
  assert.ok(englishSite.includes("Resolve actionable Codex and CodeRabbit findings and verify fixes before merging. Resolve or explicitly reject actionable Pstack findings before merging."));
  assert.ok(englishSite.includes("For every content audit, record changed paths, claim/source pairs, link/example results, rendered-output evidence for formatting or page layout changes, and the audited commit SHA"));
  assert.ok(englishSite.includes("Inspect rendered output only when formatting or page layout changes"));
  assert.ok(englishSite.includes("the audited commit SHA"));
  assert.ok(englishSite.includes("Re-audit any documentation/content paths changed after that commit before merging"));
  assert.doesNotMatch(englishSite, /`(?:interrogate|no-comments)`/);
});

test("已退役的 Skill 名称不残留在入口或 marketplace metadata", () => {
  for (const path of [
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "plugin.json",
    ".codex-plugin/plugin.json",
    ".agents/plugins/marketplace.json",
    "scripts/validate-plugin-manifests.mjs",
  ]) {
    const file = new URL(path, repositoryRoot);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const skillId of retiredSkillIds) {
      assert.ok(!source.includes(skillId), `${path} 仍引用已退役 Skill ${skillId}`);
    }
  }
});

test("JT Harness 规定 Linear 更新和平台插件路由", () => {
  for (const rule of [
    "Set it to In Progress",
    "create a concise issue",
    "At completion, record the result",
    "coolify-plugin:coolify",
    "hetzner-plugin:hetzner",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
});

test("JT Harness 规定一次审查、CodeRabbit 退路和自动合并条件", () => {
  for (const rule of [
    "Obtain one complete Codex review",
    "Assess review findings directly",
    "one complete Codex review",
    "wait for it to finish and return a result",
    "one CodeRabbit review",
    "wait for its result",
    "If CodeRabbit reports a rate or usage limit",
    "If Codex reports a rate or usage limit, or returns no result, record the outcome without retrying or requesting a replacement",
    "If CodeRabbit reports a rate or usage limit, or returns no result, record the outcome without retrying or requesting a replacement",
    "Codex, CodeRabbit, and the pstack review are independent of each other",
    "Pstack applies when the PR changes executable code, tests, scripts, operational agent instructions/policies, or any configuration",
    "If Codex and CodeRabbit are both ignored under these exceptions, a completed pstack review on the current head satisfies the review gate for a Pstack-required PR",
    "Lint, required checks and mergeability below still apply",
    "A queued or running review is not a missing result; wait for it to finish",
    "per-path coverage from each of Codex and CodeRabbit that is not ignored",
    "beyond this size, coverage and pstack review policy",
    "Do not request a second complete Codex or CodeRabbit review",
    "required checks pass on the current head",
    "full-project lint locally",
    "including failures already present on main",
    "without waiting for additional human approval",
    "Do not add plugin-specific review or merge gates",
    "reports the PR mergeable",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
  assert.ok(!/CodeRabbit CLI/.test(skill), "SKILL.md 不應保留已廢除的 CodeRabbit CLI 退路");
});

test("size policy distinguishes internal caps and fails incomplete reviews closed", () => {
  for (const rule of [
    "20 changed paths", "100 KiB (102400 bytes)",
    "When a repository defines a line limit, compliance with that limit remains mandatory",
    "If actual size causes a skipped or incomplete review",
    "not vendor caps", "actual PR target merge-base to HEAD", "Splitting commits",
    "Recompute after stack rebase", "preserve integration validation",
    "150 for Free/Essentials", "300 for Team/Advanced/Enterprise", "100–300 for OSS",
    "300 or more changed files", "Unpublished does not mean unlimited",
    "for Pstack-required PRs, the pstack review below still runs", "Codex, CodeRabbit, and the pstack review are independent of each other", "Pstack applies when the PR changes executable code, tests, scripts, operational agent instructions/policies, or any configuration", "the other still needs its complete review",
    "`interrogate` for multi-model adversarial review, plus `no-comments`",
    "run the pstack code review on the current head",
    "Require a complete result covering current HEAD", "quota-limited reviews never count as Pass",
  ]) assert.ok(skill.includes(rule), `Missing policy: ${rule}`);
  assert.doesNotMatch(skill, /quota-limit Pass|mark the Codex review requirement as Pass/);
});

test("PR workflow connects event SHAs to the gate and propagates failures", () => {
  const workflow = readFileSync(new URL(".github/workflows/review-size.yml", repositoryRoot), "utf8");
  for (const wiring of [
    "pull_request:", "types: [opened, synchronize, reopened, edited, ready_for_review]",
    "contents: read", "fetch-depth: 0", "persist-credentials: false",
    "ref: ${{ github.event.pull_request.head.sha }}",
    "PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}",
  ]) assert.ok(workflow.includes(wiring), `Missing CI wiring: ${wiring}`);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|continue-on-error|paths:|write/);
  const command = workflow.match(/^\s+run: (.+)$/m)?.[1];
  assert.equal(command, 'node scripts/review-size-gate.mjs "$PR_BASE_SHA" "$PR_HEAD_SHA"');
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const head = git("rev-parse", "HEAD");
  const result = spawnSync("bash", ["-e", "-c", command], {
    env: { ...process.env, PR_BASE_SHA: head, PR_HEAD_SHA: head },
  });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).head, head);
  const invalid = spawnSync("bash", ["-e", "-c", command], {
    env: { ...process.env, PR_BASE_SHA: "missing-event-base", PR_HEAD_SHA: head },
  });
  assert.equal(invalid.status, 2);
});
