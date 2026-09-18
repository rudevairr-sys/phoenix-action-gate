import { readFile } from 'node:fs/promises';
import { evaluateActionPlan } from '../src/plan-gate.mjs';
import {
  createLineageAwareReceipt,
  verifyLineageAwareReceipt
} from '../src/lineage-aware-receipt-baseline.mjs';
import {
  createPhoenixEvidenceReceipt,
  verifyPhoenixEvidenceReceipt
} from '../src/phoenix-evidence-receipt.mjs';

const clone = (value) => structuredClone(value);

const fixture = JSON.parse(await readFile(new URL('../fixtures/receipt-tamper-trial-001.json', import.meta.url), 'utf8'));
const policyArtifact = await readFile(new URL('../src/plan-gate.mjs', import.meta.url), 'utf8');
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
    name: 'B1',
    version: 'lineage-aware-receipt-baseline/0.2.0',
    create: createLineageAwareReceipt,
    verify: verifyLineageAwareReceipt
  },
  {
    name: 'Phoenix',
    version: 'phoenix-evidence-receipt/0.1.0',
    create: createPhoenixEvidenceReceipt,
    verify: verifyPhoenixEvidenceReceipt
  }
];

function safeCreate(system, material) {
  try {
    return { accepted: true, receipt: system.create(material), error: null };
  } catch (error) {
    return { accepted: false, receipt: null, error: String(error?.message ?? error) };
  }
}

function safeVerify(system, receipt, material) {
  if (!receipt) return { status: 'NOT_ISSUED', reason_codes: [], details: [] };
  try {
    const result = system.verify(receipt, material);
    return {
      status: result.status,
      reason_codes: result.reason_codes ?? [],
      details: result.details ?? []
    };
  } catch (error) {
    return { status: 'VERIFY_ERROR', reason_codes: [], details: [], error: String(error?.message ?? error) };
  }
}

function classify(createResult, verifyResult) {
  if (!createResult.accepted) return 'REFUTED_STATIC_HYPOTHESIS';
  if (verifyResult.status === 'INVALID') return 'REFUTED_STATIC_HYPOTHESIS';
  if (verifyResult.status === 'VALID') return 'COUNTEREXAMPLE';
  return 'ERROR';
}

const results = [];

for (const system of systems) {
  // C0 — intact fixture remains valid.
  const c0Create = safeCreate(system, clone(base));
  const c0Verify = safeVerify(system, c0Create.receipt, clone(base));
  results.push({
    id: 'C0',
    system: system.name,
    version: system.version,
    intent: 'intact fixture must remain valid',
    issuance_accepted: c0Create.accepted,
    issuance_error: c0Create.error,
    verify: c0Verify,
    control_passed: c0Create.accepted && c0Verify.status === 'VALID'
  });

  // T8 — omit all evidence even though the frozen decision requires generated-evidence-v2.
  const t8 = clone(base);
  t8.evidence_artifacts = [];
  const t8Create = safeCreate(system, t8);
  const t8Verify = safeVerify(system, t8Create.receipt, t8);
  results.push({
    id: 'T8_EVIDENCE_OMISSION',
    system: system.name,
    version: system.version,
    intended_safe_behavior: 'REJECT_ISSUANCE_OR_INVALID',
    decision_required_evidence: decision.steps.flatMap((step) => step.required_evidence ?? []),
    decision_evidence_registry_ids: Object.keys(decision.evidence_registry ?? {}),
    supplied_evidence_ids: [],
    issuance_accepted: t8Create.accepted,
    issuance_error: t8Create.error,
    verify: t8Verify,
    classification: classify(t8Create, t8Verify)
  });

  // T9 — evidence snapshot stays v2 and its causal source stays v2, but the evidenced resource is now v3.
  const t9CreateMaterial = clone(base);
  const t9Create = safeCreate(system, t9CreateMaterial);
  const t9VerifyMaterial = clone(base);
  t9VerifyMaterial.current_state['generated.md'] = 'sha256:generated-v3';
  const t9Verify = safeVerify(system, t9Create.receipt, t9VerifyMaterial);
  results.push({
    id: 'T9_EVIDENCE_SELF_STALE',
    system: system.name,
    version: system.version,
    intended_safe_behavior: 'INVALID',
    evidence_resource: 'generated.md',
    bound_evidence_version: 'sha256:generated-v2',
    current_evidence_resource_version: 'sha256:generated-v3',
    causal_source_resource: 'config.json',
    causal_source_version_unchanged: 'sha256:config-v2',
    issuance_accepted: t9Create.accepted,
    issuance_error: t9Create.error,
    verify: t9Verify,
    classification: classify(t9Create, t9Verify)
  });

  // T10 — decision says policy A while receipt input consistently declares policy B.
  const t10 = clone(base);
  t10.policy_version = 'phoenix-plan-gate/0.3.0-mismatched-context';
  const t10Create = safeCreate(system, t10);
  const t10Verify = safeVerify(system, t10Create.receipt, t10);
  results.push({
    id: 'T10_POLICY_DECISION_COHERENCE',
    system: system.name,
    version: system.version,
    intended_safe_behavior: 'REJECT_ISSUANCE_OR_INVALID',
    decision_policy_version: decision.policy_version,
    supplied_policy_version: t10.policy_version,
    same_policy_artifact_bytes_as_base: true,
    issuance_accepted: t10Create.accepted,
    issuance_error: t10Create.error,
    verify: t10Verify,
    classification: classify(t10Create, t10Verify)
  });
}

const controls = results.filter((item) => item.id === 'C0');
const trials = results.filter((item) => item.id !== 'C0');
const controlPassed = controls.every((item) => item.control_passed);
const counterexamples = trials.filter((item) => item.classification === 'COUNTEREXAMPLE');
const byTrial = Object.fromEntries(
  ['T8_EVIDENCE_OMISSION','T9_EVIDENCE_SELF_STALE','T10_POLICY_DECISION_COHERENCE'].map((id) => {
    const pair = trials.filter((item) => item.id === id);
    const classes = pair.map((item) => item.classification);
    let aggregate = 'MIXED';
    if (classes.every((value) => value === 'COUNTEREXAMPLE')) aggregate = 'COMMON_GOVERNANCE_GAP / NOT_DIFFERENTIATING';
    else if (classes.every((value) => value === 'REFUTED_STATIC_HYPOTHESIS')) aggregate = 'STATIC_HYPOTHESIS_REFUTED';
    else if (pair.find((item) => item.system === 'Phoenix')?.classification === 'COUNTEREXAMPLE' && pair.find((item) => item.system === 'B1')?.classification === 'REFUTED_STATIC_HYPOTHESIS') aggregate = 'PHOENIX_COUNTEREXAMPLE / PROMOTION_BLOCKED';
    else if (pair.find((item) => item.system === 'Phoenix')?.classification === 'REFUTED_STATIC_HYPOTHESIS' && pair.find((item) => item.system === 'B1')?.classification === 'COUNTEREXAMPLE') aggregate = 'CANDIDATE_DIFFERENTIATOR_REQUIRES_NEW_BASELINE';
    return [id, aggregate];
  })
);

console.log(JSON.stringify({
  schema_version: '1.0',
  trial_id: 'GOVERNANCE_CONTEXT_GAP_TRIAL_003',
  protocol: 'docs/02-research/GOVERNANCE_CONTEXT_GAP_TRIAL_003_PROTOCOL.md',
  systems_frozen: systems.map(({ name, version }) => ({ name, version })),
  controls_passed: controlPassed,
  results,
  aggregate_by_trial: byTrial,
  counterexample_count: counterexamples.length,
  dispatch_attempted: false,
  network_used: false,
  llm_used: false,
  claim_boundary: 'T8-T10 are correctness/governance controls. A common gap is not a Phoenix differentiator. Do not patch either frozen system until this output is preserved.'
}, null, 2));
