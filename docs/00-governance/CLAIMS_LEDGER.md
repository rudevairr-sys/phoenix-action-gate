# Claims ledger

Estados permitidos: `DOCUMENTED`, `IMPLEMENTED`, `TEST_EXECUTED`, `RUNTIME_OBSERVED`, `PRODUCTION_VALIDATED`, `HYPOTHESIS`, `NOT_CORROBORATED`, `INSUFFICIENT_EVIDENCE`.

| ID | Afirmación | Estado | Evidencia / límite |
|---|---|---|---|
| C-001 | Existe un repositorio público independiente | RUNTIME_OBSERVED | GitHub `rudevairr-sys/phoenix-action-gate` |
| C-002 | El proyecto SION sigue `origin/main` | RUNTIME_OBSERVED | `git status` observado antes de F0 |
| C-003 | Existe una fundación documental F0 | IMPLEMENTED | Esta rama y su commit |
| C-010 | Phoenix Neuron dispone de arquitectura previa relevante | DOCUMENTED | Fuente externa al repo; no importada |
| C-011 | H-PHX-04 no corroboró diferenciación en fixtures acotados | TEST_EXECUTED | Autoridad: Action Assurance Lab y checkpoint del Radar |
| C-012 | En un plan multiacción LIVE generado por Nemotron, Phoenix detectó una invalidación de evidence lineage que el baseline state-aware usado en el experimento dejó en `REVIEW`, cambiando el resultado global a `DENY` | RUNTIME_OBSERVED | E-024; un único caso LIVE acotado, no superioridad general |
| C-013 | Phoenix Action Gate usa `nvidia/Nemotron-3_5-Lightning` para generar propuestas gobernables | RUNTIME_OBSERVED | E-012, E-015, E-022, E-024, E-026 y E-028; ejecución real en Token Factory, sin dispatch |
| C-014 | Phoenix Action Gate llama a Nebius Token Factory en runtime | RUNTIME_OBSERVED | E-011, E-012, E-015, E-022, E-024, E-026 y E-028 |
| C-015 | Phoenix Action Gate supera de forma general a gates competentes | INSUFFICIENT_EVIDENCE | Trials acotados y casos LIVE favorables no demuestran superioridad general |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial |
| C-018 | Existe un núcleo determinista que transforma `ActionProposal` en `PREPARED`, `REVIEW` o `DENY` sin dispatch | IMPLEMENTED | `src/gate.mjs`, fixtures y probes en `review/g2-mvp-core` |
| C-019 | La regresión local ampliada del corte multiacción compacto pasa 52/52 tests | TEST_EXECUTED | E-025; corte histórico previo al bloque panel final |
| C-020 | Una llamada real a Nemotron alimenta directamente el gate determinista y produce una `GateDecision` trazable | RUNTIME_OBSERVED | E-015, E-022, E-026 y E-028; decisiones visibles, evidence bundle y `dispatch_attempted=false` |
| C-021 | Phoenix Plan Gate propaga un `DENY` de una dependencia a pasos posteriores donde el baseline independiente conserva decisiones locales menos restrictivas | TEST_EXECUTED | E-016; dos divergencias en Trial 001 histórico, con límite de que ambos agregados fueron `DENY` |
| C-022 | En el fixture preregistrado de estado obsoleto, todas las acciones del baseline son localmente no-denegadas, el baseline agrega `REVIEW` y Phoenix agrega `DENY` al detectar `README.md` esperado `v1`, proyectado `v2`, con último escritor trazable | TEST_EXECUTED | E-018; Trial 002 histórico |
| C-023 | Phoenix Plan Gate evita falsos positivos de stale-state cuando el consumidor declara correctamente la versión proyectada `v2` | TEST_EXECUTED | E-017; control negativo de Trial 002 histórico |
| C-024 | El baseline `state-aware-baseline/0.1.0` está cualificado para Trial 003 histórico porque reconstruye dependencias, estado proyectado y stale-state simple | TEST_EXECUTED | E-019 |
| C-025 | En Trial 003 histórico, el baseline state-aware agrega `REVIEW` y Phoenix agrega `DENY` al detectar que `generated-evidence-v2` fue derivada de `config.json@config-v2` pero la fuente actual volvió a `config-v1` | TEST_EXECUTED | E-020; `EVIDENCE_LINEAGE_INVALIDATED` |
| C-026 | Phoenix no invalida la misma evidencia en el control negativo cuando la fuente causal permanece en `config-v2` | TEST_EXECUTED | E-019/E-020 |
| C-027 | El adaptador conversacional `emit_phoenix_turn` fue observado LIVE con Nemotron para una lectura segura, una lectura de secreto y un comando allowlisted, sin dispatch | RUNTIME_OBSERVED | E-022 y E-028 |
| C-028 | El adaptador `compact-plan/0.2` puede expandir una propuesta semántica compacta de Nemotron al contrato canónico de Plan Gate preservando dependencias, estado explícito y evidence lineage | RUNTIME_OBSERVED | E-024 + E-025 + E-026 |
| C-029 | El bloque final de panel/adaptador pasa 58/58 tests, incluyendo colapso de tool calls operacionalmente equivalentes y fail-closed de llamadas materialmente distintas | TEST_EXECUTED | E-027 |
| C-030 | En el corte actual del panel, una petición LIVE de lectura de `.env` alcanza Phoenix como `READ_CONTEXT` y termina `R3/DENY/SECRET_BOUNDARY` sin dispatch | RUNTIME_OBSERVED | E-028 |
| C-031 | El panel distingue un fallo previo a ActionProposal de un `DENY` de política sobre una propuesta válida | RUNTIME_OBSERVED | E-026 y E-028 |
| C-032 | En Trial 001 de receipt/tamper, `phoenix-evidence-receipt/0.1.0` detecta T5 como `INVALID/LINEAGE_BINDING_INVALIDATED` mientras el B0 snapshot congelado permanece `VALID`, con el resto de hard gates cumplidos | TEST_EXECUTED | E-031 y E-032; `CORROBORATED_BOUNDED_VS_B0`, no claim frente a B1 |
| C-033 | `snapshot-receipt-baseline/0.1.0` es un baseline competente para Trial 001: detecta alteraciones de decision, subject, policy artifact, evidencia explícita y receipt contract, conserva controles válidos y deja T5 en `VALID` por no hacer reasoning de estado/lineage | TEST_EXECUTED | E-029 y E-030 |
| C-034 | `phoenix-evidence-receipt/0.1.0` conserva T6 `VALID`, es determinista, falla cerrado sin current causal state y rechaza emitir receipt si la obligación causal ya está incumplida | TEST_EXECUTED | E-031; 80/80 regresión |
| C-035 | Receipt/tamper constituye un diferenciador Phoenix frente a un baseline lineage-aware competente | INSUFFICIENT_EVIDENCE | B1 `lineage-aware-receipt-baseline/0.2.0` está preregistrado en E-033 pero todavía no implementado ni ejecutado |

## Formulación pública permitida hoy

> Phoenix Action Gate is an experimental governed action pipeline for AI agents. Live NVIDIA Nemotron proposals can be evaluated without dispatch. The current panel distinguishes provider fail-closed from Phoenix policy decisions and demonstrates bounded state/evidence-lineage checks. In a separate preregistered local receipt trial, an isolated Phoenix causal receipt candidate detected the T5 causal-source invalidation that a frozen snapshot receipt baseline did not, while all declared controls passed. This result is limited to that B0 comparison; a stronger one-hop lineage-aware baseline is preregistered and must be evaluated before any receipt/tamper differentiation claim.

## Formulaciones prohibidas hoy

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a cualquier gate.”
- “Phoenix ha demostrado superioridad general.”
- “Lineage de evidencia es exclusivo de Phoenix.”
- “Receipt/tamper ya es un moat Phoenix.”
- “Phoenix supera a un baseline lineage-aware competente.”
- “La integración completa está lista para producción.”
- “Está listo para producción.”
- “H-PHX-05 está completamente validada end-to-end.”
