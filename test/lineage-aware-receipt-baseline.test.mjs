import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  LINEAGE_RECEIPT_BASELINE_VERSION,
  createLineageAwareReceipt,
  verifyLineageAwareReceipt
} from '../src/lineage-aware-receipt-baseline.mjs';

async function baseMaterial() {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
  const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
  const decision = evaluateActionPlan(fixture.subject);
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

const clone = (value) => structuredClone(value);

async function pair() {
  const material = await baseMaterial();
  return { material, receipt: createLineageAwareReceipt(material) };
}

test('B1 T0 accepts untouched lineage-aware receipt', async () => {
  const { material, receipt } = await pair();
  const result = verifyLineageAwareReceipt(receipt, material);
  assert.equal(result.status, 'VALID');
  assert.equal(result.baseline_version, LINEAGE_RECEIPT_BASELINE_VERSION);
  assert.equal(result.dispatch_attempted, false);
});

test('B1 T1 detects changed decision', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.decision.outcome = 'DENY';
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('DECISION_BINDING_MISMATCH'));
});

test('B1 T2 detects changed subject', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.subject.actions.at(-1).proposal.operation.args = ['run', 'test'];
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('SUBJECT_BINDING_MISMATCH'));
});

test('B1 T3 detects changed policy artifact without version bump', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.policy_artifact = `${material.policy_artifact}\n// changed`;
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('POLICY_BINDING_MISMATCH'));
});

test('B1 T4 detects changed explicit evidence artifact', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.evidence_artifacts[0].artifact.content_digest = 'sha256:tampered';
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('EVIDENCE_BINDING_MISMATCH'));
});

test('B1 T5 detects changed causal source and explains mismatch', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.current_state['config.json'] = 'sha256:config-v1';
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('CAUSAL_SOURCE_MISMATCH'));
  assert.deepEqual(result.details, [{
    evidence_id: 'generated-evidence-v2',
    resource: 'config.json',
    expected_version: 'sha256:config-v2',
    observed_version: 'sha256:config-v1'
  }]);
});

test('B1 T6 ignores unrelated state mutation', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  changed.current_state['unrelated.txt'] = 'sha256:unrelated-v2';
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'VALID');
});

test('B1 T7 rejects truncated receipt', async () => {
  const { material, receipt } = await pair();
  const changed = clone(receipt);
  delete changed.bindings.policy_artifact_hash;
  const result = verifyLineageAwareReceipt(changed, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('B1 T7 rejects unknown receipt field', async () => {
  const { material, receipt } = await pair();
  const changed = clone(receipt);
  changed.unexpected = true;
  const result = verifyLineageAwareReceipt(changed, material);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reason_codes, ['RECEIPT_CONTRACT_INVALID']);
});

test('B1 C1 fails closed when causal source is unavailable', async () => {
  const { material, receipt } = await pair();
  const changed = clone(material);
  delete changed.current_state['config.json'];
  const result = verifyLineageAwareReceipt(receipt, changed);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reason_codes.includes('CURRENT_STATE_UNAVAILABLE'));
});

test('B1 C2 refuses issuance when causal source is already unsatisfied', async () => {
  const material = await baseMaterial();
  material.current_state['config.json'] = 'sha256:config-v1';
  assert.throws(() => createLineageAwareReceipt(material), /current_state does not satisfy causal source/);
});

test('B1 C3 is deterministic for identical inputs', async () => {
  const material = await baseMaterial();
  const first = createLineageAwareReceipt(material);
  const second = createLineageAwareReceipt(clone(material));
  assert.equal(first.receipt_hash, second.receipt_hash);
  assert.equal(first.receipt_id, second.receipt_id);
  assert.deepEqual(first.sources, second.sources);
});
