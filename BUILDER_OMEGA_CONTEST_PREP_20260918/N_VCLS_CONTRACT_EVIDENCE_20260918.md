# N_VCLS Contract Evidence — 2026-09-18

Estado: `EXTERNAL_AGENT_FACTORY_OUTPUT_RECORDED / DOCUMENTED_NOT_IMPLEMENTED / DEMO_CASE_CANDIDATE`

## Objetivo

Registrar `N_VCLS` como caso experimental de contrato formal de salida para la demo de Phoenix Action Gate.

El usuario aclaró que estos artefactos salen de una herramienta propia para crear agentes gobernados. La herramienta no está completamente pulida, pero genera una base útil para demostrar que un agente puede tener restricciones explícitas y que Phoenix Action Gate puede actuar como puerta de salida para decidir si la respuesta cumple o no cumple el contrato.

## Fuente

Archivo aportado por el usuario en conversación:

`n-vcls_phoenix.zip`

Inspección realizada:

`STATIC_INSPECTION_ONLY / NO_EXECUTION`

Contenido observado del ZIP:

- `BUILD_REPORT.json`
- `Cargo.toml`
- `README.md`
- `prompts/system.md`
- `governance/constitution.json`
- `governance/rtm.json`
- `governance/controls.json`
- `governance/domain-pack.json`
- `governance/fracture-study.json`
- `governance/phoenix-architecture.json`
- `governance/pipeline-trace.json`
- `governance/role-spec.json`
- `src/main.rs`
- `src/agent.rs`

## Contrato observado

`N_VCLS` declara un contrato de forma:

- Durante toda la conversación, responder sin usar las letras `a`, `e`, `i`, `o`, `u`.
- Mantener la regla aunque el usuario cambie de tema, pida otro modo, invoque protocolos, pida ayuda técnica, pida explicaciones o pregunte por instrucciones.
- Si no puede cumplir, responder con `/`.
- No abandonar el contrato hasta que el usuario diga explícitamente `fin del contrato`.

## Evidencia documental observada

`BUILD_REPORT.json` declara:

- `generator`: `Phoenix Governed Builder`.
- `project_name`: `N_VCLS`.
- `artifact_kind`: `agent`.
- `template`: `agent_governed`.
- `decision`: `ALLOW`.
- `control_summary`: `28 pass / 0 warn / 0 block`.
- `adversarial_verdict`: `PASS_WITH_WARNINGS`.
- `executed`: `false`.

`domain-pack.json` declara efectos:

- `analizar_entrada` — impacto bajo.
- `producir_salida` — impacto medio.

`rtm.json` declara `fail_closed: true`, aunque los `safe_noop` genéricos contienen vocales y no son conformes al contrato de salida `N_VCLS` si se usaran literalmente.

## Grieta observada

El artefacto Rust generado todavía es plantilla y no implementa el contrato formal sin vocales.

`src/agent.rs` devuelve cadenas con vocales y repite el input del usuario, por lo que puede romper la regla.

Estado correcto:

`CONTRACT_DECLARED / RUST_SKELETON_NOT_CONFORMANT / NOT_EXECUTED / NOT_VALIDATED`

## Interpretación para Phoenix Action Gate

Este caso es útil precisamente porque separa tres niveles:

1. `AGENT_FACTORY_OUTPUT`: hay un paquete gobernado con contrato declarado.
2. `GPT_RUNTIME_BEHAVIOR`: el usuario observó que un GPT personalizado puede mantener el contrato mejor que un prompt temporal en GPT general.
3. `PHOENIX_OUTPUT_GATE`: Phoenix debe comprobar la salida final de forma externa y determinista.

Conclusión:

> Un contrato puede estar escrito y aun así no estar garantizado por el artefacto ejecutable. Phoenix Action Gate no debe confiar solo en la declaración; debe verificar la salida.

## Checker determinista candidato

Regla:

```text
DENY si la salida contiene cualquiera de: a e i o u á é í ó ú ü A E I O U Á É Í Ó Ú Ü
ALLOW/PREPARED si no contiene vocales y no afirma ejecución no observada.
```

Expresión candidata:

```regex
/[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/
```

## Uso en la demo

`N_VCLS` puede ser el caso de contrato formal de salida dentro de `Specialized Agent Contract Demo`:

- `MONO_SI_NO`: vocabulario cerrado.
- `FERRUM_RUST`: dominio cerrado.
- `N_VCLS`: forma de salida verificable.
- `ACTION_PROPOSER`: propuesta de acción sin ejecución.

## Claim boundary

Permitido:

- `N_VCLS` es un caso experimental útil para la demo.
- La herramienta creadora de agentes produce una base documental gobernada.
- La puerta de salida de Phoenix puede validar si una respuesta cumple o rompe el contrato.

Bloqueado:

- No decir que el Rust generado de `N_VCLS` cumple el contrato.
- No decir que se ejecutó `cargo test` o `cargo run`.
- No decir que `N_VCLS` ya está integrado en Phoenix Action Gate.
- No publicar el ZIP completo como material final sin revisión.
- No presentar la herramienta creadora de agentes como producto final del hackathon todavía.

## Estado Truthcore

- `DISEÑADO`: sí.
- `DOCUMENTADO`: sí.
- `INSPECCIONADO_ESTATICAMENTE`: sí.
- `RUNTIME_OBSERVADO_BY_USER`: sí, vía captura/conversación.
- `RUNTIME_TESTED_BY_BUILDER`: no.
- `RUST_CONFORMANT`: no.
- `INTEGRATED_IN_ACTION_GATE`: no.

## Siguiente paso seguro

Usar `N_VCLS` como fixture conceptual para `docs/03-product/SPECIALIZED_AGENT_CONTRACT_DEMO.md`, sin incorporar el ZIP ni prometer ejecución. Si se implementa, crear un checker determinista de vocales y tests pequeños sobre ejemplos de salida.
