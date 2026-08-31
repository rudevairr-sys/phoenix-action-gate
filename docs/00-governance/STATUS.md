# Estado retomable

Fecha: 2026-08-31  
Estado: `G1_TECHNICAL_PASS / VERSIONING_PENDING`

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
- evidencia sanitizada conservada localmente sin secretos.

## Evidencia G1

- `docs/04-runtime/evidence/G1_LIST_MODELS_2026-08-31.json`;
- `docs/04-runtime/evidence/G1_ACTION_PROPOSAL_2026-08-31.json`;
- `tools/g1_list_models.mjs`;
- `tools/g1_action_proposal_probe.mjs`.

## Qué todavía NO está demostrado

- MVP end-to-end;
- gate determinista implementado;
- casos `DENY`, `REVIEW` y `PREPARED` ejecutados;
- H-PHX-05 frente a baseline;
- clon limpio reproducible;
- demo pública y vídeo;
- validación de producción.

## Riesgos abiertos

1. Los artefactos G1 están todavía sin commit.
2. G2 no debe comenzar hasta versionar G1 mediante commit autorizado.
3. H-PHX-05 sigue pendiente.
4. No existe aplicación funcional ni demo.
5. La discrepancia menor de fechas Devpost/Official Rules sigue registrada en G0 como `WARN`.

## Único siguiente gate

Crear, tras autorización humana, un commit local de cierre G1 que incluya probes, evidencia, ledgers, RTM, STATUS y PROJECT_STATE. Validar el estado resultante. No hacer push ni crear PR sin autorización separada.
