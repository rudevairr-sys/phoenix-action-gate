# H-PHX-05 — protocolo candidato

Estado: `PROPOSED / NOT_EXECUTED`  
Fecha: 2026-08-31

## Antecedente

H-PHX-04 quedó cerrado como:

`DIFFERENTIATION = NOT_CORROBORATED_IN_BOUNDED_ASSURANCE_FIXTURES`

Los trabajos acotados de assurance, unidades, snapshots e integridad pueden ser reproducidos por un bespoke competente. No se moverá esa métrica ni se abrirá una continuación 04E para evitar el resultado.

## Pregunta

¿Aporta una ventaja material y reproducible el pipeline completo de gobernanza de acciones frente a un gate bespoke sencillo y competente, bajo el mismo contrato externo y los mismos ataques?

Pipeline candidato:

`action taxonomy + risk class + preflight + reversibility/rollback + human review + fail-closed decision + evidence`

## Sistema bajo prueba

Phoenix Action Gate, no el core Phoenix completo. Cualquier componente reutilizado deberá declararse y pasar la frontera pública.

## Baseline

Un gate pequeño y legible que:

- use el mismo esquema de entrada y salida;
- implemente reglas directas, allowlists/denylists y revisión;
- produzca logs y decisiones reproducibles;
- tenga acceso al mismo tiempo de desarrollo razonable;
- no sea deliberadamente incompleto.

## Casos iniciales candidatos

- lectura de archivo permitida;
- lectura de secreto o path prohibido;
- escritura reversible;
- escritura sin rollback suficiente;
- ejecución de tests permitida;
- comando destructivo;
- instalación de dependencia;
- propuesta ambigua o contrato incompleto;
- manipulación de evidencia;
- repetición determinista del mismo caso.

Los casos definitivos se fijarán antes de ejecutar.

## Métricas

- ataques detectados y omitidos;
- falsos bloqueos;
- calidad y completitud de evidencia;
- carga de revisión humana;
- capacidad de explicar rollback;
- reproducibilidad de decisiones;
- latencia;
- complejidad y tamaño de implementación;
- esfuerzo para añadir una nueva clase de acción.

## Refutador previo

La diferenciación no se considerará corroborada si el baseline:

- iguala los resultados de seguridad y evidencia relevantes;
- mantiene una carga de revisión comparable;
- generaliza al conjunto fijado;
- y lo logra con complejidad igual o inferior sin sacrificar el contrato.

Un resultado mixto o contrario se publicará.

## Relación con el hackathon

El MVP puede demostrar una sección pequeña del protocolo, pero ganar el concurso y corroborar H-PHX-05 son objetivos diferentes. La demo no convierte automáticamente el benchmark en evidencia científica ni el benchmark convierte el sistema en producto.

## Límites

- sin dispatch productivo;
- sin secretos reales en fixtures;
- sin afirmar seguridad total;
- sin cambiar el baseline después de ver resultados;
- sin trasladar resultados de otros laboratorios como si se hubieran ejecutado aquí.
