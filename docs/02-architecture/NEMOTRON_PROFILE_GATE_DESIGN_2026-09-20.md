# Nemotron Profile Gate — diseño de arranque

Fecha de preparación: 2026-09-20  
Estado: `DESIGNED / READY_FOR_IMPLEMENTATION_NEXT_SESSION`  
Proyecto: `Phoenix Action Gate`  
Rama: `review/contest-surface-20260918`

## Objetivo

Convertir la idea de perfiles especializados aportada por el usuario en un flujo nativo del panel:

```text
Usuario
  ↓
Perfil especializado seleccionado
  ↓
Nemotron responde bajo ese perfil
  ↓
Phoenix Profile Gate verifica contrato
  ↓
Respuesta aceptada / REVIEW / DENY / SAFE_NOOP
```

El objetivo no es validar respuestas pegadas de otro GPT. Ese enfoque fue una interpretación incorrecta. Los ejemplos de GPTs personalizados aportados por el usuario eran referencias para construir **perfiles especializados de Nemotron** y contratos verificables por Phoenix.

## Tesis diferenciadora

La diferencia frente a una demo normal de prompting es:

```text
Prompting ≠ gobernanza
Perfil ≠ garantía
Phoenix Gate = verificación externa del contrato del perfil
```

Nemotron puede recibir un perfil, pero Phoenix no confía ciegamente en que lo cumplirá. Phoenix evalúa determinísticamente si la respuesta se mantiene dentro del contrato del perfil.

Formulación pública candidata:

> Nemotron conversa bajo perfiles especializados, pero Phoenix verifica que no se salga del contrato del perfil antes de aceptar la respuesta.

## Alcance MVP recomendado

No implementar demasiados perfiles en la primera iteración. Mantener tres o cuatro perfiles claros y demostrables.

### `MONO_SI_NO`

Contrato:

- Solo puede responder con vocabulario cerrado.
- Vocabulario inicial: `SI`, `NO`, `SAFE_NOOP`.
- Cualquier explicación, saludo, frase larga, matiz no permitido o evasión fuera del vocabulario debe terminar en `DENY` o `REVIEW`, según política final.

Demostración:

```text
Usuario: ¿Puedo borrar todo?
Nemotron: No, no deberías borrar todo porque...
Phoenix: DENY / CLOSED_VOCABULARY_VIOLATION
```

Respuesta válida esperada:

```text
NO
```

### `FERRUM_RUST`

Contrato:

- Nemotron solo debe responder sobre Rust y temas directamente relacionados con Rust.
- No debe convertirse en asistente general.
- Si el usuario pide marketing, cocina, política, tareas personales u otro dominio no relacionado, el perfil debe contestar con una salida segura o Phoenix debe bloquear.

Demostración:

```text
Usuario: Dame ideas de marketing para vender ropa
Nemotron: Aquí tienes una campaña...
Phoenix: DENY / DOMAIN_BOUNDARY_VIOLATION
```

Respuesta válida candidata:

```text
SAFE_NOOP
```

o una frase fija acordada:

```text
Fuera del dominio Rust.
```

### `ACTION_PROPOSER`

Contrato:

- Puede proponer acciones.
- No puede afirmar que ejecutó, modificó, borró, envió, desplegó o probó algo.
- Debe mantener `dispatch_attempted=false`.
- Debe usar lenguaje de propuesta, no de ejecución.

Violaciones típicas:

```text
He borrado el archivo.
Ya ejecuté los tests.
He desplegado la app.
```

Resultado Phoenix esperado:

```text
DENY / EXECUTION_CLAIM_VIOLATION
```

### `VETO_CONSTITUCIONAL` / `SAFE_NOOP`

Contrato:

- Perfil de seguridad para demostrar que la presión del usuario no rompe el contrato.
- Si el usuario insiste en saltarse límites del perfil, la salida debe ser `SAFE_NOOP` o equivalente aprobado.
- Útil como capa transversal o como perfil explícito.

## Arquitectura técnica propuesta

### Archivos nuevos o modificados

Candidatos:

```text
src/profiles.mjs
src/profile-gate.mjs
src/profile-pipeline.mjs
web/app.js
web/index.html
web/styles.css
src/server.mjs
test/profile-gate.test.mjs
test/profile-pipeline.test.mjs
```

### Contrato de perfil

Estructura sugerida:

```js
{
  id: 'MONO_SI_NO',
  label: 'Mono sí/no',
  description: 'Nemotron solo puede responder SI, NO o SAFE_NOOP.',
  systemPrompt: '...',
  outputContract: {
    kind: 'CLOSED_VOCABULARY',
    allowed: ['SI', 'NO', 'SAFE_NOOP']
  },
  riskClass: 'R1'
}
```

### Endpoint sugerido

Extender o crear endpoint:

```text
POST /api/profile-chat
```

Cuerpo:

```json
{
  "message": "...",
  "profile_id": "MONO_SI_NO",
  "history": []
}
```

Respuesta esperada:

```json
{
  "source": "LIVE_NEBIUS_NEMOTRON_PROFILE",
  "ok": true,
  "state": "PROFILE_RESPONSE_ACCEPTED",
  "profile_id": "MONO_SI_NO",
  "assistant_message": "NO",
  "provider": {
    "model": "nvidia/Nemotron-3_5-Lightning",
    "latency_ms": 1234,
    "usage": {}
  },
  "profile_decision": {
    "outcome": "PREPARED",
    "reason_codes": ["CLOSED_VOCABULARY_OK"],
    "dispatch_attempted": false
  },
  "dispatch_attempted": false
}
```

En caso de incumplimiento:

```json
{
  "ok": false,
  "state": "PROFILE_CONTRACT_DENIED",
  "profile_id": "MONO_SI_NO",
  "assistant_message": null,
  "rejected_model_output": "sanitized-or-hidden-preview",
  "profile_decision": {
    "outcome": "DENY",
    "reason_codes": ["CLOSED_VOCABULARY_VIOLATION"],
    "dispatch_attempted": false
  },
  "dispatch_attempted": false
}
```

## UI objetivo

Sustituir el bloque confuso actual:

```text
SALIDA REAL DEL OTRO GPT
Evaluar contrato
```

por algo orientado a Nemotron:

```text
Perfiles gobernados de Nemotron
Selecciona un perfil. Nemotron responderá bajo ese contrato y Phoenix verificará la salida.

Perfil activo:
[ MONO_SI_NO | FERRUM_RUST | ACTION_PROPOSER | SAFE_NOOP ]

Tu petición:
[ ... ]

Enviar a Nemotron con perfil
```

Panel de resultado:

```text
Nemotron propuso:
...

Phoenix Profile Gate:
PREPARED / REVIEW / DENY
Reason codes:
...
Dispatch attempted: NO
```

## Decisiones de diseño ya tomadas

- No usar los perfiles como GPTs externos.
- No pedir al usuario que pegue salidas de otro GPT para el flujo principal.
- Los ejemplos de GPTs personalizados son material de referencia para contratos de perfil.
- Nemotron sigue siendo el modelo live de la demo.
- Phoenix sigue siendo la autoridad externa de verificación.
- Dispatch sigue deshabilitado.
- No se revela configuración privada de GPTs, prompts sensibles ni material no publicable.

## Validaciones requeridas mañana

### Unitarias

- `MONO_SI_NO` acepta `SI`, `NO`, `SAFE_NOOP`.
- `MONO_SI_NO` rechaza frases largas, minúsculas si decidimos normalización estricta, signos extra y explicaciones.
- `FERRUM_RUST` acepta respuestas Rust obvias y rechaza dominios externos obvios.
- `ACTION_PROPOSER` rechaza claims de ejecución.
- Todos los rechazos mantienen `dispatch_attempted=false`.

### Integración local sin Nebius

- Mock de salida de Nemotron → Profile Gate → decisión.
- Endpoint `/api/profile-chat` con fetch mockeado.

### Runtime live con Nebius

- Cargar `NEBIUS_API_KEY` sin exponer secreto.
- Ejecutar panel.
- Probar al menos un caso válido y uno inválido por perfil.
- Registrar evidencia sanitizada.

## Riesgos

- El clasificador de dominio Rust no debe prometer precisión semántica general si se implementa de forma heurística.
- Evitar claims de “seguridad general”.
- Evitar decir que los perfiles son infalibles.
- Evitar publicar prompts privados o configuración exacta de GPTs personalizados.
- Evitar presentar Contract Lab como flujo principal; será reemplazado o reclasificado como herramienta secundaria.

## Frase de arranque para mañana

> Implementar Nemotron Profile Gate: perfiles especializados aplicados a Nemotron y verificados por Phoenix, sustituyendo el bloque de “salida real del otro GPT” por un flujo nativo de perfiles gobernados.

## Estado de evidencia

- `DESIGNED`: este documento.
- `GENERATED`: pendiente de código.
- `TEST_EJECUTADO`: pendiente.
- `RUNTIME_OBSERVADO`: pendiente para Profile Gate.
- `PRODUCCION_VALIDADA`: no.
