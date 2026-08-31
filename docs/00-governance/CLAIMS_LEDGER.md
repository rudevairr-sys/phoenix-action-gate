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
| C-014 | Phoenix Action Gate llama a Nebius Token Factory en runtime | RUNTIME_OBSERVED | E-011 y E-012; `GET /v1/models` y `POST /v1/chat/completions` observados |
| C-015 | Phoenix Action Gate supera un baseline sencillo | INSUFFICIENT_EVIDENCE | Benchmark no ejecutado |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial |
| C-018 | Existe un núcleo determinista que transforma `ActionProposal` en `PREPARED`, `REVIEW` o `DENY` sin dispatch | IMPLEMENTED | `src/gate.mjs`, fixtures y `tools/g2_gate_probe.mjs` en `review/g2-mvp-core` |
| C-019 | El núcleo determinista supera los seis casos iniciales de G2 | TEST_EXECUTED | E-013: 6 PASS / 0 FAIL en entorno de validación; repetición en SION Node 24 pendiente |

## Formulación pública permitida hoy

> Phoenix Action Gate is an experimental project investigating a governed, fail-closed action pipeline for AI agents. A live Nebius Token Factory call using NVIDIA Nemotron 3.5 Lightning has produced a structured ActionProposal without dispatch. A deterministic local gate core now maps bounded proposals to PREPARED, REVIEW or DENY in initial tests.

## Formulaciones prohibidas hoy

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a gates bespoke.”
- “La integración completa está lista para producción.”
- “Está listo para producción.”
- “H-PHX-05 está validada.”
