import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const skillsDir = new URL("skills/", repositoryRoot);
const skill = readFileSync(new URL("using-jt-harness/SKILL.md", skillsDir), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
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

test("JT Harness 规定 Linear 更新和平台插件路由", () => {
  for (const rule of [
    "set it to In Progress",
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
    "one CodeRabbit review",
    "CodeRabbit CLI once",
    "Do not request a second complete Codex or CodeRabbit review",
    "required checks pass on the current head",
    "reports the PR mergeable",
  ]) {
    assert.ok(skill.includes(rule), `SKILL.md 缺少「${rule}」`);
  }
});
