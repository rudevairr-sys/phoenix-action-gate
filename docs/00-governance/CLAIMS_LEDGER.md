# Claims ledger

Estados permitidos: `DOCUMENTED`, `IMPLEMENTED`, `TEST_EXECUTED`, `RUNTIME_OBSERVED`, `PRODUCTION_VALIDATED`, `HYPOTHESIS`, `NOT_CORROBORATED`, `INSUFFICIENT_EVIDENCE`.

| ID | Afirmación | Estado | Evidencia / límite |
|---|---|---|---|
| C-001 | Existe un repositorio público independiente | RUNTIME_OBSERVED | GitHub `rudevairr-sys/phoenix-action-gate` |
| C-002 | El proyecto SION sigue `origin/main` | RUNTIME_OBSERVED | `git status` observado antes de F0 |
| C-003 | Existe una fundación documental F0 | IMPLEMENTED | Esta rama y su commit |
| C-010 | Phoenix Neuron dispone de arquitectura previa relevante | DOCUMENTED | Fuente externa al repo; no importada |
| C-011 | H-PHX-04 no corroboró diferenciación en fixtures acotados | TEST_EXECUTED | Autoridad: Action Assurance Lab y checkpoint del Radar |
| C-012 | El pipeline completo podría aportar valor diferencial | HYPOTHESIS | H-PHX-05 ya tiene Trial 002 y Trial 003 favorables; falta llevar la capacidad diferencial a un plan multiacción live generado por Nemotron |
| C-013 | Phoenix Action Gate usa `nvidia/Nemotron-3_5-Lightning` para generar una ActionProposal estructurada | RUNTIME_OBSERVED | E-012; ejecución real en Token Factory, HTTP 200, sin dispatch |
| C-014 | Phoenix Action Gate llama a Nebius Token Factory en runtime | RUNTIME_OBSERVED | E-011, E-012 y E-015 |
| C-015 | Phoenix Action Gate supera de forma general a gates competentes | INSUFFICIENT_EVIDENCE | E-016/E-018/E-020 no autorizan superioridad general; los baselines están delimitados y aún falta runtime multiacción live |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial |
| C-018 | Existe un núcleo determinista que transforma `ActionProposal` en `PREPARED`, `REVIEW` o `DENY` sin dispatch | IMPLEMENTED | `src/gate.mjs`, fixtures y probes en `review/g2-mvp-core` |
| C-019 | La regresión local ampliada del producto pasa 29/29 tests | TEST_EXECUTED | E-019; incluye gate, reversibilidad, dependencias, stale-state, baseline state-aware, lineage, controles negativos y panel |
| C-020 | Una llamada real a Nemotron alimenta directamente el gate determinista y produce una `GateDecision` trazable | RUNTIME_OBSERVED | E-015: `R0/PREPARED`, decision hash, evidence bundle y `dispatch_attempted=false` |
| C-021 | Phoenix Plan Gate propaga un `DENY` de una dependencia a pasos posteriores donde el baseline independiente conserva decisiones locales menos restrictivas | TEST_EXECUTED | E-016; dos divergencias en Trial 001, con límite de que ambos agregados fueron `DENY` |
| C-022 | En el fixture preregistrado de estado obsoleto, todas las acciones del baseline son localmente no-denegadas, el baseline agrega `REVIEW` y Phoenix agrega `DENY` al detectar `README.md` esperado `v1`, proyectado `v2`, con último escritor trazable | TEST_EXECUTED | E-018; Trial 002 `FEASIBLE_DISCRIMINANT_PASS` |
| C-023 | Phoenix Plan Gate evita falsos positivos de stale-state cuando el consumidor declara correctamente la versión proyectada `v2` | TEST_EXECUTED | E-017; control negativo de Trial 002 mantiene `REVIEW` y no emite `STALE_STATE_DETECTED` |
| C-024 | El baseline `state-aware-baseline/0.1.0` está cualificado para Trial 003 porque reconstruye dependencias, estado proyectado y stale-state simple | TEST_EXECUTED | E-019; pasa el caso de stale-state de Trial 002 y declara `evidence_lineage_reasoning=false` |
| C-025 | En Trial 003 preregistrado, el baseline state-aware agrega `REVIEW` y Phoenix agrega `DENY` al detectar que `generated-evidence-v2` fue derivada de `config.json@config-v2` pero la fuente actual volvió a `config-v1` | TEST_EXECUTED | E-020; `EVIDENCE_LINEAGE_INVALIDATED`, invalidating writer `s3-config-v2-back-to-v1` |
| C-026 | Phoenix no invalida la misma evidencia en el control negativo cuando la fuente causal permanece en `config-v2` | TEST_EXECUTED | E-019/E-020; control negativo de Trial 003 permanece en `REVIEW` |

## Formulación pública permitida hoy

> Phoenix Action Gate is an experimental governed action pipeline for AI agents. Live NVIDIA Nemotron proposals can be evaluated without dispatch. In preregistered plan-level experiments, Phoenix detected both stale cross-step state and invalidated evidence lineage that progressively stronger fixed baselines missed under their declared boundaries, changing plan outcomes from REVIEW to DENY.

## Formulaciones prohibidas hoy

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a cualquier gate.”
- “Phoenix ha demostrado superioridad general.”
- “Lineage de evidencia es exclusivo de Phoenix.”
- “La integración completa está lista para producción.”
- “Está listo para producción.”
- “H-PHX-05 está completamente validada end-to-end.”
