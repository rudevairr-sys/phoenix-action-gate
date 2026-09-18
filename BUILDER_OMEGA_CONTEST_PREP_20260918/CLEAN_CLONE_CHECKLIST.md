# Clean Clone Checklist — Phoenix Action Gate

Estado: `CHECKLIST_NOT_EXECUTED`  
Fecha: 2026-09-18

## Objetivo

Demostrar que el proyecto público puede ser evaluado por jurado sin depender de rutas privadas, secretos versionados ni laboratorios Phoenix internos.

## Precondición

Antes de ejecutar este checklist, decidir y publicar una rama/release candidata que contenga el corte final.

## Checklist

### 1. Repo público

- [ ] Repo público accesible.
- [ ] Licencia OSI visible en la raíz.
- [ ] README visible en la raíz.
- [ ] Rama/release candidata identificada.
- [ ] No depende de `PHOENIX_NEURON_LAB`.
- [ ] No depende de `PHOENIX_ACTION_ASSURANCE_LAB`.
- [ ] No contiene rutas absolutas del equipo.
- [ ] No contiene tokens, `.env`, claves ni secretos.

### 2. Instalación

- [ ] Node.js >= 22 documentado.
- [ ] `npm install` o alternativa documentada.
- [ ] Dependencias reproducibles o ausencia de dependencias externas clara.
- [ ] Instrucciones para tests.
- [ ] Instrucciones para panel local.
- [ ] Instrucciones para probes live con `NEBIUS_API_KEY`.

### 3. Tests locales

- [ ] `npm test` ejecutado en clon limpio.
- [ ] Resultado registrado con fecha, entorno y contador de tests.
- [ ] Tests de gate individual pasan.
- [ ] Tests de plan gate pasan.
- [ ] Tests de panel/jury surface pasan.
- [ ] Tests de baseline B1 pasan si se incluye.
- [ ] No hay skipped/todo ocultando el caso principal.

### 4. Demo local

- [ ] `npm run panel` inicia.
- [ ] UI carga `styles.css` y `jury.css`.
- [ ] Botón de demo lineage carga prompt correcto.
- [ ] Justification Map se ve completo.
- [ ] Resultado `DENY` visible.
- [ ] Badge `NO DISPATCH` visible.
- [ ] Diferencia modelo/gate visible.

### 5. Live Nebius/NVIDIA

- [ ] `NEBIUS_API_KEY` se configura localmente sin versionarse.
- [ ] Modelo NVIDIA observado y documentado exactamente.
- [ ] Llamada live a Token Factory registrada con request id sanitizado si disponible.
- [ ] Latencia/tokens registrados si disponibles.
- [ ] Fallo del proveedor termina fail-closed.
- [ ] La demo puede explicar qué parte aporta Nemotron.

### 6. Flujos mínimos requeridos

- [ ] Caso `PREPARED` reproducible sin ejecución.
- [ ] Caso `REVIEW` reproducible sin ejecución.
- [ ] Caso `DENY` reproducible sin ejecución.
- [ ] Caso provider invalid/timeout/fail-closed reproducible o simulado de forma honesta.
- [ ] Caso main demo: evidence lineage invalidation visible.

### 7. Publicación Devpost

- [ ] Repo URL definitivo.
- [ ] Demo/test build URL o instrucciones suficientes.
- [ ] Vídeo público de YouTube <= 3 minutos.
- [ ] Descripción coherente con lo que se ve.
- [ ] Feedback Nebius/Nemotron completado.
- [ ] Track seleccionado.
- [ ] Pregunta Tavily respondida honestamente.
- [ ] Nuevo/existente explicado sin ocultar antecedentes Phoenix.

## Estado máximo si este checklist no se ejecuta

`LOCAL_CANDIDATE / PUBLICATION_PENDING / CLEAN_CLONE_PENDING`

No llamar `submission_ready` hasta completar al menos repo público, tests desde clon limpio, demo/test build y vídeo.
