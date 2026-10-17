import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { runReleasePrAutoMerge } from "./release-pr-auto-merge.mjs";

const REPOSITORY = "jurislm/jt-harness-plugin";
const RELEASE_BRANCH = "release-please--branches--main";
const OLD_BASE = "a".repeat(40);
const OLD_HEAD = "b".repeat(40);
const CI_SHA = "c".repeat(40);
const NEW_HEAD = "d".repeat(40);
const NEWER_MAIN = "e".repeat(40);
const MERGE_SHA = "f".repeat(40);
const BASE_VERSION = "2.3.1";
const VERSION = "2.4.0";
const VERSION_FILES = ["package.json", "plugin.json", ".codex-plugin/plugin.json"];
const RELEASE_FILES = [".release-please-manifest.json", "CHANGELOG.md", ...VERSION_FILES];
const BASE_REFS = new Set([OLD_BASE, CI_SHA, NEWER_MAIN]);

function withVersion(path, version) {
  return `${JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), version }, null, 2)}\n`;
}

const HISTORY = `## [${BASE_VERSION}](https://github.com/${REPOSITORY}/compare/v2.3.0...v${BASE_VERSION})\n\n* old\n`;
const FILE_TEXT = {
  ".release-please-manifest.json": [
    JSON.stringify({ ".": BASE_VERSION }),
    JSON.stringify({ ".": VERSION }),
  ],
  "CHANGELOG.md": [
    `# Changelog\n\n${HISTORY}`,
    `# Changelog\n\n## [${VERSION}](https://github.com/${REPOSITORY}/compare/v${BASE_VERSION}...v${VERSION})\n\n* new\n\n${HISTORY}`,
  ],
  ...Object.fromEntries(VERSION_FILES.map((path) => [path, [withVersion(path, BASE_VERSION), withVersion(path, VERSION)]])),
};

function pull(baseSha, headSha, changedFiles) {
  return {
    number: 40,
    state: "open",
    draft: false,
    title: `chore(main): release ${VERSION}`,
    body: ":robot: I have created a release *beep* *boop*\n\nThis PR was generated with [Release Please](https://github.com/googleapis/release-please).",
    user: { login: "terry90918" },
    base: { ref: "main", sha: baseSha, repo: { full_name: REPOSITORY } },
    head: { ref: RELEASE_BRANCH, sha: headSha, repo: { full_name: REPOSITORY } },
    changed_files: changedFiles,
    mergeable: true,
    mergeable_state: "clean",
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function fakeGitHub({
  prBase = CI_SHA,
  relation = "behind",
  update = { headSha: NEW_HEAD, baseSha: CI_SHA },
  mainSha = CI_SHA,
  files = RELEASE_FILES,
  pendingStatusPolls = 0,
} = {}) {
  const requests = [];
  let current = pull(prBase, OLD_HEAD, files.length);
  let statusPolls = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    const path = url.pathname.replace(`/repos/${REPOSITORY}`, "");
    const body = typeof init.body === "string" ? init.body : "";
    requests.push({ method, path, body });
    const head = current.head.sha;
    if (method === "GET" && path === "/pulls") return json([current]);
    if (method === "GET" && path === "/pulls/40") return json(current);
    if (method === "GET" && path.startsWith("/compare/")) return json({ status: relation });
    if (method === "PUT" && path === "/pulls/40/update-branch") {
      if (JSON.parse(body).expected_head_sha !== head) return json({}, 422);
      if (update !== "never") current = pull(update.baseSha, update.headSha, files.length);
      return json({ message: "Updating pull request branch." }, 202);
    }
    if (method === "GET" && path === "/pulls/40/files") {
      return json(files.map((filename) => ({ filename, status: "modified" })));
    }
    if (method === "GET" && path.startsWith("/contents/")) {
      const texts = FILE_TEXT[decodeURIComponent(path.slice("/contents/".length))];
      if (!texts) return json({}, 404);
      const text = BASE_REFS.has(url.searchParams.get("ref")) ? texts[0] : texts[1];
      return json({ type: "file", encoding: "base64", content: Buffer.from(text).toString("base64") });
    }
    if (method === "GET" && path === `/commits/${head}/status`) {
      statusPolls += 1;
      const state = statusPolls <= pendingStatusPolls ? "pending" : "success";
      return json({
        statuses: [
          { context: "ci/woodpecker/push/ci", state },
          { context: "ci/woodpecker/pr/ci", state },
        ],
      });
    }
    if (method === "GET" && path === "/git/ref/heads/main") return json({ object: { sha: mainSha } });
    if (method === "PUT" && path === "/pulls/40/merge") return json({ merged: true, sha: MERGE_SHA });
    return json({}, 404);
  };
  const puts = (suffix) => requests.filter((request) => request.method === "PUT" && request.path.endsWith(suffix));
  return { fetchImpl, merges: () => puts("/merge"), updates: () => puts("/update-branch") };
}

const run = (gitHub) =>
  runReleasePrAutoMerge({ token: "token", commitSha: CI_SHA, fetchImpl: gitHub.fetchImpl, sleep: async () => {} });

test("merges an up-to-date release PR at its validated head", async () => {
  const gitHub = fakeGitHub();
  assert.deepEqual(await run(gitHub), { status: "merged", pullNumber: 40, mergeSha: MERGE_SHA });
  assert.equal(gitHub.updates().length, 0);
  assert.equal(JSON.parse(gitHub.merges()[0].body).sha, OLD_HEAD);
});

test("updates a release PR whose base is behind the CI commit, then merges the new head", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE });
  assert.deepEqual(await run(gitHub), { status: "merged", pullNumber: 40, mergeSha: MERGE_SHA });
  assert.deepEqual(gitHub.updates().map((request) => JSON.parse(request.body)), [{ expected_head_sha: OLD_HEAD }]);
  assert.equal(JSON.parse(gitHub.merges()[0].body).sha, NEW_HEAD);
});

test("does not update or merge a release PR whose base diverged", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE, relation: "diverged" });
  await assert.rejects(run(gitHub), /does not match the triggering Woodpecker commit/u);
  assert.equal(gitHub.updates().length, 0);
  assert.equal(gitHub.merges().length, 0);
});

test("fails without merging when the branch update never lands", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE, update: "never" });
  await assert.rejects(run(gitHub), /branch update/u);
  assert.equal(gitHub.merges().length, 0);
});

test("yields without merging when main advanced during the branch update", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE, update: { headSha: NEW_HEAD, baseSha: NEWER_MAIN }, mainSha: NEWER_MAIN });
  assert.deepEqual(await run(gitHub), { status: "no-op" });
  assert.equal(gitHub.merges().length, 0);
});

test("still rejects an updated release PR that touches files beyond the release artifacts", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE, files: [...RELEASE_FILES, "scripts/evil.mjs"] });
  await assert.rejects(run(gitHub), /release artifact/u);
  assert.equal(gitHub.merges().length, 0);
});

test("waits for Woodpecker statuses on the updated head before merging", async () => {
  const gitHub = fakeGitHub({ prBase: OLD_BASE, pendingStatusPolls: 100 });
  assert.deepEqual(await run(gitHub), { status: "merged", pullNumber: 40, mergeSha: MERGE_SHA });
  assert.equal(JSON.parse(gitHub.merges()[0].body).sha, NEW_HEAD);
});
