# Matriz de trazabilidad de requisitos del hackathon

Fecha: 2026-09-18  
Estado: `RECONCILED_FOR_CONTEST_PREP / CURRENT_CUT_TEST_PASS / NOT_SUBMISSION_READY`

## Fuente de requisitos

Hackathon: `Nebius x NVIDIA Global AI Hackathon`  
Fase observada por conector Devpost: `submissions_open`  
Deadline observado: `2026-10-30T17:00:00Z`  
Track recomendado: `Coding and agentic engineering`

## RTM

| ID | Requisito | Estado actual | Evidencia / siguiente prueba |
|---|---|---|---|
| R-01 | Aplicación funcional | `TEST_EXECUTED_LOCAL_PASS` | E-045: `npm test`, 122/122 PASS. Panel/gate cubiertos por tests; falta validación visual/runtime final. |
| R-02 | Runtime en Token Factory o AI Cloud | `RUNTIME_OBSERVED_PREVIOUSLY / REVALIDATE` | Evidencias locales previas con Token Factory/Nemotron; repetir live probe antes de submission. |
| R-03 | Modelo NVIDIA open source | `RUNTIME_OBSERVED_PREVIOUSLY / REVALIDATE` | Evidencias previas referencian `nvidia/Nemotron-3_5-Lightning`; confirmar modelo exacto en corte final. |
| R-04 | Categoría | `SELECTED_CANDIDATE` | `Coding and agentic engineering`. |
| R-05 | Instalación reproducible | `PENDING` | Ejecutar clean clone checklist. |
| R-06 | Demo pública/test build | `PENDING` | Preparar URL o instrucciones de test build. |
| R-07 | Vídeo público <=3 minutos | `DRAFTED_NOT_RECORDED` | Ver `BUILDER_OMEGA_CONTEST_PREP_20260918/VIDEO_SCRIPT_3MIN.md`. |
| R-08 | Repositorio público | `PUBLIC_REPO_EXISTS / CUT_NOT_RECONCILED` | `rudevairr-sys/phoenix-action-gate`; GitHub público va detrás del corte local. |
| R-09 | Licencia OSI | `IMPLEMENTED_PREVIOUSLY / VERIFY_PUBLIC_CUT` | Apache-2.0 en raíz local; confirmar en rama pública final. |
| R-10 | README con setup | `PARTIAL` | README local existe; ajustar tras clean clone. |
| R-11 | Explicar uso de Nebius/NVIDIA | `DRAFTED` | Ver draft Devpost y README; revalidar live antes de submission. |
| R-12 | Declarar nuevo/existente | `DECIDED_WITH_BOUNDARY` | Proyecto nuevo de concurso con antecedentes Phoenix declarados como inspiración/reference_only. |
| R-13 | Feedback de plataforma/modelo | `DRAFT_PENDING_FINAL_LIVE` | Completar tras revalidar Nemotron/Token Factory. |
| R-14 | Correspondencia vídeo-runtime | `PENDING` | Grabar vídeo desde commit/tag público final. |
| R-15 | Reglas y elegibilidad | `REGISTERED / RECHECK_BEFORE_SUBMISSION` | Devpost relación `registered`; repetir preflight antes de enviar. |
| R-16 | No secrets / no private paths | `PENDING_SCAN` | Validar repo público y clean clone. |
| R-17 | Claim boundaries | `GENERATED` | Ver `CLAIM_BOUNDARY.md` y `STATUS.md`; B1 limita diferenciación. |

## Gates competitivos

| Criterio | Demostración mínima | Estado |
|---|---|---|
| Technological Implementation | llamada real Nemotron/Token Factory + gate gobernado + evidencia reproducible | `LOCAL_TEST_PASS / LIVE_REVALIDATION_PENDING` |
| Design | interfaz de revisión comprensible con `DENY/REVIEW/PREPARED` y mapa de justificación | `TEST_EXECUTED_LOCAL_PASS / VISUAL_REVALIDATION_PENDING` |
| Potential Impact | escenario real de agente de código con no-dispatch | `DRAFTED_AND_DEMONSTRABLE` |
| Quality of the Idea | uso no ornamental de Nemotron: el modelo propone, el gate decide | `STRONG_CANDIDATE / NEED_FINAL_DEMO` |

## Claim boundary competitivo

No presentar Phoenix como superioridad general ni como integración canónica de Phoenix Neuron.

Narrativa permitida:

> Phoenix Action Gate demonstrates a bounded pre-execution governance layer where Nemotron proposes and a deterministic justification gate checks whether the action is still supported by current evidence.

## Regla de cierre

Ningún requisito pasa a `PASS` por documentación o intención. Debe existir evidencia actual en la capa correspondiente.

Estado máximo actual:

`LOCAL_CONTEST_CANDIDATE / CURRENT_CUT_TEST_PASS / PUBLICATION_PENDING / CLEAN_CLONE_PENDING / SUBMISSION_PENDING`
