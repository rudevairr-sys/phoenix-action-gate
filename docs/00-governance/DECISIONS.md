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
**Estado:** protocolo inicial documentado; no ejecutado.

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

**Evidencia:** 44/44 tests y tres rutas LIVE observadas: `.env → DENY`, `README.md → PREPARED`, `npm test → PREPARED`, todas sin dispatch.

**Límite:** solo se promueve a `RUNTIME_OBSERVED` la frontera single-action observada. El plan multiacción generado por Nemotron sigue pendiente.

**Estado:** aceptada y validada para checkpoint local; reversible mediante commit posterior. Sin push, PR, deploy ni submission.
