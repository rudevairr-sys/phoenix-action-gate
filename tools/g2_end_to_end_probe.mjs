#!/usr/bin/env node
import { runReadContextPipeline } from '../src/pipeline.mjs';

const result = await runReadContextPipeline();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.ok ? 0 : 1;
