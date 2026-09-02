import { createHash } from 'node:crypto';

export const SNAPSHOT_RECEIPT_BASELINE_VERSION = 'snapshot-receipt-baseline/0.1.0';
export const SNAPSHOT_RECEIPT_VERSION = '0.1';

export const SNAPSHOT_RECEIPT_CAPABILITIES = Object.freeze({
  canonical_hashing: true,
  subject_binding: true,
  decision_binding: true,
  policy_artifact_binding: true,
  explicit_evidence_binding: true,
  current_state_input_accepted: true,
  current_state_reasoning: false,
  evidence_lineage_reasoning: false,
  dispatch_available: false
});

const RECEIPT_FIELDS = new Set([
  'receipt_version',
  'baseline_version',
  'subject_type',
  'subject_id',
  'bindings',
  'receipt_id',
  'receipt_hash'
]);

const BINDING_FIELDS = new Set([
  'subject_hash',
  'decision_hash',
  'policy_version',
  'policy_artifact_hash',
  'evidence'
]);

const EVIDENCE_BINDING_FIELDS = new Set(['evidence_id', 'artifact_hash']);
const SUBJECT_TYPES = new Set(['ACTION', 'PLAN']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasOnlyFields(value, allowed) {
  return isObject(value) && Object.keys(value).every((key) => allowed.has(key));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function normalizeEvidenceArtifacts(evidenceArtifacts) {
  if (!Array.isArray(evidenceArtifacts)) throw new TypeError('evidence_artifacts must be an array');

  const seen = new Set();
  const normalized = evidenceArtifacts.map((item) => {
    if (!isObject(item) || !isNonEmptyString(item.evidence_id) || !Object.hasOwn(item, 'artifact')) {
      throw new TypeError('each evidence artifact requires evidence_id and artifact');
    }
    if (seen.has(item.evidence_id)) throw new TypeError('duplicate evidence_id');
    seen.add(item.evidence_id);
    return {
      evidence_id: item.evidence_id,
      artifact_hash: sha256(item.artifact)
    };
  });

  return normalized.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
}

function receiptCore({ subjectType, subjectId, subject, decision, policyVersion, policyArtifact, evidenceArtifacts }) {
  if (!SUBJECT_TYPES.has(subjectType)) throw new TypeError('subject_type must be ACTION or PLAN');
  if (!isNonEmptyString(subjectId)) throw new TypeError('subject_id is required');
  if (!isObject(subject)) throw new TypeError('subject must be an object');
  if (!isObject(decision)) throw new TypeError('decision must be an object');
  if (!isNonEmptyString(policyVersion)) throw new TypeError('policy_version is required');
  if (policyArtifact === undefined) throw new TypeError('policy_artifact is required');

  return {
    receipt_version: SNAPSHOT_RECEIPT_VERSION,
    baseline_version: SNAPSHOT_RECEIPT_BASELINE_VERSION,
    subject_type: subjectType,
    subject_id: subjectId,
    bindings: {
      subject_hash: sha256(subject),
      decision_hash: sha256(decision),
      policy_version: policyVersion,
      policy_artifact_hash: sha256(policyArtifact),
      evidence: normalizeEvidenceArtifacts(evidenceArtifacts)
    }
  };
}

function invalid(reasonCodes) {
  return {
    status: 'INVALID',
    reason_codes: [...new Set(reasonCodes)],
    baseline_version: SNAPSHOT_RECEIPT_BASELINE_VERSION,
    capabilities: SNAPSHOT_RECEIPT_CAPABILITIES,
    dispatch_attempted: false
  };
}

function validateReceiptContract(receipt) {
  if (!hasOnlyFields(receipt, RECEIPT_FIELDS)) return false;
  if (receipt.receipt_version !== SNAPSHOT_RECEIPT_VERSION) return false;
  if (receipt.baseline_version !== SNAPSHOT_RECEIPT_BASELINE_VERSION) return false;
  if (!SUBJECT_TYPES.has(receipt.subject_type)) return false;
  if (!isNonEmptyString(receipt.subject_id)) return false;
  if (!isNonEmptyString(receipt.receipt_id) || !isNonEmptyString(receipt.receipt_hash)) return false;
  if (!hasOnlyFields(receipt.bindings, BINDING_FIELDS)) return false;
  if (!isNonEmptyString(receipt.bindings.subject_hash)) return false;
  if (!isNonEmptyString(receipt.bindings.decision_hash)) return false;
  if (!isNonEmptyString(receipt.bindings.policy_version)) return false;
  if (!isNonEmptyString(receipt.bindings.policy_artifact_hash)) return false;
  if (!Array.isArray(receipt.bindings.evidence)) return false;

  const seen = new Set();
  for (const item of receipt.bindings.evidence) {
    if (!hasOnlyFields(item, EVIDENCE_BINDING_FIELDS)) return false;
    if (!isNonEmptyString(item.evidence_id) || !isNonEmptyString(item.artifact_hash)) return false;
    if (seen.has(item.evidence_id)) return false;
    seen.add(item.evidence_id);
  }

  return true;
}

function coreFromReceipt(receipt) {
  return {
    receipt_version: receipt.receipt_version,
    baseline_version: receipt.baseline_version,
    subject_type: receipt.subject_type,
    subject_id: receipt.subject_id,
    bindings: receipt.bindings
  };
}

export function createSnapshotReceipt({
  subject_type: subjectType,
  subject_id: subjectId,
  subject,
  decision,
  policy_version: policyVersion,
  policy_artifact: policyArtifact,
  evidence_artifacts: evidenceArtifacts = [],
  current_state: _currentState = null
}) {
  const core = receiptCore({
    subjectType,
    subjectId,
    subject,
    decision,
    policyVersion,
    policyArtifact,
    evidenceArtifacts
  });
  const receiptHash = sha256(core);
  return {
    ...core,
    receipt_id: `snapshot-receipt-${receiptHash.slice(0, 16)}`,
    receipt_hash: receiptHash
  };
}

export function verifySnapshotReceipt(receipt, {
  subject_type: subjectType,
  subject_id: subjectId,
  subject,
  decision,
  policy_version: policyVersion,
  policy_artifact: policyArtifact,
  evidence_artifacts: evidenceArtifacts = [],
  current_state: _currentState = null
}) {
  if (!validateReceiptContract(receipt)) return invalid(['RECEIPT_CONTRACT_INVALID']);

  const expectedReceiptHash = sha256(coreFromReceipt(receipt));
  if (receipt.receipt_hash !== expectedReceiptHash || receipt.receipt_id !== `snapshot-receipt-${expectedReceiptHash.slice(0, 16)}`) {
    return invalid(['RECEIPT_INTEGRITY_MISMATCH']);
  }

  const reasonCodes = [];

  if (receipt.subject_type !== subjectType || receipt.subject_id !== subjectId || !isObject(subject) || sha256(subject) !== receipt.bindings.subject_hash) {
    reasonCodes.push('SUBJECT_BINDING_MISMATCH');
  }

  if (!isObject(decision) || sha256(decision) !== receipt.bindings.decision_hash) {
    reasonCodes.push('DECISION_BINDING_MISMATCH');
  }

  if (policyVersion !== receipt.bindings.policy_version || policyArtifact === undefined || sha256(policyArtifact) !== receipt.bindings.policy_artifact_hash) {
    reasonCodes.push('POLICY_BINDING_MISMATCH');
  }

  let currentEvidence;
  try {
    currentEvidence = normalizeEvidenceArtifacts(evidenceArtifacts);
  } catch {
    reasonCodes.push('EVIDENCE_BINDING_MISMATCH');
    currentEvidence = [];
  }

  const currentById = new Map(currentEvidence.map((item) => [item.evidence_id, item.artifact_hash]));
  for (const expected of receipt.bindings.evidence) {
    if (currentById.get(expected.evidence_id) !== expected.artifact_hash) {
      reasonCodes.push('EVIDENCE_BINDING_MISMATCH');
    }
  }

  if (reasonCodes.length > 0) return invalid(reasonCodes);

  return {
    status: 'VALID',
    reason_codes: ['SNAPSHOT_BINDINGS_VALID'],
    baseline_version: SNAPSHOT_RECEIPT_BASELINE_VERSION,
    capabilities: SNAPSHOT_RECEIPT_CAPABILITIES,
    receipt_id: receipt.receipt_id,
    receipt_hash: receipt.receipt_hash,
    dispatch_attempted: false
  };
}
