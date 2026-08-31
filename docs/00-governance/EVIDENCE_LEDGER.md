# Evidence ledger

| ID | Evidencia | Capa | Estado |
|---|---|---|---|
| E-001 | Metadatos GitHub: repo público, rama `main`, permisos administrativos | Runtime observado | Verificado 2026-08-31 |
| E-002 | SION `git status`: `main...origin/main` | Runtime observado | Verificado antes de F0 |
| E-003 | README recuperado desde GitHub | Runtime observado | Blob `190c677316a4b7d2640c6e3a50fe5108078b0d21` |
| E-004 | Devpost: evento abierto y participante ya registrado | Runtime observado | Recuperado 2026-08-31 |
| E-005 | Reglas oficiales | Documentado desde fuente viva | Recuperadas 2026-08-31T07:35:50Z |
| E-006 | Requisitos de entrega | Documentado desde fuente viva | Recuperados 2026-08-31T07:35:52Z |
| E-007 | Criterios de evaluación | Documentado desde fuente viva | Recuperados 2026-08-31T07:35:51Z |
| E-008 | Fechas oficiales | Documentado desde fuente viva | Recuperadas 2026-08-31T07:35:53Z |
| E-009 | H-PHX-04 cerrado como no corroborado | Test externo ejecutado | Radar Phoenix, blob `5a94358648cbb9c37327ae4c50afe9b709eb5c96` |
| E-010 | Documentos F0 | Implementado | El commit que contiene este archivo |
| E-011 | Token Factory `GET /v1/models`: HTTP 200, 30 modelos, 7 NVIDIA, incluido `nvidia/Nemotron-3_5-Lightning` | Runtime observado | `docs/04-runtime/evidence/G1_LIST_MODELS_2026-08-31.json` |
| E-012 | Token Factory `POST /v1/chat/completions` con `nvidia/Nemotron-3_5-Lightning`: ActionProposal estructurada válida, HTTP 200, sin dispatch | Runtime observado | `docs/04-runtime/evidence/G1_ACTION_PROPOSAL_2026-08-31.json` |

## Regla

Una afirmación no asciende de capa por aparecer en este documento. Cada ascenso requiere el artefacto o runtime correspondiente y una referencia reproducible.
