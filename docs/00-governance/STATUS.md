# Estado retomable

Fecha: 2026-09-19  
Estado: `CONTRACT_CHECKERS_IMPLEMENTED / CURRENT_LIVE_TEST_PASS_128 / EXISTING_CLEAN_CLONE_TEST_PASS_122 / FRESH_CLEAN_CLONE_PENDING_AFTER_COMMIT`

## Reentrada

Proyecto: `01_MESA_PRINCIPAL/phoenix-action-gate`  
Rama local actual: `review/contest-surface-20260918`  
Repo público: `rudevairr-sys/phoenix-action-gate`

No hay autorización para merge, deploy, dispatch productivo ni submission Devpost. La autorización humana permitió continuar el desarrollo de concurso, usar Remote Desktop para tests locales, implementar checkers mínimos de contratos de agentes, actualizar la superficie de demo y registrar evidencia.

## Pull Request

PR draft:

`https://github.com/rudevairr-sys/phoenix-action-gate/pull/7`

Datos anteriores al commit de este corte:

- PR: `#7`.
- Estado: `open`.
- Draft: `true`.
- Base: `main`.
- Base SHA: `a06291a616a96f8dd861db2dc291dd8548ee5f83`.
- Head antes del corte actual: `345b139aaf8f6298064649effd8e08489b7d1e97`.

## Implementación nueva — Specialized Agent Contract Demo

Archivos nuevos/modificados:

- `src/agent-contracts.mjs`.
- `test/agent-contracts.test.mjs`.
- `web/index.html`.
- `web/jury.css`.
- `BUILDER_OMEGA_CONTEST_PREP_20260918/VIDEO_SCRIPT_3MIN.md`.
- `docs/04-runtime/evidence/G7_CLEAN_CLONE_NPM_TEST_2026-09-19.json`.
- `docs/04-runtime/evidence/G9_SPECIALIZED_AGENT_CONTRACT_CHECKERS_TEST_2026-09-19.json`.

Checkers implementados:

- `MONO_SI_NO`: contrato de vocabulario cerrado.
- `N_VCLS`: contrato de forma de salida sin vocales.
- `ACTION_PROPOSER`: contrato sin dispatch ni afirmación de ejecución sin evidencia.
- `FERRUM_RUST`: contrato público de dominio Rust con fixtures sanitizados; no integra configuración privada del GPT.

Estado:

`IMPLEMENTED_MINIMAL_CHECKERS / CURRENT_LIVE_TEST_PASS`

## Evidencia de test — clean clone existente

Remote Desktop ejecutó:

```powershell
cd C:\Users\Usuario\.chatgpt\Gobernanza_Phoenix\SION_TALLER_RUST\SION_WORKSPACE\02_CANDIDATOS\phoenix-action-gate-cleanclone-pr7-20260918
node --version
npm test
```

Resultado:

- Node: `v24.12.0`.
- Tests: `122`.
- Pass: `122`.
- Fail: `0`.
- Duration: `636.8734 ms`.

Registro:

`docs/04-runtime/evidence/G7_CLEAN_CLONE_NPM_TEST_2026-09-19.json`

Nota: este clean clone valida el clone existente. Como el proyecto vivo fue modificado después con checkers nuevos, hace falta un clean clone fresco tras commit/push del corte actual.

## Evidencia de test — proyecto vivo actual

Remote Desktop ejecutó:

```powershell
cd C:\Users\Usuario\.chatgpt\Gobernanza_Phoenix\SION_TALLER_RUST\SION_WORKSPACE\01_MESA_PRINCIPAL\phoenix-action-gate
node --version
npm test
```

Resultado:

- Node: `v24.12.0`.
- Tests: `128`.
- Pass: `128`.
- Fail: `0`.
- Cancelled: `0`.
- Skipped: `0`.
- Todo: `0`.
- Duration: `649.6845 ms`.

Registro:

`docs/04-runtime/evidence/G9_SPECIALIZED_AGENT_CONTRACT_CHECKERS_TEST_2026-09-19.json`

Estado:

`CURRENT_LIVE_CUT_TEST_PASS_128`

## Specialized Agent Contract Demo

Spec:

`docs/03-product/SPECIALIZED_AGENT_CONTRACT_DEMO.md`

Tesis:

> Specialized agents should not become general assistants under pressure. Phoenix Action Gate verifies that each agent stays inside its contract.

Versión española:

> Un agente especializado no debería convertirse en asistente general solo porque el usuario insista. Phoenix Action Gate comprueba que cada agente se mantiene dentro de su contrato.

Microagentes candidatos:

- `MONO_SI_NO`: contrato de vocabulario cerrado.
- `FERRUM_RUST`: contrato de dominio cerrado.
- `N_VCLS`: contrato formal de salida sin vocales.
- `ACTION_PROPOSER`: contrato sin dispatch.

## Ferrum Rust

Clasificación:

`EVIDENCIA_EXTERNA_UTIL / NO_AUTORIDAD_OPERATIVA / NO_INTEGRADO_AUN`

Hallazgo:

Ferrum Rust funciona como ejemplo de agente de dominio cerrado: solo Rust o tecnologías directamente conectadas con Rust, salida `SAFE_NOOP` para fuera de alcance y redirección útil hacia herramientas Rust cuando procede.

## N_VCLS

Fuente:

`n-vcls_phoenix.zip`, aportado por el usuario.

Clasificación:

`EXTERNAL_AGENT_FACTORY_OUTPUT_RECORDED / DOCUMENTED_NOT_IMPLEMENTED / DEMO_CASE_CANDIDATE`

Hallazgo:

`N_VCLS` documenta un contrato formal de salida: no usar vocales y responder `/` si no puede cumplir. La inspección fue estática y no ejecutó código. El Rust generado todavía es plantilla no conforme porque emite textos con vocales y repite input del usuario.

Lectura estratégica:

> Un contrato declarado no basta. Phoenix Action Gate debe verificar la salida.

## Decisión de candidatura

Se mantiene `Phoenix Action Gate` como candidato principal del Nebius x NVIDIA Global AI Hackathon.

La herramienta creadora de agentes del usuario se considera fuente de casos/fixtures y línea futura, no producto principal terminado.

No se pivota a `MATHEMATICAL_ASSURANCE_KIT` como producto principal del concurso. MAK queda como referencia conceptual/controlada.

`PHOENIX_NEURON_LAB` permanece `reference_only`. No importar ni publicar su código.

## Tesis pública activa

> Before an AI agent acts, Phoenix Action Gate checks whether the reason for acting is still valid.

Formulación corta:

> A justification firewall for AI coding agents.

Ángulo de demo adicional:

> Phoenix Action Gate verifies that specialized agents stay inside their contract before responding or acting.

## Gates actuales

- G0 reglas Devpost: `PASS_STALE_RECHECK_BEFORE_SUBMISSION`.
- G1 Nebius/NVIDIA: `RUNTIME_OBSERVED_PREVIOUSLY / REVALIDATE_BEFORE_SUBMISSION`.
- G2 gate/panel: `CURRENT_LIVE_CUT_TEST_PASS_128`.
- G3 diferenciación: `IMPROVED_BY_SPECIALIZED_AGENT_CONTRACT_CHECKERS`.
- G4 receipt/tamper: `USEFUL_CAPABILITY_NOT_DIFFERENTIATOR_VS_B1`.
- G5 jury surface: `UPDATED_WITH_CONTRACT_DEMO / VISUAL_REVALIDATION_PENDING`.
- G6 publication boundary: `ACTIVE`.
- G7 clean clone: `EXISTING_CLONE_TEST_PASS / FRESH_CLONE_PENDING_AFTER_COMMIT`.
- G8 Devpost submission: `PENDING_HUMAN_AUTHORIZATION`.
- G9 specialized-agent-contract demo: `MINIMAL_CHECKERS_IMPLEMENTED / CURRENT_LIVE_TEST_PASS`.

## Bloqueos antes de submission-ready

1. Commit/push del corte actual.
2. Crear clean clone fresco desde el nuevo head y ejecutar `npm test` allí.
3. Confirmar live Nebius/Nemotron actual o declarar evidencia previa con honestidad.
4. Preparar demo URL/test build.
5. Grabar vídeo <= 3 minutos.
6. Completar formulario Devpost.
7. Enviar solo con autorización humana separada.

## Siguiente paso seguro

Commit/push del corte actual, clean clone fresco del nuevo head y `npm test` en ese clone.

No tocar Phoenix Neuron. No mover MAK. No habilitar dispatch. No publicar claims de superioridad. No hacer merge. No enviar Devpost automáticamente.
