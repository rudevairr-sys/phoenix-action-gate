import { evaluateActionProposal } from './gate.mjs';

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
    dispatch_attempted: false
  };
}

export function comparePlanEvaluators(plan, phoenixResult, baselineResult) {
  const phoenixById = new Map((phoenixResult?.steps ?? []).map((step) => [step.step_id, step]));
  const divergences = [];

  for (const baselineStep of baselineResult?.steps ?? []) {
    const phoenixStep = phoenixById.get(baselineStep.step_id);
    if (!phoenixStep) continue;
    if (baselineStep.outcome !== phoenixStep.effective_outcome) {
      divergences.push({
        step_id: baselineStep.step_id,
        baseline_outcome: baselineStep.outcome,
        phoenix_outcome: phoenixStep.effective_outcome,
        phoenix_causal_reason_codes: [...phoenixStep.causal_reason_codes],
        blocked_by: [...phoenixStep.blocked_by]
      });
    }
  }

  return {
    plan_id: plan?.plan_id ?? 'unknown',
    divergence_count: divergences.length,
    divergences
  };
}
