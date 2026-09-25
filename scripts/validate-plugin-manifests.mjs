import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));
const plugin = readJson("plugin.json");
const fallback = readJson(".codex-plugin/plugin.json");
const marketplace = readJson(".agents/plugins/marketplace.json");
const packageJson = readJson("package.json");

const ajv = new Ajv2020({ allErrors: true, strict: false });
for (const [schemaPath, documentPath] of [
  ["schemas/plugin.schema.json", "plugin.json"],
]) {
  const validate = ajv.compile(readJson(schemaPath));
  assert.ok(validate(readJson(documentPath)), ajv.errorsText(validate.errors));
}

assert.equal(plugin.name, "jt-harness-plugin");
assert.equal(fallback.name, plugin.name);
assert.match(packageJson.version, /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/);
assert.notEqual(packageJson.version, "0.1.0");
assert.equal(plugin.version, packageJson.version);
assert.equal(fallback.version, plugin.version);
assert.equal(plugin.extensions["com.openai"].interface.displayName, "JT Harness Plugin");
assert.deepEqual(plugin.extensions["com.openai"].interface.defaultPrompt, [
  "Use using-jt-harness for this engineering task.",
]);
assert.equal(fallback.skills, "./skills/");
assert.equal(Object.hasOwn(fallback, "mcpServers"), false);
assert.equal(Object.hasOwn(fallback, "apps"), false);
assert.equal(Object.hasOwn(plugin.extensions["com.openai"], "apps"), false);
assert.equal(Object.hasOwn(plugin.extensions["com.openai"], "hooks"), false);

const entry = marketplace.plugins.find((item) => item.name === plugin.name);
assert.ok(entry, "marketplace must contain jt-harness-plugin");
assert.equal(entry.source.source, "url");
assert.equal(entry.source.url, "https://github.com/jurislm/jt-harness-plugin");
assert.equal(entry.source.ref, "main");
assert.equal(entry.policy.installation, "AVAILABLE");
assert.equal(entry.policy.authentication, "ON_INSTALL");
assert.equal(entry.category, "Developer tools");

const expectedSkills = ["using-jt-harness"];
const actualSkills = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(actualSkills, expectedSkills);
assert.equal(packageJson.private, true);
console.log("JT Harness plugin manifests valid");
