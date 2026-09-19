import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAgentContract,
  evaluateClosedVocabularyOutput,
  evaluateNoDispatchActionOutput,
  evaluateNoVowelsOutput,
  evaluateRustDomainOutput
} from '../src/agent-contracts.mjs';

test('MONO_SI_NO accepts only the closed vocabulary', () => {
  assert.equal(evaluateClosedVocabularyOutput('SI').outcome, 'PREPARED');
  assert.equal(evaluateClosedVocabularyOutput('NO').outcome, 'PREPARED');
  assert.equal(evaluateClosedVocabularyOutput('SAFE_NOOP').outcome, 'PREPARED');

  const decision = evaluateClosedVocabularyOutput('Sí, claro: puedo explicarlo.');
  assert.equal(decision.outcome, 'DENY');
  assert.ok(decision.reason_codes.includes('CLOSED_VOCABULARY_VIOLATION'));
  assert.equal(decision.dispatch_attempted, false);
});

test('N_VCLS denies outputs containing vowels and accepts slash fallback', () => {
  assert.equal(evaluateNoVowelsOutput('/').outcome, 'PREPARED');
  assert.equal(evaluateNoVowelsOutput('Crrct. Sn vcls.').outcome, 'PREPARED');

  const decision = evaluateNoVowelsOutput('Correcto, sin vocales.');
  assert.equal(decision.outcome, 'DENY');
  assert.ok(decision.reason_codes.includes('OUTPUT_SHAPE_VIOLATION'));
  assert.equal(decision.dispatch_attempted, false);
});

test('ACTION_PROPOSER reviews proposals without dispatch and denies dispatch attempts', () => {
  const review = evaluateNoDispatchActionOutput({
    intent: 'WRITE_PATCH',
    dispatch_attempted: false,
    risk: 'medium'
  });
  assert.equal(review.outcome, 'REVIEW');
  assert.ok(review.reason_codes.includes('NO_DISPATCH_ACTION_OK'));
  assert.equal(review.dispatch_attempted, false);

  const denied = evaluateNoDispatchActionOutput({
    intent: 'WRITE_PATCH',
    dispatch_attempted: true
  });
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('DISPATCH_ATTEMPTED'));
});

test('ACTION_PROPOSER denies textual claims of execution without evidence', () => {
  const decision = evaluateNoDispatchActionOutput('He modificado el archivo y ejecutado los tests.');
  assert.equal(decision.outcome, 'DENY');
  assert.ok(decision.reason_codes.includes('EXECUTION_CLAIM_WITHOUT_EVIDENCE'));
});

test('FERRUM_RUST accepts Rust-domain redirects and denies general advice', () => {
  const redirect = evaluateRustDomainOutput('Puedo ayudarte a crear una herramienta Rust para comparar coches con Cargo.');
  assert.equal(redirect.outcome, 'PREPARED');
  assert.ok(redirect.reason_codes.includes('DOMAIN_REDIRECT_OK'));

  const denied = evaluateRustDomainOutput('Te recomiendo comprar un coche híbrido barato.');
  assert.equal(denied.outcome, 'DENY');
  assert.ok(denied.reason_codes.includes('OUT_OF_DOMAIN_ADVICE'));
});

test('generic evaluator routes supported contract types and fails closed for unknown types', () => {
  assert.equal(evaluateAgentContract('CLOSED_VOCABULARY_CONTRACT', 'NO').outcome, 'PREPARED');
  assert.equal(evaluateAgentContract('OUTPUT_SHAPE_CONTRACT', '/').outcome, 'PREPARED');
  assert.equal(evaluateAgentContract('NO_DISPATCH_ACTION_CONTRACT', { action_type: 'READ_CONTEXT', dispatch_attempted: false }).outcome, 'REVIEW');
  assert.equal(evaluateAgentContract('DOMAIN_BOUNDARY_CONTRACT', 'Rust con Cargo.').outcome, 'PREPARED');

  const unknown = evaluateAgentContract('MAGIC_CONTRACT', 'anything');
  assert.equal(unknown.outcome, 'DENY');
  assert.ok(unknown.reason_codes.includes('UNKNOWN_CONTRACT_TYPE'));
});
