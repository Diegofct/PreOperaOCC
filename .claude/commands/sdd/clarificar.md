---
description: Fase 3 — revisa la spec activa como QA y detecta huecos, sin resolverlos
argument-hint: "[NNN o nombre de la spec]"
---

Fase **Clarificación** del flujo SDD (`docs/flujo-sdd.md`). Usa la skill `generador-de-specs`
en modo revisión.

Spec a revisar: $ARGUMENTS (si no digo cuál, la de número más alto en `specs/`).

Léela junto con `docs/constitucion.md` y revísala **como un QA profesional**.
**Solo detecta: no resuelvas, no reescribas la spec, no toques código.**

Lista, agrupado y citando el RF concreto:

- **Ambigüedades** — frases que dos personas leerían distinto.
- **Contradicciones** — entre RF, o con una spec anterior ya cumplida.
- **Casos límite ausentes** — sin señal, evidencia ya firmada, primer arranque, dos personas
  a la vez, reloj desfasado, datos que llegan a medias, formato republicado.
- **Conflictos con la constitución** — cita el principio por su número.
- **Requisitos no verificables** — adjetivos sin umbral, "y" encubiertos, resultados que no
  se pueden observar en la aplicación funcionando.
- **Cosas del CÓMO que se colaron en el QUÉ** — nombres de tablas, librerías o archivos.

Cierra con un veredicto: ¿la spec está lista para planificar, o hay que volver a la entrevista?
