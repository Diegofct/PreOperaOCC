---
description: Fase 7 — recorre la spec RF por RF y da un veredicto de cumplimiento
argument-hint: "[NNN o nombre de la spec]"
---

Fase **Validación** del flujo SDD (`docs/flujo-sdd.md`).

Spec a validar: $ARGUMENTS (si no digo cuál, la de número más alto en `specs/`).

Recorre su `spec.md` **requisito por requisito**, sin saltarte ninguno. Para cada RF:

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | caso en `scripts/verificar-reglas.ts:NNN` / paso manual de demo | verde · rojo · sin cubrir |

Ejecuta de verdad `npm run verificar`, `npm run typecheck` y `npm run lint`, y pega la salida
real. No declares verificado lo que no ejecutaste; un RF que solo se comprueba a mano se marca
como **pendiente de demo manual** y se dice qué hay que hacer para cerrarlo.

Revisa también:

- Que no se implementó nada que la spec no pedía (**alcance**).
- Que lo declarado **fuera de alcance** sigue fuera.
- Que no se rompió ningún principio de `docs/constitucion.md`.

Cierra con un **veredicto explícito**: ¿la spec está cumplida, sí o no? Si sí, actualiza su
estado a `Cumplida`. Si no, lista exactamente qué falta.
