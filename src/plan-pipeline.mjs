import { createHash } from 'node:crypto';
import { comparePlanEvaluators, evaluateStateAwareBaseline } from './baseline.mjs';
import { requestActionPlan } from './nebius-plan.mjs';
import { NebiusProposalError } from './nebius.mjs';
import { evaluateActionPlan, PLAN_POLICY_VERSION } from './plan-gate.mjs';

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

function providerFailurePlanDecision(error) {
  const core = {
    plan_decision_version: 'provider-failure/0.1',
    plan_id: 'provider-failure',
    outcome: 'DENY',
    risk_class: 'R3',
    policy_version: PLAN_POLICY_VERSION,
    reason_codes: [error.code ?? 'PROVIDER_FAILURE'],
    state_mode: 'NO_PLAN_AVAILABLE',
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

function discriminantSummary(phoenix, baseline, comparison) {
  const lineageConflict = phoenix.steps
    .flatMap((step) => step.evidence_conflicts.map((conflict) => ({ step_id: step.step_id, ...conflict })))
    .find((conflict) => conflict.type === 'EVIDENCE_LINEAGE_INVALIDATED') ?? null;
  const staleConflict = phoenix.steps
    .flatMap((step) => step.state_conflicts.map((conflict) => ({ step_id: step.step_id, ...conflict })))
    .find(Boolean) ?? null;

  return {
    baseline_name: baseline.baseline,
    baseline_global_outcome: baseline.outcome,
    phoenix_global_outcome: phoenix.outcome,
    divergence_count: comparison.divergence_count,
    stale_state_detected: phoenix.reason_codes.includes('STALE_STATE_DETECTED'),
    evidence_lineage_invalidation_detected: phoenix.reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATION_DETECTED'),
    stale_conflict: staleConflict,
    lineage_conflict: lineageConflict
  };
}

export async function runLivePlanPipeline(userMessage, options = {}) {
  try {
    const { plan, provider } = await requestActionPlan(userMessage, options);
    const phoenix = evaluateActionPlan(plan);

    if (phoenix.reason_codes.includes('INVALID_PLAN_CONTRACT')) {
      return {
        ok: true,
        state: 'LIVE_PLAN_INVALID_CONTRACT',
        user_message: userMessage.trim(),
        provider,
        plan,
        baseline: null,
        phoenix,
        comparison: null,
        discriminant: null,
        dispatch_attempted: false
      };
    }

    const baseline = evaluateStateAwareBaseline(plan);
    const comparison = comparePlanEvaluators(plan, phoenix, baseline);

    return {
      ok: true,
      state: 'LIVE_PLAN_EVALUATED',
      user_message: userMessage.trim(),
      provider,
      plan,
      baseline,
      phoenix,
      comparison,
      discriminant: discriminantSummary(phoenix, baseline, comparison),
      dispatch_attempted: false
    };
  } catch (error) {
    if (!(error instanceof NebiusProposalError)) throw error;
    return {
      ok: false,
      state: 'FAIL_CLOSED',
      user_message: typeof userMessage === 'string' ? userMessage.trim().slice(0, 3000) : null,
      provider: error.details?.provider ?? null,
      provider_error: {
        code: error.code,
        details: error.details ?? {}
      },
      plan: null,
      baseline: null,
      phoenix: providerFailurePlanDecision(error),
      comparison: null,
      discriminant: null,
      dispatch_attempted: false
    };
  }
}
