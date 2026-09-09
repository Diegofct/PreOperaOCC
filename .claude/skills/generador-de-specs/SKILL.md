---
name: generador-de-specs
description: Convierte una idea vaga en una especificación formal (spec.md) mediante entrevista estructurada y notación EARS, o revisa una spec existente como QA. Úsala cuando se pida escribir, redactar, revisar o clarificar una spec, una especificación o unos requerimientos funcionales de PreOperaOCC, y en las fases de spec, clarificación y cambio del flujo SDD.
---

# Generador de specs — PreOperaOCC

Convierte una idea vaga en un **contrato verificable**: `specs/NNN-nombre-kebab/spec.md`.
La spec es lo que se aprueba; el código viene después y solo hace lo que la spec dice.

Sirve para dos cosas: **redactar** una spec nueva y **revisar** una existente. En revisión
se detecta, no se reescribe.

## Antes de preguntar nada

1. Lee `docs/constitucion.md`. Todo requisito se juzga contra esos principios.
2. Lee `docs/flujo-sdd.md` si necesitas recordar la frontera entre spec y plan.
3. Mira `specs/` para saber qué se ha especificado ya y cuál es el siguiente número libre.
4. Si el requerimiento toca reglas del preoperacional o de la jornada, lee
   `src/shared/rules/inspeccion.ts` y `src/shared/rules/jornada.ts`: son la fuente de
   verdad de lo que el sistema ya decide hoy.

## Fase 1 — Entrevista

**No escribas código. No propongas stack, tablas ni pantallas.** Si la respuesta se va a
lo técnico, redirige al QUÉ y al POR QUÉ.

- **Máximo 6 preguntas, de una en una.** Espera la respuesta antes de la siguiente.
- Cada pregunta ataca lo que más caro sale equivocarse: casos límite, errores, alcance.
- No preguntes lo que puedes leer en el código o en `AGENTS.md`.
- Si la respuesta abre una duda mayor, esa duda gasta una de las 6 preguntas; no las acumules.

Tres preguntas que **este proyecto** casi siempre necesita, y que deben caber entre las seis
si el requerimiento las toca:

1. **Sin señal**: ¿el operador tiene que poder hacer esto con el teléfono sin datos?
   Si la respuesta obliga a red en el móvil, choca con el principio 1 y hay que decirlo ya.
2. **Evidencia firmada**: ¿afecta a un preoperacional firmado o a una bitácora cerrada?
   Nada de eso se edita: se anula con motivo. Un RF que hable de "corregir" está mal planteado.
3. **Quién ve qué**: ¿qué cambia para el operador en el móvil y qué para la administración
   en el panel? Casi todo requerimiento toca las dos superficies, y la que se olvida es la
   que aparece rota dos semanas después.

Y si huele a datos nuevos, pregunta también: ¿esto es una **réplica** (manda el servidor,
el pull la sobrescribe) o una **captura** (nace en el teléfono y sube una sola vez)?

## Fase 2 — Redacción

- Ruta: `specs/NNN-nombre-kebab/spec.md`, con `NNN` de tres dígitos, el siguiente libre.
- Copia `specs/_plantillas/spec.md` y **no omitas secciones**. Una sección que no aplica se
  responde ("Sin cambios de esquema"), no se borra.
- Requisitos numerados `RF-1`, `RF-2`… en notación EARS, uno de estos cinco patrones y solo uno:

| Patrón | Forma |
| --- | --- |
| Ubicuo | `EL SISTEMA <comportamiento>` |
| Dirigido por evento | `CUANDO <evento>, EL SISTEMA <respuesta>` |
| Estado | `MIENTRAS <estado>, EL SISTEMA <respuesta>` |
| No deseado | `SI <condición>, ENTONCES EL SISTEMA <respuesta>` |
| Opcional | `DONDE <característica presente>, EL SISTEMA <respuesta>` |

- **Un requisito = una frase.** Si aparece un "y", son dos requisitos.
- **Todo requisito es verificable.** Rechaza adjetivos sin umbral: "rápido", "intuitivo",
  "amigable", "seguro". Si el cliente lo dice así, la pregunta es "¿cuánto?" o "¿comparado con qué?".
- La sección **Superficies afectadas** se marca siempre; es lo que después ordena el plan.
- **Fuera de alcance** nunca se deja vacía: es lo único que impide que la funcionalidad crezca sola.

## Fase 3 — Lo que no sabes

Marca `[NECESITA ACLARACIÓN: <pregunta concreta>]` en el punto exacto. **No inventes** un
valor por defecto para cerrar el hueco: una spec con tres huecos marcados es útil; una spec
con tres suposiciones silenciosas es una trampa.

## Fase 4 — Aprobación

Al terminar, resume en cinco líneas qué queda dentro, qué queda fuera y qué sigue sin resolver,
y **pide confirmación explícita antes de pasar al plan**. No arranques la fase de plan por tu cuenta.

## Qué NO va en una spec

Stack, arquitectura, nombres de tablas o columnas, endpoints, algoritmos, nombres de archivos
de código, librerías. Todo eso es `plan.md`. Si en la spec aparece `drizzle`, `outbox` como
tabla o el nombre de un componente, está en el archivo equivocado — salvo cuando el nombre
es vocabulario del negocio y no de la implementación (preoperacional, bitácora, obra, medidor).

## Modo revisión (fase de clarificación)

Mismo documento, otro trabajo: **detectar sin resolver**. Recorre la spec como un QA
profesional y lista, agrupado y citando el RF:

- **Ambigüedades**: frases que dos personas leerían distinto.
- **Contradicciones**: entre RF, o con una spec anterior ya cumplida.
- **Casos límite ausentes**: sin señal, evidencia firmada, primer arranque, dos usuarios a la
  vez, reloj desfasado, datos que llegan a medias.
- **Conflictos con la constitución**: cita el principio por su número.
- **Requisitos no verificables**: adjetivos sin umbral, "y" encubiertos, resultados no observables.

No propongas la corrección salvo que te la pidan: el objetivo de esta fase es que el hueco se
vea, y quien decide qué hacer con él es el cliente.
