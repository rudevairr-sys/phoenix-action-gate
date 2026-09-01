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
| E-013 | Núcleo determinista G2: 6 tests, 6 PASS, 0 FAIL en entorno de validación; PREPARED/REVIEW/DENY, fail-closed y hash determinista | Test ejecutado | `docs/04-runtime/evidence/G2_CORE_TESTS_2026-08-31.json` |
| E-014 | Repetición del núcleo G2 en el SION local del usuario: `npm test`, 6 tests, 6 PASS, 0 FAIL, 201.0834 ms | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-08-31.json`; salida aportada por el operador |
| E-015 | Pipeline real `Nebius/Nemotron → ActionProposal → Phoenix Gate`: HTTP 200, 1166 tokens, 4654 ms, decisión `R0/PREPARED`, 7 checks PASS, sin dispatch | Runtime observado | `docs/04-runtime/evidence/G2_E2E_NEMOTRON_GATE_2026-08-31.json`; provider response `chatcmpl-f0b5b889` |
| E-016 | H-PHX-05 Trial 001: Phoenix propagó dos bloqueos causales (`s3`, `s4`) que el baseline independiente no propagó; ambos agregados acabaron en `DENY` | Test ejecutado | `docs/04-runtime/evidence/H_PHOENIX_05_CAUSAL_PLAN_TRIAL_001_2026-09-01.json`; `FEASIBLE_WITH_LIMITATION` |
| E-017 | Regresión ampliada en SION: 23 tests, 23 PASS, 0 FAIL, 444.6959 ms | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-01.json`; salida aportada por el operador |
| E-018 | H-PHX-05 Trial 002 preregistrado: baseline global `REVIEW`, Phoenix global `DENY`; 0 acciones baseline en DENY; Phoenix detectó `README.md` esperado `v1`, proyectado `v2`, último escritor `s2-patch-v1-to-v2` | Test ejecutado | `docs/04-runtime/evidence/H_PHOENIX_05_CAUSAL_PLAN_TRIAL_002_2026-09-01.json`; `FEASIBLE_DISCRIMINANT_PASS` |
| E-019 | Regresión tras Trial 003: 29 tests, 29 PASS, 0 FAIL, 490.5008 ms | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-01_TRIAL003.json`; salida aportada por el operador |
| E-020 | H-PHX-05 Trial 003 preregistrado: baseline state-aware global `REVIEW`, Phoenix global `DENY`; Phoenix detectó `generated-evidence-v2` invalidada porque su fuente `config.json` esperaba `config-v2` y estaba en `config-v1`, invalidada por `s3-config-v2-back-to-v1` | Test ejecutado | `docs/04-runtime/evidence/H_PHOENIX_05_CAUSAL_PLAN_TRIAL_003_2026-09-01.json`; `FEASIBLE_DISCRIMINANT_PASS` |
| E-021 | Regresión final del corte conversacional single-turn: `npm test`, 44 tests, 44 PASS, 0 FAIL, 464.0955 ms; incluye adversariales de tool-call y conserva Trials 001–003 | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-01_EMIT_TURN.json`; salida aportada por el operador |
| E-022 | Runtime LIVE del adaptador `emit_phoenix_turn`: `.env` → `R3/DENY/SECRET_BOUNDARY`; `README.md` → `R0/PREPARED/BOUNDED_READ`; `npm test` → `R1/PREPARED/ALLOWLISTED_TEST_COMMAND`; los tres con `dispatch_attempted=false` | Runtime observado | `docs/04-runtime/evidence/G2_LIVE_EMIT_TURN_2026-09-01.json`; evidencia visual aportada por el operador; no es un raw archive del proveedor |

## Regla

Una afirmación no asciende de capa por aparecer en este documento. Cada ascenso requiere el artefacto o runtime correspondiente y una referencia reproducible.
