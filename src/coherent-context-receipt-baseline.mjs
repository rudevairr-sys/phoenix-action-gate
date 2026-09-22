import { createHash } from 'node:crypto';

export const COHERENT_CONTEXT_BASELINE_VERSION = 'coherent-context-receipt-baseline/0.1.0';
export const COHERENT_CONTEXT_RECEIPT_VERSION = '0.1';

export const COHERENT_CONTEXT_BASELINE_CAPABILITIES = Object.freeze({
  canonical_hashing: true,
  subject_binding: true,
  decision_binding: true,
  policy_artifact_binding: true,
  required_evidence_completeness: true,
  evidence_registry_coherence: true,
  evidence_resource_freshness: true,
  causal_source_binding: true,
  policy_decision_coherence: true,
  subject_decision_coherence: true,
  explicit_governance_context_witness: false,
  dispatch_available: false
});

const SUBJECT_TYPES = new Set(['ACTION', 'PLAN']);
const RECEIPT_FIELDS = new Set(['receipt_version','baseline_version','subject_type','subject_id','bindings','obligations','receipt_id','receipt_hash']);
const BINDING_FIELDS = new Set(['subject_hash','decision_hash','policy_version','policy_artifact_hash','evidence']);
const EVIDENCE_FIELDS = new Set(['evidence_id','artifact_hash']);
const OBLIGATION_FIELDS = new Set(['kind','evidence_id','resource','expected_version']);
const OBLIGATION_KINDS = new Set(['EVIDENCE_RESOURCE','CAUSAL_SOURCE']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function only(value, fields) {
  return isObject(value) && Object.keys(value).every((key) => fields.has(key));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function same(valueA, valueB) {
  return sha256(valueA) === sha256(valueB);
}

function normalizeEvidence(items) {
  if (!Array.isArray(items)) throw new TypeError('evidence_artifacts must be an array');
  const seen = new Set();
  return items.map((item) => {
    if (!isObject(item) || !text(item.evidence_id) || !isObject(item.artifact)) throw new TypeError('each evidence artifact requires evidence_id and artifact');
    if (seen.has(item.evidence_id)) throw new TypeError('duplicate evidence_id');
    seen.add(item.evidence_id);
    return { evidence_id: item.evidence_id, artifact_hash: sha256(item.artifact) };
  }).sort((a,b) => a.evidence_id.localeCompare(b.evidence_id));
}

function evidenceById(items) {
  if (!Array.isArray(items)) throw new TypeError('evidence_artifacts must be an array');
  const map = new Map();
  for (const item of items) {
    if (!isObject(item) || !text(item.evidence_id) || !isObject(item.artifact)) throw new TypeError('each evidence artifact requires evidence_id and artifact');
    if (map.has(item.evidence_id)) throw new TypeError('duplicate evidence_id');
    map.set(item.evidence_id, item.artifact);
  }
  return map;
}

function requiredEvidenceIds(decision) {
  if (!isObject(decision) || !Array.isArray(decision.steps)) return [];
  return [...new Set(decision.steps.flatMap((step) => Array.isArray(step?.required_evidence) ? step.required_evidence : []).filter(text))].sort();
}

function contextCheck(material) {
  const { subject_type, subject_id, subject, decision, policy_version, policy_artifact, evidence_artifacts = [], current_state } = material;
  const reasons = [];
  const details = [];

  if (!SUBJECT_TYPES.has(subject_type) || !text(subject_id) || !isObject(subject) || !isObject(decision) || !text(policy_version) || policy_artifact === undefined) {
    return { ok: false, reasons: ['CONTEXT_CONTRACT_INVALID'], details, obligations: [] };
  }
  if (!isObject(current_state)) reasons.push('CURRENT_STATE_UNAVAILABLE');

  if (subject_type === 'PLAN' && (!text(subject.plan_id) || decision.plan_id !== subject.plan_id || subject_id !== subject.plan_id)) {
    reasons.push('SUBJECT_DECISION_COHERENCE_MISMATCH');
    details.push({ type: 'SUBJECT_DECISION_COHERENCE_MISMATCH', subject_plan_id: subject.plan_id ?? null, decision_plan_id: decision.plan_id ?? null });
  }

  if (!text(decision.policy_version) || decision.policy_version !== policy_version) {
    reasons.push('POLICY_DECISION_COHERENCE_MISMATCH');
    details.push({ type: 'POLICY_DECISION_COHERENCE_MISMATCH', decision_policy_version: decision.policy_version ?? null, bound_policy_version: policy_version });
  }

  let provided;
  try { provided = evidenceById(evidence_artifacts); }
  catch { return { ok: false, reasons: [...reasons, 'EVIDENCE_CONTRACT_INVALID'], details, obligations: [] }; }

  const registry = isObject(decision.evidence_registry) ? decision.evidence_registry : {};
  const required = requiredEvidenceIds(decision);
  const obligations = [];

  for (const evidenceId of required) {
    const artifact = provided.get(evidenceId);
    if (!artifact) {
      reasons.push('REQUIRED_EVIDENCE_MISSING');
      details.push({ type: 'REQUIRED_EVIDENCE_MISSING', evidence_id: evidenceId });
      continue;
    }

    const expected = registry[evidenceId];
    if (!isObject(expected) || !text(expected.resource) || !text(expected.version) || !Array.isArray(expected.derives_from)) {
      reasons.push('DECISION_EVIDENCE_REGISTRY_INVALID');
      details.push({ type: 'DECISION_EVIDENCE_REGISTRY_INVALID', evidence_id: evidenceId });
      continue;
    }

    const actualDerives = Array.isArray(artifact.derives_from) ? artifact.derives_from : null;
    if (artifact.resource !== expected.resource || artifact.version !== expected.version || !actualDerives || !same(actualDerives, expected.derives_from)) {
      reasons.push('EVIDENCE_REGISTRY_COHERENCE_MISMATCH');
      details.push({
        type: 'EVIDENCE_REGISTRY_COHERENCE_MISMATCH', evidence_id: evidenceId,
        expected_resource: expected.resource, observed_resource: artifact.resource ?? null,
        expected_version: expected.version, observed_version: artifact.version ?? null
      });
      continue;
    }

    obligations.push({ kind: 'EVIDENCE_RESOURCE', evidence_id: evidenceId, resource: artifact.resource, expected_version: artifact.version });
    for (const source of actualDerives) {
      if (!isObject(source) || !text(source.resource) || !text(source.version)) {
        reasons.push('EVIDENCE_LINEAGE_CONTRACT_INVALID');
        details.push({ type: 'EVIDENCE_LINEAGE_CONTRACT_INVALID', evidence_id: evidenceId });
        continue;
      }
      obligations.push({ kind: 'CAUSAL_SOURCE', evidence_id: evidenceId, resource: source.resource, expected_version: source.version });
    }
  }

  obligations.sort((a,b) => a.kind.localeCompare(b.kind) || a.evidence_id.localeCompare(b.evidence_id) || a.resource.localeCompare(b.resource) || a.expected_version.localeCompare(b.expected_version));

  if (isObject(current_state)) {
    for (const obligation of obligations) {
      if (!Object.hasOwn(current_state, obligation.resource)) {
        reasons.push(obligation.kind === 'EVIDENCE_RESOURCE' ? 'EVIDENCE_RESOURCE_UNAVAILABLE' : 'CURRENT_STATE_UNAVAILABLE');
        details.push({ type: obligation.kind === 'EVIDENCE_RESOURCE' ? 'EVIDENCE_RESOURCE_UNAVAILABLE' : 'CURRENT_STATE_UNAVAILABLE', evidence_id: obligation.evidence_id, resource: obligation.resource, expected_version: obligation.expected_version, observed_version: null });
      } else if (current_state[obligation.resource] !== obligation.expected_version) {
        const type = obligation.kind === 'EVIDENCE_RESOURCE' ? 'EVIDENCE_RESOURCE_STALE' : 'CAUSAL_SOURCE_MISMATCH';
        reasons.push(type);
        details.push({ type, evidence_id: obligation.evidence_id, resource: obligation.resource, expected_version: obligation.expected_version, observed_version: current_state[obligation.resource] });
      }
    }
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], details, obligations };
}

function invalid(reason_codes, details = []) {
  return { status: 'INVALID', reason_codes: [...new Set(reason_codes)], details, baseline_version: COHERENT_CONTEXT_BASELINE_VERSION, capabilities: COHERENT_CONTEXT_BASELINE_CAPABILITIES, dispatch_attempted: false };
}

function core(material, obligations) {
  return {
    receipt_version: COHERENT_CONTEXT_RECEIPT_VERSION,
    baseline_version: COHERENT_CONTEXT_BASELINE_VERSION,
    subject_type: material.subject_type,
    subject_id: material.subject_id,
    bindings: {
      subject_hash: sha256(material.subject),
      decision_hash: sha256(material.decision),
      policy_version: material.policy_version,
      policy_artifact_hash: sha256(material.policy_artifact),
      evidence: normalizeEvidence(material.evidence_artifacts ?? [])
    },
    obligations
  };
}

function validReceipt(receipt) {
  if (!only(receipt, RECEIPT_FIELDS) || receipt.receipt_version !== COHERENT_CONTEXT_RECEIPT_VERSION || receipt.baseline_version !== COHERENT_CONTEXT_BASELINE_VERSION) return false;
  if (!SUBJECT_TYPES.has(receipt.subject_type) || !text(receipt.subject_id) || !text(receipt.receipt_id) || !text(receipt.receipt_hash)) return false;
  if (!only(receipt.bindings, BINDING_FIELDS) || !text(receipt.bindings.subject_hash) || !text(receipt.bindings.decision_hash) || !text(receipt.bindings.policy_version) || !text(receipt.bindings.policy_artifact_hash) || !Array.isArray(receipt.bindings.evidence) || !Array.isArray(receipt.obligations)) return false;
  const evidenceSeen = new Set();
  for (const item of receipt.bindings.evidence) {
    if (!only(item, EVIDENCE_FIELDS) || !text(item.evidence_id) || !text(item.artifact_hash) || evidenceSeen.has(item.evidence_id)) return false;
    evidenceSeen.add(item.evidence_id);
  }
  const obligationSeen = new Set();
  for (const item of receipt.obligations) {
    if (!only(item, OBLIGATION_FIELDS) || !OBLIGATION_KINDS.has(item.kind) || !text(item.evidence_id) || !text(item.resource) || !text(item.expected_version)) return false;
    const key = `${item.kind}\u0000${item.evidence_id}\u0000${item.resource}\u0000${item.expected_version}`;
    if (obligationSeen.has(key)) return false;
    obligationSeen.add(key);
  }
  return true;
}

function coreFromReceipt(receipt) {
  return { receipt_version: receipt.receipt_version, baseline_version: receipt.baseline_version, subject_type: receipt.subject_type, subject_id: receipt.subject_id, bindings: receipt.bindings, obligations: receipt.obligations };
}

export function createCoherentContextReceipt(material) {
  const check = contextCheck(material);
  if (!check.ok) throw new TypeError(`${check.reasons[0]}${check.details[0]?.evidence_id ? `: ${check.details[0].evidence_id}` : ''}`);
  const value = core(material, check.obligations);
  const receipt_hash = sha256(value);
  return { ...value, receipt_id: `coherent-context-receipt-${receipt_hash.slice(0,16)}`, receipt_hash };
}

export function verifyCoherentContextReceipt(receipt, material) {
  if (!validReceipt(receipt)) return invalid(['RECEIPT_CONTRACT_INVALID']);
  const expectedHash = sha256(coreFromReceipt(receipt));
  if (receipt.receipt_hash !== expectedHash || receipt.receipt_id !== `coherent-context-receipt-${expectedHash.slice(0,16)}`) return invalid(['RECEIPT_INTEGRITY_MISMATCH']);

  const reasons = [];
  if (receipt.subject_type !== material.subject_type || receipt.subject_id !== material.subject_id || !isObject(material.subject) || sha256(material.subject) !== receipt.bindings.subject_hash) reasons.push('SUBJECT_BINDING_MISMATCH');
  if (!isObject(material.decision) || sha256(material.decision) !== receipt.bindings.decision_hash) reasons.push('DECISION_BINDING_MISMATCH');
  if (material.policy_version !== receipt.bindings.policy_version || material.policy_artifact === undefined || sha256(material.policy_artifact) !== receipt.bindings.policy_artifact_hash) reasons.push('POLICY_BINDING_MISMATCH');
  let evidence = [];
  try { evidence = normalizeEvidence(material.evidence_artifacts ?? []); } catch { reasons.push('EVIDENCE_BINDING_MISMATCH'); }
  if (!same(evidence, receipt.bindings.evidence)) reasons.push('EVIDENCE_BINDING_MISMATCH');

  const check = contextCheck(material);
  reasons.push(...check.reasons);
  if (!same(check.obligations, receipt.obligations)) reasons.push('CONTEXT_OBLIGATION_MISMATCH');

  if (reasons.length) return invalid(reasons, check.details);
  return { status: 'VALID', reason_codes: ['COHERENT_CONTEXT_VALID'], details: [], baseline_version: COHERENT_CONTEXT_BASELINE_VERSION, capabilities: COHERENT_CONTEXT_BASELINE_CAPABILITIES, receipt_id: receipt.receipt_id, receipt_hash: receipt.receipt_hash, dispatch_attempted: false };
}
