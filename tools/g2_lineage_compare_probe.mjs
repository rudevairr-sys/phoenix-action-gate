#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { comparePlanEvaluators, evaluateStateAwareBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

const plan = JSON.parse(await readFile(new URL('../fixtures/plan-lineage-invalidation.json', import.meta.url), 'utf8'));
const baseline = evaluateStateAwareBaseline(plan);
const phoenix = evaluateActionPlan(plan);
const comparison = comparePlanEvaluators(plan, phoenix, baseline);
const divergentStep = phoenix.steps.find((step) => step.evidence_conflicts.length > 0) ?? null;

process.stdout.write(`${JSON.stringify({
  trial: 'H-PHX-05-CAUSAL-003',
  plan_id: plan.plan_id,
  discriminant: {
    baseline_name: baseline.baseline,
    baseline_global_outcome: baseline.outcome,
    phoenix_global_outcome: phoenix.outcome,
    all_baseline_steps_locally_non_denied: baseline.steps.every((step) => step.base_outcome !== 'DENY'),
    baseline_state_reasoning: baseline.state_reasoning,
    baseline_lineage_reasoning: baseline.evidence_lineage_reasoning,
    lineage_invalidation_detected: phoenix.reason_codes.includes('EVIDENCE_LINEAGE_INVALIDATION_DETECTED'),
    lineage_conflict: divergentStep?.evidence_conflicts?.[0] ?? null
  },
  baseline,
  phoenix,
  comparison
}, null, 2)}\n`);
