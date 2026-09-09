---
description: Fase 4 — diseña el plan técnico de la spec activa, sin escribir código
argument-hint: "[NNN o nombre de la spec]"
---

Fase **Plan** del flujo SDD (`docs/flujo-sdd.md`).

Spec a planificar: $ARGUMENTS (si no digo cuál, la de número más alto en `specs/`).

Lee `docs/constitucion.md`, el `spec.md` de esa carpeta y `AGENTS.md`. Si toca Expo SDK 57,
consulta la skill `expo-overview` antes de decidir API: nada de memoria.

**No escribas código todavía.** El resultado de esta fase es un documento.

Crea `specs/NNN-…/plan.md` copiando `specs/_plantillas/plan.md`, con:

- **Módulos y archivos** que se tocan, y **qué RF cubre cada parte**. Antes de proponer un
  archivo nuevo, busca en `src/features/` y `src/shared/` lo que ya existe y se puede reutilizar.
- **Modelo de datos**: cambios en `src/db/local/schema.ts` y/o `src/db/servidor/esquema.ts`,
  con su migración; y qué pasa con los teléfonos que aún no se han actualizado. Si no cambia
  nada, dilo explícitamente.
- **Decisiones técnicas, cada una con la alternativa descartada y por qué.** Sin la
  alternativa no es una decisión, es una preferencia sin registro.
- **Impacto en la sincronización**: pull, outbox, orden de `seq`, idempotencia, qué reevalúa
  el servidor al ingerir.
- **Contrato de API**, si hay endpoints: guardia, alcance por obra, códigos de estado.
  Recuerda que Neon no da transacciones interactivas.
- **Estrategia de verificación**: qué casos entran en `scripts/verificar-reglas.ts` y qué
  exige demo manual.
- **Riesgos**: qué puede salir mal, cómo se detecta, cómo se revierte.

Si al planificar aparece una decisión de comportamiento que la spec no contempla, **para y
pregunta**: eso se arregla en la spec (`/sdd:cambio`), no en el plan.
