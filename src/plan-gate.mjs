import { createHash } from 'node:crypto';
import { evaluateActionProposal } from './gate.mjs';

export const PLAN_POLICY_VERSION = 'phoenix-plan-gate/0.2.0';
export const PLAN_SCHEMA_VERSION = '0.1';

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

function isStateMap(value) {
  return isObject(value) && Object.entries(value).every(([resource, version]) => isNonEmptyString(resource) && isNonEmptyString(version));
}

function maxRisk(...risks) {
  const rank = { R0: 0, R1: 1, R2: 2, R3: 3 };
  return risks.filter(Boolean).sort((a, b) => (rank[b] ?? 3) - (rank[a] ?? 3))[0] ?? 'R3';
}

function validatePlan(plan) {
  const failures = [];

  if (!isObject(plan)) return ['INVALID_PLAN_CONTRACT'];
  if (plan.schema_version !== PLAN_SCHEMA_VERSION) failures.push('UNSUPPORTED_PLAN_SCHEMA_VERSION');
  if (!isNonEmptyString(plan.plan_id)) failures.push('MISSING_PLAN_ID');
  if (!isNonEmptyString(plan.goal)) failures.push('MISSING_PLAN_GOAL');
  if (plan.initial_state !== undefined && !isStateMap(plan.initial_state)) failures.push('INVALID_INITIAL_STATE');
  if (!Array.isArray(plan.actions) || plan.actions.length === 0 || plan.actions.length > 12) {
    failures.push('INVALID_PLAN_ACTION_COUNT');
    return failures;
  }

  const seen = new Set();
  for (const step of plan.actions) {
    if (!isObject(step) || !isNonEmptyString(step.step_id) || !Array.isArray(step.depends_on) || !isObject(step.proposal)) {
      failures.push('INVALID_PLAN_STEP');
      continue;
    }
    if (seen.has(step.step_id)) failures.push('DUPLICATE_STEP_ID');
    if (step.requires_state !== undefined && !isStateMap(step.requires_state)) failures.push('INVALID_STATE_PRECONDITION');
    if (step.produces_state !== undefined && !isStateMap(step.produces_state)) failures.push('INVALID_STATE_EFFECT');
    if (step.produces_state && Object.keys(step.produces_state).length > 0 && step.proposal.action_type !== 'WRITE_PATCH') {
      failures.push('STATE_EFFECT_REQUIRES_WRITE_PATCH');
    }

    for (const dependency of step.depends_on) {
      if (!isNonEmptyString(dependency)) {
        failures.push('INVALID_DEPENDENCY_ID');
        continue;
      }
      if (dependency === step.step_id) failures.push('SELF_DEPENDENCY');
      if (!seen.has(dependency)) failures.push('DEPENDENCY_NOT_PRIOR_OR_UNKNOWN');
    }

    seen.add(step.step_id);
  }

  return [...new Set(failures)];
}

function invalidPlanDecision(plan, failures) {
  const core = {
    plan_decision_version: '0.2',
    plan_id: plan?.plan_id ?? 'unknown',
    outcome: 'DENY',
    risk_class: 'R3',
    policy_version: PLAN_POLICY_VERSION,
    reason_codes: ['INVALID_PLAN_CONTRACT', ...failures],
    state_mode: 'PROJECTED_IF_APPROVED',
    steps: [],
    final_projected_state: {},
    dispatch_attempted: false
  };
  const hash = sha256(core);
  return {
    ...core,
    plan_decision_id: `plan-decision-${hash.slice(0, 16)}`,
    evidence_bundle_id: `plan-evidence-${hash.slice(0, 16)}`,
    decision_hash: hash
  };
}

function evaluateStateRequirements(step, projectedState, lastWriter) {
  const stateChecks = [];
  const conflicts = [];
  const requirements = { ...(step.requires_state ?? {}) };

  if (step.proposal.action_type === 'WRITE_PATCH') {
    const target = step.proposal.target?.relative_path;
    const baseVersion = step.proposal.operation?.base_version;
    if (isNonEmptyString(target) && isNonEmptyString(baseVersion) && projectedState.has(target)) {
      requirements[target] = baseVersion;
    }
  }

  for (const [resource, expectedVersion] of Object.entries(requirements)) {
    const actualVersion = projectedState.get(resource) ?? null;
    const status = actualVersion === expectedVersion ? 'PASS' : 'FAIL';
    const check = {
      resource,
      expected_version: expectedVersion,
      observed_version: actualVersion,
      last_writer: lastWriter.get(resource) ?? null,
      status
    };
    stateChecks.push(check);
    if (status === 'FAIL') conflicts.push(check);
  }

  return { stateChecks, conflicts };
}

export function evaluateActionPlan(plan) {
  const failures = validatePlan(plan);
  if (failures.length > 0) return invalidPlanDecision(plan, failures);

  const stepResults = [];
  const byId = new Map();
  const projectedState = new Map(Object.entries(plan.initial_state ?? {}));
  const lastWriter = new Map(Object.keys(plan.initial_state ?? {}).map((resource) => [resource, 'INITIAL_STATE']));

  for (const step of plan.actions) {
    const baseDecision = evaluateActionProposal(step.proposal);
    const dependencies = step.depends_on.map((dependencyId) => byId.get(dependencyId));
    const deniedDependencies = dependencies.filter((dependency) => dependency?.effective_outcome === 'DENY');
    const reviewDependencies = dependencies.filter((dependency) => dependency?.effective_outcome === 'REVIEW');
    const { stateChecks, conflicts } = evaluateStateRequirements(step, projectedState, lastWriter);

    let effectiveOutcome = baseDecision.outcome;
    let effectiveRisk = baseDecision.risk_class;
    let causalReasonCodes = [];
    let blockedBy = [];

    if (deniedDependencies.length > 0) {
      effectiveOutcome = 'DENY';
      effectiveRisk = 'R3';
      blockedBy = deniedDependencies.map((dependency) => dependency.step_id);
      causalReasonCodes = ['DEPENDENCY_BLOCKED'];
    } else if (conflicts.length > 0) {
      effectiveOutcome = 'DENY';
      effectiveRisk = 'R3';
      causalReasonCodes = ['STALE_STATE_PRECONDITION'];
    } else if (reviewDependencies.length > 0 && baseDecision.outcome === 'PREPARED') {
      effectiveOutcome = 'REVIEW';
      effectiveRisk = maxRisk('R2', baseDecision.risk_class);
      blockedBy = reviewDependencies.map((dependency) => dependency.step_id);
      causalReasonCodes = ['UPSTREAM_REVIEW_REQUIRED'];
    }

    const projectedStateBefore = Object.fromEntries(projectedState.entries());
    const appliedStateEffects = {};

    if (effectiveOutcome !== 'DENY' && step.produces_state) {
      for (const [resource, version] of Object.entries(step.produces_state)) {
        projectedState.set(resource, version);
        lastWriter.set(resource, step.step_id);
        appliedStateEffects[resource] = version;
      }
    }

    const result = {
      step_id: step.step_id,
      depends_on: [...step.depends_on],
      proposal_id: step.proposal.proposal_id,
      action_type: step.proposal.action_type,
      target: step.proposal.target,
      base_outcome: baseDecision.outcome,
      base_risk_class: baseDecision.risk_class,
      base_reason_codes: [...baseDecision.reason_codes],
      effective_outcome: effectiveOutcome,
      effective_risk_class: effectiveRisk,
      causal_reason_codes: causalReasonCodes,
      blocked_by: blockedBy,
      state_checks: stateChecks,
      state_conflicts: conflicts,
      projected_state_before: projectedStateBefore,
      applied_state_effects: appliedStateEffects,
      decision_id: baseDecision.decision_id,
      decision_hash: baseDecision.decision_hash,
      dispatch_attempted: false
    };

    stepResults.push(result);
    byId.set(step.step_id, result);
  }

  const hasDeny = stepResults.some((step) => step.effective_outcome === 'DENY');
  const hasReview = stepResults.some((step) => step.effective_outcome === 'REVIEW');
  const outcome = hasDeny ? 'DENY' : hasReview ? 'REVIEW' : 'PREPARED';
  const riskClass = stepResults.reduce((risk, step) => maxRisk(risk, step.effective_risk_class), 'R0');
  const causalBlocks = stepResults.filter((step) => step.causal_reason_codes.length > 0);
  const staleStateDetected = stepResults.some((step) => step.causal_reason_codes.includes('STALE_STATE_PRECONDITION'));

  const core = {
    plan_decision_version: '0.2',
    plan_id: plan.plan_id,
    goal: plan.goal,
    outcome,
    risk_class: riskClass,
    policy_version: PLAN_POLICY_VERSION,
    reason_codes: [
      ...(hasDeny ? ['PLAN_CONTAINS_DENIED_ACTION'] : []),
      ...(!hasDeny && hasReview ? ['PLAN_REQUIRES_REVIEW'] : []),
      ...(causalBlocks.length > 0 ? ['CAUSAL_DEPENDENCY_ENFORCED'] : []),
      ...(staleStateDetected ? ['STALE_STATE_DETECTED'] : [])
    ],
    state_mode: 'PROJECTED_IF_APPROVED',
    steps: stepResults,
    final_projected_state: Object.fromEntries(projectedState.entries()),
    dispatch_attempted: false
  };

  const hash = sha256(core);
  return {
    ...core,
    plan_decision_id: `plan-decision-${hash.slice(0, 16)}`,
    evidence_bundle_id: `plan-evidence-${hash.slice(0, 16)}`,
    decision_hash: hash
  };
}
