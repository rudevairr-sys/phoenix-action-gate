#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { comparePlanEvaluators, evaluateIndependentBaseline } from '../src/baseline.mjs';
import { evaluateActionPlan } from '../src/plan-gate.mjs';

const plan = JSON.parse(await readFile(new URL('../fixtures/plan-dependency-chain.json', import.meta.url), 'utf8'));
const baseline = evaluateIndependentBaseline(plan);
const phoenix = evaluateActionPlan(plan);
const comparison = comparePlanEvaluators(plan, phoenix, baseline);

process.stdout.write(`${JSON.stringify({ plan_id: plan.plan_id, baseline, phoenix, comparison }, null, 2)}\n`);
