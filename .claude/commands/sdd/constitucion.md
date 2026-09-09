---
description: Fase 1 — propone o revisa los principios innegociables del proyecto
argument-hint: "[qué revisar o añadir]"
---

Fase **Constitución** del flujo SDD (`docs/flujo-sdd.md`).

Contexto adicional del usuario: $ARGUMENTS

Lee `docs/constitucion.md` y `AGENTS.md`.

- Si la constitución todavía está marcada como propuesta pendiente, repásala punto por
  punto contra lo que hace hoy el código y señala lo que sobra, lo que falta y lo que
  está escrito de forma no verificable.
- Si el usuario pide un cambio o una adición, proponla como diff.

Reglas de esta fase:

- Principios **cortos y verificables**: cada uno se puede usar para rechazar una spec.
  Máximo 15 líneas en total; si un principio no sirve para decir "esto no se hace", sobra.
- La constitución **no duplica `AGENTS.md`**: AGENTS.md es el manual de operación (cómo se
  hace cada cosa), la constitución es la ley (qué no se hace nunca).
- **No escribas código y no toques `src/`.**
- Termina pidiendo aprobación explícita, y no la des por dada: hasta que el usuario apruebe,
  la línea de estado "propuesta pendiente de aprobación" se queda donde está.
