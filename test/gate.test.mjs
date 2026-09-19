import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateActionProposal } from '../src/gate.mjs';

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
}

test('bounded read becomes R0/PREPARED and never dispatches', async () => {
  const decision = evaluateActionProposal(await fixture('prepared-read.json'));
  assert.equal(decision.outcome, 'PREPARED');
  assert.equal(decision.risk_class, 'R0');
  assert.equal(decision.dispatch_attempted, false);
});

test('reversible patch becomes R2/REVIEW', async () => {
  const decision = evaluateActionProposal(await fixture('review-patch.json'));
  assert.equal(decision.outcome, 'REVIEW');
  assert.equal(decision.risk_class, 'R2');
  assert.equal(decision.human_review_required, true);
  assert.equal(decision.dispatch_attempted, false);
});

test('secret path fails closed as R3/DENY', async () => {
  const decision = evaluateActionProposal(await fixture('deny-secret.json'));
  assert.equal(decision.outcome, 'DENY');
  assert.equal(decision.risk_class, 'R3');
  assert.ok(decision.reason_codes.includes('SECRET_BOUNDARY'));
  assert.equal(decision.dispatch_attempted, false);
});

test('allowlisted test command becomes R1/PREPARED without execution', async () => {
  const decision = evaluateActionProposal(await fixture('prepared-command.json'));
  assert.equal(decision.outcome, 'PREPARED');
  assert.equal(decision.risk_class, 'R1');
  assert.ok(decision.reason_codes.includes('ALLOWLISTED_TEST_COMMAND'));
  assert.equal(decision.dispatch_attempted, false);
});

test('same proposal produces same deterministic decision hash', async () => {
  const proposal = await fixture('prepared-read.json');
  const first = evaluateActionProposal(proposal);
  const second = evaluateActionProposal(structuredClone(proposal));
  assert.equal(first.decision_hash, second.decision_hash);
  assert.equal(first.decision_id, second.decision_id);
});

test('unknown schema fails closed', async () => {
  const proposal = await fixture('prepared-read.json');
  proposal.schema_version = '99.0';
  const decision = evaluateActionProposal(proposal);
  assert.equal(decision.outcome, 'DENY');
  assert.equal(decision.risk_class, 'R3');
  assert.ok(decision.reason_codes.includes('UNSUPPORTED_SCHEMA_VERSION'));
});

test('read proposal with contradictory rollback semantics fails closed', async () => {
  const proposal = await fixture('prepared-read.json');
  proposal.reversibility = { kind: 'NONE', rollback_plan: null };
  const decision = evaluateActionProposal(proposal);
  assert.equal(decision.outcome, 'DENY');
  assert.equal(decision.risk_class, 'R3');
  assert.ok(decision.reason_codes.includes('REVERSIBILITY_MISMATCH'));
});

test('allowlisted command with contradictory rollback semantics fails closed', async () => {
  const proposal = await fixture('prepared-command.json');
  proposal.reversibility = { kind: 'NONE', rollback_plan: null };
  const decision = evaluateActionProposal(proposal);
  assert.equal(decision.outcome, 'DENY');
  assert.equal(decision.risk_class, 'R3');
  assert.ok(decision.reason_codes.includes('REVERSIBILITY_MISMATCH'));
});
