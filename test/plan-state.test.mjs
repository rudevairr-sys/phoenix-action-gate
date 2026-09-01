import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { comparePlanEvaluators, evaluateIndependentBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

async function staleFixture() {
  return JSON.parse(await readFile(new URL('../fixtures/plan-stale-state.json', import.meta.url), 'utf8'));
}

test('Trial 002 baseline has no individual DENY and aggregates to REVIEW', async () => {
  const plan = await staleFixture();
  const baseline = evaluateIndependentBaseline(plan);
  assert.equal(baseline.outcome, 'REVIEW');
  assert.equal(baseline.steps.some((step) => step.outcome === 'DENY'), false);
  assert.deepEqual(baseline.steps.map((step) => step.outcome), ['PREPARED', 'REVIEW', 'PREPARED']);
});

test('Phoenix detects stale state after a projected approved patch and denies the downstream step', async () => {
  const plan = await staleFixture();
  const phoenix = evaluateActionPlan(plan);
  const staleStep = phoenix.steps.find((step) => step.step_id === 's3-test-with-stale-evidence');

  assert.equal(staleStep.base_outcome, 'PREPARED');
  assert.equal(staleStep.effective_outcome, 'DENY');
  assert.ok(staleStep.causal_reason_codes.includes('STALE_STATE_PRECONDITION'));
  assert.equal(staleStep.state_conflicts.length, 1);
  assert.deepEqual(staleStep.state_conflicts[0], {
    resource: 'README.md',
    expected_version: 'sha256:v1',
    observed_version: 'sha256:v2',
    last_writer: 's2-patch-v1-to-v2',
    status: 'FAIL'
  });
  assert.equal(phoenix.outcome, 'DENY');
  assert.ok(phoenix.reason_codes.includes('STALE_STATE_DETECTED'));
  assert.equal(phoenix.dispatch_attempted, false);
});

test('Trial 002 produces an aggregate decision divergence: baseline REVIEW vs Phoenix DENY', async () => {
  const plan = await staleFixture();
  const baseline = evaluateIndependentBaseline(plan);
  const phoenix = evaluateActionPlan(plan);
  const comparison = comparePlanEvaluators(plan, phoenix, baseline);

  assert.equal(baseline.outcome, 'REVIEW');
  assert.equal(phoenix.outcome, 'DENY');
  assert.equal(comparison.divergence_count, 1);
  assert.equal(comparison.divergences[0].step_id, 's3-test-with-stale-evidence');
  assert.equal(comparison.divergences[0].baseline_outcome, 'PREPARED');
  assert.equal(comparison.divergences[0].phoenix_outcome, 'DENY');
});

test('Phoenix does not deny the same plan when downstream evidence expects the projected v2 state', async () => {
  const plan = await staleFixture();
  plan.plan_id = 'consistent-state-plan-001';
  const staleStep = plan.actions.find((step) => step.step_id === 's3-test-with-stale-evidence');
  staleStep.step_id = 's3-test-with-current-evidence';
  staleStep.requires_state['README.md'] = 'sha256:v2';
  staleStep.proposal.proposal_id = 'current-tests-001';
  staleStep.proposal.intent = 'Run bounded tests using the projected README version v2';
  staleStep.proposal.preconditions = ['README.md evidence is sha256:v2'];

  const phoenix = evaluateActionPlan(plan);
  const finalStep = phoenix.steps.find((step) => step.step_id === 's3-test-with-current-evidence');
  assert.equal(finalStep.state_conflicts.length, 0);
  assert.equal(finalStep.effective_outcome, 'REVIEW');
  assert.equal(phoenix.outcome, 'REVIEW');
  assert.equal(phoenix.reason_codes.includes('STALE_STATE_DETECTED'), false);
});

test('Trial 002 state-aware plan decision remains deterministic', async () => {
  const plan = await staleFixture();
  const first = evaluateActionPlan(plan);
  const second = evaluateActionPlan(structuredClone(plan));
  assert.equal(first.decision_hash, second.decision_hash);
  assert.equal(first.plan_decision_id, second.plan_decision_id);
});
