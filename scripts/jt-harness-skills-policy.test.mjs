import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

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
    "superpowers:requesting-code-review",
    "superpowers:receiving-code-review",
    "one complete Codex review",
    "wait for it to finish and return a result",
    "one CodeRabbit review",
    "wait for its result",
    "CodeRabbit CLI once",
    "Do not request a second complete Codex or CodeRabbit review",
    "required checks pass on the current head",
    "approval rules and current review decision",
    "reports the PR mergeable",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
});
