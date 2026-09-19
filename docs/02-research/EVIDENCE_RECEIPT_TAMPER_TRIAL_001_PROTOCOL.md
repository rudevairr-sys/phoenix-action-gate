# EVIDENCE_RECEIPT_TAMPER_TRIAL_001 — protocolo preregistrado

Estado: `PREREGISTERED / NOT_EXECUTED`  
Fecha: 2026-09-02  
Modo: `VALIDATE`  
Punto de partida congelado: `092d987 feat(panel): close governed action and lineage view`

## 1. Pregunta

¿Aporta valor material y reproducible un receipt Phoenix que vincule la decisión con la propuesta/plan, la política, el estado y la evidencia causal, frente a un receipt snapshot sencillo y competente bajo las mismas alteraciones post-decisión?

La pregunta NO es si SHA-256 funciona ni si Phoenix puede producir otro hash. La pregunta es si el binding semántico/causal permite detectar una invalidez que un receipt snapshot competente no detecta sin incorporar explícitamente el mismo razonamiento de lineage.

## 2. Hipótesis

`H-TAMPER-001`

> Un receipt Phoenix que vincule de forma verificable `subject -> decision -> policy -> evidence -> causal source obligations` detectará al menos una alteración post-decisión en la que la evidencia conservada permanezca intacta pero una fuente causal de la que depende deje de satisfacer la versión vinculada, mientras un baseline snapshot competente conserve el receipt como íntegro.

La hipótesis queda refutada para este corpus si el baseline detecta las mismas alteraciones relevantes con igual o menor complejidad total, o si el candidato necesita introducir complejidad desproporcionada para producir una única divergencia artificial.

## 3. Sistema bajo prueba

Phoenix Action Gate, no Phoenix Neuron completo.

Phoenix Neuron permanece `reference_only`. Sus ideas de artifact binding, DecisionTrace y tamper evidence pueden orientar el diseño, pero este ensayo NO autoriza:

- copiar core privado;
- importar RTM/OVAM/CX_PLANE;
- declarar integración canónica;
- usar `powered by Phoenix Neuron`;
- reformar `gate.mjs` o `plan-gate.mjs` para forzar el resultado.

## 4. Estado actual que motiva el ensayo

### Action Gate 0.1

`src/gate.mjs` calcula `decision_hash` sobre un `decisionCore` que contiene:

- versión de decisión;
- `proposal_id`;
- outcome;
- risk class;
- `policy_version`;
- reason codes;
- checks;
- revisión humana;
- rollback status.

El hash actual NO vincula directamente el contenido completo de la `ActionProposal` ni el contenido del artefacto de política.

### Plan Gate 0.3

`src/plan-gate.mjs` calcula `decision_hash` sobre el core del resultado del plan, incluidos steps evaluados, estado proyectado final y evidence registry.

Ese hash protege el objeto de decisión producido, pero no constituye por sí solo una prueba de que artefactos externos, política o fuentes causales permanezcan iguales después de emitir el receipt.

Estas observaciones describen el corte `092d987`; no son un fallo de seguridad declarado ni un claim de producción.

## 5. Definición del problema

Separar dos propiedades:

### Integridad snapshot

`¿Los objetos que estaban explícitamente ligados al receipt cambiaron?`

Esto puede resolverse con hashes canónicos de proposal/plan, decision, policy artifact y evidence artifacts.

### Validez causal en el tiempo

`Aunque los objetos ligados sigan intactos, ¿continúan satisfechas las obligaciones causales de las que dependía la evidencia/decisión?`

Este ensayo busca determinar si la segunda propiedad aporta una diferencia material frente a la primera.

## 6. Baseline B0 — snapshot-receipt-baseline/0.1.0

El baseline debe implementarse PRIMERO y congelarse antes del candidato Phoenix.

### Capacidades obligatorias

- serialización canónica estable;
- SHA-256;
- receipt determinista;
- fail-closed ante receipt ausente, truncado, inválido o con campos desconocidos;
- binding del `ActionProposal` o `ActionPlan` completo;
- binding de la `GateDecision` o `PlanGateDecision` completa;
- binding de `policy_version` y fingerprint del artefacto de política usado;
- binding de cada artefacto de evidencia explícitamente presentado al momento de decisión;
- reason codes claros para mismatch;
- sin red, sin LLM, sin dispatch.

### Qué NO hace B0

B0 no recorre ni interpreta relaciones `derives_from` para ampliar automáticamente el conjunto de bindings a las fuentes causales de una evidencia. Verifica los objetos snapshot que recibió y vinculó.

Esto debe declararse públicamente como límite del baseline, no ocultarse.

### Ventajas que deben conservarse y medirse

- implementación pequeña;
- facilidad de auditoría;
- bajo coste de ejecución;
- generalidad sobre objetos arbitrarios;
- explicación sencilla.

## 7. Escalado obligatorio B1 si Trial 001 es favorable

Un PASS frente a B0 NO autoriza por sí solo un claim fuerte de diferenciación.

Si el candidato Phoenix detecta una alteración que B0 no detecta, debe abrirse después un baseline más fuerte:

`lineage-aware-receipt-baseline/0.2.0`

B1 añadirá al menos binding de fuentes `derives_from` de un salto y verificación de su versión actual.

Si B1 iguala al candidato con menor complejidad, la línea se clasifica como útil para G7 pero NO diferenciadora.

No cambiar B1 después de ver el resultado del candidato; su contrato deberá preregistrarse antes de Trial 002.

## 8. Candidato Phoenix mínimo

Nombre provisional:

`phoenix-evidence-receipt/0.1.0`

No debe modificar la semántica del Gate ni del Plan Gate. Debe ser un módulo separable que recibe artefactos ya producidos.

Receipt mínimo candidato:

- `receipt_version`;
- `subject_type`: `ACTION` o `PLAN`;
- `subject_id`;
- hash canónico del subject completo;
- hash de la decisión completa;
- `policy_version`;
- fingerprint del artefacto de política;
- bindings de evidencia explícita;
- obligaciones causales derivadas de `derives_from` cuando existan;
- estado/versiones esperadas de las fuentes vinculadas;
- receipt hash determinista.

Verificación mínima:

- `VALID`;
- `INVALID` con reason codes deterministas;
- `UNVERIFIABLE` debe tratarse fail-closed y no como válido.

Reason codes candidatos, sujetos a implementación exacta pero no a reinterpretación post-hoc:

- `SUBJECT_BINDING_MISMATCH`;
- `DECISION_BINDING_MISMATCH`;
- `POLICY_BINDING_MISMATCH`;
- `EVIDENCE_BINDING_MISMATCH`;
- `LINEAGE_BINDING_INVALIDATED`;
- `RECEIPT_CONTRACT_INVALID`;
- `CURRENT_STATE_UNAVAILABLE`.

## 9. Corpus preregistrado Trial 001

Todos los casos usan el mismo material base para B0 y Phoenix. No hay secretos reales ni dispatch.

### T0 — control positivo sin alteración

Después de emitir el receipt no cambia ningún objeto ni fuente causal.

Esperado:

- B0: `VALID`;
- Phoenix: `VALID`.

### T1 — alteración de decisión

Modificar un campo material de la decisión conservando el receipt original.

Esperado:

- B0: `INVALID`;
- Phoenix: `INVALID`.

Propósito: demostrar que B0 no es un muñeco de paja.

### T2 — alteración de proposal/plan

Modificar la operación/target de la propuesta o un paso del plan después de emitir el receipt.

Esperado:

- B0: `INVALID`;
- Phoenix: `INVALID`.

### T3 — alteración silenciosa de política

Modificar el artefacto de política sin cambiar `policy_version`.

Esperado:

- B0: `INVALID`;
- Phoenix: `INVALID`.

B0 está obligado a bindear el fingerprint real de la política; no basta la string de versión.

### T4 — alteración de evidencia explícita

Modificar el artefacto de evidencia ligado al receipt.

Esperado:

- B0: `INVALID`;
- Phoenix: `INVALID`.

### T5 — discriminante principal: fuente causal alterada, evidencia intacta

Fixture derivado del patrón Trial 003:

1. una evidencia `evidence-generated-v2` queda ligada e intacta;
2. esa evidencia declara `derives_from: config.json@v2`;
3. se emite el receipt;
4. después cambia la versión observada de `config.json` a `v1`;
5. no se modifica el objeto de evidencia, el plan almacenado, la decisión almacenada ni la política.

Esperado preregistrado:

- B0 snapshot: `VALID` porque todos sus objetos explícitamente bindeados permanecen intactos;
- Phoenix: `INVALID / LINEAGE_BINDING_INVALIDATED` porque la obligación causal `config.json@v2` ya no se satisface.

Este es el único discriminante positivo exigido a Trial 001. Si no ocurre exactamente bajo el contrato fijado, no se sustituirá por otro caso favorable después de ver resultados.

### T6 — control negativo: cambio irrelevante

Cambiar un recurso que no está bindeado ni aparece en el lineage de ninguna evidencia utilizada.

Esperado:

- B0: `VALID`;
- Phoenix: `VALID`.

Propósito: evitar que Phoenix invalide cualquier receipt ante cualquier cambio del workspace.

### T7 — receipt truncado o campos desconocidos

Eliminar un binding requerido o introducir forma contractual no soportada.

Esperado:

- B0: `INVALID`;
- Phoenix: `INVALID`.

Ningún sistema puede tratar parse failure como validación exitosa.

## 10. Métricas

Registrar para cada caso:

- expected verdict;
- actual verdict;
- reason codes;
- false negative de tamper;
- false positive de invalidación;
- determinismo del receipt hash;
- bytes del receipt;
- LOC no blancas de baseline y candidato;
- número de módulos nuevos;
- número de dependencias nuevas;
- tiempo local de creación y verificación del receipt;
- facilidad de explicación: un resultado debe señalar qué binding falló y, en T5, qué fuente/version esperada y observada causó la invalidación.

No usar una puntuación agregada para esconder un fallo material.

## 11. Criterios de aceptación Trial 001

### Hard gates

Para considerar el ensayo válido:

1. T0 y T6 deben permanecer `VALID` en ambos sistemas;
2. T1, T2, T3, T4 y T7 deben ser detectados por B0 y Phoenix;
3. no debe existir caso `UNKNOWN` que termine tratado como válido;
4. receipt/hash repetido sobre input idéntico debe ser determinista;
5. no debe habilitarse dispatch;
6. `gate.mjs` y `plan-gate.mjs` deben permanecer sin cambios salvo que aparezca una necesidad material que obligue a parar y pedir autorización.

### Discriminante Trial 001

T5 debe producir:

`B0 = VALID`

`Phoenix = INVALID / LINEAGE_BINDING_INVALIDATED`

Si no hay esa divergencia, `H-TAMPER-001` no queda corroborada frente a B0.

## 12. Presupuesto de complejidad

No fijar un límite artificial al baseline para hacerlo perder.

Sí registrar y comparar complejidad real.

Regla de poda preregistrada:

- si Phoenix solo gana T5 pero requiere más de aproximadamente 2.5x la superficie del baseline sin aportar una segunda propiedad observable, el veredicto máximo será `MIXED_BOUNDED` y se evaluará si la función merece existir únicamente por G7;
- si B0 se puede ampliar de forma trivial y pequeña para detectar T5, esa ampliación debe convertirse en B1 y el claim diferencial queda pendiente de Trial 002;
- si B1 iguala la detección con menor complejidad, no vender tamper/receipt como diferenciador Phoenix.

La relación 2.5x es una guía de review, no un permiso para recortar capacidad del baseline.

## 13. Veredictos permitidos

- `CORROBORATED_BOUNDED`: los hard gates pasan y existe la divergencia T5 bajo el contrato fijado;
- `MIXED_BOUNDED`: Phoenix detecta T5 pero con coste/complejidad material o trade-offs relevantes;
- `NOT_CORROBORATED_BOUNDED`: no existe ventaja frente a B0;
- `COUNTEREXAMPLE_BOUNDED`: aparece una alteración material que Phoenix acepta indebidamente o un control negativo que invalida falsamente;
- `INCONCLUSIVE`: error de ejecución o evidencia insuficiente.

Aunque Trial 001 sea `CORROBORATED_BOUNDED`, el claim público de diferenciación por receipt/tamper permanece bloqueado hasta el baseline B1.

## 14. Falsadores y condiciones de parada

Parar y clasificar antes de seguir si:

- B0 detecta T5 bajo su contrato sin necesitar lineage reasoning;
- Phoenix no detecta T5;
- Phoenix invalida T6;
- el candidato necesita modificar el Gate/Plan Gate para fabricar el discriminante;
- se requiere código privado de Phoenix Neuron;
- se requiere una dependencia nueva no justificada;
- aparece una ambigüedad que cambie el significado de `VALID`/`INVALID`;
- una ruta de prueba intenta ejecutar efectos reales.

No reemplazar un falsador fallido con un fixture más favorable sin preregistro nuevo.

## 15. Relación con G7

G7 exige detección de alteración de evidencia.

Por tanto, incluso un resultado `NOT_CORROBORATED_BOUNDED` puede producir valor: un receipt simple, reproducible y auditable puede satisfacer la necesidad de tamper evidence de G7 sin convertirse en diferenciador.

El resultado experimental decide qué solución merece permanecer:

- si B0 basta: usar la solución simple;
- si Phoenix aporta valor material: conservar el binding causal;
- si ambas tienen trade-offs: documentar el resultado mixto y elegir por coste/reproducibilidad.

## 16. Orden de implementación tras este preregistro

1. implementar B0 únicamente;
2. ejecutar T0-T7 contra B0 y congelar su resultado;
3. revisar que B0 cumple su contrato y no fue debilitado;
4. implementar `phoenix-evidence-receipt/0.1.0` en módulo separado;
5. ejecutar exactamente el mismo corpus;
6. registrar resultado favorable, mixto o contrario;
7. solo si existe divergencia, preregistrar B1 antes de escribirlo.

## 17. Frontera de publicación

No claim nuevo mientras el estado sea `PREREGISTERED / NOT_EXECUTED`.

Formulación permitida durante esta fase:

> `Phoenix Action Gate has preregistered a bounded tamper-evidence trial comparing a snapshot receipt baseline with a causal evidence-binding candidate. No result is claimed yet.`

## 18. CognitiveTrace operativo

- intención: explorar la brecha receipt/tamper sin ampliar dominio;
- modo: VALIDATE;
- fuente principal: gap C del Observatorio + código actual de Gate/Plan Gate;
- alternativa simple: B0 snapshot receipt;
- candidato: binding causal separable;
- gate: baseline primero, candidato después;
- riesgo principal: fabricar una diferencia que un hash/binding simple resuelva igual;
- mitigación: T1-T4 obligan al baseline a ser competente; T6 controla falsos positivos; B1 es escalado obligatorio antes de claim público;
- estado MAVO al preregistrar: `RUNNING`;
- siguiente prueba: implementar B0 sin tocar Gate/Plan Gate.
