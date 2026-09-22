# Builder Ω residence seed — Phoenix Action Gate

Fecha: 2026-09-20  
Estado: `RESIDENCE_SEED_WRITTEN / NEXT_MISSION_READY`  
Proyecto activo SION: `01_MESA_PRINCIPAL/phoenix-action-gate`

## Objetivo retenido

Mañana hay que arrancar con **Nemotron Profile Gate**.

La idea correcta del usuario es:

```text
Nemotron adopta perfiles especializados.
Phoenix verifica que Nemotron no se salga del contrato del perfil.
```

No es un flujo de “pegar salidas de otro GPT”. Los GPTs personalizados que el usuario compartió eran ejemplos conceptuales para diseñar perfiles y contratos aplicables a Nemotron.

## Estado de verdad

### Validado / observado

- Proyecto recuperado tras reinicio.
- Panel local corre en `http://127.0.0.1:4173`.
- `NEBIUS_API_KEY` presente en la terminal local según comprobación booleana del usuario.
- Chat live con Nemotron revalidado desde el panel.
- Dispatch sigue deshabilitado por diseño.
- PR #7 existe como draft, abierto y no fusionado.
- Última regresión local registrada: `130/130 PASS`.

### Diseñado hoy

- `docs/02-architecture/NEMOTRON_PROFILE_GATE_DESIGN_2026-09-20.md`.
- `BUILDER_OMEGA_CONTEST_PREP_20260918/NEXT_SESSION_NEMOTRON_PROFILE_GATE_20260920.md`.

### No demostrado todavía

- Profile Gate implementado.
- Profile Gate probado.
- Profile Gate observado live con Nemotron.
- Plan multiacción live revalidado en este corte.
- Clean clone fresco del último corte.
- Demo URL pública/test build.
- Vídeo final.
- Devpost submission.

## Decisión conceptual

La dirección correcta para el concurso es:

```text
Nemotron conversa bajo perfiles especializados,
pero Phoenix no confía solo en el prompt:
Phoenix verifica determinísticamente el contrato del perfil.
```

Esto puede diferenciarse de una demo normal de prompt engineering porque añade una verificación externa.

## Perfiles MVP

1. `MONO_SI_NO`
   - Permitido: `SI`, `NO`, `SAFE_NOOP`.
   - Bloquear explicaciones.

2. `FERRUM_RUST`
   - Solo dominio Rust.
   - Bloquear asistente general / dominio externo.

3. `ACTION_PROPOSER`
   - Puede proponer.
   - No puede afirmar ejecución.
   - Siempre sin dispatch.

4. Opcional: `SAFE_NOOP` / `VETO_CONSTITUCIONAL`.

## Próximo paso seguro

Implementar primero la capa determinista y testable:

```text
src/profiles.mjs
src/profile-gate.mjs
test/profile-gate.test.mjs
```

Después endpoint y UI:

```text
src/profile-pipeline.mjs
POST /api/profile-chat
web/index.html
web/app.js
web/styles.css
```

No empezar por claims ni vídeo. Primero pruebas.

## Límites vigentes

- No tocar Phoenix Neuron.
- No mover MAK.
- No habilitar dispatch.
- No hacer merge.
- No enviar Devpost.
- No publicar secretos.
- No prometer producción.
- No decir que los perfiles son infalibles.
- No afirmar superioridad general.

## Comando de arranque humano

```powershell
cd C:\Users\Usuario\.chatgpt\Gobernanza_Phoenix\SION_TALLER_RUST\SION_WORKSPACE\01_MESA_PRINCIPAL\phoenix-action-gate
[bool]$env:NEBIUS_API_KEY
npm run panel
```

## Frase de reentrada

> Retomamos Nemotron Profile Gate: perfiles especializados para Nemotron verificados por Phoenix, sustituyendo el bloque de “salida real del otro GPT” por perfiles gobernados nativos.
