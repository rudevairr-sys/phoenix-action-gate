import { createHash } from 'node:crypto';
import { evaluateActionProposal } from './gate.mjs';

export const PLAN_POLICY_VERSION = 'phoenix-plan-gate/0.3.0';
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

function validateEvidenceDefinition(definition) {
  if (!isObject(definition)) return false;
  if (!isNonEmptyString(definition.evidence_id)) return false;
  if (!isNonEmptyString(definition.resource)) return false;
  if (!isNonEmptyString(definition.version)) return false;
  if (!Array.isArray(definition.derives_from)) return false;
  return definition.derives_from.every((source) =>
    isObject(source) && isNonEmptyString(source.resource) && isNonEmptyString(source.version));
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

  const seenSteps = new Set();
  const seenEvidence = new Set();

  for (const step of plan.actions) {
    if (!isObject(step) || !isNonEmptyString(step.step_id) || !Array.isArray(step.depends_on) || !isObject(step.proposal)) {
      failures.push('INVALID_PLAN_STEP');
      continue;
    }
    if (seenSteps.has(step.step_id)) failures.push('DUPLICATE_STEP_ID');
    if (step.requires_state !== undefined && !isStateMap(step.requires_state)) failures.push('INVALID_STATE_PRECONDITION');
    if (step.produces_state !== undefined && !isStateMap(step.produces_state)) failures.push('INVALID_STATE_EFFECT');
    if (step.produces_state && Object.keys(step.produces_state).length > 0 && step.proposal.action_type !== 'WRITE_PATCH') {
      failures.push('STATE_EFFECT_REQUIRES_WRITE_PATCH');
    }

    if (step.requires_evidence !== undefined) {
      if (!Array.isArray(step.requires_evidence) || !step.requires_evidence.every(isNonEmptyString)) {
        failures.push('INVALID_EVIDENCE_REQUIREMENT');
      }
    }

    if (step.produces_evidence !== undefined) {
      if (!Array.isArray(step.produces_evidence) || !step.produces_evidence.every(validateEvidenceDefinition)) {
        failures.push('INVALID_EVIDENCE_DEFINITION');
      } else {
        for (const definition of step.produces_evidence) {
          if (seenEvidence.has(definition.evidence_id)) failures.push('DUPLICATE_EVIDENCE_ID');
          seenEvidence.add(definition.evidence_id);
          if (!step.produces_state || step.produces_state[definition.resource] !== definition.version) {
            failures.push('EVIDENCE_PRODUCTION_STATE_MISMATCH');
          }
        }
      }
    }

    for (const dependency of step.depends_on) {
      if (!isNonEmptyString(dependency)) {
        failures.push('INVALID_DEPENDENCY_ID');
        continue;
      }
      if (dependency === step.step_id) failures.push('SELF_DEPENDENCY');
      if (!seenSteps.has(dependency)) failures.push('DEPENDENCY_NOT_PRIOR_OR_UNKNOWN');
    }

    seenSteps.add(step.step_id);
  }

  return [...new Set(failures)];
}

function invalidPlanDecision(plan, failures) {
  const core = {
    plan_decision_version: '0.3',
    plan_id: plan?.plan_id ?? 'unknown',
    outcome: 'DENY',
    risk_class: 'R3',
    policy_version: PLAN_POLICY_VERSION,
    reason_codes: ['INVALID_PLAN_CONTRACT', ...failures],
    state_mode: 'PROJECTED_IF_APPROVED',
    steps: [],
    final_projected_state: {},
    evidence_registry: {},
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

function evaluateEvidenceRequirements(step, evidenceRegistry, projectedState, lastWriter) {
  const evidenceChecks = [];
  const conflicts = [];

  for (const evidenceId of step.requires_evidence ?? []) {
    const evidence = evidenceRegistry.get(evidenceId);
    if (!evidence) {
      const conflict = {
        type: 'EVIDENCE_NOT_AVAILABLE',
        evidence_id: evidenceId,
        producer_step: null,
        status: 'FAIL'
      };
      evidenceChecks.push(conflict);
      conflicts.push(conflict);
      continue;
    }

    const artifactObserved = projectedState.get(evidence.resource) ?? null;
    if (artifactObserved !== evidence.version) {
      const conflict = {
        type: 'EVIDENCE_ARTIFACT_STALE',
        evidence_id: evidenceId,
        producer_step: evidence.producer_step,
        resource: evidence.resource,
        expected_version: evidence.version,
        observed_version: artifactObserved,
        invalidated_by: lastWriter.get(evidence.resource) ?? null,
        status: 'FAIL'
      };
      evidenceChecks.push(conflict);
      conflicts.push(conflict);
    }

    for (const source of evidence.derives_from) {
      const sourceObserved = projectedState.get(source.resource) ?? null;
      const check = {
        type: sourceObserved === source.version ? 'EVIDENCE_LINEAGE_VALID' : 'EVIDENCE_LINEAGE_INVALIDATED',
        evidence_id: evidenceId,
        producer_step: evidence.producer_step,
        source_resource: source.resource,
        expected_source_version: source.version,
        observed_source_version: sourceObserved,
        invalidated_by: sourceObserved === source.version ? null : (lastWriter.get(source.resource) ?? null),
        status: sourceObserved === source.version ? 'PASS' : 'FAIL'
      };
      evidenceChecks.push(check);
      if (check.status === 'FAIL') conflicts.push(check);
    }
  }

  return { evidenceChecks, conflicts };
}

export function evaluateActionPlan(plan) {
  const failures = validatePlan(plan);
  if (failures.length > 0) return invalidPlanDecision(plan, failures);

  const stepResults = [];
  const byId = new Map();
  const projectedState = new Map(Object.entries(plan.initial_state ?? {}));
  const lastWriter = new Map(Object.keys(plan.initial_state ?? {}).map((resource) => [resource, 'INITIAL_STATE']));
  const evidenceRegistry = new Map();

  for (const step of plan.actions) {
    const baseDecision = evaluateActionProposal(step.proposal);
    const dependencies = step.depends_on.map((dependencyId) => byId.get(dependencyId));
    const deniedDependencies = dependencies.filter((dependency) => dependency?.effective_outcome === 'DENY');
    const reviewDependencies = dependencies.filter((dependency) => dependency?.effective_outcome === 'REVIEW');
    const { stateChecks, conflicts: stateConflicts } = evaluateStateRequirements(step, projectedState, lastWriter);
    const { evidenceChecks, conflicts: evidenceConflicts } = evaluateEvidenceRequirements(step, evidenceRegistry, projectedState, lastWriter);

    let effectiveOutcome = baseDecision.outcome;
    let effectiveRisk = baseDecision.risk_class;
    let causalReasonCodes = [];
    let blockedBy = [];

    if (deniedDependencies.length > 0) {
      effectiveOutcome = 'DENY';
      effectiveRisk = 'R3';
      blockedBy = deniedDependencies.map((dependency) => dependency.step_id);
      causalReasonCodes = ['DEPENDENCY_BLOCKED'];
    } else if (stateConflicts.length > 0) {
      effectiveOutcome = 'DENY';
      effectiveRisk = 'R3';
      causalReasonCodes = ['STALE_STATE_PRECONDITION'];
    } else if (evidenceConflicts.length > 0) {
      effectiveOutcome = 'DENY';
      effectiveRisk = 'R3';
      causalReasonCodes = [...new Set(evidenceConflicts.map((conflict) => conflict.type))];
    } else if (reviewDependencies.length > 0 && baseDecision.outcome === 'PREPARED') {
      effectiveOutcome = 'REVIEW';
      effectiveRisk = maxRisk('R2', baseDecision.risk_class);
      blockedBy = reviewDependencies.map((dependency) => dependency.step_id);
      causalReasonCodes = ['UPSTREAM_REVIEW_REQUIRED'];
    }

    const projectedStateBefore = Object.fromEntries(projectedState.entries());
    const appliedStateEffects = {};
    const producedEvidence = [];

    if (effectiveOutcome !== 'DENY' && step.produces_state) {
      for (const [resource, version] of Object.entries(step.produces_state)) {
        projectedState.set(resource, version);
        lastWriter.set(resource, step.step_id);
        appliedStateEffects[resource] = version;
      }
    }

    if (effectiveOutcome !== 'DENY' && step.produces_evidence) {
      for (const definition of step.produces_evidence) {
        const record = {
          evidence_id: definition.evidence_id,
          producer_step: step.step_id,
          resource: definition.resource,
          version: definition.version,
          derives_from: definition.derives_from.map((source) => ({ ...source }))
        };
        evidenceRegistry.set(definition.evidence_id, record);
        producedEvidence.push(record);
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
      state_conflicts: stateConflicts,
      evidence_checks: evidenceChecks,
      evidence_conflicts: evidenceConflicts,
      required_evidence: [...(step.requires_evidence ?? [])],
      produced_evidence: producedEvidence,
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
  const lineageInvalidationDetected = stepResults.some((step) => step.evidence_conflicts.some((conflict) => conflict.type === 'EVIDENCE_LINEAGE_INVALIDATED'));

  const core = {
    plan_decision_version: '0.3',
    plan_id: plan.plan_id,
    goal: plan.goal,
    outcome,
    risk_class: riskClass,
    policy_version: PLAN_POLICY_VERSION,
    reason_codes: [
      ...(hasDeny ? ['PLAN_CONTAINS_DENIED_ACTION'] : []),
      ...(!hasDeny && hasReview ? ['PLAN_REQUIRES_REVIEW'] : []),
      ...(causalBlocks.length > 0 ? ['CAUSAL_DEPENDENCY_ENFORCED'] : []),
      ...(staleStateDetected ? ['STALE_STATE_DETECTED'] : []),
      ...(lineageInvalidationDetected ? ['EVIDENCE_LINEAGE_INVALIDATION_DETECTED'] : [])
    ],
    state_mode: 'PROJECTED_IF_APPROVED',
    steps: stepResults,
    final_projected_state: Object.fromEntries(projectedState.entries()),
    evidence_registry: Object.fromEntries(evidenceRegistry.entries()),
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
