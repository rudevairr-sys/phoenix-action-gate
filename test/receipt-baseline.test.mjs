import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  SNAPSHOT_RECEIPT_BASELINE_VERSION,
  createSnapshotReceipt,
  verifySnapshotReceipt
} from '../src/receipt-baseline.mjs';

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
    receipt: createSnapshotReceipt(material)
  };
}

test('Tamper T0 baseline accepts the untouched snapshot', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const result = verifySnapshotReceipt(receipt, material);

  assert.equal(result.status, 'VALID');
  assert.deepEqual(result.reason_codes, ['SNAPSHOT_BINDINGS_VALID']);
  assert.equal(result.baseline_version, SNAPSHOT_RECEIPT_BASELINE_VERSION);
  assert.equal(result.dispatch_attempted, false);
});

test('Tamper T1 baseline detects a changed decision', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.decision.outcome = 'DENY';

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('DECISION_BINDING_MISMATCH'));
});

test('Tamper T2 baseline detects a changed ActionPlan subject', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  const finalStep = changed.subject.actions.find((step) => step.step_id === 's4-test-generated-v2');
  finalStep.proposal.operation.args = ['run', 'test'];

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('SUBJECT_BINDING_MISMATCH'));
});

test('Tamper T3 baseline detects a policy artifact change without a version bump', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.policy_artifact = `${material.policy_artifact}\n// post-decision policy tamper`;
  changed.policy_version = material.policy_version;

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('POLICY_BINDING_MISMATCH'));
});

test('Tamper T4 baseline detects explicit evidence artifact mutation', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.evidence_artifacts[0].artifact.content_digest = 'sha256:generated-v2-tampered';

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('EVIDENCE_BINDING_MISMATCH'));
});

test('Tamper T5 baseline remains VALID when only a causal source state changes', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.current_state['config.json'] = 'sha256:config-v1';

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'VALID');
  assert.equal(result.capabilities.current_state_reasoning, false);
  assert.equal(result.capabilities.evidence_lineage_reasoning, false);
});

test('Tamper T6 baseline ignores an unrelated workspace state change', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const changed = clone(material);
  changed.current_state['unrelated.txt'] = 'sha256:unrelated-v2';

  const result = verifySnapshotReceipt(receipt, changed);
  assert.equal(result.status, 'VALID');
});

test('Tamper T7 baseline fails closed on a truncated receipt', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const truncated = clone(receipt);
  delete truncated.bindings.policy_artifact_hash;

  const result = verifySnapshotReceipt(truncated, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('Tamper T7 baseline fails closed on an unknown receipt field', async () => {
  const { material, receipt } = await receiptAndMaterial();
  const extended = clone(receipt);
  extended.unexpected = true;

  const result = verifySnapshotReceipt(extended, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('snapshot receipt creation is deterministic for identical inputs', async () => {
  const material = await baseMaterial();
  const first = createSnapshotReceipt(material);
  const second = createSnapshotReceipt(clone(material));

  assert.equal(first.receipt_hash, second.receipt_hash);
  assert.equal(first.receipt_id, second.receipt_id);
});
