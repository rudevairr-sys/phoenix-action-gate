import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createPanelServer } from '../src/server.mjs';

let server;
let baseUrl;
let observedMessage = null;

const conversationStub = async (message) => {
  observedMessage = message;
  return {
    ok: true,
    state: 'CONVERSATION_PIPELINE_OBSERVED',
    user_message: message,
    assistant_message: 'Propongo inspeccionar README.md antes de hacer cambios.',
    provider: {
      model: 'nvidia/Nemotron-3_5-Lightning',
      latency_ms: 12,
      provider_response_id: 'chatcmpl-test',
      usage: { total_tokens: 42 }
    },
    proposal: {
      schema_version: '0.1',
      proposal_id: 'test-chat-001',
      intent: 'Inspect README',
      action_type: 'READ_CONTEXT',
      target: { workspace_id: 'demo-workspace', relative_path: 'README.md' },
      operation: { kind: 'read_file' },
      requested_capabilities: ['READ_CONTEXT'],
      preconditions: [],
      reversibility: { kind: 'INHERENT', rollback_plan: null },
      estimated_effects: [],
      model_context: { model_id: 'nvidia/Nemotron-3_5-Lightning', provider_request_id: 'chatcmpl-test' }
    },
    decision: {
      decision_version: '0.1',
      proposal_id: 'test-chat-001',
      outcome: 'PREPARED',
      risk_class: 'R0',
      policy_version: 'phoenix-action-gate/0.1.0',
      reason_codes: ['BOUNDED_READ'],
      checks: [{ check: 'schema_valid', status: 'PASS', evidence_ref: '0.1' }],
      human_review_required: false,
      rollback_status: 'INHERENT',
      decision_id: 'decision-test',
      evidence_bundle_id: 'evidence-test',
      decision_hash: 'abc123',
      dispatch_attempted: false
    },
    dispatch_attempted: false,
    secret_exposed: false
  };
};

before(async () => {
  server = createPanelServer({ runConversation: conversationStub });
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

test('panel health exposes policy and confirms dispatch is unavailable', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.dispatch_available, false);
  assert.equal(body.policy_version, 'phoenix-action-gate/0.1.0');
});

test('panel chat forwards the user message and returns Nemotron speech plus one governed decision', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Quiero revisar README.md' })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(observedMessage, 'Quiero revisar README.md');
  assert.equal(body.source, 'LIVE_NEBIUS_NEMOTRON');
  assert.match(body.assistant_message, /README\.md/);
  assert.equal(body.decision.outcome, 'PREPARED');
  assert.equal(body.dispatch_attempted, false);
});

test('panel rejects an empty chat message without invoking a proposal', async () => {
  observedMessage = null;
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '   ' })
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'USER_MESSAGE_INVALID');
  assert.equal(body.dispatch_attempted, false);
  assert.equal(observedMessage, null);
});

test('panel REVIEW fixture returns a governed review decision', async () => {
  const response = await fetch(`${baseUrl}/api/fixture/review`, { method: 'POST' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'LOCAL_FIXTURE');
  assert.equal(body.decision.outcome, 'REVIEW');
  assert.equal(body.decision.risk_class, 'R2');
  assert.equal(body.dispatch_attempted, false);
});

test('panel DENY fixture fails closed and never dispatches', async () => {
  const response = await fetch(`${baseUrl}/api/fixture/deny`, { method: 'POST' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.decision.outcome, 'DENY');
  assert.equal(body.decision.risk_class, 'R3');
  assert.ok(body.decision.reason_codes.includes('SECRET_BOUNDARY'));
  assert.equal(body.dispatch_attempted, false);
});
