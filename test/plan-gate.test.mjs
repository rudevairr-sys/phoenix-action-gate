import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { comparePlanEvaluators, evaluateIndependentBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

async function planFixture() {
  return JSON.parse(await readFile(new URL('../fixtures/plan-dependency-chain.json', import.meta.url), 'utf8'));
}

test('Phoenix cascades a denied dependency into a dependent patch', async () => {
  const result = evaluateActionPlan(await planFixture());
  const patch = result.steps.find((step) => step.step_id === 's3-patch-readme');
  assert.equal(patch.base_outcome, 'REVIEW');
  assert.equal(patch.effective_outcome, 'DENY');
  assert.deepEqual(patch.blocked_by, ['s2-read-env']);
  assert.ok(patch.causal_reason_codes.includes('DEPENDENCY_BLOCKED'));
});

test('Phoenix propagates the causal block transitively into downstream tests', async () => {
  const result = evaluateActionPlan(await planFixture());
  const tests = result.steps.find((step) => step.step_id === 's4-run-tests');
  assert.equal(tests.base_outcome, 'PREPARED');
  assert.equal(tests.effective_outcome, 'DENY');
  assert.deepEqual(tests.blocked_by, ['s3-patch-readme']);
  assert.ok(tests.causal_reason_codes.includes('DEPENDENCY_BLOCKED'));
  assert.equal(result.outcome, 'DENY');
  assert.equal(result.dispatch_attempted, false);
});

test('competent independent baseline misses the cross-action causal blocks', async () => {
  const plan = await planFixture();
  const phoenix = evaluateActionPlan(plan);
  const baseline = evaluateIndependentBaseline(plan);
  const comparison = comparePlanEvaluators(plan, phoenix, baseline);

  const patchBaseline = baseline.steps.find((step) => step.step_id === 's3-patch-readme');
  const testBaseline = baseline.steps.find((step) => step.step_id === 's4-run-tests');
  assert.equal(patchBaseline.outcome, 'REVIEW');
  assert.equal(testBaseline.outcome, 'PREPARED');
  assert.equal(comparison.divergence_count, 2);
  assert.deepEqual(comparison.divergences.map((item) => item.step_id), ['s3-patch-readme', 's4-run-tests']);
});

test('unknown or forward dependency fails the entire plan closed', async () => {
  const plan = await planFixture();
  plan.actions[0].depends_on = ['s4-run-tests'];
  const result = evaluateActionPlan(plan);
  assert.equal(result.outcome, 'DENY');
  assert.equal(result.risk_class, 'R3');
  assert.ok(result.reason_codes.includes('DEPENDENCY_NOT_PRIOR_OR_UNKNOWN'));
  assert.equal(result.steps.length, 0);
});

test('same plan produces the same deterministic plan decision hash', async () => {
  const plan = await planFixture();
  const first = evaluateActionPlan(plan);
  const second = evaluateActionPlan(structuredClone(plan));
  assert.equal(first.decision_hash, second.decision_hash);
  assert.equal(first.plan_decision_id, second.plan_decision_id);
});
