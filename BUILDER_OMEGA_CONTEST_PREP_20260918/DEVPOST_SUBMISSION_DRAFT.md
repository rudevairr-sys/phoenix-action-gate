# Devpost Submission Draft — Phoenix Action Gate

Estado: `DRAFT_NOT_SUBMITTED`  
Fecha: 2026-09-18

## Project name

Phoenix Action Gate

## Tagline

A justification firewall for AI coding agents.

## Track

Coding and agentic engineering

## Short summary

Phoenix Action Gate is an experimental pre-execution governance layer for AI coding agents. NVIDIA Nemotron, accessed through Nebius Token Factory, proposes actions or compact multi-step plans. Phoenix Action Gate then deterministically checks whether the proposal is allowed, reversible and still justified by current evidence before anything can advance. The MVP does not execute actions automatically.

## What it does

Phoenix Action Gate sits between an AI agent and the actions it wants to perform. Instead of letting a model directly act on a workspace, the system turns the model output into a structured proposal and evaluates it through a deterministic gate.

The current demo focuses on a common failure pattern in agentic coding: an action may look reasonable because it is backed by evidence, but the state that made that evidence valid may have changed. The UI shows the proposed plan, the evidence chain, the expected state, the observed state and the final decision.

In the main demo, Nemotron proposes a multi-step plan where `generated.md` is derived from `config.json` v2. A later step changes `config.json` back to v1. When the agent proposes running tests using evidence derived from the old state, Phoenix Action Gate denies the action because the justification is no longer valid. Nothing is dispatched.

## How we used Nebius and NVIDIA

The project uses Nebius Token Factory to call an NVIDIA Nemotron model. Nemotron is used as the proposal engine: it interprets user intent and emits an action or compact plan. Phoenix Action Gate does not use the model as an authority. The deterministic gate remains responsible for validation, decisioning and evidence.

Observed local evidence in the project references `nvidia/Nemotron-3_5-Lightning` through Token Factory. Before submission, the live integration should be revalidated and the final model identifier should be stated exactly as observed in the clean public cut.

## Why it matters

AI coding agents are increasingly able to propose file edits, commands and workflows. The hard part is not only whether a command is syntactically valid or allowed. The hard part is whether the reason for doing it still holds.

Phoenix Action Gate makes that boundary visible. It gives a developer or operator a reviewable explanation before action: what the model proposed, what evidence supports it, what changed and why the system says `PREPARED`, `REVIEW` or `DENY`.

## Core features

- Structured action proposals from Nemotron.
- Deterministic gate with fail-closed behavior.
- `DENY`, `REVIEW` and `PREPARED` outcomes.
- No automatic dispatcher in the MVP.
- Visual justification map.
- Evidence lineage invalidation demo.
- Sanitized evidence records.
- Local tests and fixtures.
- Explicit claim boundaries and reproducibility checklist.

## Built with

- Node.js >= 22.
- Nebius Token Factory.
- NVIDIA Nemotron model through Token Factory.
- Plain local web UI.
- Deterministic JavaScript modules for proposal validation, plan gating and evidence checks.

## What is new during the hackathon period

Phoenix Action Gate is a new public product/repository created for the hackathon period. It is inspired by prior Phoenix governance research, but it does not include Phoenix Neuron source code and is not a canonical Phoenix Neuron integration. The hackathon work focuses on a new public app surface, action proposal contract, deterministic gate, Nebius/Nemotron integration, evidence UI, tests and submission materials.

## Limitations

- This is not production-ready.
- It does not automatically execute actions.
- It is not a full Phoenix Neuron release.
- It does not prove general superiority over all guardrails or baselines.
- One-hop evidence-lineage checking is useful but not claimed as exclusive to Phoenix.
- Live Nebius/Nemotron evidence must be revalidated before final submission.

## Repository URL

Pending final public branch/repo reconciliation.

Candidate repository:

`https://github.com/rudevairr-sys/phoenix-action-gate`

## Demo URL / test build

Pending.

## Video URL

Pending.

## Feedback on Nebius/Nemotron

Draft points to complete after final live revalidation:

- Structured proposal generation is a strong fit for Token Factory/Nemotron.
- The model should be treated as a proposal engine, not an execution authority.
- The most valuable platform capability is fast hosted access to NVIDIA models from a normal developer workflow.
- Useful improvements would include clearer structured-output examples, stronger function-calling guidance, easy request tracing and reproducibility metadata for hackathon demos.

## Tavily

No, unless a real runtime Tavily call is intentionally added and demonstrated. Do not add Tavily only for prize chasing.

## Final submission status

`NOT_SUBMITTED`.

A human must approve the final Devpost submission separately.
