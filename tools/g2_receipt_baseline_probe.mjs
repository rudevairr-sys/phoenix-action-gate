import { readFile } from 'node:fs/promises';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  SNAPSHOT_RECEIPT_BASELINE_VERSION,
  SNAPSHOT_RECEIPT_CAPABILITIES,
  createSnapshotReceipt,
  verifySnapshotReceipt
} from '../src/receipt-baseline.mjs';

function clone(value) {
  return structuredClone(value);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
const baselineSource = await readFile(new URL('../src/receipt-baseline.mjs', import.meta.url), 'utf8');
const decision = evaluateActionPlan(fixture.subject);

const base = {
  subject_type: fixture.subject_type,
  subject_id: fixture.subject.plan_id,
  subject: fixture.subject,
  decision,
  policy_version: fixture.policy_version,
  policy_artifact: policyArtifact,
  evidence_artifacts: fixture.evidence_artifacts,
  current_state: fixture.current_state
};

const receipt = createSnapshotReceipt(base);

function changedMaterial(mutator) {
  const material = clone(base);
  mutator(material);
  return material;
}

const t1 = changedMaterial((material) => { material.decision.outcome = 'DENY'; });
const t2 = changedMaterial((material) => {
  const step = material.subject.actions.find((item) => item.step_id === 's4-test-generated-v2');
  step.proposal.operation.args = ['run', 'test'];
});
const t3 = changedMaterial((material) => { material.policy_artifact = `${material.policy_artifact}\n// tampered`; });
const t4 = changedMaterial((material) => { material.evidence_artifacts[0].artifact.content_digest = 'sha256:generated-v2-tampered'; });
const t5 = changedMaterial((material) => { material.current_state['config.json'] = 'sha256:config-v1'; });
const t6 = changedMaterial((material) => { material.current_state['unrelated.txt'] = 'sha256:unrelated-v2'; });
const t7Receipt = clone(receipt);
delete t7Receipt.bindings.policy_artifact_hash;

const cases = [
  { id: 'T0', description: 'untouched snapshot', expected: 'VALID', receipt, material: base },
  { id: 'T1', description: 'decision changed', expected: 'INVALID', receipt, material: t1 },
  { id: 'T2', description: 'subject changed', expected: 'INVALID', receipt, material: t2 },
  { id: 'T3', description: 'policy artifact changed without version bump', expected: 'INVALID', receipt, material: t3 },
  { id: 'T4', description: 'explicit evidence artifact changed', expected: 'INVALID', receipt, material: t4 },
  { id: 'T5', description: 'causal source state changed while snapshot artifacts remain intact', expected: 'VALID', receipt, material: t5 },
  { id: 'T6', description: 'unrelated state changed', expected: 'VALID', receipt, material: t6 },
  { id: 'T7', description: 'receipt truncated', expected: 'INVALID', receipt: t7Receipt, material: base }
];

const caseResults = cases.map((entry) => {
  const result = verifySnapshotReceipt(entry.receipt, entry.material);
  return {
    id: entry.id,
    description: entry.description,
    expected: entry.expected,
    actual: result.status,
    passed: result.status === entry.expected,
    reason_codes: result.reason_codes
  };
});

const repeat = createSnapshotReceipt(clone(base));
const deterministic = receipt.receipt_hash === repeat.receipt_hash && receipt.receipt_id === repeat.receipt_id;

const timings = [];
for (let index = 0; index < 250; index += 1) {
  const started = performance.now();
  verifySnapshotReceipt(receipt, base);
  timings.push(performance.now() - started);
}

const output = {
  schema_version: '1.0',
  trial_id: fixture.trial_id,
  stage: 'BASELINE_B0_ONLY',
  baseline_version: SNAPSHOT_RECEIPT_BASELINE_VERSION,
  baseline_capabilities: SNAPSHOT_RECEIPT_CAPABILITIES,
  base_plan_outcome: decision.outcome,
  base_plan_reason_codes: decision.reason_codes,
  cases: caseResults,
  all_preregistered_expectations_met: caseResults.every((item) => item.passed),
  t5_snapshot_result: caseResults.find((item) => item.id === 'T5')?.actual ?? null,
  receipt_deterministic: deterministic,
  receipt_bytes: Buffer.byteLength(JSON.stringify(receipt), 'utf8'),
  baseline_module_nonblank_loc: baselineSource.split(/\r?\n/).filter((line) => line.trim().length > 0).length,
  verify_median_ms_250_local_iterations: Number(median(timings).toFixed(6)),
  dependencies_added: 0,
  dispatch_attempted: false,
  evidence_boundary: 'This probe evaluates B0 only. It does not execute or implement the Phoenix causal receipt candidate and supports no positive tamper differentiation claim.'
};

console.log(JSON.stringify(output, null, 2));
