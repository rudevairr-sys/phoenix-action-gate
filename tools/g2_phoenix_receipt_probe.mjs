import { readFile } from 'node:fs/promises';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  SNAPSHOT_RECEIPT_BASELINE_VERSION,
  createSnapshotReceipt,
  verifySnapshotReceipt
} from '../src/receipt-baseline.mjs';
import {
  PHOENIX_EVIDENCE_RECEIPT_VERSION,
  createPhoenixEvidenceReceipt,
  verifyPhoenixEvidenceReceipt
} from '../src/phoenix-evidence-receipt.mjs';

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
const phoenixSource = await readFile(new URL('../src/phoenix-evidence-receipt.mjs', import.meta.url), 'utf8');
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

const baselineReceipt = createSnapshotReceipt(base);
const phoenixReceipt = createPhoenixEvidenceReceipt(base);

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
const baselineT7Receipt = clone(baselineReceipt);
delete baselineT7Receipt.bindings.policy_artifact_hash;
const phoenixT7Receipt = clone(phoenixReceipt);
delete phoenixT7Receipt.bindings.policy_artifact_hash;

const cases = [
  { id: 'T0', description: 'untouched snapshot', material: base, baselineReceipt, phoenixReceipt, expectedBaseline: 'VALID', expectedPhoenix: 'VALID' },
  { id: 'T1', description: 'decision changed', material: t1, baselineReceipt, phoenixReceipt, expectedBaseline: 'INVALID', expectedPhoenix: 'INVALID' },
  { id: 'T2', description: 'subject changed', material: t2, baselineReceipt, phoenixReceipt, expectedBaseline: 'INVALID', expectedPhoenix: 'INVALID' },
  { id: 'T3', description: 'policy artifact changed without version bump', material: t3, baselineReceipt, phoenixReceipt, expectedBaseline: 'INVALID', expectedPhoenix: 'INVALID' },
  { id: 'T4', description: 'explicit evidence artifact changed', material: t4, baselineReceipt, phoenixReceipt, expectedBaseline: 'INVALID', expectedPhoenix: 'INVALID' },
  { id: 'T5', description: 'causal source state changed while stored evidence remains intact', material: t5, baselineReceipt, phoenixReceipt, expectedBaseline: 'VALID', expectedPhoenix: 'INVALID' },
  { id: 'T6', description: 'unrelated state changed', material: t6, baselineReceipt, phoenixReceipt, expectedBaseline: 'VALID', expectedPhoenix: 'VALID' },
  { id: 'T7', description: 'receipt truncated', material: base, baselineReceipt: baselineT7Receipt, phoenixReceipt: phoenixT7Receipt, expectedBaseline: 'INVALID', expectedPhoenix: 'INVALID' }
];

const caseResults = cases.map((entry) => {
  const baseline = verifySnapshotReceipt(entry.baselineReceipt, entry.material);
  const phoenix = verifyPhoenixEvidenceReceipt(entry.phoenixReceipt, entry.material);
  return {
    id: entry.id,
    description: entry.description,
    baseline: {
      expected: entry.expectedBaseline,
      actual: baseline.status,
      passed: baseline.status === entry.expectedBaseline,
      reason_codes: baseline.reason_codes
    },
    phoenix: {
      expected: entry.expectedPhoenix,
      actual: phoenix.status,
      passed: phoenix.status === entry.expectedPhoenix,
      reason_codes: phoenix.reason_codes,
      details: phoenix.details ?? []
    },
    diverged: baseline.status !== phoenix.status
  };
});

const baselineRepeat = createSnapshotReceipt(clone(base));
const phoenixRepeat = createPhoenixEvidenceReceipt(clone(base));
const baselineDeterministic = baselineReceipt.receipt_hash === baselineRepeat.receipt_hash && baselineReceipt.receipt_id === baselineRepeat.receipt_id;
const phoenixDeterministic = phoenixReceipt.receipt_hash === phoenixRepeat.receipt_hash && phoenixReceipt.receipt_id === phoenixRepeat.receipt_id;

const baselineTimings = [];
const phoenixTimings = [];
for (let index = 0; index < 250; index += 1) {
  let started = performance.now();
  verifySnapshotReceipt(baselineReceipt, base);
  baselineTimings.push(performance.now() - started);

  started = performance.now();
  verifyPhoenixEvidenceReceipt(phoenixReceipt, base);
  phoenixTimings.push(performance.now() - started);
}

const t5Result = caseResults.find((item) => item.id === 'T5');
const t6Result = caseResults.find((item) => item.id === 'T6');
const allExpected = caseResults.every((item) => item.baseline.passed && item.phoenix.passed);
const hardGatesPassed = allExpected && baselineDeterministic && phoenixDeterministic && t6Result?.phoenix.actual === 'VALID';
const preregisteredT5Divergence = t5Result?.baseline.actual === 'VALID'
  && t5Result?.phoenix.actual === 'INVALID'
  && t5Result?.phoenix.reason_codes.includes('LINEAGE_BINDING_INVALIDATED');

const baselineLoc = baselineSource.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
const phoenixLoc = phoenixSource.split(/\r?\n/).filter((line) => line.trim().length > 0).length;

const output = {
  schema_version: '1.0',
  trial_id: fixture.trial_id,
  stage: 'PHOENIX_CANDIDATE_VS_FROZEN_B0',
  baseline_version: SNAPSHOT_RECEIPT_BASELINE_VERSION,
  phoenix_candidate_version: PHOENIX_EVIDENCE_RECEIPT_VERSION,
  cases: caseResults,
  all_preregistered_expectations_met: allExpected,
  hard_gates_passed: hardGatesPassed,
  preregistered_t5_divergence_observed: preregisteredT5Divergence,
  divergence_cases: caseResults.filter((item) => item.diverged).map((item) => item.id),
  deterministic: {
    baseline: baselineDeterministic,
    phoenix: phoenixDeterministic
  },
  complexity: {
    baseline_receipt_bytes: Buffer.byteLength(JSON.stringify(baselineReceipt), 'utf8'),
    phoenix_receipt_bytes: Buffer.byteLength(JSON.stringify(phoenixReceipt), 'utf8'),
    baseline_module_nonblank_loc: baselineLoc,
    phoenix_module_nonblank_loc: phoenixLoc,
    phoenix_to_baseline_loc_ratio: Number((phoenixLoc / baselineLoc).toFixed(4)),
    dependencies_added_by_candidate: 0
  },
  local_verify_median_ms_250_iterations: {
    baseline: Number(median(baselineTimings).toFixed(6)),
    phoenix: Number(median(phoenixTimings).toFixed(6))
  },
  dispatch_attempted: false,
  candidate_claim_boundary: 'Even if T5 diverges as preregistered, no public receipt/tamper differentiation claim is authorized until lineage-aware-receipt-baseline/0.2.0 is preregistered and executed.',
  evidence_boundary: 'This probe compares the frozen B0 and the isolated Phoenix candidate on the exact preregistered T0-T7 corpus. It does not use network, LLM, dispatch, Phoenix Neuron runtime, or modified Gate/Plan Gate semantics.'
};

console.log(JSON.stringify(output, null, 2));
