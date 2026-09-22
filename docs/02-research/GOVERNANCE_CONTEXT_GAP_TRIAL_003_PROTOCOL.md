# GOVERNANCE_CONTEXT_GAP_TRIAL_003 — protocolo preregistrado

Estado: `PREREGISTERED / NOT_EXECUTED`  
Fecha: 2026-09-03  
Modo: `VALIDATE`  
Punto de partida: Trial 002 cerró `NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY` para lineage causal de un salto.

## 1. Pregunta

¿`phoenix-evidence-receipt/0.1.0` y `lineage-aware-receipt-baseline/0.2.0` verifican únicamente la integridad de los objetos suministrados, o además garantizan que evidencia, estado y política forman un contexto de gobernanza completo y coherente?

Este ensayo busca contraejemplos de corrección. T8-T10 NO son por sí mismos claims de diferenciación.

## 2. Sistemas congelados

- Phoenix: `phoenix-evidence-receipt/0.1.0`
- Baseline: `lineage-aware-receipt-baseline/0.2.0`

Durante este ensayo no modificar ninguno de los dos módulos, `gate.mjs`, `plan-gate.mjs` ni el fixture base.

## 3. Hipótesis falsables

### T8 — EVIDENCE_OMISSION

El ActionPlan/PlanDecision requiere `generated-evidence-v2`, pero la emisión y verificación reciben `evidence_artifacts: []`.

Hipótesis estática H8:
- Phoenix actual puede emitir un receipt sin evidencia explícita y luego verificarlo como `VALID`.
- B1 actual puede comportarse igual.

Comportamiento de gobernanza deseable para una futura solución:
- rechazo de emisión o `INVALID` por evidencia requerida ausente.

H8 queda refutada si el sistema actual rechaza la emisión o invalida el receipt por completitud de evidencia.

### T9 — EVIDENCE_SELF_STALE

Se emite un receipt válido para `generated.md@sha256:generated-v2`, derivado de `config.json@sha256:config-v2`. Después:

- `config.json` permanece en `sha256:config-v2`;
- el evidence artifact suministrado permanece siendo el snapshot v2;
- el estado actual de `generated.md` cambia a `sha256:generated-v3`.

Hipótesis estática H9:
- Phoenix actual puede seguir devolviendo `VALID` porque comprueba la fuente causal `config.json`, pero no la actualidad del recurso del propio artefacto `generated.md`.
- B1 actual puede comportarse igual.

Comportamiento deseable futuro:
- `INVALID` por evidencia/artefacto obsoleto respecto al estado actual.

H9 queda refutada si el sistema actual detecta que el recurso evidenciado ya no está en la versión ligada.

### T10 — POLICY_DECISION_COHERENCE

El `decision.policy_version` permanece `phoenix-plan-gate/0.3.0`, pero el receipt se emite y verifica declarando una versión de política distinta, manteniendo consistentes entre sí los argumentos externos de emisión/verificación.

Hipótesis estática H10:
- Phoenix actual puede emitir y verificar `VALID` porque liga el hash completo de la decisión y, por separado, el `policy_version` suministrado, sin exigir `decision.policy_version === policy_version`.
- B1 actual puede comportarse igual.

Comportamiento deseable futuro:
- rechazo de emisión o `INVALID` por incoherencia entre política de la decisión y política declarada/bindeada.

H10 queda refutada si el sistema actual exige esa coherencia.

## 4. Controles

C0 — fixture base intacto debe seguir `VALID` en ambos sistemas.

C1 — no red, no LLM, no dispatch.

C2 — los receipts se crean desde los mismos objetos de entrada salvo la mutación específica de cada trial.

C3 — no usar T8-T10 para afirmar superioridad de Phoenix frente a B1. Si ambos fallan, se registra una brecha común.

## 5. Clasificación de resultados

Por trial y sistema:

- `COUNTEREXAMPLE`: el sistema devuelve `VALID` donde el requisito de coherencia definido por el trial exige rechazo/invalidación.
- `REFUTED_STATIC_HYPOTHESIS`: el sistema ya detecta correctamente la incoherencia.
- `ERROR`: el ensayo no permite concluir por fallo de entorno o fixture.

Interpretación agregada:

- Si Phoenix y B1 fallan igual: `COMMON_GOVERNANCE_GAP / NOT_DIFFERENTIATING`.
- Si Phoenix pasa y B1 falla: `CANDIDATE_DIFFERENTIATOR`, sujeto a baseline competente nuevo antes de claim.
- Si B1 pasa y Phoenix falla: `PHOENIX_COUNTEREXAMPLE / PROMOTION_BLOCKED` para esa propiedad.
- Si ambos pasan: las hipótesis estáticas quedan refutadas y se poda esta línea.

## 6. Prohibiciones

Hasta cerrar este ensayo:

- no parchear `phoenix-evidence-receipt/0.1.0`;
- no parchear B1;
- no llamar `Governance Context Binding` a una capacidad implementada;
- no presentar T8-T10 como moat;
- no ocultar resultados adversos.

## 7. Siguiente decisión

Si aparece al menos un `COMMON_GOVERNANCE_GAP`, diseñar después —en protocolo separado— la solución mínima que cierre el gap y un baseline competente alternativo. Solo entonces evaluar si existe diferenciación o simplemente una mejora de corrección útil.
