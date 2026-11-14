import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assessSize } from './review-size-gate.mjs';
test('complete scope above old heuristic is measurable without mandatory splitting', () => {
  const result = assessSize({changedPaths: 21, changedLines: 100000, patchBytes: 102401});
  assert.equal(result.pass, true);
  assert.deepEqual(result.limits, {});
  assert.equal(result.requiresCoverageVerification, true);
});
test('explicit repository limits remain binding and are not capped by removed defaults', () => {
  const metrics = {changedPaths: 31, changedLines: 1000, patchBytes: 200000};
  assert.deepEqual(assessSize(metrics, {changedPaths:30}).exceeded, ['changedPaths']);
  assert.equal(assessSize(metrics, {changedPaths:31, patchBytes:200000}).pass, true);
  assert.deepEqual(assessSize(metrics, {changedLines:999}).exceeded, ['changedLines']);
});
test('invalid measurements and malformed limits still fail closed', () => {
  assert.throws(() => assessSize({changedPaths:NaN, changedLines:0, patchBytes:0}));
  for (const value of [0, -1, 1.5, NaN]) assert.throws(() => assessSize({}, {changedPaths:value}));
});
test('size report cannot certify reviewer coverage', () => {
  const result = assessSize({changedPaths:0,changedLines:0,patchBytes:0});
  assert.equal(result.requiresCoverageVerification, true);
  assert.equal(Object.hasOwn(result, 'reviewPassed'), false);
  const policy = readFileSync(new URL('../skills/using-jt-harness/SKILL.md', import.meta.url),'utf8');
  assert.match(policy, /skipped, incomplete, missing or quota-limited reviews never count as Pass/);
  assert.match(policy, /complete result covering current HEAD/);
  assert.match(policy, /pstack review are independent/);
  assert.match(policy, /full-project lint/);
});
