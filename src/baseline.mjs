import { evaluateActionProposal } from './gate.mjs';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function maxRisk(...risks) {
  const rank = { R0: 0, R1: 1, R2: 2, R3: 3 };
  return risks.filter(Boolean).sort((a, b) => (rank[b] ?? 3) - (rank[a] ?? 3))[0] ?? 'R3';
}

function stateRequirements(step, projectedState) {
  const requirements = { ...(step.requires_state ?? {}) };
  if (step.proposal?.action_type === 'WRITE_PATCH') {
    const target = step.proposal?.target?.relative_path;
    const baseVersion = step.proposal?.operation?.base_version;
    if (isNonEmptyString(target) && isNonEmptyString(baseVersion) && projectedState.has(target)) {
      requirements[target] = baseVersion;
    }
  }
  return requirements;
}

export function evaluateIndependentBaseline(plan) {
  const steps = (plan?.actions ?? []).map((step) => {
    const decision = evaluateActionProposal(step.proposal);
    return {
      step_id: step.step_id,
      depends_on: [...(step.depends_on ?? [])],
      outcome: decision.outcome,
      risk_class: decision.risk_class,
      reason_codes: [...decision.reason_codes],
      dispatch_attempted: false
    };
  });

  const outcome = steps.some((step) => step.outcome === 'DENY')
    ? 'DENY'
    : steps.some((step) => step.outcome === 'REVIEW')
      ? 'REVIEW'
      : 'PREPARED';

  return {
    baseline: 'independent-action-gate/0.1.0',
    plan_id: plan?.plan_id ?? 'unknown',
    outcome,
    steps,
    dependency_reasoning: false,
    state_reasoning: false,
    evidence_lineage_reasoning: false,
    dispatch_attempted: false
  };
}

export function evaluateStateAwareBaseline(plan) {
  const projectedState = new Map(Object.entries(plan?.initial_state ?? {}));
  const lastWriter = new Map(Object.keys(plan?.initial_state ?? {}).map((resource) => [resource, 'INITIAL_STATE']));
  const byId = new Map();
  const steps = [];

  for (const step of plan?.actions ?? []) {
    const baseDecision = evaluateActionProposal(step.proposal);
    const dependencyResults = (step.depends_on ?? []).map((id) => byId.get(id)).filter(Boolean);
    const deniedDependencies = dependencyResults.filter((item) => item.outcome === 'DENY');
    const reviewDependencies = dependencyResults.filter((item) => item.outcome === 'REVIEW');

    const checks = [];
    const conflicts = [];
    for (const [resource, expectedVersion] of Object.entries(stateRequirements(step, projectedState))) {
      const observedVersion = projectedState.get(resource) ?? null;
      const check = {
        resource,
        expected_version: expectedVersion,
        observed_version: observedVersion,
        last_writer: lastWriter.get(resource) ?? null,
        status: observedVersion === expectedVersion ? 'PASS' : 'FAIL'
      };
      checks.push(check);
      if (check.status === 'FAIL') conflicts.push(check);
    }

    let outcome = baseDecision.outcome;
    let riskClass = baseDecision.risk_class;
    const reasonCodes = [...baseDecision.reason_codes];
    let blockedBy = [];

    if (deniedDependencies.length > 0) {
      outcome = 'DENY';
      riskClass = 'R3';
      blockedBy = deniedDependencies.map((item) => item.step_id);
      reasonCodes.push('DEPENDENCY_BLOCKED');
    } else if (conflicts.length > 0) {
      outcome = 'DENY';
      riskClass = 'R3';
      reasonCodes.push('STALE_STATE_PRECONDITION');
    } else if (reviewDependencies.length > 0 && outcome === 'PREPARED') {
      outcome = 'REVIEW';
      riskClass = maxRisk('R2', riskClass);
      blockedBy = reviewDependencies.map((item) => item.step_id);
      reasonCodes.push('UPSTREAM_REVIEW_REQUIRED');
    }

    const appliedStateEffects = {};
    if (outcome !== 'DENY' && step.produces_state) {
      for (const [resource, version] of Object.entries(step.produces_state)) {
        projectedState.set(resource, version);
        lastWriter.set(resource, step.step_id);
        appliedStateEffects[resource] = version;
      }
    }

    const result = {
      step_id: step.step_id,
      depends_on: [...(step.depends_on ?? [])],
      base_outcome: baseDecision.outcome,
      outcome,
      risk_class: riskClass,
      reason_codes: [...new Set(reasonCodes)],
      blocked_by: blockedBy,
      state_checks: checks,
      state_conflicts: conflicts,
      applied_state_effects: appliedStateEffects,
      dispatch_attempted: false
    };

    steps.push(result);
    byId.set(step.step_id, result);
  }

  const outcome = steps.some((step) => step.outcome === 'DENY')
    ? 'DENY'
    : steps.some((step) => step.outcome === 'REVIEW')
      ? 'REVIEW'
      : 'PREPARED';

  return {
    baseline: 'state-aware-baseline/0.1.0',
    plan_id: plan?.plan_id ?? 'unknown',
    outcome,
    steps,
    final_projected_state: Object.fromEntries(projectedState.entries()),
    dependency_reasoning: true,
    state_reasoning: true,
    evidence_lineage_reasoning: false,
    dispatch_attempted: false
  };
}

export function comparePlanEvaluators(plan, phoenixResult, baselineResult) {
  const phoenixById = new Map((phoenixResult?.steps ?? []).map((step) => [step.step_id, step]));
  const divergences = [];

  for (const baselineStep of baselineResult?.steps ?? []) {
    const phoenixStep = phoenixById.get(baselineStep.step_id);
    if (!phoenixStep) continue;
    const baselineOutcome = baselineStep.effective_outcome ?? baselineStep.outcome;
    const phoenixOutcome = phoenixStep.effective_outcome ?? phoenixStep.outcome;
    if (baselineOutcome !== phoenixOutcome) {
      divergences.push({
        step_id: baselineStep.step_id,
        baseline_outcome: baselineOutcome,
        phoenix_outcome: phoenixOutcome,
        phoenix_causal_reason_codes: [...(phoenixStep.causal_reason_codes ?? [])],
        blocked_by: [...(phoenixStep.blocked_by ?? [])],
        evidence_conflicts: [...(phoenixStep.evidence_conflicts ?? [])]
      });
    }
  }

  return {
    plan_id: plan?.plan_id ?? 'unknown',
    baseline: baselineResult?.baseline ?? 'unknown',
    divergence_count: divergences.length,
    divergences
  };
}
