import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateProfileOutput, buildProfileResponse } from '../src/profile-gate.mjs';
import { getProfile, listProfiles, requireProfile } from '../src/profiles.mjs';

test('profile registry exposes the MVP Nemotron profiles', () => {
  const profiles = listProfiles();
  assert.deepEqual(profiles.map((profile) => profile.id), ['MONO_SI_NO', 'FERRUM_RUST', 'ACTION_PROPOSER', 'SAFE_NOOP']);
  assert.equal(getProfile('MONO_SI_NO')?.contract_type, 'CLOSED_VOCABULARY_CONTRACT');
  assert.equal(getProfile('FERRUM_RUST')?.contract_type, 'DOMAIN_BOUNDARY_CONTRACT');
  assert.equal(getProfile('ACTION_PROPOSER')?.contract_type, 'NO_DISPATCH_ACTION_CONTRACT');
  assert.equal(getProfile('SAFE_NOOP')?.contract_type, 'CLOSED_VOCABULARY_CONTRACT');
});

test('profile registry fails closed for unknown profile ids', () => {
  assert.throws(() => requireProfile('MAGIC_PROFILE'), /UNKNOWN_PROFILE/);
  const decision = evaluateProfileOutput('MAGIC_PROFILE', 'anything');
  assert.equal(decision.outcome, 'DENY');
  assert.ok(decision.reason_codes.includes('UNKNOWN_PROFILE'));
  assert.equal(decision.dispatch_attempted, false);
});
test('MONO_SI_NO accepts closed vocabulary and denies explanations without leaking rejected text', () => {
  assert.equal(evaluateProfileOutput('MONO_SI_NO', 'SI').outcome, 'PREPARED');
  assert.equal(evaluateProfileOutput('MONO_SI_NO', 'NO').outcome, 'PREPARED');
  assert.equal(evaluateProfileOutput('MONO_SI_NO', 'SAFE_NOOP').outcome, 'PREPARED');

  const denied = evaluateProfileOutput('MONO_SI_NO', 'No, no deberías hacerlo porque es riesgoso.');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('CLOSED_VOCABULARY_VIOLATION'));
  assert.equal(denied.rejected_output_preview, null);
  assert.equal(denied.rejected_output_observed, true);
  assert.ok(denied.rejected_output_length > 0);
  assert.equal(denied.dispatch_attempted, false);
});

test('SAFE_NOOP profile accepts exact SAFE_NOOP and hides violations', () => {
  assert.equal(evaluateProfileOutput('SAFE_NOOP', 'SAFE_NOOP').outcome, 'PREPARED');
  const denied = evaluateProfileOutput('SAFE_NOOP', 'NO');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('SAFE_NOOP_REQUIRED'));
  assert.equal(denied.rejected_output_preview, null);
});
test('FERRUM_RUST accepts Rust output, accepts SAFE_NOOP fallback and denies general advice', () => {
  const accepted = evaluateProfileOutput('FERRUM_RUST', 'En Rust puedes modelarlo con traits y ownership explícito.');
  assert.equal(accepted.outcome, 'PREPARED');

  const fallback = evaluateProfileOutput('FERRUM_RUST', 'SAFE_NOOP');
  assert.equal(fallback.outcome, 'PREPARED');
  assert.ok(fallback.reason_codes.includes('SAFE_FALLBACK_OK'));
  assert.equal(fallback.accepted_output, 'SAFE_NOOP');

  const denied = evaluateProfileOutput('FERRUM_RUST', 'Te recomiendo comprar un coche híbrido barato.');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('OUT_OF_DOMAIN_ADVICE'));
  assert.equal(denied.rejected_output_preview, null);
});

test('ACTION_PROPOSER permits proposals but denies execution claims', () => {
  const review = evaluateProfileOutput('ACTION_PROPOSER', 'Propongo preparar un patch reversible y pedir revisión antes de aplicarlo.');
  assert.equal(review.outcome, 'PREPARED');
  assert.ok(review.reason_codes.includes('NO_DISPATCH_TEXT_OK'));

  const denied = evaluateProfileOutput('ACTION_PROPOSER', 'He modificado el archivo y ejecutado los tests.');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('EXECUTION_CLAIM_WITHOUT_EVIDENCE'));
});
test('buildProfileResponse hides rejected model output from assistant_message and preview', () => {
  const accepted = buildProfileResponse({ profileId: 'MONO_SI_NO', userMessage: '¿Sí?', modelOutput: 'SI', provider: { model: 'test' } });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.assistant_message, 'SI');
  assert.equal(accepted.rejected_model_output_preview, null);
  assert.equal(accepted.dispatch_attempted, false);

  const denied = buildProfileResponse({ profileId: 'MONO_SI_NO', userMessage: '¿Sí?', modelOutput: 'Sí, claro.', provider: { model: 'test' } });
  assert.equal(denied.ok, false);
  assert.equal(denied.state, 'PROFILE_CONTRACT_DENIED');
  assert.equal(denied.assistant_message, null);
  assert.equal(denied.rejected_model_output_preview, null);
  assert.equal(denied.rejected_model_output_observed, true);
  assert.ok(denied.rejected_model_output_length > 0);
  assert.equal(denied.dispatch_attempted, false);
});

test('profile gate denies model reasoning scaffolding before accepting output', () => {
  const denied = evaluateProfileOutput('FERRUM_RUST', [
    "Here's a thinking process:",
    '1. Analyze User Input: Dame ideas de marketing.',
    '2. Check Active Profile: FERRUM_RUST.',
    'I will output SAFE_NOOP.'
  ].join('\n'));

  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('MODEL_REASONING_LEAK'));
  assert.equal(denied.rejected_output_preview, null);
  assert.equal(denied.rejected_output_observed, true);
});

test('ACTION_PROPOSER denies too-short non-proposal output', () => {
  const denied = evaluateProfileOutput('ACTION_PROPOSER', 'Prop');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('ACTION_PROPOSAL_TEXT_INSUFFICIENT'));
  assert.equal(denied.rejected_output_preview, null);
});
