# Phoenix Action Gate — Jury Surface v0.1

Estado: `JURY_SURFACE_V0_1_VALIDATED_BOUNDED`  
Fecha: 2026-09-03

## Objetivo

Convertir la gobernanza técnica ya demostrada en una experiencia que un jurado pueda entender en segundos sin conocer Phoenix, MAVO, RTM ni los nombres internos de los trials.

## Tesis visible

> Un agente puede proponer una acción permitida y aun así estar justificándola con evidencia que ya no es válida. Phoenix comprueba que la razón para actuar sigue siendo cierta antes de dejar que la acción avance.

El modelo propone. Phoenix no ejecuta y no delega autoridad al modelo.

## Historia principal de demo

1. Nemotron propone un plan multiacción mediante Nebius Token Factory.
2. El plan prepara `config.json` v2.
3. Se prepara `generated.md` v2 derivado de `config.json` v2 y se registra esa procedencia.
4. Un paso posterior devuelve `config.json` a v1.
5. El plan intenta usar `generated.md` v2 y su evidencia para ejecutar tests.
6. La referencia competente mantiene el paso final en REVIEW.
7. Phoenix detecta que la fuente causal ya no coincide y devuelve DENY.
8. Nada se ejecuta.

## Elemento visual central — Mapa de Justificación

La pantalla muestra una cadena simple:

`config.json @ v2`  
`FUENTE CAUSAL`  
↓ deriva
`generated.md @ v2`  
`EVIDENCIA`  
↓ justifica
`npm test`  
`ACCIÓN PROPUESTA`

Cuando `config.json` cambia a v1:

- el nodo de fuente muestra `esperado: v2 / observado: v1`;
- la cadena se marca como `INVALIDATED`;
- Phoenix muestra `DENY`;
- el texto principal explica que la evidencia ya no justifica la acción.

## Runtime observado

Evidencia preservada:

- `docs/04-runtime/evidence/G2_JURY_SURFACE_OBSERVATION_001_2026-09-03.json`: primera ejecución visual; el plan murió antes del discriminante (`DENY/DENY`, 0 diferencias). Sirvió para corregir el escenario guiado.
- `docs/04-runtime/evidence/G2_JURY_SURFACE_LIVE_DISCRIMINANT_002_2026-09-03.json`: escenario guiado correcto observado en vivo.
- `docs/04-runtime/evidence/G2_JURY_SURFACE_REGRESSION_003_2026-09-03.json`: regresión Node completa tras el refinamiento visual, `122/122 PASS`.
- `docs/04-runtime/evidence/G2_JURY_SURFACE_FINAL_VISUAL_004_2026-09-03.json`: revalidación visual final tras corregir el servido de `jury.css`; cuatro nodos completos y sin recorte a la derecha.

Observación live final confirmada:

- referencia: `REVIEW`;
- Phoenix: `DENY`;
- diferencias: `1`;
- lineage: `INVALIDATED`;
- fuente: `config.json`;
- esperado: `sha256:config-v2`;
- observado: `sha256:config-v1`;
- evidencia: `generated-evidence-v2`;
- invalidado por: `s3`;
- paso divergente: `s4`;
- dispatch: `false`;
- mapa visible completo: `FUENTE CAUSAL → EVIDENCIA → ACCIÓN POSTERIOR → PHOENIX`;
- recorte derecho: no observado.

Última regresión confirmada:

- runner aplicable: `npm test` / Node.js;
- tests: `122`;
- pass: `122`;
- fail: `0`;
- skipped: `0`;
- cancelled: `0`;
- duración observada: `656.5955 ms`;
- `cargo test`: `NOT_APPLICABLE` en este proyecto porque no existe `Cargo.toml`.

Esto valida la narrativa de demo, la regresión automatizada y el layout final para el caso acotado. NO restaura el claim refutado de que lineage de un salto sea un moat único frente a cualquier baseline competente.

## Jerarquía de información

### Nivel principal

- qué quiere hacer el agente;
- decisión Phoenix;
- riesgo;
- por qué;
- mapa de justificación;
- evidencia actual vs esperada;
- `NO DISPATCH`.

### Nivel secundario

- modelo Nemotron;
- request id sanitizado;
- latencia/tokens;
- policy version;
- decision id/hash;
- evidence bundle/receipt.

### No mostrar como protagonista

- B0/B1;
- números de trials;
- RTM/OVAM;
- Phoenix Neuron;
- nombres de hipótesis internas;
- jargon de investigación que no ayude a entender el beneficio.

Puede existir una sección avanzada para la evidencia experimental.

## Uso del Governance Context Witness

`phoenix-governance-context-receipt/0.2.0` contiene un testigo explícito de contexto de gobernanza. Trial 004 NO demostró que ese testigo sea técnicamente diferenciador frente al baseline coherente.

En Jury Surface puede utilizarse como fuente de explicación/auditabilidad, pero la UI no debe afirmar que esa representación sea exclusiva de Phoenix ni superior por sí misma.

## Criterios de aceptación

1. Un observador puede responder en menos de una pantalla: qué propuso Nemotron, qué cambió, qué evidencia quedó inválida y por qué Phoenix negó el avance. ✅
2. El flujo mantiene `dispatch_attempted=false`. ✅
3. El panel diferencia claramente propuesta del modelo y autoridad determinista. ✅
4. La demo live conserva modelo, request id sanitizado y latencia cuando el proveedor responde. ✅
5. El fallo del proveedor permanece fail-closed. ✅
6. Ningún texto de UI afirma superioridad frente a un baseline que Trial 004 no demostró. ✅
7. La prueba local completa continúa pasando tras la modificación visual. ✅ `122/122`
8. El Mapa de Justificación ocupa ancho suficiente para que los cuatro nodos sean legibles sin recorte. ✅

## Posicionamiento para el jurado

No presentar Phoenix como otro chatbot ni como un guardrail genérico.

Presentarlo como una capa previa a ejecución que pregunta:

> ¿La evidencia y el estado que justifican esta acción siguen siendo válidos ahora?

## Siguiente gate

`CONTEST_SURFACE_PREPARATION`:

1. congelar esta versión visual validada;
2. preparar guion de demo de ≤3 minutos;
3. preparar superficie pública/repo para concurso;
4. asegurar README, licencia, setup, arquitectura, uso de Nemotron/Nebius y evidencia reproducible;
5. validar clean clone y ejecución local antes de publicar;
6. no hacer deploy, push ni submission sin autorización humana separada.

No deploy, push ni publicación externa sin autorización humana separada.
