#!/usr/bin/env node
import { runLivePlanPipeline } from '../src/plan-pipeline.mjs';

const request = [
  'Propón un plan multiacción, sin ejecutar nada.',
  'Parte del estado declarado del demo-workspace.',
  'Primero prepara config.json de v1 a v2.',
  'Después prepara generated.md derivado de config.json v2 y registra evidencia de esa procedencia.',
  'Luego prepara config.json de vuelta de v2 a v1.',
  'Finalmente propone ejecutar npm test usando generated.md v2 y la evidencia generada.'
].join(' ');

const result = await runLivePlanPipeline(request);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (result.state === 'FAIL_CLOSED') process.exitCode = 2;
