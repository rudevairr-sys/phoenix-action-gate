# Publication Plan — Phoenix Action Gate

Estado: `PLAN_NOT_EXECUTED`  
Fecha: 2026-09-18

## Objetivo

Convertir el corte local avanzado de `phoenix-action-gate` en una candidatura pública reproducible sin revelar Phoenix Neuron ni depender de laboratorios privados.

## Principio de seguridad

No hacer merge, push, deploy ni submission sin autorización humana separada.

Esta preparación local no autoriza publicar automáticamente.

## Situación actual

- Worktree local avanzado en `review/g2-mvp-core`.
- Hay cambios modificados y archivos nuevos sin seguimiento.
- GitHub público contiene ramas más antiguas (`main`, `review/f0-governed-foundation`, `design/f0-5-product-contract`).
- Las PRs existentes están en draft y no reflejan el corte completo local.

## Ruta recomendada

### Fase A — Congelar estado local

1. Revisar `git status` y `git diff`.
2. Confirmar lista de archivos nuevos que pertenecen al corte de concurso.
3. Separar archivos experimentales que no deben entrar en release pública.
4. Crear/usar rama local específica:
   - candidata: `review/contest-surface-20260918`.
5. Commit local con mensaje sugerido:
   - `prepare contest surface and claim boundary`
6. No force push.

### Fase B — Reconciliar documentación

Actualizar antes de publicar:

- `docs/00-governance/STATUS.md`
- `PROJECT_STATE.json`
- `docs/00-governance/CLAIMS_LEDGER.md`
- `docs/00-governance/EVIDENCE_LEDGER.md`
- `docs/01-hackathon/RTM_HACKATHON.md`
- `README.md`

Cambio clave:

Trial 002 B1 ya existe localmente y limita el claim de diferenciación. La documentación vieja que diga `B1_PREREGISTERED / NOT_EXECUTED` debe reconciliarse.

### Fase C — Tests locales

Ejecutar en proyecto vivo:

```bash
npm test
```

Registrar:

- fecha;
- Node version;
- contador de tests;
- pass/fail/skipped;
- duración;
- commit o worktree fingerprint.

Si falla:

- no publicar;
- diagnosticar mínimo;
- corregir solo lo necesario;
- repetir tests.

### Fase D — Rama pública y PR

Tras validación local:

1. Push de rama de review.
2. Crear PR draft contra base adecuada.
3. Título sugerido:
   - `Contest surface: Phoenix Action Gate justification firewall`
4. Mantener draft hasta clean clone.
5. No merge automático.

### Fase E — Clean clone

Validar desde clon limpio:

- instalación;
- tests;
- panel;
- ausencia de secretos;
- demo local;
- live probe si hay API key disponible;
- documentación.

### Fase F — Demo/video

1. Ejecutar panel.
2. Capturar main flow.
3. Grabar vídeo <= 3 minutos siguiendo `VIDEO_SCRIPT_3MIN.md`.
4. Subir a YouTube público/no listado según reglas.
5. Confirmar que lo mostrado coincide con repo y commit.

### Fase G — Devpost

1. Completar draft usando `DEVPOST_SUBMISSION_DRAFT.md`.
2. Añadir repo URL.
3. Añadir demo/test build URL.
4. Añadir vídeo.
5. Completar feedback de Nebius/Nemotron tras live revalidation.
6. Enviar solo con autorización humana explícita.

## Rollback

Si la rama pública introduce riesgo:

- cerrar PR draft sin merge;
- conservar evidencia local;
- volver al último commit limpio conocido;
- crear una rama nueva más pequeña con solo README + demo mínima.

## No hacer en esta fase

- No fusionar a `main`.
- No publicar Phoenix Neuron.
- No mover MAK al repo público.
- No añadir Tavily artificialmente.
- No habilitar dispatcher.
- No desplegar producción.
- No convertir resultados adversos en claims positivos.

## Estado máximo permitido tras este plan, antes de ejecución

`PLAN_READY / LOCAL_PREP_GENERATED / PUBLICATION_PENDING`
