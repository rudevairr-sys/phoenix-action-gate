import assert from 'node:assert/strict';
import test from 'node:test';
import { requestProfiledNemotronResponse, runProfilePipeline } from '../src/profile-pipeline.mjs';
import { getProfile } from '../src/profiles.mjs';

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    }
  };
}

test('requestProfiledNemotronResponse sends the active profile prompt to Token Factory', async () => {
  let observedRequest = null;
  const fetchImpl = async (_endpoint, options) => {
    observedRequest = JSON.parse(options.body);
    return jsonResponse({
      id: 'chatcmpl-profile-001',
      choices: [{ message: { content: 'NO' }, finish_reason: 'stop' }],
      usage: { total_tokens: 12 }
    });
  };

  const profile = getProfile('MONO_SI_NO');
  const result = await requestProfiledNemotronResponse('¿Puedo borrar todo?', profile, {
    apiKey: 'test-key',
    fetchImpl,
    model: 'nvidia/Nemotron-3_5-Lightning'
  });

  assert.equal(result.modelOutput, 'NO');
  assert.equal(result.provider.provider_response_id, 'chatcmpl-profile-001');
  assert.equal(result.provider.profile_id, 'MONO_SI_NO');
  assert.equal(observedRequest.model, 'nvidia/Nemotron-3_5-Lightning');
  assert.equal(observedRequest.temperature, 0);
  assert.match(observedRequest.messages[1].content, /Perfil activo: MONO_SI_NO/);
  assert.match(observedRequest.messages.at(-1).content, /Puedo borrar todo/);
});

test('runProfilePipeline accepts compliant Nemotron output', async () => {
  const fetchImpl = async () => jsonResponse({
    id: 'chatcmpl-profile-accepted',
    choices: [{ message: { content: 'SI' }, finish_reason: 'stop' }],
    usage: { total_tokens: 8 }
  });

  const result = await runProfilePipeline('MONO_SI_NO', '¿Rust usa ownership?', {
    apiKey: 'test-key',
    fetchImpl
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'PROFILE_RESPONSE_ACCEPTED');
  assert.equal(result.profile_id, 'MONO_SI_NO');
  assert.equal(result.assistant_message, 'SI');
  assert.equal(result.profile_decision.outcome, 'PREPARED');
  assert.equal(result.dispatch_attempted, false);
});

test('runProfilePipeline denies non-compliant Nemotron output without dispatch', async () => {
  const fetchImpl = async () => jsonResponse({
    id: 'chatcmpl-profile-denied',
    choices: [{ message: { content: 'Sí, claro: puedo explicarlo.' }, finish_reason: 'stop' }],
    usage: { total_tokens: 18 }
  });

  const result = await runProfilePipeline('MONO_SI_NO', '¿Sí?', {
    apiKey: 'test-key',
    fetchImpl
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'PROFILE_CONTRACT_DENIED');
  assert.equal(result.assistant_message, null);
  assert.equal(result.rejected_model_output_preview, null);
  assert.equal(result.rejected_model_output_observed, true);
  assert.ok(result.rejected_model_output_length > 0);
  assert.equal(result.profile_decision.outcome, 'DENY');
  assert.equal(result.dispatch_attempted, false);
});

test('runProfilePipeline fails closed when profile is unknown', async () => {
  const result = await runProfilePipeline('UNKNOWN', 'hola', {
    apiKey: 'test-key',
    fetchImpl: async () => { throw new Error('should not fetch'); }
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'PROFILE_PROVIDER_FAIL_CLOSED');
  assert.ok(result.profile_decision.reason_codes.includes('UNKNOWN_PROFILE'));
  assert.equal(result.dispatch_attempted, false);
});

test('runProfilePipeline fails closed when NEBIUS_API_KEY is missing', async () => {
  const result = await runProfilePipeline('MONO_SI_NO', 'hola', {
    apiKey: '',
    fetchImpl: async () => { throw new Error('should not fetch'); }
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'PROFILE_PROVIDER_FAIL_CLOSED');
  assert.equal(result.provider_error.code, 'NEBIUS_API_KEY_MISSING');
  assert.equal(result.dispatch_attempted, false);
});
