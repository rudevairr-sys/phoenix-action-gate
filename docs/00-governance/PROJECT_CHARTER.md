# Carta del proyecto — Phoenix Action Gate

Fecha de apertura: 2026-08-31  
Estado: `F0_GOVERNED_FOUNDATION`  
Modo de custodia: `PRIMARY`  
Autoridad humana: Rubén Toledo Noda  
Repositorio: `rudevairr-sys/phoenix-action-gate`

## Propósito

Construir y evaluar un gateway gobernado que reciba propuestas de acción de un agente de IA y emita una decisión trazable antes de cualquier ejecución.

## Usuario inicial

El usuario inicial es un desarrollador u operador que permite a un agente trabajar con código o herramientas y necesita comprender, revisar y limitar las acciones propuestas.

## Propuesta de valor candidata

Hacer visible y verificable el paso entre “el modelo propone” y “el sistema ejecuta”, mediante un contrato de acciones, riesgos, preflight, reversibilidad, revisión, decisión fail-closed y evidencia.

La propuesta es candidata. No existe todavía evidencia de ventaja comercial ni de superioridad frente a un gate bespoke competente.

## Producto candidato

Un MVP del hackathon debería permitir:

1. recibir de Nemotron una propuesta de acción estructurada;
2. validar el contrato de la propuesta;
3. clasificar acción y riesgo;
4. ejecutar preflight y comprobar reversibilidad;
5. resolver `DENY`, `REVIEW` o `PREPARED`;
6. mostrar la decisión y su evidencia;
7. ejecutar únicamente dentro de un entorno permitido cuando el gate y el humano lo autoricen.

## Investigación candidata

`H-PHX-05` comparará el pipeline completo frente a un baseline sencillo y no deliberadamente débil. Su resultado no se presume.

## No objetivos de F0

- No copiar Phoenix Neuron.
- No registrar un DomainPack en el core.
- No habilitar dispatch productivo.
- No afirmar integración con Nemotron o Token Factory.
- No afirmar ventaja económica, seguridad total o preparación productiva.
- No diseñar todavía una plataforma general para todos los dominios.

## Autoridades

| Activo | Autoridad |
|---|---|
| Código y documentos de este proyecto | Este repositorio |
| Runtime local de desarrollo | Proyecto SION `PHOENIX_NEBIUS_AGENT_GATE_LAB` |
| Core Phoenix | `PHOENIX_NEURON_LAB` |
| Resultados H-PHX-04 | `PHOENIX_ACTION_ASSURANCE_LAB` y su checkpoint de continuidad |
| Reglas del concurso | Devpost oficial |
| Decisión de publicación y claims | Autoridad humana |

## Gate siguiente

Recuperar el consentimiento verificable sobre las reglas oficiales y cerrar el alcance del MVP mediante una entrevista breve, antes de implementar código.
