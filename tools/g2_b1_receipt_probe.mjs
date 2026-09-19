import { readFile } from 'node:fs/promises';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  LINEAGE_RECEIPT_BASELINE_VERSION,
  createLineageAwareReceipt,
  verifyLineageAwareReceipt
} from '../src/lineage-aware-receipt-baseline.mjs';
import {
  PHOENIX_EVIDENCE_RECEIPT_VERSION,
  createPhoenixEvidenceReceipt,
  verifyPhoenixEvidenceReceipt
} from '../src/phoenix-evidence-receipt.mjs';

const clone = (value) => structuredClone(value);
const median = (values) => {
  const sorted = [...values].sort((a,b) => a-b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i-1] + sorted[i]) / 2;
};

const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
const b1Source = await readFile(new URL('../src/lineage-aware-receipt-baseline.mjs', import.meta.url), 'utf8');
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

const b1Receipt = createLineageAwareReceipt(base);
const phoenixReceipt = createPhoenixEvidenceReceipt(base);
const mutate = (fn) => { const x = clone(base); fn(x); return x; };
const t1 = mutate((x) => { x.decision.outcome = 'DENY'; });
const t2 = mutate((x) => { x.subject.actions.at(-1).proposal.operation.args = ['run','test']; });
const t3 = mutate((x) => { x.policy_artifact += '\n// changed'; });
const t4 = mutate((x) => { x.evidence_artifacts[0].artifact.content_digest = 'sha256:tampered'; });
const t5 = mutate((x) => { x.current_state['config.json'] = 'sha256:config-v1'; });
const t6 = mutate((x) => { x.current_state['unrelated.txt'] = 'sha256:unrelated-v2'; });
const c1 = mutate((x) => { delete x.current_state['config.json']; });
const t7B1 = clone(b1Receipt); delete t7B1.bindings.policy_artifact_hash;
const t7Phoenix = clone(phoenixReceipt); delete t7Phoenix.bindings.policy_artifact_hash;

const cases = [
  ['T0', base, b1Receipt, phoenixReceipt, 'VALID', 'VALID'],
  ['T1', t1, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID'],
  ['T2', t2, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID'],
  ['T3', t3, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID'],
  ['T4', t4, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID'],
  ['T5', t5, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID'],
  ['T6', t6, b1Receipt, phoenixReceipt, 'VALID', 'VALID'],
  ['T7', base, t7B1, t7Phoenix, 'INVALID', 'INVALID'],
  ['C1', c1, b1Receipt, phoenixReceipt, 'INVALID', 'INVALID']
];

const results = cases.map(([id, material, br, pr, eb, ep]) => {
  const b = verifyLineageAwareReceipt(br, material);
  const p = verifyPhoenixEvidenceReceipt(pr, material);
  return {
    id,
    b1: { expected: eb, actual: b.status, passed: b.status === eb, reason_codes: b.reason_codes, details: b.details ?? [] },
    phoenix: { expected: ep, actual: p.status, passed: p.status === ep, reason_codes: p.reason_codes, details: p.details ?? [] },
    diverged: b.status !== p.status
  };
});

let c2B1 = false;
let c2Phoenix = false;
const unsatisfied = mutate((x) => { x.current_state['config.json'] = 'sha256:config-v1'; });
try { createLineageAwareReceipt(unsatisfied); } catch { c2B1 = true; }
try { createPhoenixEvidenceReceipt(unsatisfied); } catch { c2Phoenix = true; }

const b1Repeat = createLineageAwareReceipt(clone(base));
const phoenixRepeat = createPhoenixEvidenceReceipt(clone(base));
const deterministic = {
  b1: b1Receipt.receipt_hash === b1Repeat.receipt_hash && b1Receipt.receipt_id === b1Repeat.receipt_id,
  phoenix: phoenixReceipt.receipt_hash === phoenixRepeat.receipt_hash && phoenixReceipt.receipt_id === phoenixRepeat.receipt_id
};

const bt = [], pt = [];
for (let i = 0; i < 250; i += 1) {
  let s = performance.now(); verifyLineageAwareReceipt(b1Receipt, base); bt.push(performance.now() - s);
  s = performance.now(); verifyPhoenixEvidenceReceipt(phoenixReceipt, base); pt.push(performance.now() - s);
}

const b1Loc = b1Source.split(/\r?\n/).filter((line) => line.trim()).length;
const phoenixLoc = phoenixSource.split(/\r?\n/).filter((line) => line.trim()).length;
const allCasesPass = results.every((r) => r.b1.passed && r.phoenix.passed);
const hardGatesPassed = allCasesPass && c2B1 && c2Phoenix && deterministic.b1 && deterministic.phoenix;

console.log(JSON.stringify({
  schema_version: '1.0',
  trial_id: 'EVIDENCE_RECEIPT_TAMPER_TRIAL_002',
  stage: 'B1_VS_PHOENIX_FROZEN_0_1_0',
  b1_version: LINEAGE_RECEIPT_BASELINE_VERSION,
  phoenix_candidate_version: PHOENIX_EVIDENCE_RECEIPT_VERSION,
  cases: results,
  controls: { C2_b1_refuses_unsatisfied_issuance: c2B1, C2_phoenix_refuses_unsatisfied_issuance: c2Phoenix, C3_deterministic: deterministic },
  hard_gates_passed: hardGatesPassed,
  divergence_cases: results.filter((r) => r.diverged).map((r) => r.id),
  complexity: {
    b1_receipt_bytes: Buffer.byteLength(JSON.stringify(b1Receipt), 'utf8'),
    phoenix_receipt_bytes: Buffer.byteLength(JSON.stringify(phoenixReceipt), 'utf8'),
    b1_module_nonblank_loc: b1Loc,
    phoenix_module_nonblank_loc: phoenixLoc,
    b1_to_phoenix_loc_ratio: Number((b1Loc / phoenixLoc).toFixed(4)),
    dependencies_added_by_b1: 0
  },
  local_verify_median_ms_250_iterations: { b1: Number(median(bt).toFixed(6)), phoenix: Number(median(pt).toFixed(6)) },
  dispatch_attempted: false,
  interpretation_boundary: 'Apply only the preregistered Trial 002 interpretation after the full regression and this probe execute successfully. No receipt differentiation claim is authorized from implementation alone.'
}, null, 2));
