# Registro de decisiones

## D-001 — Repositorio independiente

**Decisión:** desarrollar Phoenix Action Gate en `rudevairr-sys/phoenix-action-gate`.  
**Motivo:** aislar el concurso del core, producir historia pública verificable y evitar contaminación de autoridades.  
**Estado:** aceptada.

## D-002 — Proyecto SION dedicado

**Decisión:** usar `01_MESA_PRINCIPAL/PHOENIX_NEBIUS_AGENT_GATE_LAB` como runtime local.  
**Estado:** implementada y enlazada con GitHub.

## D-003 — Publicación mínima y trazable

**Decisión:** no copiar proyectos completos. Cualquier importación futura exige fuente, versión, hash, licencia, finalidad y autorización.  
**Estado:** vigente.

## D-004 — Categoría candidata

**Decisión:** orientar el alcance inicialmente a `Coding and agentic engineering`.  
**Motivo:** el caso de uso natural es gobernar acciones de agentes que leen, escriben, ejecutan y prueban código.  
**Estado:** provisional hasta cerrar el MVP.

## D-005 — H-PHX-05 no es un claim

**Decisión:** tratar H-PHX-05 como hipótesis falsable, con baseline sencillo competente y criterios fijados antes del resultado.  
**Estado:** protocolo ejecutado por etapas; los resultados favorables siguen limitados por su evidencia.

## D-006 — Sin dispatch productivo

**Decisión:** mantener ejecución productiva fuera de alcance. Las primeras pruebas de acción usarán fixtures o un entorno acotado del hackathon.  
**Estado:** vigente.

## D-007 — Licencia

**Decisión:** publicar el contenido original de este repositorio bajo Apache-2.0.  
**Límite:** no relicencia los proyectos Phoenix referenciados.

## D-008 — Estado Devpost local

**Decisión:** inicializar continuidad Devpost porque el participante ya aparece registrado, pero mantener `rules_acknowledged=false` hasta recuperar consentimiento verificable en este proyecto.

## D-009 — Núcleo G2 sin dependencias externas

**Decisión:** implementar el primer vertical determinista del MVP con módulos ESM de Node y APIs estándar, sin framework ni dependencias de terceros en el núcleo.  
**Motivo:** minimizar superficie operativa, instalación, riesgo de supply chain y tiempo de entrega antes de demostrar `PREPARED`, `REVIEW` y `DENY`. El runtime SION observado dispone de Node 24.  
**Alcance:** contrato, política determinista, fixtures, hash de decisión y tests. La UI se añade encima una vez validado el núcleo.  
**Estado:** aceptada para G2; reversible si la UI o el despliegue exigen otro adaptador.

## D-010 — Frontera conversacional single-turn explícita

**Decisión:** usar una única función forzada `emit_phoenix_turn` como frontera entre Nemotron y el contrato de Phoenix. Nemotron clasifica el turno como `CHAT`, `READ_CONTEXT`, `WRITE_PATCH` o `RUN_COMMAND`; el adaptador construye una única `ActionProposal` cuando corresponde y Phoenix conserva la autoridad de decisión.

**Motivo:** los ensayos LIVE con múltiples tools y selección automática produjeron JSON inválido, narración sin propuesta y tool calls múltiples. La función única elimina la selección ambigua sin convertir al modelo en autoridad ni habilitar ejecución.

**Evidencia:** rutas LIVE observadas: `.env → DENY`, `README.md → PREPARED`, `npm test → PREPARED`, todas sin dispatch; regresión incluida en E-025.

**Límite:** algunos bordes conversacionales siguen requiriendo mejor UX para distinguir petición incompleta, provider fail-closed y decisión política de Phoenix.

**Estado:** aceptada y validada para checkpoint local; reversible mediante commit posterior. Sin push, PR, deploy ni submission.

## D-011 — Plan LIVE con contrato semántico compacto

**Decisión:** mantener el Plan Gate canónico y reducir únicamente el contrato que Nemotron debe producir mediante `compact-plan/0.2`. Nemotron propone pasos, dependencias, transiciones objetivo, requisitos cruzados y lineage; el adaptador deriva metadatos mecánicos y estado de target desde la proyección conocida.

**Motivo:** los contratos de plan completos sobre Chat Completions se truncaron incluso con presupuestos elevados; la ruta Responses observada presentó incompatibilidad de campo y después timeout. El contrato compacto produjo una sola tool call LIVE en 7582 ms y 2669 tokens totales.

**Salvaguarda:** una expectativa explícita del modelo en `needs_state` se preserva incluso si contradice el estado proyectado; no se corrige silenciosamente y puede activar `STALE_STATE_PRECONDITION`.

**Evidencia:** E-023, E-024 y E-025.

**Estado:** aceptada como frontera LIVE actual del plan; sin executor ni dispatch.

## D-012 — Podar transportes que no mejoren la demo

**Decisión:** no continuar inflando tokens en el contrato completo ni convertir una espera superior a 60 s en el camino normal de demo. La ruta Responses no se considera fallida en general, pero queda `PRUNED` para este vertical síncrono hasta nueva evidencia que justifique reabrirla.

**Motivo:** preservar latencia, simplicidad y reproducibilidad. Los contraejemplos se conservan en E-023.

**Estado:** vigente.

## D-013 — Cierre del bloque panel/adaptador por evidencia separada

**Decisión:** promover el bloque de panel/adaptador únicamente después de cumplir simultáneamente la regresión completa y las rutas LIVE previstas, distinguiendo de forma explícita fallos previos a ActionProposal de decisiones de política Phoenix.

**Criterios satisfechos:**

- regresión completa `58/58 PASS`;
- escritura incompleta sin inventar ActionProposal;
- provider fail-closed visible y separado de `PHOENIX DENY`;
- destructivo LIVE `RUN_COMMAND` → `R3/DENY/DESTRUCTIVE_COMMAND`;
- secreto LIVE `READ_CONTEXT .env` → `R3/DENY/SECRET_BOUNDARY`;
- Plan Gate LIVE con baseline `REVIEW`, Phoenix `DENY` y `EVIDENCE_LINEAGE_INVALIDATED`;
- `dispatch_attempted=false` en todas las rutas de aceptación.

**Interpretación del doble envío:** el `MODEL_TURN_TOOL_COUNT_INVALID` observado inmediatamente antes del PASS limpio de `.env` fue atribuido por el operador a haber disparado la interacción dos veces. Se conserva como evidencia de que la UI cierra y etiqueta el fallo previo a propuesta, pero no se clasifica como regresión de la ruta `.env` de un solo envío.

**Límite:** esto valida el corte local del panel y adaptador; no autoriza claims de producción, superioridad general, publicación, dispatch ni integración canónica con Phoenix Neuron.

**Estado:** aceptada para checkpoint local. Sin push, PR, deploy ni submission.

## D-014 — Preregistrar receipt/tamper antes de implementar

**Decisión:** abrir `EVIDENCE_RECEIPT_TAMPER_TRIAL_001` como ensayo falsable y congelar su protocolo antes de escribir baseline o candidato.

**Baseline fijado:** `snapshot-receipt-baseline/0.1.0`, competente en binding canónico de subject, decisión, policy artifact y evidencia explícita, pero sin traversal automático de `derives_from`.

**Discriminante fijado:** T5 — la evidencia y el receipt permanecen intactos, pero cambia una fuente causal declarada. El resultado preregistrado es `B0=VALID` frente a `Phoenix=INVALID/LINEAGE_BINDING_INVALIDATED`.

**Controles obligatorios:** decisión, subject, política y evidencia explícita alterados deben ser detectados por ambos; un cambio irrelevante no puede invalidar el receipt.

**Escalado:** un resultado favorable frente a B0 no autoriza claim público de diferenciación. Debe preregistrarse un baseline B1 lineage-aware antes de Trial 002. Si B1 iguala al candidato con menor complejidad, tamper/receipt queda como capacidad útil de G7 y no como diferenciador.

**Frontera:** no modificar `gate.mjs` ni `plan-gate.mjs`, no importar Phoenix Neuron, no habilitar dispatch y no cambiar fixtures después de ver resultados.

**Protocolo:** `docs/02-research/EVIDENCE_RECEIPT_TAMPER_TRIAL_001_PROTOCOL.md`.

**Estado:** preregistrada / no ejecutada.
