# Video Script — 3 minutes max

Estado: `DRAFT_NOT_RECORDED / UPDATED_FOR_SPECIALIZED_AGENT_CONTRACT_DEMO`  
Duración objetivo: 2:30–2:55

## 0:00–0:15 — Hook

AI coding agents are getting better at proposing commands, patches and plans. But a specialized agent should not become a general assistant just because the user insists.

This is Phoenix Action Gate: a justification firewall for AI coding agents.

## 0:15–0:40 — What it is

The model proposes, but the model does not authorize.

In this demo, NVIDIA Nemotron runs through Nebius Token Factory and turns a user request into a structured proposal. Phoenix Action Gate then checks the proposal deterministically before anything can move forward.

There is no automatic dispatch in this MVP.

## 0:40–1:05 — Specialized agent contract demo

The UI now shows a simple idea: small agents with clear contracts.

One agent may only answer `SI`, `NO` or `SAFE_NOOP`.

One agent may only stay inside the Rust domain.

One agent must avoid vowels.

One agent may propose actions, but must not execute.

Phoenix does not ask whether the response sounds convincing. It asks whether the output stayed inside the contract.

## 1:05–1:45 — Main action gate demo

Here is the main coding scenario.

Nemotron proposes a four-step plan.

Step 1 changes `config.json` from version 1 to version 2.

Step 2 creates `generated.md` version 2 and records that it was derived from `config.json` version 2.

Step 3 changes `config.json` back to version 1.

Step 4 proposes running `npm test` using the evidence generated earlier.

A normal review might see that there is evidence and keep the action under review.

Phoenix follows the evidence back to its causal source. It expected `config.json` version 2, but the current observed state is version 1.

So the justification is no longer valid.

Phoenix returns `DENY`.

Nothing is executed.

## 1:45–2:15 — Why this matters

This is useful because agent safety is not only about blocking dangerous commands. It is also about keeping each agent inside its lane.

A Rust agent should not become a car-buying assistant. A yes/no agent should not start explaining. An action proposer should not claim it executed a change.

Phoenix Action Gate makes those boundaries visible and reviewable.

## 2:15–2:35 — Nebius/NVIDIA centrality

Nebius and Nemotron are central to the demo because the model generates the proposed action or plan. Token Factory gives the app hosted access to an NVIDIA model. Phoenix Action Gate then provides the deterministic governance layer around that proposal.

If you remove Nemotron, you lose the agent proposal. If you remove the gate, you lose the pre-execution decision boundary.

## 2:35–2:55 — Close

Phoenix Action Gate is experimental and not production-ready. It does not claim to solve all agent safety problems.

It demonstrates one practical idea: before an AI agent acts, check whether the reason for acting is still valid and whether the agent stayed inside its contract.

## Shots checklist

- Browser on local panel.
- `Specialized Agent Contract Demo` strip visible.
- Four microagent cards visible: `MONO_SI_NO`, `FERRUM_RUST`, `N_VCLS`, `ACTION_PROPOSER`.
- Nebius/Nemotron model/provider area visible.
- Main prompt loaded.
- Four-step plan visible.
- Justification map visible.
- Expected vs observed state visible.
- Phoenix result: `DENY`.
- `NO DISPATCH` badge visible.
- Evidence/trace area visible briefly.

## Do not say

- Do not say production-ready.
- Do not say formally verified.
- Do not say Phoenix Neuron is included.
- Do not say automatic execution.
- Do not say exclusive or unbeatable guardrail.
- Do not say the agent factory is the final product.
- Do not say external GPT ZIPs are integrated runtime components.
