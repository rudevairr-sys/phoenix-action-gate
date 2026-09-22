# Builder Omega Contest Prep — Phoenix Action Gate

Fecha: 2026-09-18  
Proyecto: `Phoenix Action Gate`  
Ruta: `01_MESA_PRINCIPAL/phoenix-action-gate`  
Modo: `CONTEST_SURFACE_PREPARATION`  
Autor operativo: `BUILDER-FLL-STACK Ω · MAVO`  
Autorización humana: `USER-20260918-HAZLO-CONTEST-PREP`

## Decisión

Continuar con `Phoenix Action Gate` como candidatura principal del Nebius x NVIDIA Global AI Hackathon.

No pivotar a `MATHEMATICAL_ASSURANCE_KIT` como producto principal del concurso en este corte. MAK queda como referencia conceptual/controlada, no como dependencia pública ni núcleo de la demo.

No tocar `PHOENIX_NEURON_LAB`. Phoenix Neuron permanece `reference_only`.

## Tesis pública

> Before an AI agent acts, Phoenix Action Gate checks whether the reason for acting is still valid.

Versión española:

> Antes de que un agente de IA actúe, Phoenix Action Gate comprueba si la razón para actuar sigue siendo válida.

## Producto candidato

Phoenix Action Gate es una capa de gobernanza previa a ejecución para agentes de código. Nemotron, ejecutado mediante Nebius Token Factory, propone acciones o planes compactos. Phoenix Action Gate evalúa de forma determinista contrato, riesgo, estado, dependencias, evidencia y reversibilidad antes de permitir que una acción avance a revisión.

El MVP no ejecuta acciones productivas. `PREPARED` no significa permiso de ejecución. El flujo conserva `dispatch_attempted=false`.

## Historia principal de demo

1. Un usuario pide a Nemotron un plan multiacción.
2. Nemotron propone preparar `config.json` v2.
3. Luego propone crear `generated.md` v2 derivado de `config.json` v2.
4. Después el plan vuelve `config.json` a v1.
5. Finalmente propone ejecutar `npm test` usando `generated.md` y su evidencia.
6. Phoenix detecta que la fuente causal de la evidencia ya no coincide: esperado `config-v2`, observado `config-v1`.
7. Resultado: `DENY`, sin dispatch.

## Posicionamiento recomendado

No venderlo como otro chatbot, guardrail genérico o framework Phoenix completo.

Venderlo como una experiencia clara de `justification firewall` para agentes de código:

- el modelo propone;
- el gate no delega autoridad al modelo;
- la evidencia se visualiza;
- la razón para actuar puede caducar;
- nada se ejecuta automáticamente.

## Frontera pública

Se puede publicar:

- código original de `phoenix-action-gate`;
- contratos públicos del MVP;
- panel local;
- tests y fixtures sanitizados;
- evidencia redactada;
- resultados negativos y límites experimentales.

No publicar ni copiar automáticamente:

- código completo de `PHOENIX_NEURON_LAB`;
- código completo de `PHOENIX_ACTION_ASSURANCE_LAB`;
- material privado del Taller;
- rutas absolutas;
- secretos o tokens;
- claims de producción o superioridad general.

## Estado actual observado por esta preparación

- Carpeta local candidata localizada: `01_MESA_PRINCIPAL/phoenix-action-gate`.
- Rama local: `review/g2-mvp-core`.
- Repo público: `rudevairr-sys/phoenix-action-gate`.
- GitHub tiene `main`, `review/f0-governed-foundation` y `design/f0-5-product-contract`; la rama local avanzada no aparece publicada en la lectura previa.
- Worktree local contiene cambios modificados y archivos nuevos sin seguimiento.
- Evidencias locales indican validación previa de panel y tests, pero no fueron reejecutadas en este corte.
- Devpost indica hackathon registrado y submissions abiertas.

## Bloqueos antes de submission

1. Reconciliar `STATUS.md` y `PROJECT_STATE.json` con el resultado B1 ya existente.
2. Decidir qué archivos locales avanzados se congelan en una rama pública.
3. Validar tests localmente en el corte actual.
4. Validar clean clone público.
5. Preparar demo URL o test build.
6. Grabar vídeo público <= 3 minutos.
7. Completar formulario Devpost.
8. Enviar solo con autorización humana separada.

## Archivos de este pack

- `README.md`: decisión y frontera.
- `CLAIM_BOUNDARY.md`: claims permitidos y prohibidos.
- `DEVPOST_SUBMISSION_DRAFT.md`: borrador de candidatura.
- `VIDEO_SCRIPT_3MIN.md`: guion de vídeo.
- `CLEAN_CLONE_CHECKLIST.md`: checklist reproducible.
- `PUBLICATION_PLAN.md`: plan de rama, PR y publicación.
- `TCC_MAVO_GATE.md`: gate final de evidencia y riesgos.

## Estado TRUTHCORE de este pack

`GENERATED_LOCAL_FILES`: sí.  
`TEST_EXECUTED`: no.  
`RUNTIME_OBSERVED_IN_THIS_CUT`: no.  
`PERSISTED_LOCAL_SION`: sí, dentro de la carpeta autorizada.  
`PUSHED`: no.  
`SUBMITTED`: no.
