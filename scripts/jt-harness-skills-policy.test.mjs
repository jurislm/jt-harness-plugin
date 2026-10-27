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

test("Pstack is preferred without an external skill hard dependency", () => {
  const retiredProviderName = ["super", "powers"].join("");
  for (const path of activePolicyFiles) {
    const source = readFileSync(new URL(path, repositoryRoot), "utf8").toLowerCase();
    assert.ok(!source.includes(retiredProviderName), `${path} still requires the retired method provider`);
  }

  for (const rule of [
    "When the official Pstack plugin is available on the current host, prefer it for engineering methods",
    "Use only capabilities exposed by the current host",
    "Confirm it fails for the intended reason",
    "git worktree add",
    "main/root checkout read-only",
    "Do not add comments to code, tests, scripts, or configuration",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
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
    "CodeRabbit CLI once",
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
    "do not treat it as a failure or a merge blocker", "If the CLI is also limited, record both limits and ignore CodeRabbit",
    "run `interrogate` for multi-model adversarial review and `blast-radius`",
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
