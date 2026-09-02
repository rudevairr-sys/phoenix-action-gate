# Estado retomable

Fecha: 2026-09-02  
Estado: `G6_TAMPER_TRIAL001_CORROBORATED_VS_B0 / B1_PREREGISTERED`

## Reentrada

Proyecto: `01_MESA_PRINCIPAL/phoenix-action-gate`  
Rama: `review/g2-mvp-core`

Último checkpoint limpio anterior a este cierre:

`d089e8a test(g6): qualify snapshot receipt baseline`

No hay autorización para push, PR, deploy, dispatch ni submission.

## Corte panel previo

El corte `092d987` permanece validado con 58/58, rutas LIVE de secreto/destructivo, provider fail-closed separado de Phoenix DENY, Plan Gate lineage y dispatch false.

## EVIDENCE_RECEIPT_TAMPER_TRIAL_001

Estado:

`CORROBORATED_BOUNDED_VS_B0 / RESULT_FROZEN`

Baseline:

`snapshot-receipt-baseline/0.1.0`

Candidato:

`phoenix-evidence-receipt/0.1.0`

### Regresión actual

`npm test`

- 80 tests;
- 80 PASS;
- 0 FAIL;
- 529.5486 ms.

### Probe B0 ↔ Phoenix

Todos los hard gates preregistrados pasan.

- T0: B0 VALID / Phoenix VALID;
- T1: ambos INVALID por decision binding;
- T2: ambos INVALID por subject binding;
- T3: ambos INVALID por policy binding;
- T4: ambos INVALID por evidence binding;
- T5: **B0 VALID / Phoenix INVALID `LINEAGE_BINDING_INVALIDATED`**;
- T6: ambos VALID;
- T7: ambos INVALID por receipt contract.

Única divergencia: `T5`.

Detalle T5:

- evidence: `generated-evidence-v2`;
- source: `config.json`;
- expected: `sha256:config-v2`;
- observed: `sha256:config-v1`.

Complejidad observada:

- B0 receipt: 724 bytes;
- Phoenix receipt: 872 bytes;
- B0: 203 LOC no blancas;
- Phoenix: 296 LOC no blancas;
- ratio LOC: 1.4581x;
- mediana verify B0: 0.15215 ms;
- mediana verify Phoenix: 0.163 ms;
- dependencias nuevas Phoenix: 0;
- dispatch false.

Evidencia:

- `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-02_TAMPER_PHOENIX.json`;
- `docs/04-runtime/evidence/G2_RECEIPT_TAMPER_TRIAL_001_RESULT_2026-09-02.json`.

## Interpretación permitida

Trial 001 corrobora de forma acotada que el candidato causal detecta T5 frente al B0 snapshot congelado.

Esto NO autoriza afirmar que receipt/tamper sea exclusivo de Phoenix, un moat, una ventaja general o superior a un baseline lineage-aware.

Nivel probatorio: `TEST_EXECUTED`, no `RUNTIME_OBSERVED`.

## Trial 002 — B1

Protocolo:

`docs/02-research/EVIDENCE_RECEIPT_TAMPER_TRIAL_002_B1_PROTOCOL.md`

Estado:

`PREREGISTERED / NOT_IMPLEMENTED / NOT_EXECUTED`

Baseline congelado a construir después:

`lineage-aware-receipt-baseline/0.2.0`

B1 debe conservar B0 y añadir one-hop `derives_from`, current-state verification, fail-closed si la fuente no está disponible y explicación expected/observed.

Resultado que puede eliminar la diferenciación:

si B1 iguala T5 y controles con menor o similar complejidad, la conclusión será `NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY`.

## Phoenix Neuron

Permanece `reference_only`. No se ha importado core, RTM, OVAM ni CX_PLANE.

## Gates

- G0: WARN — revalidar reglas antes de submission.
- G1: PASS — Nebius/NVIDIA runtime observado.
- G2: PASS — gate, plan y panel/adaptador validados.
- G3: WARN — diferenciación acotada; evitar superioridad general.
- G4: WARN / ACTIVE_RESEARCH — Trial 001 favorable vs B0; B1 preregistrado pendiente.
- G5: PASS — panel LIVE validado.
- G6: PASS_WITH_BOUNDARY — Trial 001 `CORROBORATED_BOUNDED_VS_B0`; claim receipt/tamper frente a B1 bloqueado.
- G7: PENDING — clean clone + elección final de tamper solution + reproducibilidad.
- G8: PENDING — submission no autorizado.

## Estado MAVO

`phoenix-safe-3 / RUNNING`

Razón: Trial 001 está congelado, pero Trial 002 B1 está preregistrado y todavía no ejecutado.

## Único siguiente paso seguro

Antes de implementar B1, cerrar checkpoint local del resultado Trial 001 + protocolo B1. Después, y solo con continuidad humana, implementar únicamente `lineage-aware-receipt-baseline/0.2.0` contra el corpus congelado.

No modificar `gate.mjs`, `plan-gate.mjs`, B0, candidato Phoenix ni T5. No push/PR/deploy/submission.
