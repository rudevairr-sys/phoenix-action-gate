# Estado retomable

Fecha: 2026-08-31  
Estado: `G2_IN_PROGRESS / CORE_IMPLEMENTED / SION_TEST_PENDING`

## G1 cerrado

- Nebius Token Factory observado en runtime;
- `nvidia/Nemotron-3_5-Lightning` observado y usado;
- ActionProposal estructurada producida sin dispatch;
- evidencia G1 versionada en `cc97dd1`;
- cierre de G1 registrado en `ba6272d`.

## G2 — núcleo determinista

Rama local: `review/g2-mvp-core`.

Implementado:

- `src/gate.mjs`: política determinista v0.1;
- resultados `PREPARED`, `REVIEW` y `DENY`;
- riesgo `R0`, `R1`, `R2`, `R3`;
- validación de contrato y schema version;
- target acotado a `demo-workspace`;
- frontera básica de secretos;
- allowlist de comandos de test;
- exigencia de rollback para patches;
- hash determinista de decisión;
- `dispatch_attempted=false` en todas las decisiones;
- cuatro fixtures y seis tests;
- CLI de demostración `tools/g2_gate_probe.mjs`;
- núcleo sin dependencias externas de terceros.

## Evidencia de test actual

`docs/04-runtime/evidence/G2_CORE_TESTS_2026-08-31.json`

Resultado observado en entorno de validación:

- 6 tests;
- 6 PASS;
- 0 FAIL;
- Node v22.16.0;
- target SION observado: Node v24.12.0.

Esta prueba asciende el núcleo a `TEST_EXECUTED`, pero todavía no demuestra su ejecución dentro del runtime SION del usuario.

## Qué todavía NO está demostrado

- repetición de `npm test` en SION Node 24;
- conexión end-to-end Nemotron → gate determinista;
- panel web;
- revisión humana interactiva;
- evidence store completo;
- H-PHX-05 frente a baseline;
- clon limpio reproducible;
- demo pública y vídeo;
- validación de producción.

## Único siguiente paso seguro

Versionar localmente este primer núcleo G2 y ejecutar `npm test` desde el proyecto SION. Si los seis tests pasan también allí, conservar esa evidencia y continuar con el adaptador end-to-end y el panel. No hacer push ni crear PR sin autorización separada.
