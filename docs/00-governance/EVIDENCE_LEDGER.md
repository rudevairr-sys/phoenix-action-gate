# Evidence ledger

Fecha de reconciliación: 2026-09-18  
Estado: `B1_RESULT_RECONCILED / CONTEST_PREP_RECORDED / CURRENT_CUT_TEST_PASS`

| ID | Evidencia | Capa | Estado |
|---|---|---|---|
| E-001 | Metadatos GitHub: repo público, rama `main`, permisos administrativos | Runtime observado | Verificado 2026-08-31; revalidar antes de publicación final. |
| E-004 | Devpost: evento abierto y participante ya registrado | Runtime observado | Recuperado 2026-08-31 y reconfirmado por conector 2026-09-18 como `registered` / `submissions_open`. |
| E-005 | Reglas oficiales | Documentado desde fuente viva | Recuperadas 2026-08-31; revalidadas por conector 2026-09-18 para requisitos de entrega. |
| E-006 | Requisitos de entrega | Documentado desde fuente viva | App funcional, repo público, demo/test build, vídeo <=3 min, README, licencia OSI, uso Nebius/NVIDIA, feedback. |
| E-007 | Criterios de evaluación | Documentado desde fuente viva | Technological Implementation, Design, Potential Impact, Quality of the Idea. |
| E-008 | Fechas oficiales | Documentado desde fuente viva | Deadline observado 2026-09-18: `2026-10-30T17:00:00Z`. |
| E-009 | H-PHX-04 cerrado como no corroborado | Test externo ejecutado | Radar Phoenix / Action Assurance Lab; no usar como claim positivo. |
| E-011 | Token Factory `GET /v1/models`: HTTP 200, 30 modelos, 7 NVIDIA, incluido `nvidia/Nemotron-3_5-Lightning` | Runtime observado | `docs/04-runtime/evidence/G1_LIST_MODELS_2026-08-31.json`; evidencia previa, revalidar. |
| E-012 | Token Factory `POST /v1/chat/completions` con `nvidia/Nemotron-3_5-Lightning`: ActionProposal estructurada válida, HTTP 200, sin dispatch | Runtime observado | `docs/04-runtime/evidence/G1_ACTION_PROPOSAL_2026-08-31.json`; evidencia previa, revalidar. |
| E-013 | Núcleo determinista G2: PREPARED/REVIEW/DENY, fail-closed y hash determinista | Test ejecutado | `docs/04-runtime/evidence/G2_CORE_TESTS_2026-08-31.json`. |
| E-015 | Pipeline real `Nebius/Nemotron → ActionProposal → Phoenix Gate`: decisión trazable, sin dispatch | Runtime observado | `docs/04-runtime/evidence/G2_E2E_NEMOTRON_GATE_2026-08-31.json`. |
| E-020 | H-PHX-05 Trial 003 preregistrado: baseline state-aware global `REVIEW`, Phoenix global `DENY` por `generated-evidence-v2` invalidada | Test ejecutado | `docs/04-runtime/evidence/H_PHOENIX_05_CAUSAL_PLAN_TRIAL_003_2026-09-01.json`. |
| E-022 | Runtime LIVE del adaptador `emit_phoenix_turn` con `.env`, `README.md` y `npm test`, todos sin dispatch | Runtime observado | `docs/04-runtime/evidence/G2_LIVE_EMIT_TURN_2026-09-01.json`. |
| E-024 | Plan multiacción LIVE generado por `nvidia/Nemotron-3_5-Lightning`: baseline `REVIEW`, Phoenix `DENY` por `EVIDENCE_LINEAGE_INVALIDATED`, sin dispatch | Runtime observado | `docs/04-runtime/evidence/G2_LIVE_PLAN_SUCCESS_001_2026-09-01.json`; caso acotado. |
| E-025 | Regresión del corte multiacción compacto: `npm test`, 52 PASS, 0 FAIL | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-01_COMPACT_PLAN.json`; evidencia previa. |
| E-026 | Panel observado: provider fail-closed vs Phoenix DENY, destructivo LIVE y plan lineage LIVE | Runtime observado | `docs/04-runtime/evidence/G2_PANEL_RUNTIME_OBSERVATIONS_2026-09-01.json` + contraejemplo preservado. |
| E-027 | Regresión bloque panel/adaptador: `npm test`, 58 PASS, 0 FAIL | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-02_PANEL_FINAL.json`; evidencia previa. |
| E-028 | Validación LIVE de secreto: Nemotron propuso `READ_CONTEXT` sobre `.env`; Phoenix `R3/DENY/SECRET_BOUNDARY`; `dispatch_attempted=false` | Runtime observado | `docs/04-runtime/evidence/G2_PANEL_SECRET_BOUNDARY_2026-09-02.json`. |
| E-029 | Regresión tras añadir B0: `npm test`, 68 PASS, 0 FAIL | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-02_TAMPER_B0.json`. |
| E-030 | `snapshot-receipt-baseline/0.1.0` ejecutado contra T0-T7; T5 permanece `VALID` | Test ejecutado | `docs/04-runtime/evidence/G2_RECEIPT_TAMPER_B0_BASELINE_2026-09-02.json`. |
| E-031 | Regresión con `phoenix-evidence-receipt/0.1.0`: `npm test`, 80 PASS, 0 FAIL | Test ejecutado | `docs/04-runtime/evidence/G2_SION_TESTS_2026-09-02_TAMPER_PHOENIX.json`. |
| E-032 | Trial 001 B0 vs Phoenix: única divergencia T5; B0 `VALID`, Phoenix `INVALID/LINEAGE_BINDING_INVALIDATED` | Test ejecutado | `docs/04-runtime/evidence/G2_RECEIPT_TAMPER_TRIAL_001_RESULT_2026-09-02.json`; `CORROBORATED_BOUNDED_VS_B0`. |
| E-033 | Baseline B1 `lineage-aware-receipt-baseline/0.2.0` preregistrado antes de implementación | Documentado | `docs/02-research/EVIDENCE_RECEIPT_TAMPER_TRIAL_002_B1_PROTOCOL.md`. |
| E-034 | Trial 002 B1 vs Phoenix ejecutado: hard gates passed, sin divergencias semánticas, B1 iguala T5 con menos LOC, 0 dependencias; interpretación `NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY` | Test ejecutado | `docs/04-runtime/evidence/G2_RECEIPT_TAMPER_TRIAL_002_B1_RESULT_2026-09-03.json`; resultado adverso a claim de diferenciación. |
| E-035 | Jury Surface Observation 001: primer run visual, sin discriminante; conservado como evidencia negativa para corregir escenario | Runtime observado | `docs/04-runtime/evidence/G2_JURY_SURFACE_OBSERVATION_001_2026-09-03.json`. |
| E-036 | Jury Surface Live Discriminant 002: escenario guiado correcto observado en vivo; referencia `REVIEW`, Phoenix `DENY`, lineage invalidated | Runtime observado | `docs/04-runtime/evidence/G2_JURY_SURFACE_LIVE_DISCRIMINANT_002_2026-09-03.json`. |
| E-037 | Jury Surface Regression 003: Node tests completos tras refinamiento visual, `122/122 PASS` | Test ejecutado | `docs/04-runtime/evidence/G2_JURY_SURFACE_REGRESSION_003_2026-09-03.json`. |
| E-038 | Jury Surface Final Visual 004: revalidación visual final, cuatro nodos completos sin recorte derecho | Runtime observado | `docs/04-runtime/evidence/G2_JURY_SURFACE_FINAL_VISUAL_004_2026-09-03.json`. |
| E-039 | Builder Omega Contest Prep Pack creado localmente | Implementado | `BUILDER_OMEGA_CONTEST_PREP_20260918/`; incluye README, claim boundary, Devpost draft, video script, clean clone checklist, publication plan y TCC-MAVO gate. |
| E-040 | `STATUS.md` reconciliado con B1 ejecutado y contest prep | Implementado | `docs/00-governance/STATUS.md`; backup generado por SION. |
| E-041 | `RTM_HACKATHON.md` reconciliado para contest prep | Implementado | `docs/01-hackathon/RTM_HACKATHON.md`; backup generado por SION. |
| E-042 | `CLAIMS_LEDGER.md` reconciliado con B1 adverso a diferenciación | Implementado | Este corte del claims ledger; backup generado por SION. |
| E-043 | `EVIDENCE_LEDGER.md` reconciliado con B1 y contest prep | Implementado | Este archivo; backup generado por SION. |
| E-044 | SION Node/npm gate intentado: Node disponible pero acción `npm_test` no expuesta; registrado como bloqueo temporal | Tooling blocker observado | `BUILDER_OMEGA_CONTEST_PREP_20260918/SIGMA_TEST_BLOCKER_20260918.md`. |
| E-045 | Regresión actual del corte 2026-09-18 ejecutada por terminal humana: `node --version` -> `v24.12.0`; `npm test` -> `122/122 PASS`, 0 fail, 0 skipped, 0 todo, 737.3368 ms | Test ejecutado | `docs/04-runtime/evidence/G2_CURRENT_CUT_NPM_TEST_2026-09-18.json`; salida pegada por el operador. |

## Regla

Una afirmación no asciende de capa por aparecer en este documento. Cada ascenso requiere el artefacto o runtime correspondiente y una referencia reproducible.

## Estado máximo actual

`LOCAL_CONTEST_CANDIDATE / PREP_GENERATED / GOVERNANCE_RECONCILED / CURRENT_CUT_TEST_PASS / PUBLICATION_PENDING / CLEAN_CLONE_PENDING / SUBMISSION_PENDING`
