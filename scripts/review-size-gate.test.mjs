import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assessSize, parseNumstat, measureReview } from "./review-size-gate.mjs";

test("internal limits accept equality and reject each exceeded dimension", () => {
  const exact = { changedPaths: 20, changedLines: 500, patchBytes: 102400 };
  assert.equal(assessSize(exact).pass, true);
  for (const dimension of Object.keys(exact)) {
    assert.deepEqual(assessSize({ ...exact, [dimension]: exact[dimension] + 1 }).exceeded, [dimension]);
  }
});

test("repository limits can tighten but never relax the defaults", () => {
  assert.equal(assessSize({ changedPaths: 3, changedLines: 0, patchBytes: 0 }, { changedPaths: 2 }).pass, false);
  for (const value of [21, 0, -1, 1.5, NaN]) {
    assert.throws(() => assessSize({}, { changedPaths: value }));
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

test("real Git range uses target merge-base and full history rather than final commit", (t) => {
  if (spawnSync("git", ["rev-parse", "--verify", "HEAD~2"], { stdio: "pipe" }).status !== 0) {
    t.skip("Requires two existing ancestors; fixture commits are intentionally not created");
    return;
  }
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const head = git("rev-parse", "HEAD");
  const target = git("rev-parse", "HEAD~2");
  const report = measureReview({ target, head });
  assert.equal(report.mergeBase, target);
  assert.equal(report.head, head);
  assert.equal(report.target, target);
  assert.equal(report.changedLines, report.coverage.reduce((sum, entry) => sum + (entry.additions ?? 0) + (entry.deletions ?? 0), 0));
  assert.ok(report.changedPaths > 0);
  assert.notDeepEqual(report.coverage, measureReview({ target: "HEAD~1", head }).coverage);
  assert.equal(measureReview({ target: head, head }).changedPaths, 0);
  const reverse = measureReview({ target: head, head: target });
  assert.equal(reverse.mergeBase, target);
  assert.equal(reverse.changedPaths, 0);
  assert.throws(() => measureReview({ target: "missing-review-target", head }));
});

test("CLI requires an explicit target and fails closed on invalid refs", () => {
  for (const args of [[], ["missing-review-target"]]) {
    const result = spawnSync(process.execPath, ["scripts/review-size-gate.mjs", ...args]);
    assert.equal(result.status, 2);
    assert.match(result.stderr.toString(), /target|revision|argument/i);
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
