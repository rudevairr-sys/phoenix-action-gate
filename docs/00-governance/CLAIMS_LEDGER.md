# Claims ledger

Fecha de reconciliación: 2026-09-18  
Estado: `B1_RESULT_RECONCILED / CONTEST_SURFACE_PREP / CURRENT_CUT_TEST_PASS`

Estados permitidos: `DOCUMENTED`, `IMPLEMENTED`, `TEST_EXECUTED`, `RUNTIME_OBSERVED`, `PRODUCTION_VALIDATED`, `HYPOTHESIS`, `NOT_CORROBORATED`, `INSUFFICIENT_EVIDENCE`.

| ID | Afirmación | Estado | Evidencia / límite |
|---|---|---|---|
| C-001 | Existe un repositorio público independiente | RUNTIME_OBSERVED | GitHub `rudevairr-sys/phoenix-action-gate`; el corte público va por detrás del worktree local. |
| C-010 | Phoenix Neuron dispone de arquitectura previa relevante | DOCUMENTED | Fuente externa al repo; `reference_only`; no importada ni publicable automáticamente. |
| C-011 | H-PHX-04 no corroboró diferenciación en fixtures acotados | TEST_EXECUTED | Autoridad: Action Assurance Lab y checkpoint del Radar. |
| C-012 | En un plan multiacción LIVE generado por Nemotron, Phoenix detectó una invalidación de evidence lineage que el baseline state-aware usado en el experimento dejó en `REVIEW`, cambiando el resultado global a `DENY` | RUNTIME_OBSERVED | E-024; un único caso LIVE acotado, no superioridad general. |
| C-013 | Phoenix Action Gate usa `nvidia/Nemotron-3_5-Lightning` para generar propuestas gobernables | RUNTIME_OBSERVED | E-012, E-015, E-022, E-024, E-026 y E-028; revalidar modelo exacto antes de submission. |
| C-014 | Phoenix Action Gate llama a Nebius Token Factory en runtime | RUNTIME_OBSERVED | E-011, E-012, E-015, E-022, E-024, E-026 y E-028; revalidar en corte final. |
| C-015 | Phoenix Action Gate supera de forma general a gates competentes | INSUFFICIENT_EVIDENCE | Trials acotados y casos LIVE favorables no demuestran superioridad general. |
| C-016 | Phoenix Action Gate está validado en producción | INSUFFICIENT_EVIDENCE | Producción fuera de alcance; no hay dispatch productivo. |
| C-017 | Phoenix tiene ventaja comercial por su arquitectura | INSUFFICIENT_EVIDENCE | No existe validación comercial. |
| C-018 | Existe un núcleo determinista que transforma `ActionProposal` en `PREPARED`, `REVIEW` o `DENY` sin dispatch | TEST_EXECUTED | E-045; regresión actual 122/122 PASS. No implica runtime live ni producción. |
| C-020 | Una llamada real a Nemotron alimenta directamente el gate determinista y produce una `GateDecision` trazable | RUNTIME_OBSERVED | E-015, E-022, E-026 y E-028; decisiones visibles, evidence bundle y `dispatch_attempted=false`; revalidar live antes de submission. |
| C-025 | En Trial 003 histórico, el baseline state-aware agrega `REVIEW` y Phoenix agrega `DENY` al detectar que `generated-evidence-v2` fue derivada de `config.json@config-v2` pero la fuente actual volvió a `config-v1` | TEST_EXECUTED | E-020; `EVIDENCE_LINEAGE_INVALIDATED`; caso acotado. |
| C-027 | El adaptador conversacional `emit_phoenix_turn` fue observado LIVE con Nemotron para una lectura segura, una lectura de secreto y un comando allowlisted, sin dispatch | RUNTIME_OBSERVED | E-022 y E-028. |
| C-028 | El adaptador `compact-plan/0.2` puede expandir una propuesta semántica compacta de Nemotron al contrato canónico de Plan Gate preservando dependencias, estado explícito y evidence lineage | TEST_EXECUTED | E-045 incluye compact live plan contract; runtime live previo en E-024/E-026. |
| C-029 | El bloque actual de panel/adaptador y superficie de jurado pasa 122/122 tests | TEST_EXECUTED | E-045; Node v24.12.0, `npm test`, 122 PASS, 0 FAIL, 737.3368 ms. |
| C-030 | En el corte del panel, una petición LIVE de lectura de `.env` alcanza Phoenix como `READ_CONTEXT` y termina `R3/DENY/SECRET_BOUNDARY` sin dispatch | RUNTIME_OBSERVED | E-028; evidencia previa. |
| C-031 | El panel distingue un fallo previo a ActionProposal de un `DENY` de política sobre una propuesta válida | TEST_EXECUTED | E-045 cubre panel endpoints y fail-closed; runtime previo en E-026/E-028. |
| C-032 | En Trial 001 de receipt/tamper, `phoenix-evidence-receipt/0.1.0` detecta T5 como `INVALID/LINEAGE_BINDING_INVALIDATED` mientras el B0 snapshot congelado permanece `VALID`, con el resto de hard gates cumplidos | TEST_EXECUTED | E-031, E-032 y regresión actual E-045; `CORROBORATED_BOUNDED_VS_B0`, no claim frente a B1. |
| C-033 | `snapshot-receipt-baseline/0.1.0` es un baseline competente para Trial 001 dentro de su contrato | TEST_EXECUTED | E-029, E-030 y E-045. |
| C-034 | `phoenix-evidence-receipt/0.1.0` conserva T6 `VALID`, es determinista, falla cerrado sin current causal state y rechaza emitir receipt si la obligación causal ya está incumplida | TEST_EXECUTED | E-031 y E-045. |
| C-035 | Receipt/tamper constituye un diferenciador Phoenix frente a un baseline lineage-aware competente | NOT_CORROBORATED | E-034 ejecuta B1 y concluye `NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY`. Claim bloqueado. |
| C-036 | `lineage-aware-receipt-baseline/0.2.0` iguala el verdict semántico de Phoenix en el corpus Trial 002 B1 con menor LOC y sin dependencias nuevas | TEST_EXECUTED | E-034 y E-045; adverso a diferenciación Phoenix, útil para seleccionar solución simple. |
| C-037 | La Jury Surface v0.1 convierte la demo técnica en experiencia comprensible para jurado | TEST_EXECUTED | E-035/E-036/E-037/E-038 y E-045; revalidar visualmente antes de vídeo. |
| C-038 | El Contest Prep Pack 2026-09-18 existe localmente | IMPLEMENTED | E-039; archivos en `BUILDER_OMEGA_CONTEST_PREP_20260918/`. |
| C-039 | Phoenix Action Gate está listo para submission Devpost | INSUFFICIENT_EVIDENCE | Tests actuales pasan, pero falta clean clone, live Nebius revalidation o clasificación final, demo URL/test build, vídeo y autorización humana de envío. |

## Formulación pública permitida ahora

> Phoenix Action Gate is an experimental pre-execution governance layer for AI coding agents. NVIDIA Nemotron proposes actions or compact plans through Nebius Token Factory, while a deterministic gate checks whether the action is allowed, reversible and still justified by current evidence. The current local regression passes 122/122 tests, and the MVP keeps dispatch disabled.

## Formulación pública corta

> A justification firewall for AI coding agents.

## Formulaciones prohibidas

- “Phoenix hace seguros a los agentes.”
- “Phoenix supera a cualquier gate.”
- “Phoenix ha demostrado superioridad general.”
- “Lineage de evidencia es exclusivo de Phoenix.”
- “Receipt/tamper ya es un moat Phoenix.”
- “Phoenix supera a un baseline lineage-aware competente.”
- “La integración completa está lista para producción.”
- “Está listo para producción.”
- “Phoenix Action Gate está powered by Phoenix Neuron.”
- “H-PHX-05 está completamente validada end-to-end.”
- “Submission-ready.”

## Nota de continuidad

Este ledger sustituye la lectura anterior en la que B1 aparecía solo como preregistrado/no ejecutado y añade la regresión actual del 2026-09-18: `npm test`, 122/122 PASS.
