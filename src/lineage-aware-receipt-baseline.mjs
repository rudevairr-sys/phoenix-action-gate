import { createHash } from 'node:crypto';

export const LINEAGE_RECEIPT_BASELINE_VERSION = 'lineage-aware-receipt-baseline/0.2.0';
export const LINEAGE_RECEIPT_VERSION = '0.2';

export const LINEAGE_RECEIPT_CAPABILITIES = Object.freeze({
  canonical_hashing: true,
  subject_binding: true,
  decision_binding: true,
  policy_artifact_binding: true,
  explicit_evidence_binding: true,
  causal_source_binding: true,
  current_state_reasoning: true,
  evidence_lineage_reasoning: true,
  lineage_depth: 1,
  dispatch_available: false
});

const SUBJECT_TYPES = new Set(['ACTION', 'PLAN']);
const RECEIPT_FIELDS = new Set(['receipt_version','baseline_version','subject_type','subject_id','bindings','sources','receipt_id','receipt_hash']);
const BINDING_FIELDS = new Set(['subject_hash','decision_hash','policy_version','policy_artifact_hash','evidence']);
const EVIDENCE_FIELDS = new Set(['evidence_id','artifact_hash']);
const SOURCE_FIELDS = new Set(['evidence_id','resource','expected_version']);

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

function normalizeEvidence(items) {
  if (!Array.isArray(items)) throw new TypeError('evidence_artifacts must be an array');
  const seen = new Set();
  return items.map((item) => {
    if (!isObject(item) || !text(item.evidence_id) || !Object.hasOwn(item, 'artifact')) {
      throw new TypeError('each evidence artifact requires evidence_id and artifact');
    }
    if (seen.has(item.evidence_id)) throw new TypeError('duplicate evidence_id');
    seen.add(item.evidence_id);
    return { evidence_id: item.evidence_id, artifact_hash: sha256(item.artifact) };
  }).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
}

function sourceBindings(items) {
  if (!Array.isArray(items)) throw new TypeError('evidence_artifacts must be an array');
  const sources = [];
  for (const item of items) {
    if (!isObject(item) || !text(item.evidence_id) || !Object.hasOwn(item, 'artifact')) {
      throw new TypeError('each evidence artifact requires evidence_id and artifact');
    }
    const derivesFrom = item.artifact?.derives_from;
    if (derivesFrom === undefined) continue;
    if (!Array.isArray(derivesFrom)) throw new TypeError('derives_from must be an array');
    for (const source of derivesFrom) {
      if (!isObject(source) || !text(source.resource) || !text(source.version)) {
        throw new TypeError('each derives_from entry requires resource and version');
      }
      sources.push({ evidence_id: item.evidence_id, resource: source.resource, expected_version: source.version });
    }
  }
  return sources.sort((a, b) =>
    a.evidence_id.localeCompare(b.evidence_id) ||
    a.resource.localeCompare(b.resource) ||
    a.expected_version.localeCompare(b.expected_version));
}

function core(material) {
  const {
    subject_type, subject_id, subject, decision,
    policy_version, policy_artifact, evidence_artifacts = []
  } = material;
  if (!SUBJECT_TYPES.has(subject_type)) throw new TypeError('subject_type must be ACTION or PLAN');
  if (!text(subject_id)) throw new TypeError('subject_id is required');
  if (!isObject(subject)) throw new TypeError('subject must be an object');
  if (!isObject(decision)) throw new TypeError('decision must be an object');
  if (!text(policy_version)) throw new TypeError('policy_version is required');
  if (policy_artifact === undefined) throw new TypeError('policy_artifact is required');
  return {
    receipt_version: LINEAGE_RECEIPT_VERSION,
    baseline_version: LINEAGE_RECEIPT_BASELINE_VERSION,
    subject_type,
    subject_id,
    bindings: {
      subject_hash: sha256(subject),
      decision_hash: sha256(decision),
      policy_version,
      policy_artifact_hash: sha256(policy_artifact),
      evidence: normalizeEvidence(evidence_artifacts)
    },
    sources: sourceBindings(evidence_artifacts)
  };
}

function fail(reason_codes, details = []) {
  return {
    status: 'INVALID',
    reason_codes: [...new Set(reason_codes)],
    details,
    baseline_version: LINEAGE_RECEIPT_BASELINE_VERSION,
    capabilities: LINEAGE_RECEIPT_CAPABILITIES,
    dispatch_attempted: false
  };
}

function validContract(receipt) {
  if (!only(receipt, RECEIPT_FIELDS)) return false;
  if (receipt.receipt_version !== LINEAGE_RECEIPT_VERSION || receipt.baseline_version !== LINEAGE_RECEIPT_BASELINE_VERSION) return false;
  if (!SUBJECT_TYPES.has(receipt.subject_type) || !text(receipt.subject_id) || !text(receipt.receipt_id) || !text(receipt.receipt_hash)) return false;
  if (!only(receipt.bindings, BINDING_FIELDS) || !text(receipt.bindings.subject_hash) || !text(receipt.bindings.decision_hash) || !text(receipt.bindings.policy_version) || !text(receipt.bindings.policy_artifact_hash)) return false;
  if (!Array.isArray(receipt.bindings.evidence) || !Array.isArray(receipt.sources)) return false;

  const evidenceIds = new Set();
  for (const item of receipt.bindings.evidence) {
    if (!only(item, EVIDENCE_FIELDS) || !text(item.evidence_id) || !text(item.artifact_hash) || evidenceIds.has(item.evidence_id)) return false;
    evidenceIds.add(item.evidence_id);
  }

  const sourceKeys = new Set();
  for (const source of receipt.sources) {
    if (!only(source, SOURCE_FIELDS) || !text(source.evidence_id) || !text(source.resource) || !text(source.expected_version)) return false;
    if (!evidenceIds.has(source.evidence_id)) return false;
    const key = `${source.evidence_id}\u0000${source.resource}\u0000${source.expected_version}`;
    if (sourceKeys.has(key)) return false;
    sourceKeys.add(key);
  }
  return true;
}

function receiptCore(receipt) {
  return {
    receipt_version: receipt.receipt_version,
    baseline_version: receipt.baseline_version,
    subject_type: receipt.subject_type,
    subject_id: receipt.subject_id,
    bindings: receipt.bindings,
    sources: receipt.sources
  };
}

export function createLineageAwareReceipt(material) {
  const currentState = material.current_state;
  if (!isObject(currentState)) throw new TypeError('current_state must be an object');
  const value = core(material);
  for (const source of value.sources) {
    if (!Object.hasOwn(currentState, source.resource)) throw new TypeError(`current_state missing causal source: ${source.resource}`);
    if (currentState[source.resource] !== source.expected_version) throw new TypeError(`current_state does not satisfy causal source: ${source.resource}`);
  }
  const receipt_hash = sha256(value);
  return { ...value, receipt_id: `lineage-receipt-${receipt_hash.slice(0,16)}`, receipt_hash };
}

export function verifyLineageAwareReceipt(receipt, material) {
  if (!validContract(receipt)) return fail(['RECEIPT_CONTRACT_INVALID']);
  const hash = sha256(receiptCore(receipt));
  if (receipt.receipt_hash !== hash || receipt.receipt_id !== `lineage-receipt-${hash.slice(0,16)}`) {
    return fail(['RECEIPT_INTEGRITY_MISMATCH']);
  }

  const reasons = [];
  const details = [];
  const { subject_type, subject_id, subject, decision, policy_version, policy_artifact, evidence_artifacts = [], current_state } = material;

  if (receipt.subject_type !== subject_type || receipt.subject_id !== subject_id || !isObject(subject) || sha256(subject) !== receipt.bindings.subject_hash) reasons.push('SUBJECT_BINDING_MISMATCH');
  if (!isObject(decision) || sha256(decision) !== receipt.bindings.decision_hash) reasons.push('DECISION_BINDING_MISMATCH');
  if (policy_version !== receipt.bindings.policy_version || policy_artifact === undefined || sha256(policy_artifact) !== receipt.bindings.policy_artifact_hash) reasons.push('POLICY_BINDING_MISMATCH');

  let evidence = [];
  let sources = [];
  try {
    evidence = normalizeEvidence(evidence_artifacts);
    sources = sourceBindings(evidence_artifacts);
  } catch {
    reasons.push('EVIDENCE_BINDING_MISMATCH');
  }
  if (sha256(evidence) !== sha256(receipt.bindings.evidence) || sha256(sources) !== sha256(receipt.sources)) reasons.push('EVIDENCE_BINDING_MISMATCH');

  if (!isObject(current_state)) {
    reasons.push('CURRENT_STATE_UNAVAILABLE');
  } else {
    for (const source of receipt.sources) {
      if (!Object.hasOwn(current_state, source.resource)) {
        reasons.push('CURRENT_STATE_UNAVAILABLE');
        details.push({ evidence_id: source.evidence_id, resource: source.resource, expected_version: source.expected_version, observed_version: null });
        continue;
      }
      const observed = current_state[source.resource];
      if (observed !== source.expected_version) {
        reasons.push('CAUSAL_SOURCE_MISMATCH');
        details.push({ evidence_id: source.evidence_id, resource: source.resource, expected_version: source.expected_version, observed_version: observed });
      }
    }
  }

  if (reasons.length) return fail(reasons, details);
  return {
    status: 'VALID',
    reason_codes: ['LINEAGE_BINDINGS_VALID'],
    details: [],
    baseline_version: LINEAGE_RECEIPT_BASELINE_VERSION,
    capabilities: LINEAGE_RECEIPT_CAPABILITIES,
    receipt_id: receipt.receipt_id,
    receipt_hash: receipt.receipt_hash,
    dispatch_attempted: false
  };
}
