import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assessSize, parseNumstat, measureReview } from "./review-size-gate.mjs";

test("explicit repository dimensions stay enforced without default caps", () => {
  const exact = { changedPaths: 20, changedLines: 500, patchBytes: 102400 };
  assert.equal(assessSize(exact).pass, true);
  assert.equal(assessSize({ ...exact, changedLines: 615 }).pass, true);
  assert.equal(assessSize(exact).requiresCoverageVerification, true);
  assert.deepEqual(assessSize({ ...exact, changedLines: 615 }, { changedLines: 500 }).exceeded, ["changedLines"]);
  for (const dimension of ["changedPaths", "patchBytes"]) {
    assert.deepEqual(assessSize({ ...exact, [dimension]: exact[dimension] + 1 }, { [dimension]: exact[dimension] }).exceeded, [dimension]);
  }
});

test("repository limits accept positive safe integers and reject malformed values", () => {
  assert.equal(assessSize({ changedPaths: 3, changedLines: 0, patchBytes: 0 }, { changedPaths: 2 }).pass, false);
  for (const value of [0, -1, 1.5, NaN]) {
    assert.throws(() => assessSize({ changedPaths: 0, changedLines: 0, patchBytes: 0 }, { changedPaths: value }));
  }
  assert.throws(() => assessSize({}, { unknown: 1 }));
  assert.throws(() => assessSize({ changedPaths: 0, changedLines: 0, patchBytes: 0 }, []));
  assert.throws(() => assessSize({ changedPaths: 0, changedLines: NaN, patchBytes: 0 }));
});

test("NUL coverage preserves renames, deletes, whitespace, generated and binary entries", () => {
  const entries = parseNumstat("0\t0\t\0old name\0new\tname\0" +
    "0\t7\tdeleted file\0-\t-\timage.bin\0" +
    "1\t2\tgenerated/output.js\0" + "1\t0\tpackage-lock.json\0");
  assert.deepEqual(entries, [
    { paths: ["old name", "new\tname"], additions: 0, deletions: 0, binary: false },
    { paths: ["deleted file"], additions: 0, deletions: 7, binary: false },
    { paths: ["image.bin"], additions: null, deletions: null, binary: true },
    { paths: ["generated/output.js"], additions: 1, deletions: 2, binary: false },
    { paths: ["package-lock.json"], additions: 1, deletions: 0, binary: false },
  ]);
  assert.throws(() => parseNumstat("1\t0\ttruncated"));
});

function createHistoryRepo() {
  const repo = mkdtempSync(join(tmpdir(), "review-size-range-"));
  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  git("init", "-q", "--template=");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Review Size Test");
  git("config", "commit.gpgsign", "false");
  mkdirSync(join(repo, "nested"));
  writeFileSync(join(repo, "base.txt"), "base\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  writeFileSync(join(repo, "nested", "first.txt"), "one\ntwo\n");
  git("add", ".");
  git("commit", "-q", "-m", "first");
  writeFileSync(join(repo, "base.txt"), "changed\n");
  git("add", ".");
  git("commit", "-q", "-m", "second");
  return { repo, git };
}

test("real Git range uses target merge-base and full history rather than final commit", () => {
  const { repo, git } = createHistoryRepo();
  try {
    const head = git("rev-parse", "HEAD");
    const target = git("rev-parse", "HEAD~2");
    const report = measureReview({ target, head, cwd: repo });
    assert.equal(report.mergeBase, target);
    assert.equal(report.head, head);
    assert.equal(report.target, target);
    assert.equal(report.changedLines, report.coverage.reduce((sum, entry) => sum + (entry.additions ?? 0) + (entry.deletions ?? 0), 0));
    assert.equal(report.changedPaths, 2);
    assert.notDeepEqual(report.coverage, measureReview({ target: "HEAD~1", head, cwd: repo }).coverage);
    assert.equal(measureReview({ target: head, head, cwd: repo }).changedPaths, 0);
    const reverse = measureReview({ target: head, head: target, cwd: repo });
    assert.equal(reverse.mergeBase, target);
    assert.equal(reverse.changedPaths, 0);
    assert.throws(() => measureReview({ target: "missing-review-target", head, cwd: repo }));
    const fromSubdirectory = spawnSync(process.execPath, [fileURLToPath(new URL("./review-size-gate.mjs", import.meta.url)), target, head], {
      cwd: join(repo, "nested"),
      env: { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "diff.relative", GIT_CONFIG_VALUE_0: "true" },
    });
    assert.equal(fromSubdirectory.status, report.pass ? 0 : 1);
    assert.deepEqual(JSON.parse(fromSubdirectory.stdout).coverage, report.coverage);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("CLI requires an explicit target and fails closed on invalid refs", () => {
  for (const args of [[], ["missing-review-target"]]) {
    const result = spawnSync(process.execPath, ["scripts/review-size-gate.mjs", ...args]);
    assert.equal(result.status, 2);
    assert.match(result.stderr.toString(), /target|revision|argument/i);
  }
});

test("working-tree attributes cannot disguise text changes as binary", () => {
  const { repo, git } = createHistoryRepo();
  const root = mkdtempSync(join(tmpdir(), "jt-attributes-"));
  try {
    const target = git("rev-parse", "HEAD~2");
    const head = git("rev-parse", "HEAD");
    const expected = measureReview({ target, head, cwd: repo });
    execFileSync("git", ["init", "--quiet", "--template=", `--object-format=${git("rev-parse", "--show-object-format")}`, root]);
    writeFileSync(join(root, ".git", "objects", "info", "alternates"), git("rev-parse", "--path-format=absolute", "--git-path", "objects") + "\n");
    writeFileSync(join(root, ".gitattributes"), "* -diff\n");
    const actual = measureReview({ target, head, cwd: root });
    assert.ok(actual.changedLines > 0);
    assert.deepEqual(actual, expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test("committed HEAD measurement excludes an actual untracked file", () => {
  const root = mkdtempSync(join(process.cwd(), ".jt-untracked-size-test-"));
  try {
    writeFileSync(join(root, "untracked file"), "pending content\n");
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", root], { encoding: "utf8" });
    assert.match(status, /\?\?/);
    const report = measureReview({ target: "HEAD", head: "HEAD" });
    assert.equal(report.changedPaths, 0);
    assert.equal(report.changedLines, 0);
    assert.equal(report.patchBytes, 0);
    assert.deepEqual(report.coverage, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("real Git numstat preserves rename and deletion with whitespace without fixture commits", () => {
  const root = mkdtempSync(join(tmpdir(), "jt-size-"));
  try {
    for (const name of ["before", "after"]) mkdirSync(join(root, name));
    writeFileSync(join(root, "before", "old name"), "rename content\n");
    writeFileSync(join(root, "after", "new name"), "rename content\n");
    writeFileSync(join(root, "before", "deleted file"), "deleted\n");
    writeFileSync(join(root, "after", "binary file"), Buffer.from([0, 1, 2]));
    const result = spawnSync("git", ["diff", "--no-index", "--find-renames=50%", "--numstat", "-z", "before", "after"], { cwd: root });
    assert.equal(result.status, 1);
    const coverage = parseNumstat(result.stdout.toString());
    assert.ok(coverage.some((entry) => entry.paths[0].endsWith("old name") && entry.paths[1]?.endsWith("new name")));
    assert.ok(coverage.some((entry) => entry.paths[0].endsWith("deleted file") && entry.deletions === 1));
    assert.ok(coverage.some((entry) => entry.paths.some((path) => path.endsWith("binary file")) && entry.binary));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI and PR workflow accept complete scope above former caps and enforce explicit limits", () => {
  const { repo, git } = createHistoryRepo();
  try {
    const base = git("rev-parse", "HEAD");
    for (let index = 0; index < 21; index++) writeFileSync(join(repo, `scope-${index}.txt`), "x".repeat(6000));
    git("add", ".");
    git("commit", "-q", "-m", "complete scope");
    const head = git("rev-parse", "HEAD");
    const script = fileURLToPath(new URL("./review-size-gate.mjs", import.meta.url));
    const invoke = (limits) => spawnSync(process.execPath, [script, base, head, ...limits], { cwd: repo });
    const complete = invoke([]);
    assert.equal(complete.status, 0);
    const report = JSON.parse(complete.stdout);
    assert.equal(report.changedPaths, 21);
    assert.ok(report.patchBytes > 102400);
    assert.equal(report.requiresCoverageVerification, true);
    const restricted = invoke(['{"changedPaths":20}']);
    assert.equal(restricted.status, 1);
    assert.deepEqual(JSON.parse(restricted.stdout).exceeded, ["changedPaths"]);
    const workflow = readFileSync(new URL("../.github/workflows/review-size.yml", import.meta.url), "utf8");
    const command = workflow.match(/^\s+run: (.+)$/m)[1].replace("scripts/review-size-gate.mjs", JSON.stringify(script));
    const ci = spawnSync("bash", ["-e", "-c", command], {
      cwd: repo, env: { ...process.env, PR_BASE_SHA: base, PR_HEAD_SHA: head },
    });
    assert.equal(ci.status, 0);
    assert.deepEqual(JSON.parse(ci.stdout), report);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
