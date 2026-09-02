# EVIDENCE_RECEIPT_TAMPER_TRIAL_002 — protocolo preregistrado B1

Estado: `PREREGISTERED / NOT_IMPLEMENTED / NOT_EXECUTED`  
Fecha: 2026-09-02  
Modo: `VALIDATE`  
Punto de partida experimental: Trial 001 `CORROBORATED_BOUNDED_VS_B0`; candidato Phoenix aún sin claim público.

## 1. Pregunta

¿La diferencia observada en T5 frente al baseline snapshot B0 sigue aportando valor material cuando el rival se refuerza explícitamente con lineage de un salto, o un baseline pequeño y competente puede igualar la detección de `phoenix-evidence-receipt/0.1.0` con igual o menor complejidad?

Este ensayo existe para intentar refutar la interpretación de diferenciación, no para protegerla.

## 2. Sistemas congelados

### Phoenix candidate

`phoenix-evidence-receipt/0.1.0`

No modificar durante Trial 002 salvo que un defecto material obligue a parar y abrir un nuevo protocolo. Resultado Trial 001 ya observado:

- T0-T4/T6/T7: mismo verdict que B0;
- T5: `INVALID / LINEAGE_BINDING_INVALIDATED`;
- 296 LOC no blancas;
- receipt 872 bytes;
- verify median 0.163 ms / 250 iteraciones;
- 0 dependencias nuevas;
- dispatch false.

### Baseline B1

Nombre congelado:

`lineage-aware-receipt-baseline/0.2.0`

B1 debe conservar todas las capacidades de B0 y añadir únicamente la mínima competencia causal necesaria para no ser un baseline débil.

## 3. Contrato obligatorio B1

B1 DEBE:

- serialización canónica estable;
- SHA-256 y receipt determinista;
- binding completo de subject;
- binding completo de decision;
- binding de `policy_version` y fingerprint real del policy artifact;
- binding de evidencia explícita;
- fail-closed ante receipt inválido, truncado o con campos desconocidos;
- interpretar `derives_from` de la evidencia explícita;
- extraer y bindear fuentes causales de **un salto**;
- registrar para cada fuente: evidence id, resource y expected version;
- exigir que el current state satisfaga esas obligaciones al emitir el receipt;
- verificar las versiones actuales de las fuentes causales al validar el receipt;
- devolver `INVALID` si una fuente causal ligada cambia;
- devolver fail-closed si una fuente causal requerida no puede observarse;
- explicar resource, expected version y observed version en la invalidación;
- no invalidar cambios irrelevantes fuera del conjunto ligado;
- no usar red, LLM ni dispatch;
- no modificar `gate.mjs`, `plan-gate.mjs`, el fixture T5, B0 ni el candidato Phoenix.

B1 PUEDE implementar estos requisitos con una estructura distinta de Phoenix. No debe copiar deliberadamente código del candidato si una solución más pequeña y directa resulta suficiente.

## 4. Límites deliberados B1

B1 NO está obligado a:

- traversal multi-hop/transitivo más allá de un salto;
- proyectar estado futuro de ActionPlan;
- reconstruir writers o causalidad temporal entre pasos;
- interpretar semántica específica de políticas más allá de su artifact binding;
- usar Phoenix Neuron, RTM, OVAM o CX_PLANE;
- generar una arquitectura general de provenance.

Estos límites no son una debilidad artificial: Trial 002 pregunta específicamente si el discriminante T5 de un salto puede resolverse con un receipt lineage-aware pequeño.

## 5. Corpus congelado

Trial 002 reutiliza exactamente el material T0-T7 de Trial 001. No cambiar fixtures ni expectativas después de implementar B1.

### T0 — untouched

Esperado:

- B1 `VALID`;
- Phoenix `VALID`.

### T1 — decision changed

Esperado:

- B1 `INVALID`;
- Phoenix `INVALID`.

### T2 — subject changed

Esperado:

- B1 `INVALID`;
- Phoenix `INVALID`.

### T3 — policy artifact changed without version bump

Esperado:

- B1 `INVALID`;
- Phoenix `INVALID`.

### T4 — explicit evidence artifact changed

Esperado:

- B1 `INVALID`;
- Phoenix `INVALID`.

### T5 — causal source changed, evidence intact

La evidencia `generated-evidence-v2` permanece intacta y declara `derives_from: config.json@sha256:config-v2`; current state pasa a `sha256:config-v1`.

Esperado para un B1 competente:

- B1 `INVALID` con reason code de lineage/source mismatch claramente explicable;
- Phoenix `INVALID / LINEAGE_BINDING_INVALIDATED`.

Trial 002 NO espera que Phoenix gane T5. Si B1 no detecta T5 bajo este contrato, B1 no queda cualificado y debe corregirse antes de interpretar diferenciación.

### T6 — unrelated state changed

Esperado:

- B1 `VALID`;
- Phoenix `VALID`.

### T7 — receipt invalid/truncated

Esperado:

- B1 `INVALID`;
- Phoenix `INVALID`.

## 6. Controles adicionales obligatorios

C1 — current source unavailable:

- B1 debe fallar cerrado;
- Phoenix debe fallar cerrado.

C2 — issuance with already-unsatisfied causal source:

- B1 no debe emitir un receipt válido;
- Phoenix no debe emitir un receipt válido.

C3 — determinism:

- inputs idénticos producen receipt id/hash idénticos en cada sistema.

## 7. Métricas

Registrar por sistema:

- verdict y reason codes por T0-T7 y C1-C3;
- receipt bytes;
- LOC no blancas del módulo;
- módulos nuevos;
- dependencias nuevas;
- mediana local create/verify o, como mínimo, verify sobre 250 iteraciones equivalentes;
- false positives;
- false negatives;
- calidad de explicación de T5;
- dispatch attempted.

No usar score agregado para esconder un fallo material.

## 8. Interpretación preregistrada

### Resultado A — B1 iguala Phoenix con menor o similar complejidad

Si B1 pasa todos los hard gates, detecta T5 y su implementación es menor o materialmente similar en complejidad/coste:

`NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY`

Interpretación: causal receipt/tamper es útil, pero el valor observado puede conseguirse con un baseline lineage-aware pequeño. No venderlo como moat Phoenix.

### Resultado B — B1 iguala detección pero con coste materialmente mayor

Si B1 iguala verdicts pero requiere más complejidad, peor auditabilidad o coste claramente superior:

`MIXED_BOUNDED`

Debe documentarse el trade-off; no basta para superioridad general.

### Resultado C — Phoenix conserva una propiedad preregistrada que B1 no puede igualar sin ampliar materialmente su contrato

Solo puede considerarse un nuevo discriminante si la propiedad estaba preregistrada antes de implementar B1 o emerge como contraejemplo que se conserva y se somete después a un protocolo nuevo. No convertir observaciones post-hoc en claim.

### Resultado D — Phoenix falla un control que B1 pasa

`COUNTEREXAMPLE_BOUNDED`

Parar promoción del candidato y revisar si B1 es la solución preferible para G7.

## 9. Hard gates

Trial 002 solo es válido si:

- B1 es competente en T0-T7 y C1-C3;
- Phoenix permanece congelado;
- T5 no se cambia;
- no se modifica Gate/Plan Gate;
- no se introducen dependencias no justificadas;
- no existe dispatch;
- los resultados se preservan aunque sean adversos a Phoenix.

## 10. Claim boundary

Hasta ejecutar Trial 002 permanece prohibido afirmar:

- que receipt/tamper es exclusivo de Phoenix;
- que Phoenix supera a un baseline lineage-aware;
- que la diferencia frente a B0 constituye un moat;
- que el sistema está listo para producción.

Formulación permitida:

> Trial 001 reproduced a preregistered causal-source invalidation that a frozen snapshot receipt baseline did not detect. A stronger one-hop lineage-aware baseline has now been preregistered and must be evaluated before any receipt/tamper differentiation claim.

## 11. Orden autorizado tras este preregistro

1. congelar este protocolo en Git antes de implementar B1;
2. verificar worktree/checkpoint;
3. implementar únicamente `lineage-aware-receipt-baseline/0.2.0` y tests/probe asociados;
4. ejecutar regresión completa;
5. ejecutar comparación B1 vs Phoenix sobre el corpus congelado;
6. registrar el resultado incluso si elimina la diferenciación;
7. elegir para G7 la solución más simple que satisfaga evidencia, auditabilidad y reproducibilidad.

No push, PR, deploy ni submission sin autorización humana separada.
