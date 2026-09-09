# Flujo SDD — cómo se trabaja en este proyecto

*Spec Driven Development*: el trabajo con el agente parte de una **especificación
acordada**, no de prompts improvisados. Cada fase deja un artefacto escrito en el
repo, y ese artefacto es lo que se revisa y se aprueba —no el código que sale después.

La regla que lo resume todo: **un cambio de comportamiento empieza por la spec,
nunca por el código.**

## Las ocho fases

| # | Fase | Comando | Produce | Regla dura |
| --- | --- | --- | --- | --- |
| 1 | Constitución | `/sdd:constitucion` | `docs/constitucion.md` | Espera aprobación explícita |
| 2 | Spec | `/sdd:spec <idea>` | `specs/NNN-…/spec.md` | Entrevista primero. **No escribe código** |
| 3 | Clarificación | `/sdd:clarificar` | informe de hallazgos | Solo detecta; no resuelve ni reescribe |
| 4 | Plan | `/sdd:plan` | `specs/NNN-…/plan.md` | Diseño sin código, con el RF que cubre cada parte |
| 5 | Tareas | `/sdd:tareas` | `specs/NNN-…/tareas.md` | Tareas de <30 min, ordenadas por dependencia |
| 6 | Implementación | `/sdd:implementar T3` | código + tarea marcada | **Una sola tarea**, y se detiene al terminar |
| 7 | Validación | `/sdd:validar` | informe RF por RF | Veredicto explícito: ¿spec cumplida? |
| 8 | Cambio | `/sdd:cambio <req>` | spec actualizada | **No toca código**: primero la spec y su diff |

## Dónde vive cada cosa

```
docs/constitucion.md          los principios innegociables (fase 1)
docs/flujo-sdd.md             este documento
specs/_plantillas/            las plantillas de spec, plan y tareas
specs/NNN-nombre-kebab/       una carpeta por funcionalidad
  spec.md                     el QUÉ y el POR QUÉ (fases 2, 3 y 8)
  plan.md                     el CÓMO (fase 4)
  tareas.md                   el orden de ejecución con checkboxes (fases 5 y 6)
```

## La frontera entre spec y plan

Es la que más se cruza sin darse cuenta, y la que hace que el flujo sirva de algo:

- **`spec.md` — el QUÉ y el POR QUÉ.** Se entiende sin saber que existe Drizzle.
  Habla de operadores, vehículos, obras, evidencia y decisiones de negocio. Un RF
  se puede comprobar mirando la aplicación funcionando.
- **`plan.md` — el CÓMO.** Módulos, tablas, migraciones, endpoints, algoritmos,
  decisiones técnicas con su alternativa descartada.

Si en la spec aparece un nombre de tabla o de librería, está en el archivo equivocado.

## Notación EARS para los requisitos

Cada RF usa uno de estos patrones, y solo uno:

| Patrón | Forma | Cuándo |
| --- | --- | --- |
| Ubicuo | `EL SISTEMA <comportamiento>` | Siempre cierto |
| Dirigido por evento | `CUANDO <evento>, EL SISTEMA <respuesta>` | Algo lo dispara |
| Estado | `MIENTRAS <estado>, EL SISTEMA <respuesta>` | Vale durante una condición |
| No deseado | `SI <condición>, ENTONCES EL SISTEMA <respuesta>` | Error, conflicto o caso límite |
| Opcional | `DONDE <característica presente>, EL SISTEMA <respuesta>` | Solo en cierta configuración |

Un requisito es **una** frase. Si lleva un "y", son dos requisitos. Y si contiene un
adjetivo sin umbral —"rápido", "intuitivo", "seguro"— no es verificable y no vale.

## Lo que este proyecto añade al flujo del curso

Tres preguntas que ninguna spec de PreOperaOCC puede dejar sin responder:

1. **¿Qué pasa sin señal?** El operador trabaja offline por defecto; si un requisito
   necesita red para funcionar, choca con el principio 1 de la constitución.
2. **¿Toca evidencia ya firmada?** Preoperacionales y bitácoras cerradas no se editan:
   se anulan. Un RF que "corrija" un registro firmado está mal planteado.
3. **¿Qué superficie cambia?** Móvil, panel, API, sincronización o esquema de datos.
   Casi todo cambio toca dos, y el que se olvida es el que rompe la subida.

Y la puerta de calidad no es negociable: `npm run verificar`, `npm run typecheck` y
`npm run lint` en verde antes de dar por hecha cualquier tarea.
