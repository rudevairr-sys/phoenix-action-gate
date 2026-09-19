# Contrato de acciones v0

Estado: `DRAFT / NOT_IMPLEMENTED`  
Ámbito: MVP de Phoenix Action Gate  
Dispatch: ausente

## Principio

Una salida del modelo es una propuesta no confiable. Ningún campo de `ActionProposal` concede autoridad. Solo el gate interpreta el contrato y emite una decisión trazable.

## ActionProposal

Campos mínimos:

| Campo | Tipo | Regla |
|---|---|---|
| `schema_version` | string | Debe ser una versión soportada |
| `proposal_id` | string | Único y no vacío |
| `intent` | string | Resumen no sensible de la intención |
| `action_type` | enum | `READ_CONTEXT`, `WRITE_PATCH` o `RUN_COMMAND` |
| `target.workspace_id` | string | Workspace lógico conocido |
| `target.relative_path` | string/null | Nunca absoluto ni con traversal |
| `operation` | object | Campos específicos por clase |
| `requested_capabilities` | array | Toda capacidad debe ser conocida |
| `preconditions` | array | Condiciones declaradas por el proponente |
| `reversibility.kind` | enum | `NONE`, `INHERENT`, `ROLLBACK_PLAN` |
| `reversibility.rollback_plan` | object/null | Obligatorio cuando corresponda |
| `estimated_effects` | array | Efectos previstos, no hechos confirmados |
| `model_context.model_id` | string | ID observado del proveedor |
| `model_context.provider_request_id` | string/null | Sanitizado |

Los campos adicionales se rechazarán en la primera versión salvo extensión explícitamente versionada.

## Operaciones por clase

### READ_CONTEXT

- target relativo allowlisted;
- sin secretos;
- sin red;
- sin mutación.

### WRITE_PATCH

- diff explícito;
- archivos relativos dentro de scope;
- hash o versión previa;
- rollback suficiente;
- revisión humana obligatoria.

### RUN_COMMAND

- programa y argumentos separados;
- sin shell concatenada;
- cwd lógico acotado;
- timeout obligatorio;
- allowlist por policy version;
- sin elevación, red arbitraria o destrucción.

## Riesgo

| Clase | Significado | Resultado candidato |
|---|---|---|
| `R0` | Observación acotada | `PREPARED` si todo pasa |
| `R1` | Operación acotada sin mutación persistente | `PREPARED` si todo pasa |
| `R2` | Mutación reversible que exige juicio humano | `REVIEW` |
| `R3` | Destructiva, secreta, ambigua, desconocida o sin rollback suficiente | `DENY` |

El riesgo se calcula por reglas; el modelo no puede autodeclararse de bajo riesgo.

## Preflight mínimo

| Check | PASS | FAIL |
|---|---|---|
| `schema_valid` | Contrato soportado | `DENY/INVALID_CONTRACT` |
| `target_in_scope` | Workspace y path permitidos | `DENY/TARGET_OUT_OF_SCOPE` |
| `capability_known` | Capacidades registradas | `DENY/UNKNOWN_CAPABILITY` |
| `secret_boundary_clear` | Sin secreto o path reservado | `DENY/SECRET_BOUNDARY` |
| `command_allowlisted` | Programa y args permitidos | `DENY/COMMAND_NOT_ALLOWED` |
| `rollback_sufficient` | Inherente o plan comprobable | `REVIEW` o `DENY/ROLLBACK_INSUFFICIENT` |
| `evidence_complete` | Identificadores y versiones presentes | `DENY/EVIDENCE_INCOMPLETE` |

## GateDecision

| Campo | Tipo |
|---|---|
| `decision_version` | string |
| `decision_id` | string |
| `proposal_id` | string |
| `outcome` | `DENY`, `REVIEW`, `PREPARED` |
| `risk_class` | `R0`, `R1`, `R2`, `R3` |
| `policy_version` | string |
| `reason_codes` | array no vacío |
| `checks` | array de check, status y evidence ref |
| `human_review_required` | boolean |
| `rollback_status` | enum |
| `evidence_bundle_id` | string |
| `decision_hash` | string determinista |

## HumanReviewRecord

Solo existe para resultados `REVIEW`:

- `review_id`;
- `proposal_id`;
- `decision_id`;
- `reviewer_role`;
- `result`: `ACCEPT_PREPARATION` o `REJECT`;
- `reason`;
- `timestamp`;
- `evidence_bundle_id`.

`ACCEPT_PREPARATION` puede transformar el estado visible a `PREPARED`, pero no ejecuta la acción.

## Matriz de demostración

| Caso | Propuesta | Resultado esperado |
|---|---|---|
| D1 | `cargo test --workspace` allowlisted, cwd y timeout válidos | `R1/PREPARED` |
| D2 | Patch a archivo permitido, versión previa y rollback | `R2/REVIEW` |
| D3 | Comando destructivo o path secreto | `R3/DENY` |
| D4 | JSON inválido, timeout o schema desconocido | `R3/DENY` |

Los comandos son fixtures contractuales. Su presencia no significa que se hayan ejecutado.

## Invariantes

1. El modelo propone; no autoriza.
2. El gate decide por política versionada.
3. Lo desconocido falla cerrado.
4. Toda decisión tiene evidencia.
5. `PREPARED` no significa ejecutado.
6. La revisión humana no habilita dispatch en el MVP.
7. La repetición con entrada y política idénticas conserva el resultado.

## Estado probatorio

- Documentado: sí.
- Implementado: no.
- Test ejecutado: no.
- Runtime observado: no.
- Producción validada: no.
