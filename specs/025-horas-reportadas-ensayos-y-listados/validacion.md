# Validación — Spec 025, Horas reportadas, ensayos más flexibles y listados por fecha y por páginas

> Fecha: 2026-10-09 · Fase 7 del flujo SDD (tarea T23)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec empiezan por «025/»);
- una prueba en vivo, con la tarea en que se hizo;
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **454 verificaciones correctas** (21 nuevas; 4 pruebas anteriores ajustadas a las reglas nuevas: fin del ensayo, metros libres, observación con resultado y la fila de la plantilla) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |

**Integración (PC, sin arrancar n8n ni Evolution; T18 y T19):**
- El texto real del reporte del 8-oct pasó por la IA y salieron:
  - 37 personas con L, ED y EN, agrupadas por cargo;
  - Vicente Arias con novedad «Incapacitado»;
  - 4 ensayos «Compresión simple» con tramo, edad, resultado, unidad y si cumple.
- La plantilla v4 da lo mismo en su personal y sus ensayos.

**Desarrollo (T9, T20):**
- La clasificación real del 8-oct se entregó a la obra de pruebas y se procesó con el pulso. La bitácora quedó con:
  - 37 personas, 36 con horas y 1 incapacitada;
  - los 4 ensayos.
- «No se pudo guardar» quedó sin renglones de personal ni de ensayos. Solo hay máquinas, porque la obra de pruebas no tiene esos equipos.

**Producción (T21, T22, 2026-10-09):**
- **Panel:** imagen nueva y sana, con `preoperaocc:anterior` de respaldo. Sin migración.
- **n8n:** clasificador nuevo publicado, con respaldo. Cuatro flujos activos, WhatsApp `open` y un pulso a mano sin errores.
- **Reporte del 8-oct de Catalina Chaparro** (`3EB024B22E22EB9C3B2A3D`):
  - se reclasificó y se volvió a llevar a la bitácora;
  - la bitácora del 8-oct de la obra real quedó con **37 personas (36 con horas, Vicente Arias incapacitado) y los 4 ensayos**;
  - las actividades, el clima y las notas no se duplicaron;
  - las 37 excepciones de personal, las 4 de ensayos y la falsa de «bitácora» quedaron descartadas con motivo;
  - siguen pendientes las 9 de maquinaria, que están fuera de esta spec.

## Horas reportadas del personal (H1)

| RF | Cómo se comprobó |
| --- | --- |
| RF-1 a RF-3 | T8: `PATCH /api/panel/partes/:id` guarda L, ED y EN. T13: Chrome, casillas «Laboradas (L)», «Extra diurnas (ED)», «Extra nocturnas (EN)». |
| RF-4 | «025/RF-4: las horas van de media hora en media hora». |
| RF-5 | «025/RF-5, RF-12…» y «025/RF-14…» (L 13 = 780 min, de ellos 240 extra). |
| RF-6 | «025/RF-6…» y el cierre «025/RF-6, RF-19…». |
| RF-7 | «025/RF-7: con entrada y salida sigue la regla de la 016». |
| RF-8 | «025/RF-8…» (regla y cierre); T15: excepción real con ese texto. |
| RF-9 | «025/RF-9…». |
| RF-10 | «025/RF-10…». T8: la ruta responde 400 con el texto. |
| RF-11 | «025/RF-11…». |
| RF-12 | «025/RF-5, RF-12…». T8: `construirPersona` guarda 0. |
| RF-13 | T13: Chrome, «13 h laboradas (reportadas)», «3 h extra diurnas», «1 h extra nocturnas». |
| RF-14, RF-15 | «025/RF-14…» y «025/RF-15, RF-22…». |
| RF-16 | «025/RF-16…». T13: Chrome, aviso con Natalia (07:30–17:00, L 10). |
| RF-17 | T10: `GET /api/panel/resumen?periodo=mes` suma las horas reportadas (`horasDeLaPersona`). |

## Novedades (H2)

| RF | Cómo se comprobó |
| --- | --- |
| RF-18 | T8 y T13: Chrome, selector «Novedad» con las cuatro. |
| RF-19, RF-20 | «025/RF-19, RF-20…». |
| RF-21 | T13: Chrome, etiqueta «Incapacitado» junto a la persona. |
| RF-22 | «025/RF-15, RF-22…». En el resumen se cuenta a la persona con 0 horas, por construcción (`resumen+api.ts`). |

## El reporte de WhatsApp con horas y novedades (H1, H2)

| RF | Cómo se comprobó |
| --- | --- |
| RF-23, RF-24 | «025/RF-23 a RF-26, RF-40 a RF-43…». T18, T20 y T22: el reporte real. |
| RF-25 | Misma prueba (`hoja` = título del grupo). T18: `cargo_hoja` por grupo. |
| RF-26 | «025/RF-23 a RF-26…» (sin faltas cuando trae horas). T15: renglón sin horas → «No se pudo guardar» con el texto de RF-8. |
| RF-27 | T15: Chrome, se completó L = 8 en «No se pudo guardar» y quedó guardado. |
| RF-28 | La prueba de la plantilla (entrada y salida, sin horas) sigue pasando. |

## Control Calidad de Obra (H3, H4)

| RF | Cómo se comprobó |
| --- | --- |
| RF-29, RF-30 | «025/RF-29 a RF-33…» y la prueba ajustada «a un ensayo se le exigen…». |
| RF-31 a RF-33 | Mismas pruebas y «025/RF-31, RF-33, RF-43…». T14: Chrome, tramo «PR 1 + 300 a PR 1 + 170». |
| RF-34 a RF-36 | T8 y T14: guardados por la ruta y por la pantalla. |
| RF-37 | T14: casillas en el formulario. La tabla de solo lectura muestra «28 días · 2.98 MPa · No cumple» por construcción (`resultadoDelEnsayo`); no se miró en Chrome una bitácora cerrada con ensayos nuevos. |
| RF-38, RF-39 | «025/RF-38, RF-39…». T14: guardado sin observación con resultado. |
| RF-40 | «025/RF-40…». T18: la IA ya da «Compresión simple». |
| RF-41, RF-42 | «025/RF-23 a RF-26, RF-40 a RF-43…» y la prueba de la plantilla ajustada. |
| RF-43 | «025/RF-31, RF-33, RF-43…» («Cantera La Fortune» → lugar). |
| RF-44 | Por construcción: los campos nuevos solo se pintan si existen, y `esEnsayoAnterior` no cambió. |

## Filtro por fecha (H5)

| RF | Cómo se comprobó |
| --- | --- |
| RF-45 a RF-47 | T11 (curl) y T16 (Chrome) en las tres listas. |
| RF-48 | T11: `diaDelMensaje` = `fecha_hecho` o el día de envío en Bogotá; rango 2026-10-01..08 por curl. |
| RF-49 | «025/RF-49 a RF-51…». T16: Chrome abre con 2026-10-03..09. |
| RF-50, RF-51 | Misma prueba. T11: 400 por curl. T16: Chrome muestra «Tiene que ser igual o posterior a «Desde»». |
| RF-52, RF-53 | T11: orden descendente y 28 mensajes de un rango (antes había un tope de 200). |
| RF-54 | T16: Chrome, recargar con `?desde=&hasta=` conserva el rango. |

## Tablas de a 15 (H6)

| RF | Cómo se comprobó |
| --- | --- |
| RF-55 | «025/RF-55, RF-58…» (`POR_PAGINA === 15`). T17: Personas «Página 1 de 4». |
| RF-56 | T17: `usePaginacion` en las 12 tablas de la lista. En Chrome se vieron el Historial («Página 1 de 6»), Obras, Laboratorio y Cantera. |
| RF-57 | Por construcción: cambia la clave (cuántas filas hay más los filtros) → página 1. No se probó con clics. |
| RF-58 | «025/RF-55, RF-58…» y `Paginacion` se oculta con una sola página. T17: Obras, Laboratorio y Cantera sin controles. |
| RF-59 | Por construcción: las secciones de la bitácora no usan `usePaginacion`. |

## Reglas transversales

| RF | Cómo se comprobó |
| --- | --- |
| RF-60 | Por construcción: en solo lectura, las casillas nuevas solo se pintan si traen valor. No se abrió en Chrome una bitácora cerrada antigua. |
| RF-61 | La misma `validarPersonaDelParte` en el guardado, en el reporte y en el cierre, y la misma `faltasDelEnsayo` en la pantalla, la ruta y el reporte. |

## Defecto de la spec 024 corregido aquí (T12)

El choque de versión entre la entrega y el pulso ya no deja un «No se pudo guardar» falso:
- `guardarEnBitacora` reintenta 4 veces;
- si aun así choca, el mensaje queda en espera.

Prueba: tres `armarBitacora` simultáneos del mismo día dejaron el mensaje guardado una vez, sin excepciones y sin duplicar.

## Lo que queda abierto

- **RNF de 3 s** con 1 000 mensajes en 31 días: sin medir.
- **RF-37 y RF-60 en una bitácora cerrada:** no se miraron en Chrome.
- **Fuera de esta spec:** las 9 máquinas del 8-oct en «No se pudo guardar», por no reconocerse por su nombre y por lecturas mal escritas en el reporte. Es la mejora ya anotada: reconocer máquinas por nombre o marca.

## Veredicto

**Spec 025 cumplida.** Los 61 RF tienen evidencia, y los que se cumplen por construcción lo dicen.
