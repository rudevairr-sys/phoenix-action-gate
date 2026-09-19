# GOVERNANCE_CONTEXT_BINDING_TRIAL_004 — protocolo preregistrado

Estado: `PREREGISTERED / NOT_IMPLEMENTED / NOT_EXECUTED`  
Fecha: 2026-09-03  
Modo: `VALIDATE`

## 1. Punto de partida

Trial 003 reprodujo tres brechas comunes en `phoenix-evidence-receipt/0.1.0` y `lineage-aware-receipt-baseline/0.2.0`:

- T8: evidencia requerida omitida pero receipt `VALID`;
- T9: recurso de la propia evidencia obsoleto pero receipt `VALID`;
- T10: `decision.policy_version` incoherente con la política ligada pero receipt `VALID`.

Estas brechas son de corrección/gobernanza. No constituyen por sí mismas diferenciación Phoenix.

## 2. Pregunta

¿Puede una candidata mínima de `Governance Context Binding` cerrar T8-T10 y además detectar incoherencias entre sujeto, decisión, registro de evidencia y estado actual, sin introducir una arquitectura innecesaria; y puede un baseline competente más simple conseguir lo mismo con menor o similar complejidad?

## 3. Sistemas a implementar

### Candidata Phoenix

Nombre congelado:

`phoenix-governance-context-receipt/0.2.0`

Debe ser un módulo nuevo. No modificar `phoenix-evidence-receipt/0.1.0`.

### Baseline competente

Nombre congelado:

`coherent-context-receipt-baseline/0.1.0`

Debe resolver el mismo contrato de corrección con la implementación más pequeña y directa razonable. No debe copiar deliberadamente la estructura de la candidata si puede resolverlo con menos piezas.

## 4. Contrato mínimo común

Ambos sistemas DEBEN conservar:

- serialización canónica estable;
- SHA-256;
- receipt determinista;
- binding de subject completo;
- binding de decision completo;
- binding de policy artifact real;
- binding de evidencia explícita;
- lineage causal de un salto;
- fail-closed ante receipt inválido/truncado/campos desconocidos;
- no red, no LLM, no dispatch;
- cambio irrelevante fuera del conjunto gobernado no invalida.

Además DEBEN cerrar las brechas reproducidas:

1. **Completitud de evidencia**  
   Toda evidencia requerida por `decision.steps[].required_evidence` debe estar presente al emitir y verificar.

2. **Coherencia evidencia/decisión**  
   Para cada evidencia requerida, el artefacto suministrado debe ser coherente con `decision.evidence_registry[evidence_id]` al menos en `resource`, `version` y `derives_from`.

3. **Actualidad del artefacto evidenciado**  
   `current_state[artifact.resource]` debe existir y coincidir con `artifact.version`.

4. **Actualidad de fuentes causales**  
   Cada `derives_from[].resource/version` debe seguir satisfecho en `current_state`.

5. **Coherencia política/decisión**  
   `decision.policy_version` debe coincidir exactamente con `policy_version` ligado.

6. **Coherencia sujeto/decisión para PLAN**  
   `decision.plan_id` debe coincidir exactamente con `subject.plan_id`.

## 5. Diferencia permitida de diseño

La candidata Phoenix PUEDE materializar explícitamente un `governance_context`/`context_hash` que haga auditable el conjunto coherente ligado.

El baseline NO está obligado a materializar ese objeto si puede comprobar los mismos invariantes directamente.

Un `context_hash` no se considerará ventaja por sí solo si no cambia un resultado observable o una propiedad de auditabilidad medible.

## 6. Corpus preregistrado

### C0 — intacto
- candidata `VALID`;
- baseline `VALID`.

### T5 — fuente causal cambia
`config.json v2 -> v1`, evidencia intacta.
- ambos `INVALID`.

### T6 — estado irrelevante cambia
`unrelated.txt v1 -> v2`.
- ambos `VALID`.

### T8 — evidencia requerida omitida
`decision` requiere `generated-evidence-v2`, pero `evidence_artifacts=[]`.
- ambos deben rechazar emisión o devolver `INVALID`.

### T9 — evidencia propia obsoleta
`generated.md v2 -> v3`, `config.json` permanece v2, snapshot de evidencia permanece v2.
- ambos `INVALID`.

### T10 — política/decisión incoherente
`decision.policy_version=A`, `policy_version=B`.
- ambos deben rechazar emisión o devolver `INVALID`.

### T11 — sujeto/decisión mezclados
El subject presentado tiene otro `plan_id`, mientras la decisión conserva el plan_id original. Se intenta emitir desde esa pareja incoherente.
- ambos deben rechazar emisión o devolver `INVALID`.

### T12 — evidencia no coincide con registry de decisión
Se presenta el mismo `evidence_id`, pero el artefacto declara `resource/version/derives_from` distintos de `decision.evidence_registry[evidence_id]`, con current state manipulado para que esas nuevas declaraciones sean internamente consistentes.
- ambos deben rechazar emisión o devolver `INVALID`.

### T13 — evidencia requerida no observable en estado actual
La evidencia requerida está presente, pero `current_state` no contiene el recurso del propio artefacto.
- ambos `INVALID` o rechazo de emisión.

## 7. Controles

C1 — current causal source unavailable: fail closed.  
C2 — identical inputs produce identical receipt id/hash.  
C3 — receipt truncated or unknown field: fail closed.  
C4 — dispatch_attempted false.  
C5 — 0 dependencias nuevas salvo justificación explícita.

## 8. Métricas

Registrar por sistema:

- verdict/reason codes por C0, T5, T6, T8-T13 y C1-C4;
- receipt bytes;
- LOC no blancas;
- módulos nuevos;
- dependencias nuevas;
- mediana verify 250 iteraciones;
- calidad de explicación de T8-T13;
- false positives/false negatives en corpus;
- si expone o no un witness/contexto auditable explícito.

## 9. Interpretación preregistrada

### A — baseline iguala todo con menor o similar complejidad

`USEFUL_GOVERNANCE_HARDENING / NOT_DIFFERENTIATING_VS_COHERENT_BASELINE`

Mantener la mejora si aporta producto, pero no venderla como moat.

### B — candidata iguala seguridad con coste materialmente menor o mejor auditabilidad observable

`MIXED_BOUNDED_CANDIDATE_ADVANTAGE`

No equivale a superioridad general. Debe mostrarse el trade-off concreto.

### C — candidata conserva una propiedad observable que el baseline no puede igualar sin ampliar materialmente su contrato

`CANDIDATE_DIFFERENTIATOR_REQUIRES_STRONGER_BASELINE`

No autoriza claim final: obliga a preregistrar un baseline reforzado.

### D — candidata falla un control que el baseline pasa

`PHOENIX_COUNTEREXAMPLE / PROMOTION_BLOCKED`

La candidata no se promociona.

## 10. Límites

Fuera de Trial 004:

- multi-hop/transitive provenance;
- replay entre epochs de gobernanza;
- policy deployment/2PC;
- RTM/SAFE_NOOP/state machine;
- dispatcher;
- persistencia longitudinal;
- Phoenix Neuron runtime.

No introducirlos para “ganar” este ensayo.

## 11. Orden

1. preservar este protocolo antes de implementar;
2. implementar baseline y candidata como módulos nuevos;
3. añadir tests de regresión;
4. ejecutar `npm test`;
5. ejecutar comparativa dedicada;
6. preservar el resultado aunque elimine diferenciación;
7. solo después decidir promoción o siguiente trial.

No push, PR, deploy ni submission sin autorización humana separada.
