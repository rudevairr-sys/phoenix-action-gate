# G5 Visual Screenshot Revalidation — 2026-09-19

Estado: `VISUAL_SCREENSHOT_REVALIDATION_PASS`

## Fuente

Captura aportada por el usuario en la conversación.

URL observada en la barra del navegador:

`127.0.0.1:4183`

Nota: `127.0.0.1:4173` estaba ocupado por otro proyecto (`Show Drag Factory`). Phoenix Action Gate fue levantado correctamente en puerto alternativo `4183` usando `PHOENIX_PORT=4183`.

## Observación visual

La captura muestra correctamente:

- Título principal: `Phoenix Action Gate`.
- Badge superior: `NO DISPATCH`.
- Flujo superior:
  - `Tú`
  - `Nemotron`
  - `Phoenix Gate`
  - `Evidencia`
- Franja visible: `SPECIALIZED AGENT CONTRACT DEMO`.
- Subtítulo visible: `Agentes pequeños, contratos claros, puerta de salida Phoenix`.
- Texto explicativo visible: un agente especializado no debería convertirse en asistente general y Phoenix comprueba la salida antes de avanzar.
- Tarjetas visibles:
  - `MONO_SI_NO` — `Solo SI / NO / SAFE_NOOP`.
  - `FERRUM_RUST` — `Solo dominio Rust`.
  - `N_VCLS` — `Sin vocales`.
  - `ACTION_PROPOSER` — `Propone, no ejecuta`.
- Panel inferior inicial visible:
  - `CONVERSACIÓN EN VIVO`.
  - `Habla con Nemotron`.
  - Métricas `ORIGEN`, `MODELO`, `RIESGO`, `DECISIÓN`.
  - `PROPUESTA DE NEMOTRON`.
  - `POLÍTICA DETERMINISTA`.

## Resultado

La superficie visual queda validada para la primera pantalla del demo:

`G5_JURY_SURFACE = VISUAL_SCREENSHOT_REVALIDATION_PASS`

## Alcance

Validado:

- La UI carga en navegador local.
- La narrativa principal es visible.
- La franja de microagentes especializados aparece antes de la zona de conversación.
- El badge `NO DISPATCH` aparece visible.
- El diseño no se observa roto en la captura aportada.

No validado todavía:

- Grabación final de vídeo.
- Demo live completa con interacción.
- Nebius/Nemotron live revalidation en este corte.
- Demo/test build URL pública.
- Devpost submission.

## Truthcore

- `VISUAL_SCREENSHOT_PROVIDED_BY_USER`: true.
- `LOCALHOST_PORT`: `4183`.
- `VISUAL_REVALIDATION_PASS`: true.
- `VIDEO_RECORDED`: false.
- `PRODUCTION_VALIDATED`: false.
- `DEVPOST_SUBMITTED`: false.
