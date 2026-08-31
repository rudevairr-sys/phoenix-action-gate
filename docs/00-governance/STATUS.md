# Estado retomable

Fecha: 2026-08-31  
Estado: `G2_IN_PROGRESS / E2E_RUNTIME_OBSERVED / PANEL_READY`

## G1 cerrado

- Nebius Token Factory observado en runtime;
- `nvidia/Nemotron-3_5-Lightning` observado y usado;
- ActionProposal estructurada producida sin dispatch;
- evidencia G1 versionada en `cc97dd1`;
- cierre de G1 registrado en `ba6272d`.

## G2 — núcleo determinista

Rama local: `review/g2-mvp-core`.

Implementado y versionado en `6248158`:

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

## Evidencia de tests

- `docs/04-runtime/evidence/G2_CORE_TESTS_2026-08-31.json`: 6 PASS / 0 FAIL en entorno de validación.
- `docs/04-runtime/evidence/G2_SION_TESTS_2026-08-31.json`: 6 PASS / 0 FAIL en el SION local del operador; duración total 201.0834 ms.

## G2 — pipeline end-to-end observado

La ejecución real `npm run demo:e2e` completó el recorrido:

`Nebius Token Factory → nvidia/Nemotron-3_5-Lightning → ActionProposal → Phoenix Gate → GateDecision`

Resultado observado:

- HTTP 200;
- latencia 4654 ms;
- 1166 tokens totales;
- provider response `chatcmpl-f0b5b889`;
- propuesta `READ_CONTEXT` para `demo-workspace/README.md`;
- decisión `R0 / PREPARED`;
- 7 checks `PASS`;
- `decision_hash=ee2cdb280c34525257ab0ba587e4bbaccfb89132d5ddb626134deb7467b73d24`;
- `dispatch_attempted=false`;
- `secret_exposed=false`.

Evidencia: `docs/04-runtime/evidence/G2_E2E_NEMOTRON_GATE_2026-08-31.json`.

## Qué todavía NO está demostrado

- panel web;
- revisión humana interactiva;
- evidence store completo para múltiples ejecuciones;
- recorridos live `REVIEW` y `DENY` desde Nemotron;
- H-PHX-05 frente a baseline;
- clon limpio reproducible;
- demo pública y vídeo;
- validación de producción.

## Único siguiente paso seguro

Versionar este corte end-to-end y comenzar el panel web mínimo. La primera pantalla debe mostrar claramente intención, propuesta Nemotron, checks Phoenix, riesgo, decisión y evidencia; no debe existir ningún botón o endpoint de dispatch. No hacer push ni crear PR sin autorización separada.
