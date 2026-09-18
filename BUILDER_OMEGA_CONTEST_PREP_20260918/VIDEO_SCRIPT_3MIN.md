# Video Script — 3 minutes max

Estado: `DRAFT_NOT_RECORDED`  
Duración objetivo: 2:30–2:50

## 0:00–0:15 — Hook

AI coding agents can propose commands, patches and multi-step plans. But before an agent acts, we should ask a different question: is the reason for acting still true?

This is Phoenix Action Gate: a justification firewall for AI coding agents.

## 0:15–0:35 — What it is

The model proposes, but the model does not authorize.

In this demo, NVIDIA Nemotron runs through Nebius Token Factory and turns a user request into a structured plan. Phoenix Action Gate then checks the plan deterministically before anything can move forward.

There is no automatic dispatch in this MVP.

## 0:35–1:10 — Show the UI

On screen we can see four things:

1. the user request;
2. the plan proposed by Nemotron;
3. the Phoenix decision;
4. the justification map.

The important part is the map. Phoenix does not only ask whether an action is allowed. It checks whether the evidence that justifies the action is still valid.

## 1:10–1:55 — Main demo

Here is the scenario.

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

## 1:55–2:20 — Nebius/NVIDIA centrality

Nebius and Nemotron are central to the demo because the model generates the proposed action plan. Token Factory gives the app hosted access to an NVIDIA model. Phoenix Action Gate then provides the deterministic governance layer around that proposal.

If you remove Nemotron, you lose the agent proposal. If you remove the gate, you lose the pre-execution decision boundary.

## 2:20–2:40 — Why it matters

This is useful for developers and operators who want agents to help with code, but do not want to blindly trust model output.

The goal is not to make the model more powerful. The goal is to make the action boundary visible, reviewable and fail-closed.

## 2:40–2:55 — Close

Phoenix Action Gate is experimental and not production-ready. It does not claim to solve all agent safety problems.

It demonstrates one practical idea: before an AI agent acts, check whether its reason for acting is still valid.

## Shots checklist

- Browser on local panel.
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
