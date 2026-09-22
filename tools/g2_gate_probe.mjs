#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { evaluateActionProposal } from '../src/gate.mjs';

const fixtureNames = process.argv.slice(2);
const selected = fixtureNames.length > 0
  ? fixtureNames
  : ['prepared-read.json', 'review-patch.json', 'deny-secret.json', 'prepared-command.json'];

for (const name of selected) {
  const url = new URL(`../fixtures/${name}`, import.meta.url);
  const proposal = JSON.parse(await readFile(url, 'utf8'));
  const decision = evaluateActionProposal(proposal);
  process.stdout.write(`${JSON.stringify({ fixture: name, decision }, null, 2)}\n`);
}
