import { createHash } from 'node:crypto';

export const PHOENIX_EVIDENCE_RECEIPT_VERSION = 'phoenix-evidence-receipt/0.1.0';
export const RECEIPT_CONTRACT_VERSION = '0.1';

export const PHOENIX_EVIDENCE_RECEIPT_CAPABILITIES = Object.freeze({
  canonical_hashing: true,
  subject_binding: true,
  decision_binding: true,
  policy_artifact_binding: true,
  explicit_evidence_binding: true,
  causal_source_binding: true,
  current_state_reasoning: true,
  evidence_lineage_reasoning: true,
  dispatch_available: false
});

const SUBJECT_TYPES = new Set(['ACTION', 'PLAN']);
const RECEIPT_FIELDS = new Set([
  'receipt_version',
  'candidate_version',
  'subject_type',
  'subject_id',
  'bindings',
  'causal_obligations',
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
const OBLIGATION_FIELDS = new Set(['evidence_id', 'source_resource', 'expected_source_version']);

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

function extractCausalObligations(evidenceArtifacts) {
  if (!Array.isArray(evidenceArtifacts)) throw new TypeError('evidence_artifacts must be an array');

  const obligations = [];
  for (const item of evidenceArtifacts) {
    if (!isObject(item) || !isNonEmptyString(item.evidence_id) || !Object.hasOwn(item, 'artifact')) {
      throw new TypeError('each evidence artifact requires evidence_id and artifact');
    }

    const derivesFrom = item.artifact?.derives_from;
    if (derivesFrom === undefined) continue;
    if (!Array.isArray(derivesFrom)) throw new TypeError('derives_from must be an array when present');

    for (const source of derivesFrom) {
      if (!isObject(source) || !isNonEmptyString(source.resource) || !isNonEmptyString(source.version)) {
        throw new TypeError('each derives_from entry requires resource and version');
      }
      obligations.push({
        evidence_id: item.evidence_id,
        source_resource: source.resource,
        expected_source_version: source.version
      });
    }
  }

  obligations.sort((a, b) => {
    const evidenceOrder = a.evidence_id.localeCompare(b.evidence_id);
    if (evidenceOrder !== 0) return evidenceOrder;
    const resourceOrder = a.source_resource.localeCompare(b.source_resource);
    if (resourceOrder !== 0) return resourceOrder;
    return a.expected_source_version.localeCompare(b.expected_source_version);
  });

  return obligations;
}

function receiptCore({ subjectType, subjectId, subject, decision, policyVersion, policyArtifact, evidenceArtifacts }) {
  if (!SUBJECT_TYPES.has(subjectType)) throw new TypeError('subject_type must be ACTION or PLAN');
  if (!isNonEmptyString(subjectId)) throw new TypeError('subject_id is required');
  if (!isObject(subject)) throw new TypeError('subject must be an object');
  if (!isObject(decision)) throw new TypeError('decision must be an object');
  if (!isNonEmptyString(policyVersion)) throw new TypeError('policy_version is required');
  if (policyArtifact === undefined) throw new TypeError('policy_artifact is required');

  return {
    receipt_version: RECEIPT_CONTRACT_VERSION,
    candidate_version: PHOENIX_EVIDENCE_RECEIPT_VERSION,
    subject_type: subjectType,
    subject_id: subjectId,
    bindings: {
      subject_hash: sha256(subject),
      decision_hash: sha256(decision),
      policy_version: policyVersion,
      policy_artifact_hash: sha256(policyArtifact),
      evidence: normalizeEvidenceArtifacts(evidenceArtifacts)
    },
    causal_obligations: extractCausalObligations(evidenceArtifacts)
  };
}

function invalid(reasonCodes, details = []) {
  return {
    status: 'INVALID',
    reason_codes: [...new Set(reasonCodes)],
    details,
    candidate_version: PHOENIX_EVIDENCE_RECEIPT_VERSION,
    capabilities: PHOENIX_EVIDENCE_RECEIPT_CAPABILITIES,
    dispatch_attempted: false
  };
}

function validateReceiptContract(receipt) {
  if (!hasOnlyFields(receipt, RECEIPT_FIELDS)) return false;
  if (receipt.receipt_version !== RECEIPT_CONTRACT_VERSION) return false;
  if (receipt.candidate_version !== PHOENIX_EVIDENCE_RECEIPT_VERSION) return false;
  if (!SUBJECT_TYPES.has(receipt.subject_type)) return false;
  if (!isNonEmptyString(receipt.subject_id)) return false;
  if (!isNonEmptyString(receipt.receipt_id) || !isNonEmptyString(receipt.receipt_hash)) return false;
  if (!hasOnlyFields(receipt.bindings, BINDING_FIELDS)) return false;
  if (!isNonEmptyString(receipt.bindings.subject_hash)) return false;
  if (!isNonEmptyString(receipt.bindings.decision_hash)) return false;
  if (!isNonEmptyString(receipt.bindings.policy_version)) return false;
  if (!isNonEmptyString(receipt.bindings.policy_artifact_hash)) return false;
  if (!Array.isArray(receipt.bindings.evidence)) return false;
  if (!Array.isArray(receipt.causal_obligations)) return false;

  const evidenceIds = new Set();
  for (const item of receipt.bindings.evidence) {
    if (!hasOnlyFields(item, EVIDENCE_BINDING_FIELDS)) return false;
    if (!isNonEmptyString(item.evidence_id) || !isNonEmptyString(item.artifact_hash)) return false;
    if (evidenceIds.has(item.evidence_id)) return false;
    evidenceIds.add(item.evidence_id);
  }

  const obligationKeys = new Set();
  for (const item of receipt.causal_obligations) {
    if (!hasOnlyFields(item, OBLIGATION_FIELDS)) return false;
    if (!isNonEmptyString(item.evidence_id) || !isNonEmptyString(item.source_resource) || !isNonEmptyString(item.expected_source_version)) return false;
    if (!evidenceIds.has(item.evidence_id)) return false;
    const key = `${item.evidence_id}\u0000${item.source_resource}\u0000${item.expected_source_version}`;
    if (obligationKeys.has(key)) return false;
    obligationKeys.add(key);
  }

  return true;
}

function coreFromReceipt(receipt) {
  return {
    receipt_version: receipt.receipt_version,
    candidate_version: receipt.candidate_version,
    subject_type: receipt.subject_type,
    subject_id: receipt.subject_id,
    bindings: receipt.bindings,
    causal_obligations: receipt.causal_obligations
  };
}

function causalObligationsMatch(receipt, evidenceArtifacts) {
  try {
    return sha256(receipt.causal_obligations) === sha256(extractCausalObligations(evidenceArtifacts));
  } catch {
    return false;
  }
}

export function createPhoenixEvidenceReceipt({
  subject_type: subjectType,
  subject_id: subjectId,
  subject,
  decision,
  policy_version: policyVersion,
  policy_artifact: policyArtifact,
  evidence_artifacts: evidenceArtifacts = [],
  current_state: currentState = null
}) {
  if (!isObject(currentState)) throw new TypeError('current_state must be an object');

  const core = receiptCore({
    subjectType,
    subjectId,
    subject,
    decision,
    policyVersion,
    policyArtifact,
    evidenceArtifacts
  });

  for (const obligation of core.causal_obligations) {
    if (!Object.hasOwn(currentState, obligation.source_resource)) {
      throw new TypeError(`current_state missing causal source: ${obligation.source_resource}`);
    }
    if (currentState[obligation.source_resource] !== obligation.expected_source_version) {
      throw new TypeError(`current_state does not satisfy causal source: ${obligation.source_resource}`);
    }
  }

  const receiptHash = sha256(core);
  return {
    ...core,
    receipt_id: `phoenix-evidence-receipt-${receiptHash.slice(0, 16)}`,
    receipt_hash: receiptHash
  };
}

export function verifyPhoenixEvidenceReceipt(receipt, {
  subject_type: subjectType,
  subject_id: subjectId,
  subject,
  decision,
  policy_version: policyVersion,
  policy_artifact: policyArtifact,
  evidence_artifacts: evidenceArtifacts = [],
  current_state: currentState = null
}) {
  if (!validateReceiptContract(receipt)) return invalid(['RECEIPT_CONTRACT_INVALID']);

  const expectedReceiptHash = sha256(coreFromReceipt(receipt));
  if (receipt.receipt_hash !== expectedReceiptHash || receipt.receipt_id !== `phoenix-evidence-receipt-${expectedReceiptHash.slice(0, 16)}`) {
    return invalid(['RECEIPT_CONTRACT_INVALID']);
  }

  const reasonCodes = [];
  const details = [];

  if (receipt.subject_type !== subjectType || receipt.subject_id !== subjectId || !isObject(subject) || sha256(subject) !== receipt.bindings.subject_hash) {
    reasonCodes.push('SUBJECT_BINDING_MISMATCH');
  }

  if (!isObject(decision) || sha256(decision) !== receipt.bindings.decision_hash) {
    reasonCodes.push('DECISION_BINDING_MISMATCH');
  }

  if (policyVersion !== receipt.bindings.policy_version || policyArtifact === undefined || sha256(policyArtifact) !== receipt.bindings.policy_artifact_hash) {
    reasonCodes.push('POLICY_BINDING_MISMATCH');
  }

  let currentEvidence = [];
  try {
    currentEvidence = normalizeEvidenceArtifacts(evidenceArtifacts);
  } catch {
    reasonCodes.push('EVIDENCE_BINDING_MISMATCH');
  }

  const currentById = new Map(currentEvidence.map((item) => [item.evidence_id, item.artifact_hash]));
  for (const expected of receipt.bindings.evidence) {
    if (currentById.get(expected.evidence_id) !== expected.artifact_hash) {
      reasonCodes.push('EVIDENCE_BINDING_MISMATCH');
    }
  }

  if (!causalObligationsMatch(receipt, evidenceArtifacts)) {
    reasonCodes.push('EVIDENCE_BINDING_MISMATCH');
  }

  if (!isObject(currentState)) {
    reasonCodes.push('CURRENT_STATE_UNAVAILABLE');
  } else {
    for (const obligation of receipt.causal_obligations) {
      if (!Object.hasOwn(currentState, obligation.source_resource)) {
        reasonCodes.push('CURRENT_STATE_UNAVAILABLE');
        details.push({
          type: 'CURRENT_STATE_UNAVAILABLE',
          evidence_id: obligation.evidence_id,
          source_resource: obligation.source_resource,
          expected_source_version: obligation.expected_source_version,
          observed_source_version: null
        });
        continue;
      }

      const observed = currentState[obligation.source_resource];
      if (observed !== obligation.expected_source_version) {
        reasonCodes.push('LINEAGE_BINDING_INVALIDATED');
        details.push({
          type: 'LINEAGE_BINDING_INVALIDATED',
          evidence_id: obligation.evidence_id,
          source_resource: obligation.source_resource,
          expected_source_version: obligation.expected_source_version,
          observed_source_version: observed
        });
      }
    }
  }

  if (reasonCodes.length > 0) return invalid(reasonCodes, details);

  return {
    status: 'VALID',
    reason_codes: ['CAUSAL_BINDINGS_VALID'],
    details: [],
    candidate_version: PHOENIX_EVIDENCE_RECEIPT_VERSION,
    capabilities: PHOENIX_EVIDENCE_RECEIPT_CAPABILITIES,
    receipt_id: receipt.receipt_id,
    receipt_hash: receipt.receipt_hash,
    dispatch_attempted: false
  };
}
