# G1 Live Nebius/Nemotron Chat Revalidation — 2026-09-19

Estado: `LIVE_NEBIUS_NEMOTRON_CHAT_REVALIDATED`

## Fuente

Prueba aportada por el usuario desde el panel local de Phoenix Action Gate.

Contexto previo:

- Proyecto: `Phoenix Action Gate`.
- Ruta local: `01_MESA_PRINCIPAL/phoenix-action-gate`.
- Panel levantado con `npm run panel`.
- Salida del servidor observada:

```text
Phoenix Action Gate panel: http://127.0.0.1:4173
Dispatch capability: disabled
```

La variable de entorno `NEBIUS_API_KEY` fue comprobada por el usuario en PowerShell:

```powershell
[bool]$env:NEBIUS_API_KEY
```

Resultado observado:

```text
True
```

No se expuso ni se registró la clave.

## Conversación observada

Turno 1:

```text
TÚ:
Hola Nemotron. Responde en una frase corta quién eres dentro de Phoenix Action Gate.

NEMOTRON:
Soy Nemotron, el componente de propuestas de Phoenix Action Gate, listo para ayudarte.
```

Turno 2:

```text
TÚ:
Quien es Phoenix Action Gate

NEMOTRON:
Phoenix Action Gate es una plataforma de automatización y gestión de propuestas que coordina acciones técnicas y de desarrollo de software de manera segura y rastreable.
```

## Interpretación

La prueba demuestra que el panel local puede recibir respuestas conversacionales de Nemotron mediante la conexión existente a Nebius Token Factory cuando `NEBIUS_API_KEY` está cargada en el entorno del proceso Node.

Esto corrige el diagnóstico anterior: `Dispatch capability: disabled` no implica que Nemotron esté desconectado. Significa que Phoenix Action Gate no ejecuta acciones reales. La conversación con Nemotron puede funcionar aun con dispatch deshabilitado.

## Resultado

Validado:

- `NEBIUS_API_KEY` cargada en la terminal local: sí, confirmado por booleano sin exponer secreto.
- Panel local levantado: sí.
- Respuesta conversacional de Nemotron observada: sí.
- Dispatch automático: no, sigue deshabilitado por diseño.

Estado:

`G1_NEBIUS_NVIDIA = LIVE_CHAT_REVALIDATED`

## Alcance

Validado:

- Chat live básico con Nemotron desde el panel local.
- Conexión funcional cuando la variable de entorno existe.
- Respuesta de modelo en flujo conversacional.

No validado todavía:

- Plan multiacción live en este corte.
- Registro de provider response id/latencia/tokens para este turno concreto, porque el usuario aportó transcripción visible y no el JSON de respuesta.
- Demo URL pública.
- Vídeo final.
- Devpost submission.
- Producción.

## Truthcore

- `LIVE_NEBIUS_NEMOTRON_CHAT_REVALIDATED`: true.
- `NEBIUS_API_KEY_PRESENT_IN_LOCAL_ENV`: true.
- `SECRET_EXPOSED`: false.
- `DISPATCH_ATTEMPTED`: false.
- `MULTI_ACTION_PLAN_LIVE_REVALIDATED_THIS_CUT`: false.
- `PRODUCTION_VALIDATED`: false.
- `DEVPOST_SUBMITTED`: false.
