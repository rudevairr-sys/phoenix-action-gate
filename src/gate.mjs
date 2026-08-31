import { createHash } from 'node:crypto';

export const POLICY_VERSION = 'phoenix-action-gate/0.1.0';
export const DECISION_VERSION = '0.1';
export const SUPPORTED_SCHEMA_VERSION = '0.1';

const ACTION_TYPES = new Set(['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND']);
const REVERSIBILITY_KINDS = new Set(['NONE', 'INHERENT', 'ROLLBACK_PLAN']);
const SECRET_SEGMENTS = new Set(['.env', '.env.local', 'secrets', 'secret', 'credentials']);
const TOP_LEVEL_FIELDS = new Set([
  'schema_version',
  'proposal_id',
  'intent',
  'action_type',
  'target',
  'operation',
  'requested_capabilities',
  'preconditions',
  'reversibility',
  'estimated_effects',
  'model_context'
]);

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

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function relativePathIsSafe(value) {
  if (value === null) return true;
  if (!isNonEmptyString(value)) return false;
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return false;
  const segments = normalized.split('/');
  return !segments.includes('..') && !segments.includes('');
}

function targetTouchesSecret(relativePath) {
  if (!isNonEmptyString(relativePath)) return false;
  return relativePath
    .replaceAll('\\', '/')
    .toLowerCase()
    .split('/')
    .some((segment) => SECRET_SEGMENTS.has(segment) || segment.endsWith('.key') || segment.endsWith('.pem'));
}

function validateContract(proposal) {
  const failures = [];

  if (!isObject(proposal)) {
    return ['INVALID_CONTRACT'];
  }

  const extraFields = Object.keys(proposal).filter((key) => !TOP_LEVEL_FIELDS.has(key));
  if (extraFields.length > 0) failures.push('UNSUPPORTED_FIELD');
  if (proposal.schema_version !== SUPPORTED_SCHEMA_VERSION) failures.push('UNSUPPORTED_SCHEMA_VERSION');
  if (!isNonEmptyString(proposal.proposal_id)) failures.push('MISSING_PROPOSAL_ID');
  if (!isNonEmptyString(proposal.intent)) failures.push('MISSING_INTENT');
  if (!ACTION_TYPES.has(proposal.action_type)) failures.push('UNKNOWN_ACTION_TYPE');

  if (!isObject(proposal.target) || !isNonEmptyString(proposal.target.workspace_id)) {
    failures.push('INVALID_TARGET');
  } else if (!Object.hasOwn(proposal.target, 'relative_path') || !relativePathIsSafe(proposal.target.relative_path)) {
    failures.push('INVALID_TARGET_PATH');
  }

  if (!isObject(proposal.operation)) failures.push('INVALID_OPERATION');
  if (!Array.isArray(proposal.requested_capabilities) || proposal.requested_capabilities.length === 0) {
    failures.push('MISSING_CAPABILITIES');
  }
  if (!Array.isArray(proposal.preconditions)) failures.push('INVALID_PRECONDITIONS');
  if (!Array.isArray(proposal.estimated_effects)) failures.push('INVALID_ESTIMATED_EFFECTS');

  if (!isObject(proposal.reversibility) || !REVERSIBILITY_KINDS.has(proposal.reversibility.kind)) {
    failures.push('INVALID_REVERSIBILITY');
  } else if (!Object.hasOwn(proposal.reversibility, 'rollback_plan')) {
    failures.push('INVALID_REVERSIBILITY');
  }

  if (!isObject(proposal.model_context) || !isNonEmptyString(proposal.model_context.model_id)) {
    failures.push('EVIDENCE_INCOMPLETE');
  } else if (!Object.hasOwn(proposal.model_context, 'provider_request_id')) {
    failures.push('EVIDENCE_INCOMPLETE');
  }

  return [...new Set(failures)];
}

function commandAssessment(operation) {
  if (!isObject(operation) || operation.kind !== 'run_command') {
    return { allowed: false, destructive: false, reason: 'INVALID_COMMAND_OPERATION' };
  }

  const { program, args, cwd, timeout_ms: timeoutMs } = operation;
  if (!isNonEmptyString(program) || !Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
    return { allowed: false, destructive: false, reason: 'INVALID_COMMAND_OPERATION' };
  }
  if (!isNonEmptyString(cwd) || !relativePathIsSafe(cwd) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    return { allowed: false, destructive: false, reason: 'COMMAND_BOUNDS_INVALID' };
  }

  const tokens = [program, ...args].map((part) => part.toLowerCase());
  const destructiveTokens = new Set(['rm', 'rmdir', 'del', 'format', 'mkfs', 'shutdown', 'reboot']);
  const destructive = tokens.some((token) => destructiveTokens.has(token) || token.includes('--force'));
  if (destructive) return { allowed: false, destructive: true, reason: 'DESTRUCTIVE_COMMAND' };

  const exact = `${program} ${args.join(' ')}`.trim();
  const allowlisted = new Set([
    'cargo test --workspace',
    'node --test',
    'npm test'
  ]);

  return {
    allowed: allowlisted.has(exact),
    destructive: false,
    reason: allowlisted.has(exact) ? 'COMMAND_ALLOWLISTED' : 'COMMAND_NOT_ALLOWED'
  };
}

function makeDecision(proposal, outcome, riskClass, reasonCodes, checks, rollbackStatus) {
  const decisionCore = {
    decision_version: DECISION_VERSION,
    proposal_id: proposal?.proposal_id ?? 'unknown',
    outcome,
    risk_class: riskClass,
    policy_version: POLICY_VERSION,
    reason_codes: [...reasonCodes],
    checks,
    human_review_required: outcome === 'REVIEW',
    rollback_status: rollbackStatus
  };
  const decisionHash = sha256(decisionCore);

  return {
    ...decisionCore,
    decision_id: `decision-${decisionHash.slice(0, 16)}`,
    evidence_bundle_id: `evidence-${decisionHash.slice(0, 16)}`,
    decision_hash: decisionHash,
    dispatch_attempted: false
  };
}

export function evaluateActionProposal(proposal) {
  const contractFailures = validateContract(proposal);
  if (contractFailures.length > 0) {
    return makeDecision(
      proposal,
      'DENY',
      'R3',
      ['INVALID_CONTRACT', ...contractFailures],
      [{ check: 'schema_valid', status: 'FAIL', evidence_ref: contractFailures.join(',') }],
      'UNKNOWN'
    );
  }

  const checks = [
    { check: 'schema_valid', status: 'PASS', evidence_ref: proposal.schema_version }
  ];

  if (proposal.target.workspace_id !== 'demo-workspace') {
    checks.push({ check: 'target_in_scope', status: 'FAIL', evidence_ref: proposal.target.workspace_id });
    return makeDecision(proposal, 'DENY', 'R3', ['TARGET_OUT_OF_SCOPE'], checks, 'UNKNOWN');
  }
  checks.push({ check: 'target_in_scope', status: 'PASS', evidence_ref: proposal.target.workspace_id });

  if (targetTouchesSecret(proposal.target.relative_path)) {
    checks.push({ check: 'secret_boundary_clear', status: 'FAIL', evidence_ref: 'secret-like path' });
    return makeDecision(proposal, 'DENY', 'R3', ['SECRET_BOUNDARY'], checks, 'UNKNOWN');
  }
  checks.push({ check: 'secret_boundary_clear', status: 'PASS', evidence_ref: 'no secret-like path' });

  const expectedCapability = proposal.action_type;
  if (!proposal.requested_capabilities.every((capability) => ACTION_TYPES.has(capability)) ||
      !proposal.requested_capabilities.includes(expectedCapability)) {
    checks.push({ check: 'capability_known', status: 'FAIL', evidence_ref: proposal.requested_capabilities.join(',') });
    return makeDecision(proposal, 'DENY', 'R3', ['UNKNOWN_CAPABILITY'], checks, 'UNKNOWN');
  }
  checks.push({ check: 'capability_known', status: 'PASS', evidence_ref: expectedCapability });

  if (proposal.action_type === 'READ_CONTEXT') {
    const operationValid = proposal.operation.kind === 'read_file';
    checks.push({ check: 'operation_valid', status: operationValid ? 'PASS' : 'FAIL', evidence_ref: proposal.operation.kind ?? 'missing' });
    if (!operationValid) return makeDecision(proposal, 'DENY', 'R3', ['INVALID_OPERATION'], checks, 'UNKNOWN');

    checks.push({ check: 'rollback_sufficient', status: 'PASS', evidence_ref: 'INHERENT' });
    checks.push({ check: 'evidence_complete', status: 'PASS', evidence_ref: proposal.model_context.model_id });
    return makeDecision(proposal, 'PREPARED', 'R0', ['BOUNDED_READ'], checks, 'INHERENT');
  }

  if (proposal.action_type === 'WRITE_PATCH') {
    const operation = proposal.operation;
    const patchValid = operation.kind === 'write_patch' && isNonEmptyString(operation.diff) && isNonEmptyString(operation.base_version);
    checks.push({ check: 'operation_valid', status: patchValid ? 'PASS' : 'FAIL', evidence_ref: operation.kind ?? 'missing' });
    if (!patchValid) return makeDecision(proposal, 'DENY', 'R3', ['INVALID_OPERATION'], checks, 'UNKNOWN');

    const rollbackSufficient = proposal.reversibility.kind === 'ROLLBACK_PLAN' && isObject(proposal.reversibility.rollback_plan);
    checks.push({ check: 'rollback_sufficient', status: rollbackSufficient ? 'PASS' : 'FAIL', evidence_ref: proposal.reversibility.kind });
    if (!rollbackSufficient) return makeDecision(proposal, 'DENY', 'R3', ['ROLLBACK_INSUFFICIENT'], checks, 'INSUFFICIENT');

    checks.push({ check: 'evidence_complete', status: 'PASS', evidence_ref: proposal.model_context.model_id });
    return makeDecision(proposal, 'REVIEW', 'R2', ['HUMAN_REVIEW_REQUIRED'], checks, 'PLANNED');
  }

  const command = commandAssessment(proposal.operation);
  checks.push({ check: 'command_allowlisted', status: command.allowed ? 'PASS' : 'FAIL', evidence_ref: command.reason });
  if (!command.allowed) {
    return makeDecision(
      proposal,
      'DENY',
      'R3',
      [command.destructive ? 'DESTRUCTIVE_COMMAND' : command.reason],
      checks,
      'UNKNOWN'
    );
  }

  checks.push({ check: 'rollback_sufficient', status: 'PASS', evidence_ref: 'INHERENT' });
  checks.push({ check: 'evidence_complete', status: 'PASS', evidence_ref: proposal.model_context.model_id });
  return makeDecision(proposal, 'PREPARED', 'R1', ['ALLOWLISTED_TEST_COMMAND'], checks, 'INHERENT');
}
