# Matriz de trazabilidad de requisitos del hackathon

| ID | Requisito | Estado F0 | Evidencia / siguiente prueba |
|---|---|---|---|
| R-01 | Aplicación funcional | NOT_IMPLEMENTED | MVP pendiente |
| R-02 | Runtime en Token Factory o AI Cloud | NOT_IMPLEMENTED | Capturar request, response y timestamp |
| R-03 | Modelo NVIDIA open source | NOT_IMPLEMENTED | Seleccionar Nemotron y registrar variante |
| R-04 | Categoría | CANDIDATE | Coding and agentic engineering |
| R-05 | Instalación reproducible | NOT_IMPLEMENTED | Validar desde clon limpio |
| R-06 | Demo pública/test build | NOT_IMPLEMENTED | URL y health check |
| R-07 | Vídeo público ≤3 minutos | NOT_STARTED | Guion y captura después del MVP |
| R-08 | Repositorio público | RUNTIME_OBSERVED | `rudevairr-sys/phoenix-action-gate` |
| R-09 | Licencia OSI | IMPLEMENTED_IN_F0 | Apache-2.0 |
| R-10 | README con setup | PARTIAL | F0 explica que aún no existe ejecución |
| R-11 | Explicar uso de Nebius/NVIDIA | NOT_IMPLEMENTED | No redactar hasta observar runtime |
| R-12 | Declarar nuevo/existente | DECIDED | Proyecto nuevo; antecedentes Phoenix se revelarán |
| R-13 | Feedback de plataforma/modelo | NOT_STARTED | Registrar durante integración |
| R-14 | Correspondencia vídeo↔runtime | NOT_STARTED | Comparar demo grabada con commit/tag |
| R-15 | Reglas y elegibilidad | REGISTERED / LOCAL_ACK_PENDING | Gate Devpost pendiente en esta carpeta |

## Gates competitivos

| Criterio | Demostración mínima |
|---|---|
| Technological Implementation | llamada real Nemotron/Token Factory + gate gobernado + evidencia reproducible |
| Design | interfaz de revisión comprensible con estados DENY/REVIEW/PREPARED |
| Potential Impact | escenario real de agente de código y usuario claramente definido |
| Quality of the Idea | integración no ornamental: el modelo propone; el gate decide y justifica |

## Regla de cierre

Ningún requisito pasa a `PASS` por documentación o intención. Debe existir evidencia en la capa correspondiente.
