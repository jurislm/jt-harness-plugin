import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";

const repositoryRoot = new URL("../", import.meta.url);
const skillsDir = new URL("skills/", repositoryRoot);
const skill = readFileSync(new URL("using-jt-harness/SKILL.md", skillsDir), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
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

test("JT retains independent reviews and content and media acceptance", () => {
  for (const rule of [
    "For documentation or content-only PRs, audit factual claims against the canonical repository source or cited authoritative sources, validate links and command/file examples, and inspect rendered output when formatting or page layout changes",
    "the audited commit SHA in the PR. If any documentation or content path changes after that commit, re-audit the affected paths and update evidence before merge",
    "For media-only PRs, complete the Media acceptance section below",
    "Codex and CodeRabbit are independent review requirements for every PR, subject to the quota/result exceptions below",
    "Use only capabilities exposed by the current host",
    "Confirm it fails for the intended reason",
    "Do not add comments to code, tests, scripts, or configuration",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }

  const readme = readFileSync(new URL("README.md", repositoryRoot), "utf8");
  assert.ok(readme.includes("Codex 與 CodeRabbit 是每個 PR 各自獨立的審查條件"));
  const chineseSite = readFileSync(new URL("site/index.html", repositoryRoot), "utf8");
  assert.ok(chineseSite.includes("確認觸及 rate／usage limit，或確認審查已結束但未產生結果"));
  assert.ok(chineseSite.includes("如果兩者都沒有完成最新提交的審查，停止交付"));
  assert.ok(chineseSite.includes("合併前必須解決 Codex 與 CodeRabbit 的可採取行動 findings 並驗證修正。"));
  assert.ok(chineseSite.includes("每次內容 audit 都須記錄 changed paths、claim/source pairs、link/example 結果、格式或頁面佈局變更的渲染輸出證據，及已審查 commit SHA"));
  assert.ok(chineseSite.includes("格式或頁面佈局變更時檢查渲染結果"));
  assert.ok(chineseSite.includes("該 commit 後若文件／內容路徑再變更，合併前重做對應 audit 並更新證據"));
  const englishSite = readFileSync(new URL("site/en/index.html", repositoryRoot), "utf8");
  assert.ok(englishSite.includes("Documentation/content-only PRs confirm there are no code, operational-policy, or configuration changes"));
  assert.ok(englishSite.includes("confirms a rate/usage limit or confirms that a review finished without a result"));
  assert.ok(englishSite.includes("If neither reviewer completes a review of the current head, stop delivery."));
  assert.ok(englishSite.includes("Resolve actionable Codex and CodeRabbit findings and verify fixes before merging."));
  assert.ok(englishSite.includes("For every content audit, record changed paths, claim/source pairs, link/example results, rendered-output evidence for formatting or page layout changes, and the audited commit SHA"));
  assert.ok(englishSite.includes("Inspect rendered output only when formatting or page layout changes"));
  assert.ok(englishSite.includes("the audited commit SHA"));
  assert.ok(englishSite.includes("Re-audit any documentation/content paths changed after that commit before merging"));
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
    "Codex and CodeRabbit are independent of each other",
    "Lint, required checks and mergeability below still apply",
    "Wait for queued or running reviews to finish",
    "per-path coverage from each of Codex and CodeRabbit that is not ignored",
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

test("size policy submits complete scope first and fails incomplete reviews closed", () => {
  for (const rule of [
    "complete, coherent intended PR scope first", "JT imposes no default size caps",
    "Explicit repository limits remain binding", "splitting must not bypass quota limits",
    "When a repository defines a line limit, compliance with that limit remains mandatory",
    "If actual size causes a skipped or incomplete review",
    "actual PR target merge-base to HEAD", "Splitting commits",
    "Recompute after stack rebase", "preserve integration validation",
    "150 for Free/Essentials", "300 for Team/Advanced/Enterprise", "100–300 for OSS",
    "300 or more changed files", "Unpublished does not mean unlimited",
    "Apply an exception to at most one reviewer, and only if the other completed its review on the current head",
    "If neither reviewer completed its review on the current head, stop delivery, even if both otherwise qualify for exceptions",
    "A generic error, failed or incomplete review, missing status, and queued or running review do not qualify",
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
