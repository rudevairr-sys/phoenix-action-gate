import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  createCoherentContextReceipt,
  verifyCoherentContextReceipt
} from '../src/coherent-context-receipt-baseline.mjs';
import {
  createPhoenixGovernanceContextReceipt,
  verifyPhoenixGovernanceContextReceipt
} from '../src/phoenix-governance-context-receipt.mjs';

const clone = (value) => structuredClone(value);

async function baseMaterial() {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
  const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
  return {
    subject_type: fixture.subject_type,
    subject_id: fixture.subject.plan_id,
    subject: fixture.subject,
    decision: evaluateActionPlan(fixture.subject),
    policy_version: fixture.policy_version,
    policy_artifact: policyArtifact,
    evidence_artifacts: fixture.evidence_artifacts,
    current_state: fixture.current_state
  };
}

const systems = [
  { name: 'coherent baseline', create: createCoherentContextReceipt, verify: verifyCoherentContextReceipt },
  { name: 'Phoenix governance context', create: createPhoenixGovernanceContextReceipt, verify: verifyPhoenixGovernanceContextReceipt }
];

for (const system of systems) {
  test(`${system.name} C0 accepts intact coherent context`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const result = system.verify(receipt, material);
    assert.equal(result.status, 'VALID');
    assert.equal(result.dispatch_attempted, false);
  });

  test(`${system.name} T5 invalidates changed causal source`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const changed = clone(material);
    changed.current_state['config.json'] = 'sha256:config-v1';
    const result = system.verify(receipt, changed);
    assert.equal(result.status, 'INVALID');
    assert.ok(result.reason_codes.includes('CAUSAL_SOURCE_MISMATCH'));
  });

  test(`${system.name} T6 ignores unrelated state change`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const changed = clone(material);
    changed.current_state['unrelated.txt'] = 'sha256:unrelated-v2';
    assert.equal(system.verify(receipt, changed).status, 'VALID');
  });

  test(`${system.name} T8 refuses issuance when required evidence is omitted`, async () => {
    const material = await baseMaterial();
    material.evidence_artifacts = [];
    assert.throws(() => system.create(material), /REQUIRED_EVIDENCE_MISSING/);
  });

  test(`${system.name} T9 invalidates stale evidence resource even when causal source remains valid`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const changed = clone(material);
    changed.current_state['generated.md'] = 'sha256:generated-v3';
    const result = system.verify(receipt, changed);
    assert.equal(result.status, 'INVALID');
    assert.ok(result.reason_codes.includes('EVIDENCE_RESOURCE_STALE'));
  });

  test(`${system.name} T10 refuses policy/decision mismatch at issuance`, async () => {
    const material = await baseMaterial();
    material.policy_version = 'phoenix-plan-gate/0.3.0-mismatched-context';
    assert.throws(() => system.create(material), /POLICY_DECISION_COHERENCE_MISMATCH/);
  });

  test(`${system.name} T11 refuses mixed subject/decision plan identity`, async () => {
    const material = await baseMaterial();
    material.subject.plan_id = 'mixed-plan-id';
    assert.throws(() => system.create(material), /SUBJECT_DECISION_COHERENCE_MISMATCH/);
  });

  test(`${system.name} T12 refuses evidence that disagrees with decision evidence registry`, async () => {
    const material = await baseMaterial();
    material.evidence_artifacts[0].artifact.resource = 'other-generated.md';
    material.evidence_artifacts[0].artifact.version = 'sha256:other-v9';
    material.evidence_artifacts[0].artifact.derives_from = [{ resource: 'config.json', version: 'sha256:config-v9' }];
    material.current_state['other-generated.md'] = 'sha256:other-v9';
    material.current_state['config.json'] = 'sha256:config-v9';
    assert.throws(() => system.create(material), /EVIDENCE_REGISTRY_COHERENCE_MISMATCH/);
  });

  test(`${system.name} T13 fails closed when required evidence resource is unavailable`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const changed = clone(material);
    delete changed.current_state['generated.md'];
    const result = system.verify(receipt, changed);
    assert.equal(result.status, 'INVALID');
    assert.ok(result.reason_codes.includes('EVIDENCE_RESOURCE_UNAVAILABLE'));
  });

  test(`${system.name} C1 fails closed when causal source is unavailable`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const changed = clone(material);
    delete changed.current_state['config.json'];
    const result = system.verify(receipt, changed);
    assert.equal(result.status, 'INVALID');
    assert.ok(result.reason_codes.includes('CURRENT_STATE_UNAVAILABLE'));
  });

  test(`${system.name} C2 is deterministic`, async () => {
    const material = await baseMaterial();
    const first = system.create(material);
    const second = system.create(clone(material));
    assert.equal(first.receipt_id, second.receipt_id);
    assert.equal(first.receipt_hash, second.receipt_hash);
  });

  test(`${system.name} C3 rejects truncated and unknown-field receipts`, async () => {
    const material = await baseMaterial();
    const receipt = system.create(material);
    const truncated = clone(receipt);
    delete truncated.receipt_hash;
    assert.equal(system.verify(truncated, material).status, 'INVALID');
    const unknown = clone(receipt);
    unknown.unexpected = true;
    assert.equal(system.verify(unknown, material).status, 'INVALID');
  });
}

test('Phoenix candidate exposes an explicit governance context witness', async () => {
  const material = await baseMaterial();
  const receipt = createPhoenixGovernanceContextReceipt(material);
  assert.ok(receipt.governance_context);
  assert.equal(typeof receipt.governance_context.context_hash, 'string');
  assert.deepEqual(receipt.governance_context.required_evidence_ids, ['generated-evidence-v2']);
  assert.ok(receipt.governance_context.state_obligations.some((item) => item.kind === 'EVIDENCE_RESOURCE' && item.resource === 'generated.md'));
  assert.ok(receipt.governance_context.state_obligations.some((item) => item.kind === 'CAUSAL_SOURCE' && item.resource === 'config.json'));
});
