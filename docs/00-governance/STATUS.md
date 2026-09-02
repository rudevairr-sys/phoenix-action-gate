# Estado retomable

Fecha: 2026-09-02  
Estado: `G6_BOUNDED_RUNTIME_PASS / PANEL_BLOCK_PASS / TAMPER_B0_QUALIFIED`

## Reentrada

Proyecto: `01_MESA_PRINCIPAL/phoenix-action-gate`  
Rama: `review/g2-mvp-core`

Checkpoint limpio anterior al bloque B0:

`9ba5435 docs(g6): preregister evidence receipt tamper trial`

No hay autorización para push, PR, deploy, dispatch ni submission.

## Corte panel previo

El corte `092d987` permanece validado:

- 58/58 tests;
- `PROVIDER FAIL-CLOSED` separado de `PHOENIX DENY`;
- destructivo LIVE → `R3/DENY/DESTRUCTIVE_COMMAND`;
- `.env` LIVE → `R3/DENY/SECRET_BOUNDARY`;
- Plan Gate LIVE → baseline state-aware `REVIEW`, Phoenix `DENY`, `EVIDENCE_LINEAGE_INVALIDATED`;
- dispatch false.

## EVIDENCE_RECEIPT_TAMPER_TRIAL_001

Protocolo:

`docs/02-research/EVIDENCE_RECEIPT_TAMPER_TRIAL_001_PROTOCOL.md`

Estado general del ensayo:

`PREREGISTERED / BASELINE_B0_EXECUTED / PHOENIX_CANDIDATE_NOT_IMPLEMENTED`

### Baseline B0

Versión:

`snapshot-receipt-baseline/0.1.0`

Capacidades ejecutadas:

- canonical hashing;
- subject binding;
- decision binding;
- policy artifact binding;
- explicit evidence binding;
- fail-closed de receipt inválido;
- determinismo;
- sin state reasoning;
- sin evidence-lineage reasoning;
- sin dispatch.

### Regresión real en SION

`npm test`

- tests: 68;
- PASS: 68;
- FAIL: 0;
- duración: 593.0824 ms.

Evidencia:

`docs/04-runtime/evidence/G2_SION_TESTS_2026-09-02_TAMPER_B0.json`

### Probe B0 real

Comando ejecutado por el operador:

`node tools/g2_receipt_baseline_probe.mjs`

Resultado:

- T0 `VALID` — PASS;
- T1 `INVALID / DECISION_BINDING_MISMATCH` — PASS;
- T2 `INVALID / SUBJECT_BINDING_MISMATCH` — PASS;
- T3 `INVALID / POLICY_BINDING_MISMATCH` — PASS;
- T4 `INVALID / EVIDENCE_BINDING_MISMATCH` — PASS;
- T5 `VALID / SNAPSHOT_BINDINGS_VALID` — PASS;
- T6 `VALID / SNAPSHOT_BINDINGS_VALID` — PASS;
- T7 `INVALID / RECEIPT_CONTRACT_INVALID` — PASS;
- `all_preregistered_expectations_met=true`;
- receipt determinista;
- receipt: 724 bytes;
- módulo B0: 203 LOC no blancas;
- verificación mediana: 0.14765 ms / 250 iteraciones locales;
- dependencias añadidas: 0;
- dispatch false.

Evidencia:

`docs/04-runtime/evidence/G2_RECEIPT_TAMPER_B0_BASELINE_2026-09-02.json`

## Interpretación

B0 queda `QUALIFIED / FROZEN` como baseline competente de integridad snapshot.

T5 ha hecho exactamente lo preregistrado para B0: el cambio de `config.json@v2` a `config.json@v1` no altera subject, decisión, policy artifact ni evidencia explícita, por lo que B0 mantiene el receipt como `VALID`.

Esto NO es todavía una victoria de Phoenix. H-TAMPER-001 permanece `HYPOTHESIS` porque `phoenix-evidence-receipt/0.1.0` todavía no ha sido implementado ni ejecutado.

## Salvaguarda anti-baseline-débil

Si el candidato Phoenix produce la divergencia T5 prevista, no se publicará aún como diferenciador. Antes debe preregistrarse y ejecutarse `lineage-aware-receipt-baseline/0.2.0`.

Si B1 iguala la detección con menor complejidad, receipt/tamper se conservará como capacidad útil para G7, no como moat.

## Phoenix Neuron

Permanece `reference_only`. No se ha importado código, RTM, OVAM ni CX_PLANE. Artifact binding y DecisionTrace son únicamente referencias conceptuales.

## Gates

- G0: WARN — revalidar reglas antes de submission.
- G1: PASS — Nebius/NVIDIA runtime observado.
- G2: PASS — gate, plan y panel/adaptador validados.
- G3: WARN — diferenciación acotada; evitar superioridad general.
- G4: WARN / ACTIVE_RESEARCH — B0 cualificado; candidato Phoenix pendiente.
- G5: PASS — panel LIVE validado.
- G6: PASS — stale-state/lineage acotados y B0 tamper baseline cualificado.
- G7: PENDING — clean clone + tamper evidence final + reproducibilidad.
- G8: PENDING — submission no autorizado.

## Estado MAVO

`phoenix-safe-3 / RUNNING`

Razón: B0 está ejecutado y congelado; el ensayo sigue abierto hasta evaluar el candidato Phoenix y, si procede, B1.

## Único siguiente paso seguro

Crear `phoenix-evidence-receipt/0.1.0` como módulo separado y ejecutar exactamente T0-T7 contra el mismo fixture preregistrado.

No modificar `gate.mjs` ni `plan-gate.mjs`. No cambiar T5. No importar Phoenix Neuron. No push/PR/deploy/submission.
