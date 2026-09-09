---
description: Fase 5 — trocea el plan en tareas de menos de 30 minutos con checkboxes
argument-hint: "[NNN o nombre de la spec]"
---

Fase **Tareas** del flujo SDD (`docs/flujo-sdd.md`).

Spec a trocear: $ARGUMENTS (si no digo cuál, la de número más alto en `specs/`).

Lee su `spec.md` y su `plan.md`. **No escribas código.**

Crea `specs/NNN-…/tareas.md` copiando `specs/_plantillas/tareas.md`:

- Tareas de **menos de 30 minutos**, ordenadas por dependencia: cada una debe poder
  completarse y quedar en verde por sí sola.
- Cada tarea lleva **los RF que cubre** y una línea `Hecho cuando:` comprobable sin
  interpretar ("los tres comandos en verde y el panel muestra X", no "funciona bien").
- Primero lo que no depende de nada (esquema y migración, reglas puras con su caso en
  `scripts/verificar-reglas.ts`), después la superficie que lo consume.
- Si el plan toca reglas de negocio, la tarea que las escribe **incluye su caso en
  `scripts/verificar-reglas.ts`**: no es una tarea aparte.
- La última tarea es siempre la validación RF por RF de la spec.

Cierra diciendo cuántas tareas son y cuál es la primera que ejecutaríamos.
