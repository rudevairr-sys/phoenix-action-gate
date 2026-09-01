# Phoenix Action Gate

> Experimental fail-closed governance gateway for actions proposed by AI agents.

**Phoenix Action Gate** es una capa de control entre un agente de IA y las acciones que propone realizar. Nemotron interpreta la petición y propone; Phoenix aplica una política determinista, reconstruye dependencias y estado cuando existe un plan, y emite una decisión trazable antes de cualquier ejecución.

El proyecto se desarrolla para el **Nebius x NVIDIA Global AI Hackathon**. No modifica automáticamente los laboratorios Phoenix privados y no incluye un dispatcher productivo.

## Flujo actual

### Acción individual

`usuario → NVIDIA Nemotron en Nebius Token Factory → ActionProposal → Phoenix Gate → PREPARED / REVIEW / DENY → evidencia`

### Plan multiacción experimental

`usuario → Nemotron → plan compacto → adaptador determinista → Phoenix Plan Gate → dependencias + estado proyectado + evidence lineage → decisión global y por paso`

**PREPARED no significa permiso de ejecución.** En el MVP actual `dispatch_attempted=false` y no existe un executor automático.

## Estado verificable

| Capa | Estado actual |
|---|---|
| Documentado | Gobernanza, requisitos, claims, evidencia, contratos y protocolo H-PHX-05 |
| Implementado | Gate individual, Plan Gate, baseline experimental, adaptadores Nebius/Nemotron, panel local y probes |
| Test ejecutado | `npm test`: **52/52 PASS**, 0 FAIL en el último corte local observado |
| Runtime observado | Nemotron LIVE para acción individual y para un plan multiacción acotado, siempre sin dispatch |
| Producción validada | No |
| Dispatch productivo | No disponible / fuera de alcance |

## Diferenciación observada, con límites

Los fixtures preregistrados de H-PHX-05 mostraron dos discriminantes acotados:

- **stale cross-step state**: una acción posterior exige una versión que ya cambió en el estado proyectado;
- **evidence lineage invalidation**: una evidencia derivada conserva su artefacto, pero una fuente causal de la que dependía cambió después.

En un run LIVE acotado con `nvidia/Nemotron-3_5-Lightning`, Nemotron generó un plan de cuatro pasos. El baseline `state-aware-baseline/0.1.0` terminó en `REVIEW`; Phoenix terminó en `DENY` al detectar `EVIDENCE_LINEAGE_INVALIDATED`. No hubo dispatch.

Esto **no** demuestra superioridad general frente a otros gates, exclusividad de la técnica, seguridad general de agentes ni readiness de producción.

## Integración Nebius / NVIDIA

Integración observada:

- proveedor: **Nebius Token Factory**;
- modelo: **`nvidia/Nemotron-3_5-Lightning`**;
- transporte LIVE actual para el plan compacto: Chat Completions con una función explícita;
- evidencia sanitizada: request/response IDs, latencia, uso de tokens y resultado se conservan cuando están disponibles;
- secretos y credenciales no se versionan.

El valor central de la demo depende de Nemotron: el modelo propone las acciones, dependencias, transiciones y lineage semántico que Phoenix evalúa. Phoenix no usa al modelo como autoridad de autorización.

## Ejecutar localmente

Requisitos:

- Node.js `>=22`;
- `NEBIUS_API_KEY` para probes LIVE;
- no guardar la API key en el repositorio.

Regresión local:

```bash
npm test
```

Panel local:

```bash
npm run panel
```

Probe LIVE de acción individual:

```bash
npm run demo:e2e
```

Probe LIVE multiacción:

```bash
npm run demo:plan:live
```

Los probes LIVE proponen y evalúan; **no ejecutan las acciones propuestas**.

## Fronteras

Este repositorio no contiene ni concede licencia sobre:

- `PHOENIX_NEURON_LAB`;
- `PHOENIX_ACTION_ASSURANCE_LAB`;
- otros proyectos privados del ecosistema Phoenix;
- secretos, credenciales o rutas absolutas de la máquina de desarrollo.

Cualquier reutilización de material externo debe respetar la [frontera de publicación](docs/00-governance/PUBLICATION_BOUNDARY.md) y el [registro de fuentes](docs/00-governance/SOURCE_REGISTRY.json).

## Evidencia y continuidad

- [Estado retomable](docs/00-governance/STATUS.md)
- [Decisiones](docs/00-governance/DECISIONS.md)
- [Claims ledger](docs/00-governance/CLAIMS_LEDGER.md)
- [Evidence ledger](docs/00-governance/EVIDENCE_LEDGER.md)
- [Requisitos oficiales](docs/01-hackathon/OFFICIAL_REQUIREMENTS.md)
- [RTM del hackathon](docs/01-hackathon/RTM_HACKATHON.md)
- [Protocolo H-PHX-05](docs/02-research/H_PHX_05_PROTOCOL.md)

## English summary

Phoenix Action Gate is an experimental governed action pipeline for AI agents. NVIDIA Nemotron proposes actions or compact multi-action plans through Nebius Token Factory; Phoenix evaluates them deterministically before any execution. The current MVP has no automatic dispatcher. In one bounded live multi-action run, a declared state-aware baseline returned REVIEW while Phoenix returned DENY after detecting invalidated evidence lineage. This is a limited experimental result, not a claim of general superiority or production readiness.

## License

Original content in this repository is licensed under [Apache License 2.0](LICENSE). External references retain their own authority and licensing terms.
