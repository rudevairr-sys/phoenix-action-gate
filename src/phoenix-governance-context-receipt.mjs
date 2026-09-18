import { createHash } from 'node:crypto';

export const PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION = 'phoenix-governance-context-receipt/0.2.0';
export const GOVERNANCE_CONTEXT_RECEIPT_CONTRACT_VERSION = '0.2';

export const PHOENIX_GOVERNANCE_CONTEXT_CAPABILITIES = Object.freeze({
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
  explicit_governance_context_witness: true,
  governance_context_hashing: true,
  dispatch_available: false
});

const SUBJECT_TYPES = new Set(['ACTION', 'PLAN']);
const RECEIPT_FIELDS = new Set(['receipt_version','candidate_version','subject_type','subject_id','bindings','governance_context','receipt_id','receipt_hash']);
const BINDING_FIELDS = new Set(['subject_hash','decision_hash','policy_version','policy_artifact_hash','evidence']);
const EVIDENCE_BINDING_FIELDS = new Set(['evidence_id','artifact_hash']);
const CONTEXT_FIELDS = new Set(['subject_plan_id','decision_plan_id','decision_policy_version','bound_policy_version','required_evidence_ids','required_evidence','state_obligations','context_hash']);
const CONTEXT_EVIDENCE_FIELDS = new Set(['evidence_id','artifact_hash','resource','version','derives_from_hash']);
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

function same(a, b) {
  return sha256(a) === sha256(b);
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

function contextCore(context) {
  return {
    subject_plan_id: context.subject_plan_id,
    decision_plan_id: context.decision_plan_id,
    decision_policy_version: context.decision_policy_version,
    bound_policy_version: context.bound_policy_version,
    required_evidence_ids: context.required_evidence_ids,
    required_evidence: context.required_evidence,
    state_obligations: context.state_obligations
  };
}

function buildGovernanceContext(material) {
  const { subject_type, subject_id, subject, decision, policy_version, policy_artifact, evidence_artifacts = [], current_state } = material;
  const reasons = [];
  const details = [];

  if (!SUBJECT_TYPES.has(subject_type) || !text(subject_id) || !isObject(subject) || !isObject(decision) || !text(policy_version) || policy_artifact === undefined) {
    return { ok: false, reasons: ['CONTEXT_CONTRACT_INVALID'], details, context: null };
  }

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
  catch { return { ok: false, reasons: [...new Set([...reasons, 'EVIDENCE_CONTRACT_INVALID'])], details, context: null }; }

  const registry = isObject(decision.evidence_registry) ? decision.evidence_registry : {};
  const requiredIds = requiredEvidenceIds(decision);
  const requiredEvidence = [];
  const stateObligations = [];

  for (const evidenceId of requiredIds) {
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

    const derivesFrom = Array.isArray(artifact.derives_from) ? artifact.derives_from : null;
    if (artifact.resource !== expected.resource || artifact.version !== expected.version || !derivesFrom || !same(derivesFrom, expected.derives_from)) {
      reasons.push('EVIDENCE_REGISTRY_COHERENCE_MISMATCH');
      details.push({
        type: 'EVIDENCE_REGISTRY_COHERENCE_MISMATCH', evidence_id: evidenceId,
        expected_resource: expected.resource, observed_resource: artifact.resource ?? null,
        expected_version: expected.version, observed_version: artifact.version ?? null
      });
      continue;
    }

    requiredEvidence.push({
      evidence_id: evidenceId,
      artifact_hash: sha256(artifact),
      resource: artifact.resource,
      version: artifact.version,
      derives_from_hash: sha256(derivesFrom)
    });

    stateObligations.push({ kind: 'EVIDENCE_RESOURCE', evidence_id: evidenceId, resource: artifact.resource, expected_version: artifact.version });
    for (const source of derivesFrom) {
      if (!isObject(source) || !text(source.resource) || !text(source.version)) {
        reasons.push('EVIDENCE_LINEAGE_CONTRACT_INVALID');
        details.push({ type: 'EVIDENCE_LINEAGE_CONTRACT_INVALID', evidence_id: evidenceId });
        continue;
      }
      stateObligations.push({ kind: 'CAUSAL_SOURCE', evidence_id: evidenceId, resource: source.resource, expected_version: source.version });
    }
  }

  requiredEvidence.sort((a,b) => a.evidence_id.localeCompare(b.evidence_id));
  stateObligations.sort((a,b) => a.kind.localeCompare(b.kind) || a.evidence_id.localeCompare(b.evidence_id) || a.resource.localeCompare(b.resource) || a.expected_version.localeCompare(b.expected_version));

  if (!isObject(current_state)) {
    reasons.push('CURRENT_STATE_UNAVAILABLE');
  } else {
    for (const obligation of stateObligations) {
      if (!Object.hasOwn(current_state, obligation.resource)) {
        const type = obligation.kind === 'EVIDENCE_RESOURCE' ? 'EVIDENCE_RESOURCE_UNAVAILABLE' : 'CURRENT_STATE_UNAVAILABLE';
        reasons.push(type);
        details.push({ type, evidence_id: obligation.evidence_id, resource: obligation.resource, expected_version: obligation.expected_version, observed_version: null });
      } else if (current_state[obligation.resource] !== obligation.expected_version) {
        const type = obligation.kind === 'EVIDENCE_RESOURCE' ? 'EVIDENCE_RESOURCE_STALE' : 'CAUSAL_SOURCE_MISMATCH';
        reasons.push(type);
        details.push({ type, evidence_id: obligation.evidence_id, resource: obligation.resource, expected_version: obligation.expected_version, observed_version: current_state[obligation.resource] });
      }
    }
  }

  const context = {
    subject_plan_id: subject_type === 'PLAN' ? (subject.plan_id ?? null) : null,
    decision_plan_id: subject_type === 'PLAN' ? (decision.plan_id ?? null) : null,
    decision_policy_version: decision.policy_version ?? null,
    bound_policy_version: policy_version,
    required_evidence_ids: requiredIds,
    required_evidence: requiredEvidence,
    state_obligations: stateObligations
  };
  const context_hash = sha256(context);
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], details, context: { ...context, context_hash } };
}

function invalid(reason_codes, details = []) {
  return { status: 'INVALID', reason_codes: [...new Set(reason_codes)], details, candidate_version: PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION, capabilities: PHOENIX_GOVERNANCE_CONTEXT_CAPABILITIES, dispatch_attempted: false };
}

function receiptCore(material, governanceContext) {
  return {
    receipt_version: GOVERNANCE_CONTEXT_RECEIPT_CONTRACT_VERSION,
    candidate_version: PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION,
    subject_type: material.subject_type,
    subject_id: material.subject_id,
    bindings: {
      subject_hash: sha256(material.subject),
      decision_hash: sha256(material.decision),
      policy_version: material.policy_version,
      policy_artifact_hash: sha256(material.policy_artifact),
      evidence: normalizeEvidence(material.evidence_artifacts ?? [])
    },
    governance_context: governanceContext
  };
}

function validateReceipt(receipt) {
  if (!only(receipt, RECEIPT_FIELDS) || receipt.receipt_version !== GOVERNANCE_CONTEXT_RECEIPT_CONTRACT_VERSION || receipt.candidate_version !== PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION) return false;
  if (!SUBJECT_TYPES.has(receipt.subject_type) || !text(receipt.subject_id) || !text(receipt.receipt_id) || !text(receipt.receipt_hash)) return false;
  if (!only(receipt.bindings, BINDING_FIELDS) || !text(receipt.bindings.subject_hash) || !text(receipt.bindings.decision_hash) || !text(receipt.bindings.policy_version) || !text(receipt.bindings.policy_artifact_hash) || !Array.isArray(receipt.bindings.evidence)) return false;
  const seenEvidence = new Set();
  for (const item of receipt.bindings.evidence) {
    if (!only(item, EVIDENCE_BINDING_FIELDS) || !text(item.evidence_id) || !text(item.artifact_hash) || seenEvidence.has(item.evidence_id)) return false;
    seenEvidence.add(item.evidence_id);
  }

  const context = receipt.governance_context;
  if (!only(context, CONTEXT_FIELDS) || !Array.isArray(context.required_evidence_ids) || !Array.isArray(context.required_evidence) || !Array.isArray(context.state_obligations) || !text(context.bound_policy_version) || !text(context.decision_policy_version) || !text(context.context_hash)) return false;
  if (context.subject_plan_id !== null && !text(context.subject_plan_id)) return false;
  if (context.decision_plan_id !== null && !text(context.decision_plan_id)) return false;
  for (const id of context.required_evidence_ids) if (!text(id)) return false;
  for (const item of context.required_evidence) {
    if (!only(item, CONTEXT_EVIDENCE_FIELDS) || !text(item.evidence_id) || !text(item.artifact_hash) || !text(item.resource) || !text(item.version) || !text(item.derives_from_hash)) return false;
  }
  const obligationSeen = new Set();
  for (const item of context.state_obligations) {
    if (!only(item, OBLIGATION_FIELDS) || !OBLIGATION_KINDS.has(item.kind) || !text(item.evidence_id) || !text(item.resource) || !text(item.expected_version)) return false;
    const key = `${item.kind}\u0000${item.evidence_id}\u0000${item.resource}\u0000${item.expected_version}`;
    if (obligationSeen.has(key)) return false;
    obligationSeen.add(key);
  }
  if (sha256(contextCore(context)) !== context.context_hash) return false;
  return true;
}

function coreFromReceipt(receipt) {
  return { receipt_version: receipt.receipt_version, candidate_version: receipt.candidate_version, subject_type: receipt.subject_type, subject_id: receipt.subject_id, bindings: receipt.bindings, governance_context: receipt.governance_context };
}

export function createPhoenixGovernanceContextReceipt(material) {
  const built = buildGovernanceContext(material);
  if (!built.ok) throw new TypeError(`${built.reasons[0]}${built.details[0]?.evidence_id ? `: ${built.details[0].evidence_id}` : ''}`);
  const value = receiptCore(material, built.context);
  const receipt_hash = sha256(value);
  return { ...value, receipt_id: `phoenix-governance-context-${receipt_hash.slice(0,16)}`, receipt_hash };
}

export function verifyPhoenixGovernanceContextReceipt(receipt, material) {
  if (!validateReceipt(receipt)) return invalid(['RECEIPT_CONTRACT_INVALID']);
  const expectedHash = sha256(coreFromReceipt(receipt));
  if (receipt.receipt_hash !== expectedHash || receipt.receipt_id !== `phoenix-governance-context-${expectedHash.slice(0,16)}`) return invalid(['RECEIPT_INTEGRITY_MISMATCH']);

  const reasons = [];
  if (receipt.subject_type !== material.subject_type || receipt.subject_id !== material.subject_id || !isObject(material.subject) || sha256(material.subject) !== receipt.bindings.subject_hash) reasons.push('SUBJECT_BINDING_MISMATCH');
  if (!isObject(material.decision) || sha256(material.decision) !== receipt.bindings.decision_hash) reasons.push('DECISION_BINDING_MISMATCH');
  if (material.policy_version !== receipt.bindings.policy_version || material.policy_artifact === undefined || sha256(material.policy_artifact) !== receipt.bindings.policy_artifact_hash) reasons.push('POLICY_BINDING_MISMATCH');

  let evidence = [];
  try { evidence = normalizeEvidence(material.evidence_artifacts ?? []); } catch { reasons.push('EVIDENCE_BINDING_MISMATCH'); }
  if (!same(evidence, receipt.bindings.evidence)) reasons.push('EVIDENCE_BINDING_MISMATCH');

  const built = buildGovernanceContext(material);
  reasons.push(...built.reasons);
  if (!built.context || built.context.context_hash !== receipt.governance_context.context_hash || !same(contextCore(built.context), contextCore(receipt.governance_context))) reasons.push('GOVERNANCE_CONTEXT_MISMATCH');

  if (reasons.length) return invalid(reasons, built.details);
  return {
    status: 'VALID',
    reason_codes: ['GOVERNANCE_CONTEXT_VALID'],
    details: [],
    candidate_version: PHOENIX_GOVERNANCE_CONTEXT_RECEIPT_VERSION,
    capabilities: PHOENIX_GOVERNANCE_CONTEXT_CAPABILITIES,
    governance_context_hash: receipt.governance_context.context_hash,
    receipt_id: receipt.receipt_id,
    receipt_hash: receipt.receipt_hash,
    dispatch_attempted: false
  };
}
