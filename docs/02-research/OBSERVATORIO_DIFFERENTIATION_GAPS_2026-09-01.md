# Observatorio de diferenciación y brechas — Phoenix Action Gate

Fecha: 2026-09-01
Modo: `VALIDATE / OUTSIDE_EYE_REVIEW`
Estado: `BOUNDED_DIFFERENTIATION_OBSERVED / GAPS_OPEN / NO_GENERAL_SUPERIORITY_CLAIM`

## 1. Pregunta

Mirando Phoenix Action Gate desde fuera, ¿qué aporta realmente frente a un action gate competente y qué brechas pueden convertirse en demostraciones diferenciadoras sin inflar el producto ni importar Phoenix Neuron completo?

## 2. Fuentes internas que gobiernan esta revisión

1. Estado y evidencia de `phoenix-action-gate`, incluidos Trials 001-003 y runtime LIVE.
2. `PHOENIX_ACTION_ASSURANCE_LAB/00_GOVERNANCE/ESTADO.md`: H-PHX-04 cerró `NOT_CORROBORATED_IN_BOUNDED_ASSURANCE_FIXTURES`; baselines bespoke pequeños alcanzaron paridad en varias propiedades de integridad.
3. `PHOENIX_OPPORTUNITY_RADAR/EVIDENCE/PHOENIX_PRODUCT_STRATEGY_REVIEW_2026-09-01.md`: Phoenix debe permanecer como R&D kernel y competir selectivamente como componente dentro de productos reales, no imponerse como plataforma o substrate por defecto.
4. `PHOENIX_PRODUCT_STRATEGY_REVIEW/STRATEGY_REVIEW_V1_2026-09-01.md`: la unidad de validación recomendada es `PRODUCT_JOB × PHOENIX_COMPONENT × BASELINE`.
5. Protocolo de forja: baseline competente, contraejemplos preservados, claims limitados por evidencia.

## 3. Baseline externo de lectura

El competidor conceptual mínimo no es un gate torpe. Es un control de acciones competente que puede:

- validar schema;
- comprobar scope;
- bloquear secretos;
- allowlist/denylist de operaciones;
- clasificar riesgo;
- exigir revisión humana;
- fallar cerrado ante entradas inválidas;
- producir logs o un receipt básico.

Un segundo baseline más fuerte añade:

- dependencias entre pasos;
- estado proyectado;
- detección de stale-state simple.

Ese segundo baseline corresponde conceptualmente a `state-aware-baseline/0.1.0`, contra el que Phoenix ya fue comparado.

## 4. Qué NO diferencia suficientemente

Estas capacidades son valiosas, pero no deben venderse como moat por sí solas:

- `DENY` de un comando destructivo;
- bloqueo de `.env` o secretos;
- schema validation;
- scope checking;
- allowlists;
- clasificación R0-R3;
- revisión humana;
- fail-closed básico;
- uso de function calling de Nemotron;
- ausencia de dispatch;
- hashes o logs si no se demuestra una propiedad adicional.

H-PHX-04 ya enseñó la lección general: una arquitectura más rica no gana automáticamente cuando un baseline pequeño reproduce el outcome con menor superficie.

## 5. Diferenciación observada por capas temporales

### T0 — Proposal boundary

Pregunta:

`¿Existe realmente una propuesta canónica que Phoenix pueda evaluar?`

Phoenix separa el fallo del proveedor/modelo de la política:

- `PROVIDER FAIL-CLOSED` cuando Nemotron no produce una propuesta válida;
- `PHOENIX DENY` solo cuando sí existe una ActionProposal/ActionPlan evaluable.

Valor: claridad de trust boundary y evidencia más honesta.

Estado: `RUNTIME_OBSERVED` en panel.

Diferenciación: útil, pero no se afirma exclusiva.

### T1 — Action-time assurance

Pregunta:

`¿Esta acción concreta está permitida y acotada ahora?`

Incluye scope, secretos, reversibilidad y destructividad.

Ejemplo LIVE reciente:

`rm -f README.md -> R3 / DENY / DESTRUCTIVE_COMMAND / dispatch NO`.

Estado: `RUNTIME_OBSERVED`.

Diferenciación: baja-media; un bespoke competente puede reproducirla.

### T2 — Plan-time assurance

Pregunta:

`¿Sigue siendo coherente cada paso con el estado producido por pasos anteriores?`

Phoenix reconstruye dependencias y estado proyectado y puede propagar causalmente un bloqueo.

Trial 002 mostró stale-state cross-step que el baseline independiente no detectó.

Estado: `TEST_EXECUTED`.

Diferenciación: media; un baseline state-aware más fuerte puede alcanzar esta capacidad.

### T3 — Evidence-time assurance

Pregunta:

`Aunque el artefacto/evidencia siga existiendo, ¿sigue siendo válida la justificación causal de la acción después de que cambió una fuente de la que dependía?`

Este es el discriminante más fuerte observado.

Trial 003:

- baseline state-aware: `REVIEW`;
- Phoenix: `DENY`;
- causa: `EVIDENCE_LINEAGE_INVALIDATED`.

Runtime LIVE y panel:

- Nemotron genera un plan de cuatro pasos;
- evidencia `evidence-generated-v2` deriva de `config.json@v2`;
- un paso posterior devuelve `config.json` a `v1`;
- la acción final intenta apoyarse en aquella evidencia;
- baseline: `REVIEW`;
- Phoenix: `DENY`;
- divergencias: `1`;
- UI muestra `expected v2 / observed v1 / invalidated by s3`;
- dispatch: `NO`.

Estado: `RUNTIME_OBSERVED` dentro del escenario acotado.

Diferenciación: `CORROBORATED_BOUNDED` frente al baseline declarado; NO superioridad general.

## 6. Tesis diferencial actual

La formulación más fuerte soportada hoy NO es:

> Phoenix bloquea acciones peligrosas.

La formulación mejor soportada es:

> Phoenix no solo evalúa si una acción está permitida. En planes multiacción puede evaluar si una acción sigue estando justificada por el estado actual y por evidencia cuya procedencia causal continúa siendo válida.

Versión corta:

> `Most action gates ask: “Is this action allowed?” Phoenix can also ask: “Is this action still justified?”`

Esta tesis debe seguir atada a los límites de los ensayos actuales.

## 7. Brechas que pueden convertirse en valor observable

### GAP-A — File-gate perception trap

**Brecha**

README, `.env` y comandos hacen que un observador pueda interpretar Phoenix como un guardián de archivos/comandos.

**Oportunidad**

Cambiar lenguaje de UI hacia `acción propuesta`, `estado`, `evidencia` y `justificación`, manteniendo Coding como único dominio LIVE.

Mostrar, sin fingir implementación, una franja de extensibilidad:

- Coding — `LIVE`;
- Cloud/DevOps — `CONCEPT`;
- Data — `CONCEPT`;
- Business Ops — `CONCEPT`.

**Severidad**: `warning`.

**No requiere** construir cuatro backends.

### GAP-B — Baseline credibility gap

**Brecha**

Un juez puede pensar que el baseline fue debilitado para que Phoenix gane.

**Oportunidad**

Hacer visible una capability matrix del baseline:

- schema/scope/fail-closed: sí;
- dependency reasoning: sí;
- projected state: sí;
- stale-state: sí;
- evidence-lineage reasoning: no.

Publicar el baseline y sus ventajas de simplicidad. La transparencia fortalece el resultado más que esconderlo.

**Severidad**: `review_required` antes de narrativa final.

### GAP-C — Receipt / tamper gap

**Brecha**

El panel muestra decision hash y evidence bundle, pero todavía no demuestra visualmente qué ocurre si alguien altera propuesta, política o evidencia después de la decisión.

**Oportunidad**

Siguiente discriminante candidato:

`EVIDENCE_RECEIPT_TAMPER_TRIAL_001`

Mismo decision receipt; alterar un componente vinculado; exigir detección reproducible de mismatch o invalidación.

Si un baseline de logging simple no detecta la alteración y Phoenix sí, aparece una segunda dimensión diferencial independiente de lineage.

**Severidad**: `review_required` y además relevante para G7 reproducibility/tamper evidence.

### GAP-D — Transfer gap

**Brecha**

La arquitectura parece generalizable, pero la evidencia LIVE actual está centrada en coding/workspace.

**Oportunidad**

No abrir seis dominios. Diseñar más adelante un único fixture de transferencia que use el mismo patrón semántico en otro dominio y comparar against B0.

Ejemplos candidatos sin ejecución externa:

- release/deployment approval;
- GitHub pull-request governance;
- data-pipeline evidence validity.

Debe mantenerse `fixture-only` hasta que exista razón para una integración real.

**Severidad**: `warning`.

### GAP-E — REVIEW workflow gap

**Brecha**

`REVIEW` existe como decisión, pero el MVP no enseña todavía una transición de revisión humana gobernada.

**Oportunidad**

Para la demo basta con mostrar `HUMAN REVIEW REQUIRED`; no se necesita executor. Solo construir flujo de aprobación si mejora materialmente el criterio del concurso y sigue siendo reversible.

**Severidad**: `warning`.

### GAP-F — Clean-clone reproducibility gap

**Brecha**

No se ha completado aún G7 desde clon limpio.

**Oportunidad**

Convertir reproducibilidad, evidencia y provider-failure fixtures en parte de la candidatura pública.

**Severidad**: `blocker` antes de submission, no antes de continuar VALIDATE.

### GAP-G — Integration economics gap

**Brecha**

La estrategia interna exige demostrar que el componente Phoenix aporta más de lo que cuesta frente al baseline pequeño.

**Oportunidad**

Usar Phoenix Action Gate como caso real de `SELECTIVE_EMBEDDED_COMPONENT`: medir LOC, tests, dependencia, complejidad, latencia, claridad de evidencia y discriminantes frente al baseline.

**Severidad**: `review_required` para claim de valor arquitectónico; no bloquea la demo técnica.

### GAP-H — Phoenix Neuron ancestry gap

**Brecha**

Hay similitud conceptual con Phoenix Neuron, pero no existe integración canónica y decir lo contrario dañaría la credibilidad.

**Oportunidad**

Mantener la separación explícita. Si algún componente Phoenix Neuron se propone más adelante, debe superar `PRODUCT_JOB × COMPONENT × BASELINE` y una frontera de licencia/publicación.

**Severidad**: `PASS_BOUNDARY` mientras se mantenga `reference_only`.

## 8. P0-P5 — Observatorio actual

| Nivel | Estado | Lectura |
|---|---|---|
| P0 | PASS | Identidad, autoridad, claims y frontera con Phoenix Neuron están explícitas. |
| P1 | PASS | Se distinguen reglas, evidencia, contraejemplos, provider failure y policy decision. |
| P2 | PASS | Existe vertical concreto, panel, live provider, ActionProposal/ActionPlan y outcome verificable. |
| P3 | PASS/PARTIAL | Se han probado errores de proveedor, tool-call ambiguity y baselines fuertes; cambios de reglas del hackathon deben revalidarse antes de submission. |
| P4 | PARTIAL | Hay estado retomable, evidencia, tests y checkpoints; clean-clone G7 pendiente y el bloque UI actual sigue en cuarentena hasta regresión fresca. |
| P5 | NOT_TESTED | La transferencia del método a otro dominio/hackathon no está demostrada. |

## 9. La brecha más valiosa ahora

No es añadir más políticas ni más dominios.

La brecha técnicamente más cercana a la tesis actual es:

`decision/evidence receipt integrity over time`.

Eso permitiría convertir la narrativa en tres horizontes coherentes:

1. **Proposal-time** — ¿el modelo produjo una propuesta válida?
2. **Plan-time** — ¿el plan sigue siendo coherente con el estado proyectado?
3. **Evidence-time** — ¿la justificación y su receipt siguen siendo válidos después de cambios o manipulación?

La combinación puede ser más difícil de reducir a un `if` aislado que la política de comandos individual, pero debe ser sometida a baseline antes de usarla como claim.

## 10. Relación con la estrategia Phoenix previa

Esta revisión NO concluye que Phoenix Neuron deba entrar en Action Gate.

Al contrario, el resultado encaja con la estrategia interna ya fijada:

`PHOENIX = R&D_KERNEL + SELECTIVE_EMBEDDED_COMPONENT`

Action Gate puede usar ideas o componentes solo cuando ganen un trial dentro de este producto. No se integra el whole-core por identidad, herencia o estética.

## 11. Decisión del Observatorio

`ALLOW_WITH_WARNINGS / DIFFERENTIATION_BOUNDED_BUT_REAL`

La brecha diferencial más fuerte ya no es hipotética: evidence-lineage invalidation frente a un baseline state-aware fue observada en test y LIVE.

Sin embargo, la candidatura todavía debe evitar dos trampas:

- parecer un file/command guard;
- convertir un resultado acotado en superioridad general.

## 12. Próximo discriminante recomendado

Antes de abrir otro dominio, cerrar el bloque UI actual y G7 básico. Después predeclarar:

`EVIDENCE_RECEIPT_TAMPER_TRIAL_001`

Baseline competente: decision log + hash básico sobre decisión.

Phoenix candidate: binding verificable entre propuesta, política, estado/evidencia y receipt.

Falsador: si el baseline pequeño detecta las mismas alteraciones con menor complejidad total, podar la línea y no convertirla en diferenciador.
