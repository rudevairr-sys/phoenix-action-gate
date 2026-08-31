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
| C-013 | Phoenix Action Gate usa Nemotron | INSUFFICIENT_EVIDENCE | No implementado |
| C-014 | Phoenix Action Gate llama a Token Factory en runtime | INSUFFICIENT_EVIDENCE | No implementado |
| C-015 | Phoenix Action Gate supera un baseline sencillo | INSUFFICIENT_EVIDENCE | Benchmark no ejecutado |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial |

## Formulación pública permitida hoy

> Phoenix Action Gate is an experimental project investigating a governed, fail-closed action pipeline for AI agents.

## Formulaciones prohibidas hoy

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a gates bespoke.”
- “La integración con Nemotron está terminada.”
- “Está listo para producción.”
- “H-PHX-05 está validada.”
