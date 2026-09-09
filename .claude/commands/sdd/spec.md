---
description: Fase 2 — entrevista y redacta la especificación (EARS) de un requerimiento
argument-hint: "<el requerimiento, en las palabras del cliente>"
---

Fase **Spec** del flujo SDD (`docs/flujo-sdd.md`). Usa la skill `generador-de-specs`.

Requerimiento: $ARGUMENTS

**NO escribas código. No toques `src/`. No propongas stack, tablas ni pantallas.**

1. Lee `docs/constitucion.md` y mira `specs/` para saber cuál es el siguiente número libre.
2. Hazme preguntas **de una en una, máximo 6**, sobre casos límite, errores y alcance.
   Espera mi respuesta antes de la siguiente. Cubre siempre, si el requerimiento lo toca:
   qué pasa **sin señal**, si afecta a **evidencia ya firmada**, y **qué cambia para el
   operador y qué para la administración**.
3. Con las respuestas, crea `specs/NNN-nombre-kebab/spec.md` copiando
   `specs/_plantillas/spec.md`, sin omitir ninguna sección.
4. Requisitos numerados `RF-1…` en notación EARS, uno por frase, todos verificables.
   Marca la sección **Superficies afectadas** y no dejes vacío **Fuera de alcance**.
5. Lo que no sepas va como `[NECESITA ACLARACIÓN: …]`. No lo inventes.
6. Resume en cinco líneas qué queda dentro, qué queda fuera y qué sigue sin resolver, y
   **espera mi aprobación antes de planificar**.
