# Phoenix Action Gate

> Experimental fail-closed governance gateway for actions proposed by AI agents.

**Phoenix Action Gate** es un proyecto nuevo y aislado para investigar y construir un gateway que evalúe acciones propuestas por un agente antes de permitir su ejecución. El proyecto se desarrolla para el **Nebius x NVIDIA Global AI Hackathon** sin modificar ni publicar automáticamente los laboratorios Phoenix existentes.

## Estado verificable

| Capa | Estado en este repositorio |
|---|---|
| Documentado | Alcance F0, límites de publicación, requisitos, claims, evidencias e hipótesis H-PHX-05 |
| Implementado | Repositorio, enlace Git/SION y armazón documental |
| Test ejecutado | Ningún test del producto todavía |
| Runtime observado | Git local sincronizado con GitHub; datos oficiales Devpost recuperados |
| Producción validada | No |
| Dispatch productivo | Deshabilitado / fuera de alcance |

## Problema candidato

Los agentes pueden proponer acciones sobre código y herramientas, pero una propuesta no debería convertirse automáticamente en ejecución. El flujo candidato es:

`propuesta de acción → taxonomía → riesgo → preflight → reversibilidad/rollback → revisión humana → decisión fail-closed → evidencia`

Este flujo constituye una **hipótesis de producto e investigación**. No se afirma todavía que supere a una solución bespoke sencilla.

## Encaje provisional en el hackathon

- Evento: Nebius x NVIDIA Global AI Hackathon.
- Categoría candidata: **Coding and agentic engineering**.
- Integración obligatoria pendiente: llamada runtime a Nebius Token Factory o ejecución en Nebius AI Cloud.
- Modelo obligatorio pendiente: al menos un modelo NVIDIA open source; Nemotron es el candidato natural.
- Aplicación, demo y vídeo: pendientes.

## Fronteras

Este repositorio no contiene ni concede licencia sobre:

- `PHOENIX_NEURON_LAB`;
- `PHOENIX_ACTION_ASSURANCE_LAB`;
- otros proyectos privados del ecosistema Phoenix;
- secretos, credenciales o rutas absolutas de la máquina de desarrollo.

Cualquier integración futura deberá pasar por [la frontera de publicación](docs/00-governance/PUBLICATION_BOUNDARY.md) y el [registro de fuentes](docs/00-governance/SOURCE_REGISTRY.json).

## Documentación F0

- [Carta del proyecto](docs/00-governance/PROJECT_CHARTER.md)
- [Estado retomable](docs/00-governance/STATUS.md)
- [Decisiones](docs/00-governance/DECISIONS.md)
- [Claims ledger](docs/00-governance/CLAIMS_LEDGER.md)
- [Evidence ledger](docs/00-governance/EVIDENCE_LEDGER.md)
- [Frontera de publicación](docs/00-governance/PUBLICATION_BOUNDARY.md)
- [Requisitos oficiales](docs/01-hackathon/OFFICIAL_REQUIREMENTS.md)
- [RTM del hackathon](docs/01-hackathon/RTM_HACKATHON.md)
- [Protocolo candidato H-PHX-05](docs/02-research/H_PHX_05_PROTOCOL.md)

## Ejecución

Todavía no existe un binario o servicio ejecutable. Las instrucciones de instalación se añadirán cuando haya un MVP reproducible. No deben inventarse comandos antes de implementar y probar el stack.

## English summary

Phoenix Action Gate is a new experimental project for governing AI-agent action proposals before execution. The repository currently contains the governed F0 foundation only; the Nebius/NVIDIA integration, working MVP, benchmark and production validation have not yet been implemented.

## Licencia

El contenido original de este repositorio se publica bajo [Apache License 2.0](LICENSE). Las referencias externas conservan su propia autoridad y licencia.
