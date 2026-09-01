import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { comparePlanEvaluators, evaluateStateAwareBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

async function lineageFixture() {
  return JSON.parse(await readFile(new URL('../fixtures/plan-lineage-invalidation.json', import.meta.url), 'utf8'));
}

test('Trial 003 state-aware baseline is qualified and keeps the lineage fixture at REVIEW', async () => {
  const plan = await lineageFixture();
  const baseline = evaluateStateAwareBaseline(plan);
  const finalStep = baseline.steps.find((step) => step.step_id === 's4-test-generated-v2');

  assert.equal(baseline.outcome, 'REVIEW');
  assert.equal(baseline.steps.some((step) => step.outcome === 'DENY'), false);
  assert.equal(finalStep.base_outcome, 'PREPARED');
  assert.equal(finalStep.outcome, 'REVIEW');
  assert.equal(finalStep.state_conflicts.length, 0);
  assert.equal(baseline.dependency_reasoning, true);
  assert.equal(baseline.state_reasoning, true);
  assert.equal(baseline.evidence_lineage_reasoning, false);
});

test('Phoenix detects evidence lineage invalidation after a causal source version changes', async () => {
  const plan = await lineageFixture();
  const phoenix = evaluateActionPlan(plan);
  const finalStep = phoenix.steps.find((step) => step.step_id === 's4-test-generated-v2');

  assert.equal(finalStep.base_outcome, 'PREPARED');
  assert.equal(finalStep.state_conflicts.length, 0);
  assert.equal(finalStep.effective_outcome, 'DENY');
  assert.ok(finalStep.causal_reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATED'));
  assert.equal(finalStep.evidence_conflicts.length, 1);
  assert.deepEqual(finalStep.evidence_conflicts[0], {
    type: 'EVIDENCE_LINEAGE_INVALIDATED',
    evidence_id: 'generated-evidence-v2',
    producer_step: 's2-generate-from-config-v2',
    source_resource: 'config.json',
    expected_source_version: 'sha256:config-v2',
    observed_source_version: 'sha256:config-v1',
    invalidated_by: 's3-config-v2-back-to-v1',
    status: 'FAIL'
  });
  assert.equal(phoenix.outcome, 'DENY');
  assert.ok(phoenix.reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATION_DETECTED'));
  assert.equal(phoenix.dispatch_attempted, false);
});

test('Trial 003 produces the preregistered aggregate divergence against state-aware baseline', async () => {
  const plan = await lineageFixture();
  const baseline = evaluateStateAwareBaseline(plan);
  const phoenix = evaluateActionPlan(plan);
  const comparison = comparePlanEvaluators(plan, phoenix, baseline);

  assert.equal(baseline.outcome, 'REVIEW');
  assert.equal(phoenix.outcome, 'DENY');
  assert.equal(comparison.divergence_count, 1);
  assert.equal(comparison.divergences[0].step_id, 's4-test-generated-v2');
  assert.equal(comparison.divergences[0].baseline_outcome, 'REVIEW');
  assert.equal(comparison.divergences[0].phoenix_outcome, 'DENY');
  assert.equal(comparison.divergences[0].evidence_conflicts[0].type, 'EVIDENCE_LINEAGE_INVALIDATED');
});

test('Trial 003 negative control does not invalidate evidence when the causal source remains at v2', async () => {
  const plan = await lineageFixture();
  plan.plan_id = 'lineage-valid-control-001';
  plan.actions = plan.actions.filter((step) => step.step_id !== 's3-config-v2-back-to-v1');
  const finalStep = plan.actions.find((step) => step.step_id === 's4-test-generated-v2');
  finalStep.depends_on = ['s2-generate-from-config-v2'];

  const baseline = evaluateStateAwareBaseline(plan);
  const phoenix = evaluateActionPlan(plan);
  const phoenixFinal = phoenix.steps.find((step) => step.step_id === 's4-test-generated-v2');

  assert.equal(baseline.outcome, 'REVIEW');
  assert.equal(phoenix.outcome, 'REVIEW');
  assert.equal(phoenixFinal.evidence_conflicts.length, 0);
  assert.equal(phoenixFinal.effective_outcome, 'REVIEW');
  assert.equal(phoenix.reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATION_DETECTED'), false);
});

test('Trial 003 lineage-aware plan decision remains deterministic', async () => {
  const plan = await lineageFixture();
  const first = evaluateActionPlan(plan);
  const second = evaluateActionPlan(structuredClone(plan));
  assert.equal(first.decision_hash, second.decision_hash);
  assert.equal(first.plan_decision_id, second.plan_decision_id);
});
