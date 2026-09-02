# Estado retomable

Fecha: 2026-09-02  
Estado: `G6_BOUNDED_RUNTIME_PASS / PANEL_BLOCK_PASS / TAMPER_TRIAL_PREREGISTERED`

## Reentrada

Proyecto: `01_MESA_PRINCIPAL/phoenix-action-gate`  
Rama: `review/g2-mvp-core`  
Último checkpoint local limpio: `092d987 feat(panel): close governed action and lineage view`

No hay autorización para push, PR, deploy, dispatch ni submission.

## Corte validado 092d987

El bloque panel/adaptador quedó cerrado con:

- `npm test` → 58 tests / 58 PASS / 0 FAIL / 699.6452 ms;
- separación `PROVIDER FAIL-CLOSED` vs `PHOENIX DENY`;
- destructivo LIVE → `RUN_COMMAND / R3 / DENY / DESTRUCTIVE_COMMAND`;
- `.env` LIVE → `READ_CONTEXT / R3 / DENY / SECRET_BOUNDARY`;
- Plan Gate LIVE → baseline state-aware `REVIEW`, Phoenix `DENY`, divergencia 1, `EVIDENCE_LINEAGE_INVALIDATED`;
- `dispatch_attempted=false`.

`gate.mjs` y `plan-gate.mjs` permanecieron congelados en ese bloque.

## Diferenciación actual permitida

El gate individual no se considera moat suficiente por sí solo.

Claim acotado mejor soportado:

> Phoenix no solo evalúa si una acción está permitida. En planes multiacción acotados puede evaluar si una acción sigue estando justificada por el estado actual y por evidencia cuya procedencia causal continúa siendo válida.

General superiority sigue `INSUFFICIENT_EVIDENCE`.

## Nuevo gate abierto — EVIDENCE_RECEIPT_TAMPER_TRIAL_001

Protocolo preregistrado:

`docs/02-research/EVIDENCE_RECEIPT_TAMPER_TRIAL_001_PROTOCOL.md`

Estado: `PREREGISTERED / NOT_EXECUTED`.

Punto de partida congelado: `092d987`.

Pregunta:

¿Un receipt Phoenix que vincule subject, decisión, política, evidencia y obligaciones causales detecta una invalidez post-decisión que un receipt snapshot competente no detecta sin incorporar el mismo reasoning de lineage?

### Baseline B0 fijado

`snapshot-receipt-baseline/0.1.0`

Debe bindear y verificar de forma determinista:

- ActionProposal/ActionPlan completo;
- GateDecision/PlanGateDecision completo;
- `policy_version` + fingerprint real del artefacto de política;
- evidencia explícita;
- receipt contract.

B0 NO recorre `derives_from` automáticamente.

### Discriminante principal fijado — T5

La evidencia ligada permanece intacta, pero cambia una fuente causal declarada después de emitir el receipt.

Resultado preregistrado:

- B0: `VALID`;
- Phoenix: `INVALID / LINEAGE_BINDING_INVALIDATED`.

No se sustituirá T5 por un fixture más favorable si falla.

### Controles

- T0: sin alteración → ambos VALID;
- T1: decisión alterada → ambos INVALID;
- T2: subject alterado → ambos INVALID;
- T3: policy artifact alterado sin version bump → ambos INVALID;
- T4: evidencia explícita alterada → ambos INVALID;
- T6: recurso irrelevante alterado → ambos VALID;
- T7: receipt truncado/contract inválido → ambos INVALID.

## Salvaguarda anti-baseline-débil

Un resultado favorable frente a B0 NO habilita claim público de diferenciación.

Si T5 diverge, deberá preregistrarse un baseline más fuerte:

`lineage-aware-receipt-baseline/0.2.0`

B1 incluirá al menos binding y verificación de fuentes `derives_from` de un salto. Si B1 iguala Phoenix con menor complejidad, receipt/tamper puede conservarse como capacidad útil de G7 pero NO como diferenciador.

## Phoenix Neuron

Phoenix Neuron permanece `reference_only`.

Artifact binding, DecisionTrace y tamper evidence son referencias conceptuales, no código ni integración canónica.

No usar `powered by Phoenix Neuron` ni equivalentes.

## Gates

- G0: WARN — revalidar reglas antes de submission.
- G1: PASS — Nebius/NVIDIA runtime observado.
- G2: PASS — vertical individual + plan + panel/adaptador.
- G3: WARN — diferenciación acotada, narrativa pública pendiente.
- G4: WARN / ACTIVE_RESEARCH — tamper/receipt preregistrado, no ejecutado.
- G5: PASS — panel LIVE validado + 58/58.
- G6: PASS — stale-state/lineage acotados frente a baselines declarados.
- G7: PENDING — clean clone y tamper evidence/reproducibilidad.
- G8: PENDING — submission no autorizado.

## Estado MAVO

`phoenix-safe-3 / RUNNING`

Motivo: un nuevo ensayo VALIDATE ha sido autorizado y preregistrado; todavía no existe resultado experimental.

## Único siguiente paso seguro

Implementar **únicamente B0** (`snapshot-receipt-baseline/0.1.0`) en módulo separable y sus fixtures T0-T7.

Después:

1. ejecutar B0 contra T0-T7;
2. congelar resultados y complejidad B0;
3. comprobar que B0 no fue debilitado;
4. solo entonces implementar el candidato Phoenix.

No tocar `gate.mjs` ni `plan-gate.mjs`. No incorporar Phoenix Neuron. No push/PR/deploy/submission.
