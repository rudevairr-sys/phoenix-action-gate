# Frontera de publicación

## Se puede publicar

- código original creado específicamente para Phoenix Action Gate;
- contratos públicos diseñados para el MVP;
- documentación, tests y fixtures sin información privada;
- resultados reproducibles, incluidos resultados negativos;
- adaptadores a APIs cuya licencia y términos permitan su distribución;
- evidencia redactada para no contener secretos.

## No se publica automáticamente

- código completo de `PHOENIX_NEURON_LAB`;
- código completo de `PHOENIX_ACTION_ASSURANCE_LAB`;
- documentos internos de otros proyectos;
- rutas absolutas del equipo de desarrollo;
- claves, tokens, credenciales, endpoints privados o datos personales;
- componentes con licencia o autoría sin verificar;
- resultados descritos como producción cuando proceden de fixtures o entornos acotados.

## Regla de importación

Toda importación debe registrar:

1. fuente y autoridad;
2. ruta o URL;
3. versión, commit o fingerprint;
4. licencia;
5. finalidad;
6. transformación realizada;
7. archivos concretos incorporados;
8. prueba de que el repositorio público funciona sin dependencias privadas ocultas.

## Integración preferida

Orden de preferencia:

1. interfaz o contrato nuevo y limpio;
2. adaptador explícito;
3. dependencia versionada y autorizada;
4. snapshot mínimo auditado;
5. copia amplia: rechazada por defecto.

## Gate público de entrega

Antes de presentar el proyecto, un entorno limpio deberá poder:

- clonar el repositorio;
- instalar dependencias con instrucciones públicas;
- ejecutar tests declarados;
- iniciar la demo;
- observar una llamada real a Nebius/NVIDIA;
- reproducir al menos un flujo `DENY`, uno `REVIEW` y uno `PREPARED`;
- verificar que ningún secreto o path privado es necesario.
