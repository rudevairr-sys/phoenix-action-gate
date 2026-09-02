import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  PHOENIX_EVIDENCE_RECEIPT_VERSION,
  createPhoenixEvidenceReceipt,
  verifyPhoenixEvidenceReceipt
} from '../src/phoenix-evidence-receipt.mjs';

async function baseMaterial() {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
  const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
  const decision = evaluateActionPlan(fixture.subject);

  assert.equal(decision.outcome, 'REVIEW');
  assert.equal(decision.reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATION_DETECTED'), false);

  return {
    subject_type: fixture.subject_type,
    subject_id: fixture.subject.plan_id,
    subject: fixture.subject,
    decision,
    policy_version: fixture.policy_version,
    policy_artifact: policyArtifact,
    evidence_artifacts: fixture.evidence_artifacts,
    current_state: fixture.current_state
  };
}

function clone(value) {
  return structuredClone(value);
}

async function receiptAndMaterial() {
  const material = await baseMaterial();
  return {
    material,
    receipt: createPhoenixEvidenceReceipt(material)
  };
}

test('Tamper T0 Phoenix accepts the untouched causal receipt', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const result = verifyPhoenixEvidenceReceipt(receipt, material);

  assert.equal(result.status, 'VALID');
  assert.deepEqual(result.reason_codes, ['CAUSAL_BINDINGS_VALID']);
  assert.equal(result.candidate_version, PHOENIX_EVIDENCE_RECEIPT_VERSION);
  assert.equal(result.dispatch_attempted, false);
});

test('Tamper T1 Phoenix detects a changed decision', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.decision.outcome = 'DENY';

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('DECISION_BINDING_MISMATCH'));
});

test('Tamper T2 Phoenix detects a changed ActionPlan subject', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  const finalStep = changed.subject.actions.find((step) => step.step_id === 's4-test-generated-v2');
  finalStep.proposal.operation.args = ['run', 'test'];

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('SUBJECT_BINDING_MISMATCH'));
});

test('Tamper T3 Phoenix detects a policy artifact change without a version bump', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.policy_artifact = `${material.policy_artifact}\n// post-decision policy tamper`;
  changed.policy_version = material.policy_version;

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('POLICY_BINDING_MISMATCH'));
});

test('Tamper T4 Phoenix detects explicit evidence artifact mutation', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.evidence_artifacts[0].artifact.content_digest = 'sha256:generated-v2-tampered';

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('EVIDENCE_BINDING_MISMATCH'));
});

test('Tamper T5 Phoenix invalidates receipt when causal source state changes', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.current_state['config.json'] = 'sha256:config-v1';

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('LINEAGE_BINDING_INVALIDATED'));
  assert.deepEqual(result.details, [{
    type: 'LINEAGE_BINDING_INVALIDATED',
    evidence_id: 'generated-evidence-v2',
    source_resource: 'config.json',
    expected_source_version: 'sha256:config-v2',
    observed_source_version: 'sha256:config-v1'
  }]);
  assert.equal(result.capabilities.current_state_reasoning, true);
  assert.equal(result.capabilities.evidence_lineage_reasoning, true);
});

test('Tamper T6 Phoenix ignores an unrelated workspace state change', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.current_state['unrelated.txt'] = 'sha256:unrelated-v2';

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'VALID');
});

test('Tamper T7 Phoenix fails closed on a truncated receipt', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const truncated = clone(receipt);
  delete truncated.bindings.policy_artifact_hash;

  const result = verifyPhoenixEvidenceReceipt(truncated, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('Tamper T7 Phoenix fails closed on an unknown receipt field', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const extended = clone(receipt);
  extended.unexpected = true;

  const result = verifyPhoenixEvidenceReceipt(extended, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('Phoenix evidence receipt creation is deterministic for identical inputs', async () => {
  const material = await baseMaterial();
  const first = createPhoenixEvidenceReceipt(material);
  const second = createPhoenixEvidenceReceipt(clone(material));

  assert.equal(first.receipt_hash, second.receipt_hash);
  assert.equal(first.receipt_id, second.receipt_id);
  assert.deepEqual(first.causal_obligations, second.causal_obligations);
});

test('Phoenix receipt verification fails closed when current causal state is unavailable', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  delete changed.current_state['config.json'];

  const result = verifyPhoenixEvidenceReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('CURRENT_STATE_UNAVAILABLE'));
});

test('Phoenix refuses to issue a receipt when causal obligations are already unsatisfied', async () => {
  const material = await baseMaterial();
  material.current_state['config.json'] = 'sha256:config-v1';

  assert.throws(
    () => createPhoenixEvidenceReceipt(material),
    /current_state does not satisfy causal source: config\.json/
  );
});
