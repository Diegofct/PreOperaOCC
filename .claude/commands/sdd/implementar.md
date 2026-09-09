---
description: Fase 6 — implementa UNA sola tarea de la spec activa y se detiene
argument-hint: "<Tn>"
---

Fase **Implementación** del flujo SDD (`docs/flujo-sdd.md`).

Tarea a implementar: $ARGUMENTS

**Implementa SOLO esa tarea.** Nada de "ya que estoy": si ves algo que arreglar fuera de la
tarea, anótalo en las notas de ejecución de `tareas.md` y sigue.

1. Lee la tarea en `specs/NNN-…/tareas.md`, los RF que cita en `spec.md`, y la parte del
   `plan.md` que le corresponde.
2. Escribe primero la comprobación: si la tarea toca reglas puras, el caso nuevo en
   `scripts/verificar-reglas.ts` va antes que la implementación. Si no es testeable ahí,
   di con qué paso manual se comprueba, antes de escribir el código.
3. Implementa, respetando `AGENTS.md` y `docs/constitucion.md`.
4. Ritual de cierre, obligatorio y en este orden:
   - `npm run verificar`
   - `npm run typecheck`
   - `npm run lint`
   - si tocaste `src/db/local/schema.ts`: `npm run db:generate` y confirma la migración en `drizzle/local/`
   - si tocaste `src/db/servidor/esquema.ts`: `npm run db:generate:servidor` y confirma `drizzle/servidor/`
   - si tocaste algo que lea un secreto: `npx expo export --platform web` y `grep -r "DATABASE_URL" dist/client` (debe salir vacío), luego borra `dist`
   - si añadiste una pantalla al operador: confirma que existe su variante `.web.tsx` fuera de `src/app/`
5. Marca la tarea como hecha en `tareas.md` **solo si todo salió en verde**. Si algo falla,
   dilo con la salida real y no la marques.
6. **PÁRATE.** No empieces la siguiente tarea.
