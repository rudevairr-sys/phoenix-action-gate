# Próxima sesión — Nemotron Profile Gate

Fecha de semilla: 2026-09-20  
Estado: `NEXT_SESSION_READY`  
Proyecto: `Phoenix Action Gate`  
Rama: `review/contest-surface-20260918`

## Misión de mañana

Reconducir el bloque de contratos hacia la intención correcta del usuario:

```text
Nemotron debe poder operar bajo perfiles especializados.
Phoenix debe verificar que Nemotron no se sale del contrato del perfil.
```

La idea correcta no es pedir salidas de otros GPTs. Los perfiles de GPT personalizados compartidos por el usuario eran ejemplos para diseñar contratos de comportamiento aplicables a Nemotron.

## Arranque rápido

Abrir terminal en:

```text
C:\Users\Usuario\.chatgpt\Gobernanza_Phoenix\SION_TALLER_RUST\SION_WORKSPACE\01_MESA_PRINCIPAL\phoenix-action-gate
```

Comprobar clave sin exponerla:

```powershell
[bool]$env:NEBIUS_API_KEY
```

Si es `False`, cargarla o usar variable persistente de usuario.

Arrancar panel:

```powershell
npm run panel
```

URL esperada:

```text
http://127.0.0.1:4173
```

Nota: `Dispatch capability: disabled` es correcto. Significa que no se ejecutan acciones reales.

## Archivos guía

Leer primero:

```text
docs/02-architecture/NEMOTRON_PROFILE_GATE_DESIGN_2026-09-20.md
docs/00-governance/STATUS.md
```

Luego revisar código actual:

```text
src/server.mjs
src/pipeline.mjs
src/nebius-conversation.mjs
src/nebius.mjs
web/index.html
web/app.js
web/styles.css
src/agent-contracts.mjs
```

## Cambio principal previsto

Transformar el bloque actual de UI:

```text
SALIDA REAL DEL OTRO GPT
Evaluar contrato
```

en:

```text
Perfiles gobernados de Nemotron
Selecciona un perfil. Nemotron responderá bajo ese contrato y Phoenix verificará la salida.
```

## Perfiles MVP

Implementar primero tres:

1. `MONO_SI_NO`
   - Permitido: `SI`, `NO`, `SAFE_NOOP`.
   - Bloquear frases largas o explicaciones.

2. `FERRUM_RUST`
   - Solo dominio Rust.
   - Bloquear salida de asistente general o dominio externo.

3. `ACTION_PROPOSER`
   - Puede proponer.
   - No puede afirmar ejecución.
   - Mantener `dispatch_attempted=false`.

Opcional si da tiempo:

4. `SAFE_NOOP` / `VETO_CONSTITUCIONAL`
   - Salida segura ante presión para romper perfil.

## Implementación recomendada

Crear o adaptar:

```text
src/profiles.mjs
src/profile-gate.mjs
src/profile-pipeline.mjs
test/profile-gate.test.mjs
test/profile-pipeline.test.mjs
```

Modificar:

```text
src/server.mjs
web/index.html
web/app.js
web/styles.css
```

No borrar todavía `src/agent-contracts.mjs` hasta decidir si se conserva como utilidad secundaria o se reemplaza por `profile-gate`.

## Endpoint candidato

```text
POST /api/profile-chat
```

Body:

```json
{
  "profile_id": "MONO_SI_NO",
  "message": "¿Puedo borrar todo?",
  "history": []
}
```

Resultado esperado:

```json
{
  "source": "LIVE_NEBIUS_NEMOTRON_PROFILE",
  "profile_id": "MONO_SI_NO",
  "assistant_message": "NO",
  "profile_decision": {
    "outcome": "PREPARED",
    "reason_codes": ["CLOSED_VOCABULARY_OK"]
  },
  "dispatch_attempted": false
}
```

## Tests mínimos de cierre

Antes de commit:

```powershell
npm test
```

Aceptar solo si todos pasan.

Casos mínimos:

- `MONO_SI_NO` acepta `SI`.
- `MONO_SI_NO` rechaza `Sí, claro...`.
- `FERRUM_RUST` rechaza un dominio externo obvio.
- `ACTION_PROPOSER` rechaza `he ejecutado` / `ya borré` / `desplegué`.
- Todos los endpoints de perfil devuelven `dispatch_attempted=false`.

## Evidencia a registrar mañana

Crear si se implementa:

```text
docs/04-runtime/evidence/G10_NEMOTRON_PROFILE_GATE_TESTS_2026-09-20.json
docs/04-runtime/evidence/G10_NEMOTRON_PROFILE_GATE_LIVE_2026-09-20.md
```

Actualizar:

```text
docs/00-governance/STATUS.md
docs/00-governance/CLAIMS_LEDGER.md
docs/00-governance/EVIDENCE_LEDGER.md
BUILDER_OMEGA_CONTEST_PREP_20260918/DEVPOST_SUBMISSION_DRAFT.md
BUILDER_OMEGA_CONTEST_PREP_20260918/VIDEO_SCRIPT_3MIN.md
```

Solo actualizar claims si hay evidencia.

## Claim permitido si pasa test local

> Phoenix Action Gate incluye un prototipo de perfiles gobernados: Nemotron responde bajo un perfil especializado y Phoenix verifica determinísticamente si la salida respeta el contrato del perfil.

## Claim permitido solo si hay runtime live

> En una prueba local live, Nemotron respondió bajo perfiles especializados y Phoenix aceptó o bloqueó las salidas según el contrato del perfil, sin dispatch.

## Claims bloqueados

No decir:

- “perfiles infalibles”;
- “seguridad general de agentes”;
- “producción”;
- “Phoenix supera cualquier guardrail”;
- “powered by Phoenix Neuron”;
- “GPTs personalizados integrados como runtime externo”;
- “Devpost submission-ready” hasta cerrar demo URL, vídeo y autorización.

## Estado al cierre de esta noche

Hecho:

- Panel recuperado tras reinicio.
- `NEBIUS_API_KEY` presente en entorno local.
- Chat live con Nemotron revalidado.
- Diseño de Nemotron Profile Gate registrado.
- Proyecto activo marcado en SION.

Pendiente:

- Implementar Profile Gate.
- Sustituir o reconducir la UI del Contract Lab.
- Tests unitarios/integración.
- Runtime live con perfiles.
- Clean clone fresco.
- Demo URL/test build.
- Vídeo <= 3 minutos.
- Devpost submission solo con autorización humana.

## Frase exacta para retomar mañana

> Retomamos Nemotron Profile Gate: convertir los contratos de perfiles especializados en un flujo nativo donde Nemotron responde bajo perfil y Phoenix verifica que no se sale del contrato.
