# F0.5 — Especificación verificable del producto

Fecha: 2026-08-31  
Estado: `SPECIFIED_WITH_ASSUMPTIONS / DOCUMENTATION_ONLY`  
Dependencia: F0 remoto en `a4069af40740df6a98a0c2f5486439409b04a16a`

## Resultado de F0.5

Phoenix Action Gate será una aplicación pública nueva para que un desarrollador u operador pueda observar y revisar la acción que propone un agente antes de cualquier ejecución.

El MVP no será un ejecutor autónomo. Nemotron propondrá una acción estructurada; un gate determinista validará contrato, riesgo, preflight, reversibilidad y evidencia; el sistema emitirá `DENY`, `REVIEW` o `PREPARED`.

`PREPARED` significa que la propuesta superó los checks definidos y está preparada para revisión o demostración. No concede permiso de ejecución.

## Problema acotado

Entre una intención expresada a un agente y una acción sobre código existe una frontera difícil de inspeccionar. El MVP hará esa frontera visible:

`intención → propuesta Nemotron → validación → riesgo → preflight → reversibilidad → revisión → decisión → evidencia`

## Usuario inicial

Un desarrollador u operador que permite a un agente proponer acciones sobre un workspace acotado y necesita saber:

- qué quiere hacer el agente;
- sobre qué objetivo;
- con qué capacidad;
- qué riesgo introduce;
- si existe rollback suficiente;
- qué comprobaciones pasaron o fallaron;
- y por qué el sistema deniega, pide revisión o prepara la acción.

## Tres clases de acción

| Clase | Ejemplo | Tratamiento candidato |
|---|---|---|
| `READ_CONTEXT` | Leer un archivo permitido | `R0` y `PREPARED` si no toca secretos |
| `WRITE_PATCH` | Aplicar un diff con rollback | `R2` y `REVIEW` |
| `RUN_COMMAND` | Ejecutar tests allowlisted | `R1` y `PREPARED`; destructivo o desconocido → `R3/DENY` |

No se añadirán instalación de dependencias, red arbitraria, despliegue, operaciones Git destructivas ni shell autónomo al MVP inicial.

## Demo vertical

La demo tendrá tres casos conectados en una sola experiencia:

1. **PREPARED:** Nemotron propone ejecutar un comando de tests allowlisted, con directorio y timeout acotados. El gate lo prepara, pero no lo ejecuta.
2. **REVIEW:** Nemotron propone un patch reversible. El gate exige revisión humana y conserva la aceptación o rechazo como evidencia.
3. **DENY:** Nemotron propone un comando destructivo, un path secreto, una capacidad desconocida o una acción sin rollback suficiente. El gate falla cerrado.

Un cuarto caso técnico mostrará timeout o JSON inválido del proveedor y deberá terminar en `DENY`.

## Frontera Nemotron / Phoenix Action Gate

| Nemotron | Gate determinista |
|---|---|
| Interpreta la intención | Valida el contrato |
| Propone `ActionProposal` | Clasifica riesgo |
| Sugiere target, operación y precondiciones | Comprueba alcance, allowlist, secretos y rollback |
| Puede equivocarse o devolver datos inválidos | Falla cerrado |
| No ejecuta | No delega la decisión al modelo |

La integración natural con Nebius usa function calling o JSON Schema para obtener una propuesta estructurada. La disponibilidad y el identificador exacto del modelo deberán observarse mediante `GET /v1/models`.

## Arquitectura proporcional

Se propone un monolito modular con seis responsabilidades:

1. interfaz web;
2. adaptador Token Factory/Nemotron;
3. contratos versionados;
4. política determinista;
5. revisión humana;
6. evidence store sanitizado.

No existirán `production_dispatcher`, shell autónomo, dependencia oculta del core Phoenix, plataforma multiusuario ni registro general de DomainPacks.

## OVAM

### Hechos

- El repositorio público y F0 existen.
- Las reglas exigen una aplicación funcional, runtime Nebius y al menos un modelo NVIDIA abierto.
- Phoenix Neuron y Action Assurance Lab son antecedentes separados.
- H-PHX-04 no corroboró diferenciación en fixtures acotados.
- No existe todavía integración, MVP, benchmark H-PHX-05 ni producción.

### Supuestos

- El usuario inicial será un desarrollador u operador de agentes de código.
- Token Factory Serverless bastará para el MVP.
- El modelo candidato será el Nemotron que devuelva la cuenta real y cumpla el contrato necesario.
- Los targets serán fixtures públicos sin secretos.
- La revisión humana no activará ejecución.

### Decisiones

- Un solo usuario inicial y una sola pantalla principal.
- Tres clases de acción.
- Cuatro clases de riesgo: `R0`, `R1`, `R2`, `R3`.
- Resultados públicos: `DENY`, `REVIEW`, `PREPARED`.
- Condición desconocida equivale a fallo cerrado.
- Sin dispatch.
- Contratos nuevos y limpios antes que copia del core.

### Desconocidos pendientes de runtime

- ID exacto y disponibilidad del modelo NVIDIA en la cuenta Nebius.
- Comportamiento real de JSON Schema/function calling del modelo elegido.
- Latencia y coste observados.
- Stack y versiones concretas, que deben seleccionarse con evidencia vigente.
- Reutilización mínima posible desde Phoenix tras gate de procedencia y licencia.

## Criterios de aceptación principales

- `RUN_COMMAND` allowlisted produce `PREPARED` sin ejecución.
- `WRITE_PATCH` reversible produce `REVIEW`.
- acción destructiva, secreta, desconocida o incompleta produce `DENY`.
- timeout o salida inválida de Nemotron produce `DENY`.
- misma propuesta y política producen la misma decisión y hash.
- la UI separa visualmente propuesta del modelo y decisión del gate.
- cada caso exporta evidencia sanitizada.
- no existe endpoint o módulo de dispatch.
- un clon limpio puede instalar, probar e iniciar la demo sin laboratorios privados.

El registro completo y validable vive en [`project-spec.json`](project-spec.json). El contrato detallado de intercambio vive en [`ACTION_CONTRACT_V0.md`](ACTION_CONTRACT_V0.md).

## Estado probatorio

| Capa | Estado al cerrar F0.5 |
|---|---|
| Documentado | Especificación, OVAM, contratos y criterios |
| Implementado | No |
| Test ejecutado | Solo validación estructural documental; no producto |
| Runtime observado | No Nebius, Nemotron ni gate |
| Producción validada | No |

## Gate siguiente

Reconciliar el checkout local. Después aceptar las reglas mediante el flujo verificable y ejecutar G1: consultar `/v1/models`, seleccionar el modelo real y observar una propuesta mínima estructurada.
