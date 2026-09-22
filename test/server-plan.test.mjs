import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createPanelServer } from '../src/server.mjs';

let server;
let baseUrl;
let observedPlanMessage = null;

const planStub = async (message) => {
  observedPlanMessage = message;
  return {
    ok: true,
    state: 'LIVE_PLAN_EVALUATED',
    user_message: message,
    provider: {
      transport: 'chat_completions',
      adapter_contract: 'compact-plan/0.2',
      model: 'nvidia/Nemotron-3_5-Lightning',
      latency_ms: 15,
      provider_response_id: 'chatcmpl-plan-panel-test',
      usage: { total_tokens: 120 }
    },
    plan: {
      schema_version: '0.1',
      plan_id: 'panel-plan-test',
      goal: message,
      actions: [{ step_id: 's1' }, { step_id: 's2' }]
    },
    baseline: {
      baseline: 'state-aware-baseline/0.1.0',
      outcome: 'REVIEW',
      steps: [{ step_id: 's1', outcome: 'REVIEW' }, { step_id: 's2', outcome: 'REVIEW' }]
    },
    phoenix: {
      outcome: 'DENY',
      risk_class: 'R3',
      policy_version: 'phoenix-plan-gate/0.3.0',
      reason_codes: ['EVIDENCE_LINEAGE_INVALIDATION_DETECTED'],
      steps: [
        { step_id: 's1', action_type: 'WRITE_PATCH', target: { relative_path: 'config.json' }, base_outcome: 'REVIEW', effective_outcome: 'REVIEW', causal_reason_codes: [], evidence_conflicts: [] },
        { step_id: 's2', action_type: 'RUN_COMMAND', target: { relative_path: null }, base_outcome: 'PREPARED', effective_outcome: 'DENY', causal_reason_codes: ['EVIDENCE_LINEAGE_INVALIDATED'], evidence_conflicts: [{ type: 'EVIDENCE_LINEAGE_INVALIDATED' }] }
      ],
      plan_decision_id: 'plan-decision-panel-test',
      evidence_bundle_id: 'plan-evidence-panel-test',
      decision_hash: 'planhash',
      dispatch_attempted: false
    },
    comparison: {
      divergence_count: 1,
      divergences: [{ step_id: 's2', baseline_outcome: 'REVIEW', phoenix_outcome: 'DENY' }]
    },
    discriminant: {
      baseline_name: 'state-aware-baseline/0.1.0',
      baseline_global_outcome: 'REVIEW',
      phoenix_global_outcome: 'DENY',
      divergence_count: 1,
      evidence_lineage_invalidation_detected: true,
      lineage_conflict: {
        step_id: 's2',
        type: 'EVIDENCE_LINEAGE_INVALIDATED',
        evidence_id: 'evidence-generated-v2',
        source_resource: 'config.json',
        expected_source_version: 'v2',
        observed_source_version: 'v1',
        invalidated_by: 's1'
      }
    },
    dispatch_attempted: false
  };
};

before(async () => {
  server = createPanelServer({ runPlan: planStub });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('panel exposes live multi-action plan endpoint without dispatch', async () => {
  const response = await fetch(`${baseUrl}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Propón un plan de cuatro pasos.' })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(observedPlanMessage, 'Propón un plan de cuatro pasos.');
  assert.equal(body.source, 'LIVE_NEBIUS_NEMOTRON_PLAN');
  assert.equal(body.state, 'LIVE_PLAN_EVALUATED');
  assert.equal(body.baseline.outcome, 'REVIEW');
  assert.equal(body.phoenix.outcome, 'DENY');
  assert.equal(body.discriminant.evidence_lineage_invalidation_detected, true);
  assert.equal(body.dispatch_attempted, false);
});

test('panel rejects empty plan request before invoking Nemotron', async () => {
  observedPlanMessage = null;
  const response = await fetch(`${baseUrl}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '   ' })
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'USER_MESSAGE_INVALID');
  assert.equal(body.dispatch_attempted, false);
  assert.equal(observedPlanMessage, null);
});
