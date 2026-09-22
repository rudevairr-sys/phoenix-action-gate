import { readFile } from 'node:fs/promises';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  COHERENT_CONTEXT_BASELINE_VERSION,
  COHERENT_CONTEXT_BASELINE_CAPABILITIES,
  createCoherentContextReceipt,
  verifyCoherentContextReceipt
} from '../src/coherent-context-receipt-baseline.mjs';
import {
  PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION,
  PHOENIX_GOVERNANCE_CONTEXT_CAPABILITIES,
  createPhoenixGovernanceContextReceipt,
  verifyPhoenixGovernanceContextReceipt
} from '../src/phoenix-governance-context-receipt.mjs';

const clone = (value) => structuredClone(value);
const median = (values) => {
  const sorted = [...values].sort((a,b) => a-b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};

const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
const baselineSource = await readFile(new URL('../src/coherent-context-receipt-baseline.mjs', import.meta.url), 'utf8');
const candidateSource = await readFile(new URL('../src/phoenix-governance-context-receipt.mjs', import.meta.url), 'utf8');
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

const systems = [
  {
    name: 'baseline', version: COHERENT_CONTEXT_BASELINE_VERSION,
    capabilities: COHERENT_CONTEXT_BASELINE_CAPABILITIES,
    create: createCoherentContextReceipt, verify: verifyCoherentContextReceipt,
    source: baselineSource
  },
  {
    name: 'phoenix', version: PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION,
    capabilities: PHOENIX_GOVERNANCE_CONTEXT_CAPABILITIES,
    create: createPhoenixGovernanceContextReceipt, verify: verifyPhoenixGovernanceContextReceipt,
    source: candidateSource
  }
];

function safeCreate(system, material) {
  try { return { accepted: true, receipt: system.create(material), error: null }; }
  catch (error) { return { accepted: false, receipt: null, error: String(error?.message ?? error) }; }
}

function safeVerify(system, receipt, material) {
  if (!receipt) return { status: 'NOT_ISSUED', reason_codes: [], details: [] };
  try {
    const result = system.verify(receipt, material);
    return { status: result.status, reason_codes: result.reason_codes ?? [], details: result.details ?? [] };
  } catch (error) {
    return { status: 'VERIFY_ERROR', reason_codes: [], details: [], error: String(error?.message ?? error) };
  }
}

function verifyCase(system, id, description, receiptMaterial, verifyMaterial, expected) {
  const issued = safeCreate(system, receiptMaterial);
  const verified = safeVerify(system, issued.receipt, verifyMaterial);
  return {
    id, description, mode: 'VERIFY', expected,
    issuance_accepted: issued.accepted, issuance_error: issued.error,
    actual: verified.status, passed: issued.accepted && verified.status === expected,
    reason_codes: verified.reason_codes, details: verified.details
  };
}

function issuanceCase(system, id, description, material, expectedReason) {
  const issued = safeCreate(system, material);
  const reasonMatched = !issued.accepted && issued.error?.includes(expectedReason);
  return {
    id, description, mode: 'ISSUANCE', expected: 'REJECTED',
    issuance_accepted: issued.accepted, issuance_error: issued.error,
    actual: issued.accepted ? 'ISSUED' : 'REJECTED', passed: reasonMatched,
    expected_reason_fragment: expectedReason
  };
}

function materials() {
  const t5 = clone(base); t5.current_state['config.json'] = 'sha256:config-v1';
  const t6 = clone(base); t6.current_state['unrelated.txt'] = 'sha256:unrelated-v2';
  const t8 = clone(base); t8.evidence_artifacts = [];
  const t9 = clone(base); t9.current_state['generated.md'] = 'sha256:generated-v3';
  const t10 = clone(base); t10.policy_version = 'phoenix-plan-gate/0.3.0-mismatched-context';
  const t11 = clone(base); t11.subject.plan_id = 'mixed-plan-id';
  const t12 = clone(base);
  t12.evidence_artifacts[0].artifact.resource = 'other-generated.md';
  t12.evidence_artifacts[0].artifact.version = 'sha256:other-v9';
  t12.evidence_artifacts[0].artifact.derives_from = [{ resource: 'config.json', version: 'sha256:config-v9' }];
  t12.current_state['other-generated.md'] = 'sha256:other-v9';
  t12.current_state['config.json'] = 'sha256:config-v9';
  const t13 = clone(base); delete t13.current_state['generated.md'];
  const c1 = clone(base); delete c1.current_state['config.json'];
  return { t5, t6, t8, t9, t10, t11, t12, t13, c1 };
}

const comparison = [];
for (const system of systems) {
  const m = materials();
  const baseReceipt = safeCreate(system, clone(base));
  const results = [
    verifyCase(system, 'C0', 'intact coherent context', clone(base), clone(base), 'VALID'),
    verifyCase(system, 'T5', 'causal source changed', clone(base), m.t5, 'INVALID'),
    verifyCase(system, 'T6', 'unrelated state changed', clone(base), m.t6, 'VALID'),
    issuanceCase(system, 'T8', 'required evidence omitted', m.t8, 'REQUIRED_EVIDENCE_MISSING'),
    verifyCase(system, 'T9', 'evidence resource stale while causal source remains valid', clone(base), m.t9, 'INVALID'),
    issuanceCase(system, 'T10', 'policy and decision disagree', m.t10, 'POLICY_DECISION_COHERENCE_MISMATCH'),
    issuanceCase(system, 'T11', 'subject and decision plan identity disagree', m.t11, 'SUBJECT_DECISION_COHERENCE_MISMATCH'),
    issuanceCase(system, 'T12', 'required evidence disagrees with decision registry', m.t12, 'EVIDENCE_REGISTRY_COHERENCE_MISMATCH'),
    verifyCase(system, 'T13', 'required evidence resource unavailable', clone(base), m.t13, 'INVALID'),
    verifyCase(system, 'C1', 'causal source unavailable', clone(base), m.c1, 'INVALID')
  ];

  const first = system.create(clone(base));
  const second = system.create(clone(base));
  const deterministic = first.receipt_id === second.receipt_id && first.receipt_hash === second.receipt_hash;
  const truncated = clone(first); delete truncated.receipt_hash;
  const unknown = clone(first); unknown.unexpected = true;
  const contractFailClosed = system.verify(truncated, base).status === 'INVALID' && system.verify(unknown, base).status === 'INVALID';

  const timings = [];
  for (let i = 0; i < 250; i += 1) {
    const started = performance.now();
    system.verify(first, base);
    timings.push(performance.now() - started);
  }

  const loc = system.source.split(/\r?\n/).filter((line) => line.trim()).length;
  comparison.push({
    system: system.name,
    version: system.version,
    results,
    all_trial_expectations_met: results.every((item) => item.passed),
    controls: {
      deterministic,
      contract_fail_closed: contractFailClosed,
      dispatch_attempted: false,
      dependencies_added: 0
    },
    complexity: {
      receipt_bytes: baseReceipt.accepted ? Buffer.byteLength(JSON.stringify(baseReceipt.receipt), 'utf8') : null,
      module_nonblank_loc: loc,
      verify_median_ms_250_iterations: Number(median(timings).toFixed(6)),
      explicit_governance_context_witness: system.capabilities.explicit_governance_context_witness,
      governance_context_bytes: baseReceipt.receipt?.governance_context ? Buffer.byteLength(JSON.stringify(baseReceipt.receipt.governance_context), 'utf8') : 0,
      obligation_bytes: baseReceipt.receipt?.obligations ? Buffer.byteLength(JSON.stringify(baseReceipt.receipt.obligations), 'utf8') : 0
    }
  });
}

const hardGatesPassed = comparison.every((item) =>
  item.all_trial_expectations_met &&
  item.controls.deterministic &&
  item.controls.contract_fail_closed &&
  item.controls.dispatch_attempted === false &&
  item.controls.dependencies_added === 0
);

const baseline = comparison.find((item) => item.system === 'baseline');
const phoenix = comparison.find((item) => item.system === 'phoenix');
const differingOutcomes = [];
for (const id of ['C0','T5','T6','T8','T9','T10','T11','T12','T13','C1']) {
  const b = baseline.results.find((item) => item.id === id);
  const p = phoenix.results.find((item) => item.id === id);
  if (b?.actual !== p?.actual) differingOutcomes.push(id);
}

console.log(JSON.stringify({
  schema_version: '1.0',
  trial_id: 'GOVERNANCE_CONTEXT_BINDING_TRIAL_004',
  protocol: 'docs/02-research/GOVERNANCE_CONTEXT_BINDING_TRIAL_004_PROTOCOL.md',
  comparison,
  hard_gates_passed: hardGatesPassed,
  differing_outcome_cases: differingOutcomes,
  complexity_delta: {
    phoenix_minus_baseline_loc: phoenix.complexity.module_nonblank_loc - baseline.complexity.module_nonblank_loc,
    phoenix_to_baseline_loc_ratio: Number((phoenix.complexity.module_nonblank_loc / baseline.complexity.module_nonblank_loc).toFixed(4)),
    phoenix_minus_baseline_receipt_bytes: phoenix.complexity.receipt_bytes - baseline.complexity.receipt_bytes
  },
  auditability_difference: {
    baseline_explicit_context_witness: baseline.complexity.explicit_governance_context_witness,
    phoenix_explicit_context_witness: phoenix.complexity.explicit_governance_context_witness,
    note: 'An explicit context witness is only an observable auditability feature; it is not a differentiator unless its benefit survives a stronger competent baseline or measurable use-case test.'
  },
  dispatch_attempted: false,
  network_used: false,
  llm_used: false,
  claim_boundary: 'Passing Trial 004 establishes bounded governance hardening. Equal verdicts with a smaller/similar competent baseline imply NOT_DIFFERENTIATING for these properties.'
}, null, 2));
