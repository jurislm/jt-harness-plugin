import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const defaultLimits = Object.freeze({ changedPaths: 20, changedLines: 500, patchBytes: 100 * 1024 });

export function assessSize(metrics, overrides = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) throw new Error("Limits must be an object");
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(defaultLimits, key) || !Number.isSafeInteger(value) || value < 1 || value > defaultLimits[key]) {
      throw new Error(`Invalid stricter limit: ${key}`);
    }
  }
  const limits = { ...defaultLimits, ...overrides };
  for (const key of Object.keys(limits)) {
    if (!Number.isSafeInteger(metrics[key]) || metrics[key] < 0) throw new Error(`Invalid measurement: ${key}`);
  }
  const exceeded = Object.keys(limits).filter((key) => metrics[key] > limits[key]);
  return { limits, exceeded, pass: exceeded.length === 0 };
}

export function parseNumstat(source) {
  if (source === "") return [];
  if (!source.endsWith("\0")) throw new Error("Incomplete numstat coverage");
  const fields = source.slice(0, -1).split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index++) {
    const match = fields[index].match(/^(\d+|-)\t(\d+|-)\t([\s\S]*)$/);
    if (!match) throw new Error("Invalid numstat coverage");
    const paths = match[3] === "" ? [fields[++index], fields[++index]] : [match[3]];
    if (paths.some((path) => !path)) throw new Error("Incomplete rename coverage");
    const binary = match[1] === "-";
    if (binary !== (match[2] === "-")) throw new Error("Invalid binary coverage");
    entries.push({ paths, additions: binary ? null : Number(match[1]), deletions: binary ? null : Number(match[2]), binary });
  }
  return entries;
}

export function measureReview({ target, head = "HEAD", cwd = process.cwd(), limits = {} }) {
  const runGit = (directory, env, ...args) => {
    const result = spawnSync("git", args, { cwd: directory, env, maxBuffer: 1024 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.toString() || "Git measurement failed");
    return result.stdout;
  };
  const git = (...args) => runGit(cwd, process.env, ...args);
  if (!target) throw new Error("Explicit PR target required");
  const resolve = (ref) => git("rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).toString().trim();
  const targetId = resolve(target);
  const headId = resolve(head);
  const bases = git("merge-base", "--all", targetId, headId).toString().trim().split("\n");
  if (bases.length !== 1 || !bases[0]) throw new Error("A unique merge-base is required");
  const diff = ["diff", "--no-relative", "--no-ext-diff", "--no-textconv", "--no-color", "--find-renames=50%", "--ignore-submodules=none"];
  const range = [bases[0], headId, "--"];
  const metadata = mkdtempSync(join(tmpdir(), "jt-size-metadata-"));
  try {
    const objects = git("rev-parse", "--path-format=absolute", "--git-path", "objects").toString().trim();
    const format = git("rev-parse", "--show-object-format").toString().trim();
    git("init", "--bare", "--quiet", "--template=", `--object-format=${format}`, metadata);
    const measure = (...args) => runGit(metadata, { ...process.env, GIT_OBJECT_DIRECTORY: objects, GIT_ATTR_NOSYSTEM: "1" },
      `--git-dir=${metadata}`, `--work-tree=${metadata}`, "-c", "core.attributesFile=/dev/null", ...diff, ...args, ...range);
    const coverage = parseNumstat(measure("--numstat", "-z").toString());
    const patch = measure("--patch", "--unified=3");
    const metrics = {
      changedPaths: coverage.length,
      changedLines: coverage.reduce((sum, entry) => sum + (entry.additions ?? 0) + (entry.deletions ?? 0), 0),
      patchBytes: patch.length,
    };
    return { target: targetId, head: headId, mergeBase: bases[0], ...metrics, coverage, ...assessSize(metrics, limits) };
  } finally {
    rmSync(metadata, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [target, head = "HEAD", limitsJson = "{}", ...extra] = process.argv.slice(2);
    if (extra.length) throw new Error("Unexpected arguments");
    const report = measureReview({ target, head, limits: JSON.parse(limitsJson) });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.pass ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
