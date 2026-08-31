# Estado retomable

Fecha: 2026-08-31  
Estado: `G1_PASS / G2_READY`

## Qué está demostrado

- repositorio público independiente y licencia Apache-2.0;
- contrato F0.5 para `ActionProposal` y separación modelo/gate;
- acceso real a Nebius Token Factory mediante la cuenta del participante;
- `GET /v1/models` observado con HTTP 200;
- 7 modelos NVIDIA disponibles en la cuenta;
- `nvidia/Nemotron-3_5-Lightning` disponible y seleccionado;
- `POST /v1/chat/completions` observado con HTTP 200;
- Nemotron produjo una `ActionProposal` estructurada `READ_CONTEXT` para `demo-workspace/README.md`;
- el probe no intentó dispatch (`dispatch_attempted=false`);
- evidencia sanitizada conservada sin secretos;
- artefactos G1 versionados localmente en commit `cc97dd1`.

## Evidencia G1

- `docs/04-runtime/evidence/G1_LIST_MODELS_2026-08-31.json`;
- `docs/04-runtime/evidence/G1_ACTION_PROPOSAL_2026-08-31.json`;
- `tools/g1_list_models.mjs`;
- `tools/g1_action_proposal_probe.mjs`;
- commit local `cc97dd1` (`feat(g1): record live Nebius Nemotron integration evidence`).

## Qué todavía NO está demostrado

- MVP end-to-end;
- gate determinista implementado;
- casos `DENY`, `REVIEW` y `PREPARED` ejecutados;
- H-PHX-05 frente a baseline;
- clon limpio reproducible;
- demo pública y vídeo;
- validación de producción.

## Gate G1

`PASS`.

La integración obligatoria fue observada en runtime y quedó versionada con evidencia sanitizada. Esto autoriza abrir G2; no implica que exista todavía un MVP ni una integración lista para producción.

## Riesgos abiertos

1. H-PHX-05 sigue pendiente.
2. No existe aplicación funcional ni demo.
3. La discrepancia menor de fechas Devpost/Official Rules sigue registrada en G0 como `WARN`.
4. No se ha realizado push ni PR de G1; el commit permanece local.

## Único siguiente gate

G2: construir el vertical mínimo del producto. Primer objetivo: implementar el gate determinista para una `ActionProposal` acotada y hacer visible el resultado `PREPARED`, `REVIEW` o `DENY` sin dispatch. Mantener Nebius/Nemotron como proponente y Phoenix como decisor.
