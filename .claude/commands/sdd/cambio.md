---
description: Fase 8 — un requisito nuevo entra por la spec, no por el código
argument-hint: "<el requisito nuevo>"
---

Fase **Cambio** del flujo SDD (`docs/flujo-sdd.md`).

Nuevo requisito: $ARGUMENTS

**NO toques código.** Un cambio de comportamiento empieza siempre por la spec.

1. Decide, y justifícalo en una línea: ¿esto **modifica la spec activa** o es una
   **funcionalidad nueva** que merece su propia carpeta `specs/NNN-…`? Si es nueva, para aquí
   y dilo: se arranca con `/sdd:spec`.
2. Si modifica la spec activa: actualiza `spec.md` —RF nuevos con su numeración siguiente
   (los números existentes **no se reutilizan ni se renumeran**), casos límite, superficies
   afectadas y Fuera de alcance— y **muéstrame el diff**.
3. Di qué arrastra el cambio: qué RF quedan obsoletos, qué partes de `plan.md` y de
   `tareas.md` hay que rehacer, y si algo ya implementado deja de valer.
4. Si el requisito choca con `docs/constitucion.md`, dilo antes que nada, citando el
   principio. Se cambia la constitución o se cambia el requisito; lo que no se hace es
   implementarlo a escondidas.
5. **Espera mi aprobación del diff** antes de replanificar.
