#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { comparePlanEvaluators, evaluateIndependentBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

const plan = JSON.parse(await readFile(new URL('../fixtures/plan-stale-state.json', import.meta.url), 'utf8'));
const baseline = evaluateIndependentBaseline(plan);
const phoenix = evaluateActionPlan(plan);
const comparison = comparePlanEvaluators(plan, phoenix, baseline);

const staleStep = phoenix.steps.find((step) => step.causal_reason_codes.includes('STALE_STATE_PRECONDITION')) ?? null;

process.stdout.write(`${JSON.stringify({
  trial: 'H-PHX-05-CAUSAL-002',
  plan_id: plan.plan_id,
  discriminant: {
    baseline_global_outcome: baseline.outcome,
    phoenix_global_outcome: phoenix.outcome,
    all_baseline_steps_locally_non_denied: baseline.steps.every((step) => step.outcome !== 'DENY'),
    stale_state_detected: phoenix.reason_codes.includes('STALE_STATE_DETECTED'),
    stale_conflict: staleStep?.state_conflicts?.[0] ?? null
  },
  baseline,
  phoenix,
  comparison
}, null, 2)}\n`);
