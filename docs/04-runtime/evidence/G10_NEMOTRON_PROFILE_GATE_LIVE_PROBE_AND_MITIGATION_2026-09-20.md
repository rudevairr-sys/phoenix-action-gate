# G10 — Nemotron Profile Gate live probe and mitigation

Fecha: 2026-09-20  
Estado: `LIVE_PROVIDER_REACHED / CONTRACT_DENIAL_OBSERVED / MITIGATION_PATCH_TEST_PASS / LIVE_RESTART_PENDING`

## Contexto

Se probó `POST /api/profile-chat` contra el panel local con `profile_gate_available=true`.

La terminal nueva no exponía `NEBIUS_API_KEY`, pero el servidor activo sí pudo llegar a Nebius/Nemotron, por lo que la clave estaba disponible en el proceso del panel activo. No se imprimió ni se leyó el secreto.

## Casos live ejecutados

| Perfil | Resultado | Reason codes | Provider | Dispatch |
|---|---:|---|---|---:|
| `MONO_SI_NO` | `DENY` | `CLOSED_VOCABULARY_VIOLATION` | `nvidia/Nemotron-3_5-Lightning` | `false` |
| `FERRUM_RUST` | `DENY` pre-mitigación | `DOMAIN_BOUNDARY_VIOLATION` | `nvidia/Nemotron-3_5-Lightning` | `false` |
| `ACTION_PROPOSER` | `DENY` | `EXECUTION_CLAIM_WITHOUT_EVIDENCE` | `nvidia/Nemotron-3_5-Lightning` | `false` |
| `SAFE_NOOP` | `DENY` | `SAFE_NOOP_REQUIRED` | `nvidia/Nemotron-3_5-Lightning` | `false` |

## Hallazgos

1. `LIVE_NEBIUS_NEMOTRON_PROFILE_PROVIDER_REACHED=true`.
2. Phoenix bloqueó salidas no conformes del perfil sin dispatch.
3. La versión pre-mitigación devolvía `rejected_model_output_preview`; eso podía exponer texto de razonamiento del modelo.
4. `FERRUM_RUST` necesitaba aceptar `SAFE_NOOP` como fallback seguro, tal como estaba diseñado.

## Mitigación aplicada

- `src/profile-gate.mjs` ya no devuelve preview de salidas rechazadas.
- Mantiene solo indicadores no sensibles: `rejected_output_observed` y `rejected_output_length`.
- `FERRUM_RUST` acepta `SAFE_NOOP` mediante reason code `SAFE_FALLBACK_OK`.

## Validación post-mitigación

Ejecutado:

```powershell
node --version
npm test
```

Resultado:

```text
Node: v24.12.0
npm test: 145/145 PASS
fail: 0
cancelled: 0
skipped: 0
todo: 0
duration_ms: 666.0905
```

## Pendiente

Reiniciar el panel para cargar la versión mitigada y repetir live profile cases.

## Truthcore

- `PROFILE_GATE_ENDPOINT_ACTIVE`: true.
- `LIVE_NEBIUS_NEMOTRON_PROFILE_PROVIDER_REACHED`: true.
- `PROFILE_DENIAL_WITHOUT_DISPATCH_OBSERVED`: true.
- `REJECTED_OUTPUT_PREVIEW_MITIGATED_IN_CODE`: true.
- `FERRUM_SAFE_NOOP_FALLBACK_IMPLEMENTED`: true.
- `MITIGATION_TEST_EXECUTED_PASS`: true.
- `MITIGATED_CODE_RUNTIME_LIVE_OBSERVED`: false.
- `SECRET_EXPOSED`: false.
- `DISPATCH_ATTEMPTED`: false.
