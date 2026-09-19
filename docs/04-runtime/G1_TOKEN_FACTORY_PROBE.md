# G1 — Token Factory / Nemotron runtime

Fecha: 2026-08-31

## Objetivo

Comprobar la dependencia obligatoria del hackathon antes de construir el MVP: observar una llamada real a Nebius Token Factory, descubrir un modelo NVIDIA disponible en la cuenta y usar ese modelo para producir una `ActionProposal` estructurada sin ejecutar ninguna acción.

## Fase A — catálogo de modelos

Artefacto: `tools/g1_list_models.mjs`

Resultado real observado:

- endpoint: `GET https://api.tokenfactory.nebius.com/v1/models`;
- HTTP: `200`;
- latencia: `956 ms`;
- modelos totales: `30`;
- modelos NVIDIA detectados: `7`;
- `nvidia/Nemotron-3_5-Lightning`: disponible en la cuenta real;
- secreto expuesto: `false`.

Evidencia: `docs/04-runtime/evidence/G1_LIST_MODELS_2026-08-31.json`.

## Fase B — ActionProposal con Nemotron

Artefacto: `tools/g1_action_proposal_probe.mjs`

Resultado real observado:

- endpoint: `POST https://api.tokenfactory.nebius.com/v1/chat/completions`;
- modelo: `nvidia/Nemotron-3_5-Lightning`;
- HTTP: `200`;
- latencia: `3727 ms`;
- provider response id: `chatcmpl-4c1c70f1`;
- tokens totales: `880`;
- salida JSON estructurada y parseable;
- `schema_version`: `0.1`;
- `action_type`: `READ_CONTEXT`;
- target: `demo-workspace/README.md`;
- operación: `read_file`;
- reversibilidad: `INHERENT`;
- `dispatch_attempted`: `false`;
- secreto expuesto: `false`.

Evidencia: `docs/04-runtime/evidence/G1_ACTION_PROPOSAL_2026-08-31.json`.

## Qué demuestra

La cuenta real accede a Token Factory, el modelo NVIDIA seleccionado existe en la cuenta y una inferencia real de Nemotron produce una propuesta estructurada compatible con el contrato mínimo de Phoenix Action Gate. El modelo propone y no ejecuta.

## Qué NO demuestra

- no existe todavía un MVP end-to-end;
- no existe todavía un gate determinista implementado;
- no se han ejecutado los casos DENY/REVIEW/PREPARED;
- H-PHX-05 no se ha ejecutado;
- no existe validación de producción.

## Estado probatorio

- Documentación de integración: sí.
- Probes implementados: sí, en el workspace local.
- Runtime real de catálogo: `RUNTIME_OBSERVED`.
- Runtime real de inferencia Nemotron: `RUNTIME_OBSERVED`.
- Evidencia sanitizada: sí.
- RTM R-02/R-03/R-11: actualizada localmente.
- Código versionado por commit: pendiente de autorización humana.

## Gate

`G1 = TECHNICAL_PASS / VERSIONING_PENDING`.

La prueba técnica requerida por G1 está conseguida. No se promueve el gate a cierre gobernado definitivo ni se abre G2 hasta versionar los artefactos y la evidencia en un commit autorizado.
