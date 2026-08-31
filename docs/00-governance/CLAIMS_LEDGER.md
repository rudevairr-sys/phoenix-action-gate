# Claims ledger

Estados permitidos: `DOCUMENTED`, `IMPLEMENTED`, `TEST_EXECUTED`, `RUNTIME_OBSERVED`, `PRODUCTION_VALIDATED`, `HYPOTHESIS`, `NOT_CORROBORATED`, `INSUFFICIENT_EVIDENCE`.

| ID | Afirmación | Estado | Evidencia / límite |
|---|---|---|---|
| C-001 | Existe un repositorio público independiente | RUNTIME_OBSERVED | GitHub `rudevairr-sys/phoenix-action-gate` |
| C-002 | El proyecto SION sigue `origin/main` | RUNTIME_OBSERVED | `git status` observado antes de F0 |
| C-003 | Existe una fundación documental F0 | IMPLEMENTED | Esta rama y su commit |
| C-010 | Phoenix Neuron dispone de arquitectura previa relevante | DOCUMENTED | Fuente externa al repo; no importada |
| C-011 | H-PHX-04 no corroboró diferenciación en fixtures acotados | TEST_EXECUTED | Autoridad: Action Assurance Lab y checkpoint del Radar |
| C-012 | El pipeline completo podría aportar valor diferencial | HYPOTHESIS | H-PHX-05; todavía no ejecutada |
| C-013 | Phoenix Action Gate usa `nvidia/Nemotron-3_5-Lightning` para generar una ActionProposal estructurada | RUNTIME_OBSERVED | E-012; ejecución real en Token Factory, HTTP 200, sin dispatch |
| C-014 | Phoenix Action Gate llama a Nebius Token Factory en runtime | RUNTIME_OBSERVED | E-011, E-012 y E-015 |
| C-015 | Phoenix Action Gate supera un baseline sencillo | INSUFFICIENT_EVIDENCE | Benchmark no ejecutado |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial |
| C-018 | Existe un núcleo determinista que transforma `ActionProposal` en `PREPARED`, `REVIEW` o `DENY` sin dispatch | IMPLEMENTED | `src/gate.mjs`, fixtures y `tools/g2_gate_probe.mjs` en `review/g2-mvp-core` |
| C-019 | El núcleo determinista supera los seis casos iniciales de G2 | TEST_EXECUTED | E-013 y E-014: 6 PASS / 0 FAIL tanto en validación como en SION |
| C-020 | Una llamada real a Nemotron alimenta directamente el gate determinista y produce una `GateDecision` trazable | RUNTIME_OBSERVED | E-015: `R0/PREPARED`, 7 checks PASS, decision hash, evidence bundle y `dispatch_attempted=false` |

## Formulación pública permitida hoy

> Phoenix Action Gate is an experimental governed action pipeline for AI agents. A live Nebius Token Factory call using NVIDIA Nemotron 3.5 Lightning now feeds a structured ActionProposal directly into a deterministic Phoenix gate, which produced a traceable R0/PREPARED decision without dispatch.

## Formulaciones prohibidas hoy

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a gates bespoke.”
- “La integración completa está lista para producción.”
- “Está listo para producción.”
- “H-PHX-05 está validada.”
