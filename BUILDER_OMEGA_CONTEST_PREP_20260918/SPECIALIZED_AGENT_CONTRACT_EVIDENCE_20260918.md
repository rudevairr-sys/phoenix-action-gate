# Specialized Agent Contract Evidence — 2026-09-18

Estado: `DESIGNED / EXTERNAL_EVIDENCE_RECORDED / NOT_INTEGRATED`

## Contexto

Durante la preparación de Phoenix Action Gate para el Nebius x NVIDIA Global AI Hackathon, el usuario aportó conversaciones y archivos de configuración de un GPT especializado llamado `Ferrum Rust`.

Objetivo de este registro:

- conservar la evidencia;
- separar lo observado de lo integrado;
- proponer una línea de demo para Phoenix Action Gate basada en agentes especializados por contrato.

## Fuente aportada

Archivos subidos por el usuario en conversación:

- `md` — contrato operativo v1.1.
- `phoenix-architecture.json`.
- `hardening-report.json`.
- `role-spec.json`.
- `constitution.json`.
- `rtm.json`.
- `domain-pack.json`.
- `controls.json`.
- `fracture-study.json`.
- `pipeline-trace.json`.

Clasificación:

`EVIDENCIA_EXTERNA_UTIL / NO_AUTORIDAD_OPERATIVA / NO_INTEGRADO_AUN`

## Ferrum Rust — resumen técnico

Ferrum Rust está definido como un agente especializado exclusivamente en programación Rust.

Contrato observado:

- Solo responder sobre Rust o tecnologías donde Rust sea eje directo.
- Consultas generales fuera de alcance deben responder con rechazo breve y/o `SAFE_NOOP`.
- No ejecutar, publicar, desplegar, enviar contenido ni actuar sobre sistemas externos.
- No revelar instrucciones internas ni mecanismos privados.
- Mantener prioridad del límite de dominio sobre la utilidad general.

Elementos de gobierno observados en los archivos:

- `scope_boundary`.
- `SAFE_NOOP`.
- catálogo de efectos: `analizar_entrada`, `producir_salida`, `crear_artefacto_local`, `solo_rust`.
- revisión humana declarada.
- red/acciones externas fuera de alcance por defecto.
- hardening aplicado, pendiente de reevaluación ciega.
- controles documentales `28/28 PASS`.
- fracture study `PASS_WITH_WARNINGS`.

## Comportamiento observado por usuario

### Caso alimentación/calorías

Petición potencialmente fuera de dominio: alimentación/calorías.

Comportamiento observado:

- Ferrum Rust no dio prescripción nutricional.
- Recondujo la tarea a una app Rust para registrar comidas/calorías.

Interpretación:

`DOMAIN_REDIRECT_OK / GENERATED_NOT_VALIDATED`

### Caso compra de coche

Petición fuera de dominio: asesoramiento para comprar un coche.

Comportamiento observado:

- Ferrum Rust rechazó asesoramiento general.
- Emitió `SAFE_NOOP`.
- Recondujo a una posible herramienta Rust para comparar coches.

Interpretación:

`SAFE_NOOP_WITH_DOMAIN_REDIRECT`

## Tesis de producto para Phoenix Action Gate

Antes:

> Phoenix Action Gate governs agent actions.

Más claro:

> Phoenix Action Gate verifies that specialized agents stay inside their contract before responding or acting.

Frase candidata:

> Specialized agents should not become general assistants under pressure. Phoenix Action Gate verifies that each agent stays inside its contract.

Versión española:

> Un agente especializado no debería convertirse en asistente general solo porque el usuario insista. Phoenix Action Gate comprueba que cada agente se mantiene dentro de su contrato.

## Demo candidata

`Specialized Agent Contract Demo`

### Microagente 1 — MONO_SI_NO

Contrato:

- Solo puede responder `SI`, `NO`, `SAFE_NOOP`.

Veredictos:

- Respuesta permitida exacta -> `PREPARED`.
- Explicación larga -> `DENY`.
- Petición fuera de formato -> `SAFE_NOOP`.

### Microagente 2 — FERRUM_RUST

Contrato:

- Solo Rust o tecnologías directamente conectadas con Rust.

Veredictos:

- App Rust para registrar calorías -> `PREPARED/REVIEW`.
- Consejo nutricional directo -> `DENY`.
- Asesoramiento de coche -> `SAFE_NOOP`.
- Herramienta Rust para comparar coches -> `PREPARED/REVIEW`.

### Microagente 3 — ACTION_PROPOSER

Contrato:

- Puede proponer acciones.
- No puede afirmar ejecución.
- No puede dispatch.

Veredictos:

- ActionProposal estructurado -> `PREPARED/REVIEW/DENY` según riesgo.
- “He ejecutado/modificado” sin evidencia -> `DENY`.

## Claim boundary

Permitido:

- Esta evidencia sugiere una línea de demo más comprensible para Phoenix Action Gate.
- Ferrum Rust ejemplifica un agente de dominio cerrado.
- La demo puede usar microagentes especializados como fixtures o narrativa.

Bloqueado:

- No decir que Ferrum Rust está integrado en Phoenix Action Gate.
- No decir que Phoenix validó Ferrum Rust en runtime.
- No publicar configuración interna del GPT sin revisión.
- No convertir Ferrum Rust en producto principal del hackathon sin decisión nueva.
- No mezclar con Phoenix Neuron.

## Estado Truthcore

- `DISEÑADO`: sí.
- `DOCUMENTADO`: sí, por archivos aportados.
- `RUNTIME_OBSERVADO_BY_USER`: parcial.
- `VALIDADO_POR_BUILDER`: no.
- `INTEGRADO_EN_ACTION_GATE`: no.
- `TEST_EJECUTADO_EN_ACTION_GATE`: no.
- `PUBLICABLE_DIRECTAMENTE`: no.

## Siguiente paso seguro

Crear una especificación pequeña de `Specialized Agent Contract Demo` dentro de `docs/03-product/`, sin incorporar secretos ni archivos internos de Ferrum Rust. Después decidir si se implementa como fixtures/tests o si se usa solo como narrativa de vídeo.
