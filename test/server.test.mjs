import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createPanelServer } from '../src/server.mjs';

let server;
let baseUrl;
let observedMessage = null;
let observedHistory = null;
let observedProfileId = null;
let observedProfileMessage = null;
let observedProfileHistory = null;

const conversationStub = async (message, options = {}) => {
  observedMessage = message;
  observedHistory = options.history ?? [];

  if (message === 'nemo') {
    return {
      ok: true,
      state: 'CHAT_ONLY',
      turn_mode: 'CHAT',
      user_message: message,
      assistant_message: 'Hola. Soy Nemotron. ¿Qué quieres revisar o hacer?',
      provider: {
        model: 'nvidia/Nemotron-3_5-Lightning',
        latency_ms: 8,
        provider_response_id: 'chatcmpl-chat-test',
        usage: { total_tokens: 20 }
      },
      proposal: null,
      decision: null,
      dispatch_attempted: false,
      secret_exposed: false
    };
  }

  return {
    ok: true,
    state: 'CONVERSATION_ACTION_EVALUATED',
    turn_mode: 'ACTION_PROPOSAL',
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

const profileStub = async (profileId, message, options = {}) => {
  observedProfileId = profileId;
  observedProfileMessage = message;
  observedProfileHistory = options.history ?? [];

  if (message === 'bad-profile-output') {
    return {
      ok: false,
      state: 'PROFILE_CONTRACT_DENIED',
      source: 'LIVE_NEBIUS_NEMOTRON_PROFILE',
      profile_id: profileId,
      user_message: message,
      assistant_message: null,
      rejected_model_output_preview: null,
      rejected_model_output_observed: true,
      rejected_model_output_length: 26,
      profile_decision: {
        outcome: 'DENY',
        reason_codes: ['CLOSED_VOCABULARY_VIOLATION'],
        checks: [{ check: 'closed_vocabulary_member', status: 'FAIL', evidence_ref: 'not_in_allowed_set' }],
        dispatch_attempted: false
      },
      provider: { model: 'nvidia/Nemotron-3_5-Lightning', provider_response_id: 'chatcmpl-profile-deny' },
      dispatch_attempted: false,
      secret_exposed: false
    };
  }

  return {
    ok: true,
    state: 'PROFILE_RESPONSE_ACCEPTED',
    source: 'LIVE_NEBIUS_NEMOTRON_PROFILE',
    profile_id: profileId,
    user_message: message,
    assistant_message: 'NO',
    rejected_model_output_preview: null,
    profile_decision: {
      outcome: 'PREPARED',
      reason_codes: ['CLOSED_VOCABULARY_OK'],
      checks: [{ check: 'closed_vocabulary_member', status: 'PASS', evidence_ref: 'NO' }],
      dispatch_attempted: false
    },
    provider: { model: 'nvidia/Nemotron-3_5-Lightning', provider_response_id: 'chatcmpl-profile-ok' },
    dispatch_attempted: false,
    secret_exposed: false
  };
};

before(async () => {
  server = createPanelServer({ runConversation: conversationStub, runProfile: profileStub });
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

test('panel health exposes policy, bounded history, profile gate and confirms dispatch is unavailable', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.dispatch_available, false);
  assert.equal(body.profile_gate_available, true);
  assert.equal(body.chat_history_limit, 8);
  assert.equal(body.policy_version, 'phoenix-action-gate/0.1.0');
  assert.ok(body.profiles.some((profile) => profile.id === 'MONO_SI_NO'));
  assert.ok(body.profiles.some((profile) => profile.id === 'FERRUM_RUST'));
});

test('panel chat can return Nemotron speech without forcing an ActionProposal', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'nemo', history: [] })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'LIVE_NEBIUS_NEMOTRON');
  assert.equal(body.turn_mode, 'CHAT');
  assert.equal(body.proposal, null);
  assert.equal(body.decision, null);
  assert.match(body.assistant_message, /Nemotron/);
  assert.equal(body.dispatch_attempted, false);
});

test('panel profile chat forwards profile, user message and bounded history', async () => {
  const history = [
    { role: 'user', content: 'solo responde sí o no' },
    { role: 'assistant', content: 'SAFE_NOOP' }
  ];
  const response = await fetch(`${baseUrl}/api/profile-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: 'MONO_SI_NO', message: '¿Puedo borrar todo?', history })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(observedProfileId, 'MONO_SI_NO');
  assert.equal(observedProfileMessage, '¿Puedo borrar todo?');
  assert.deepEqual(observedProfileHistory, history);
  assert.equal(body.source, 'LIVE_NEBIUS_NEMOTRON_PROFILE');
  assert.equal(body.state, 'PROFILE_RESPONSE_ACCEPTED');
  assert.equal(body.assistant_message, 'NO');
  assert.equal(body.profile_decision.outcome, 'PREPARED');
  assert.equal(body.dispatch_attempted, false);
});

test('panel profile chat can deny a non-compliant Nemotron output without dispatch', async () => {
  const response = await fetch(`${baseUrl}/api/profile-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: 'MONO_SI_NO', message: 'bad-profile-output', history: [] })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.state, 'PROFILE_CONTRACT_DENIED');
  assert.equal(body.assistant_message, null);
  assert.equal(body.rejected_model_output_preview, null);
  assert.equal(body.rejected_model_output_observed, true);
  assert.ok(body.profile_decision.reason_codes.includes('CLOSED_VOCABULARY_VIOLATION'));
  assert.equal(body.dispatch_attempted, false);
});

test('panel profile chat rejects empty message or missing profile id before invoking Nemotron', async () => {
  observedProfileMessage = null;
  const noMessage = await fetch(`${baseUrl}/api/profile-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: 'MONO_SI_NO', message: '   ' })
  });
  assert.equal(noMessage.status, 400);
  assert.equal((await noMessage.json()).error, 'USER_MESSAGE_INVALID');
  assert.equal(observedProfileMessage, null);

  const noProfile = await fetch(`${baseUrl}/api/profile-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hola' })
  });
  assert.equal(noProfile.status, 400);
  assert.equal((await noProfile.json()).error, 'PROFILE_ID_INVALID');
});

test('panel chat forwards bounded conversation history for follow-up references', async () => {
  const history = [
    { role: 'user', content: 'quiero leer el readme' },
    { role: 'assistant', content: 'Propongo leer README.md.' }
  ];
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'podemos borrarlo?', history })
  });
  assert.equal(response.status, 200);
  assert.equal(observedMessage, 'podemos borrarlo?');
  assert.deepEqual(observedHistory, history);
});

test('panel chat forwards the user message and returns Nemotron speech plus one governed decision', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Quiero revisar README.md', history: [] })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(observedMessage, 'Quiero revisar README.md');
  assert.equal(body.source, 'LIVE_NEBIUS_NEMOTRON');
  assert.equal(body.turn_mode, 'ACTION_PROPOSAL');
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

test('panel rejects malformed or oversized chat history before invoking Nemotron', async () => {
  observedMessage = null;
  const invalidHistory = Array.from({ length: 9 }, (_, index) => ({ role: 'user', content: `turn-${index}` }));
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hola', history: invalidHistory })
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'INVALID_CHAT_HISTORY');
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
