# Validación — Spec 029, Ajustes de la bitácora

> Fecha: 2026-10-19 · Fase 7 del flujo SDD (tarea T13)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec empiezan por «029/»);
- una prueba en vivo, con la tarea en que se hizo;
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **487 verificaciones correctas** (10 pruebas «029/»: línea 1449 y 8933 a 9096) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

**Desarrollo** (`neondb`, obra «Pruebas spec 018 (laboratorio)»):
- **T4:** `lecturasAnteriores` contra la base.
  - 9-oct: 21 equipos con `origen: 'bitacora'`.
  - 30-sep: PRUEBA-EXO-01 con `origen: 'vehiculo'`.
  - Tarda ~400 ms.
- **T5:** POST de la integración con el token de dev (sin imprimirlo).
  - PRUEBA-029-T5-1 (solo la final) → inicial 449.
  - PRUEBA-029-T5-2 (25-oct) → sin día futuro, con la excepción `fecha` y ninguna máquina creada.
- **T6:** GET de `ensayos-de-obra` con una sesión temporal de gerencia (borrada).
  - Devuelve 15 ensayos de PRUEBA-018.
  - Deja fuera las obras con Laboratorio apagado.
  - Responde 400 a periodos mal pedidos y 401 sin sesión.
- **T8 a T11, y la T13:** en Chrome con la sesión de gerencia del usuario.

**Producción** (`preoperaocc`, T12): sin migración, imagen `c7b71f1b4bae` (respaldo `552acd50f1d6`), healthy, el vecino y el panel 200, día 24-oct borrado con permiso.
- Bitácora del 16-oct de CONSORCIO MAGDALENA:
  - 60 casillas;
  - las iniciales con «Final del 15-oct» y sin avisos;
  - sin entrada ni salida.
- «Ensayos de obra» del 7 al 19-oct: 23 ensayos.

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | «029/RF-1» (8933). T4 (9-oct, bitácora gana). T8: añadir WA-LPN264 llena 756. Producción: «Final del 15-oct» | verde |
| RF-2 | «029/RF-2» (8940): del vehículo solo si es de un día anterior. T4: PRUEBA-EXO-01, 3500 h del 28-sep | verde |
| RF-3 | «029/RF-3» (8953). Por construcción: la fila nace con `""` si no hay lectura (`pantalla-partes.tsx`, «Añadir máquina») | verde |
| RF-4 | T8: la inicial llenada se cambió a 760 y se guardó | verde |
| RF-5 | «029/RF-5, RF-9» (8958). T8: «No coincide con la final del día anterior (756, 8-oct).», y se guarda igual | verde |
| RF-6 | T8: «6 horas de máquina», «30 km recorridos» | verde |
| RF-7 | «029/RF-7» (8975): no pisa una escrita ni llena sin final. T5: PRUEBA-029-T5-1 quedó 449→455 | verde |
| RF-8 | Por construcción: `completarIniciales` corre antes de `faltasDelReporte`, que ya aparta `final_menor` y `salto_enorme` con sus pruebas de la 021 y la 026. No se repitió en vivo | verde |
| RF-9 | 8958 (texto con el origen). T8: «Final del 8-oct». En la del vehículo, «Última lectura del vehículo (…)» solo en la regla | verde |
| RF-10 | T8 (Maquinaria), T9 (Personal), T10 (Actividades y Control de calidad). Producción: 60 casillas en el 16-oct | verde |
| RF-11 | T8 y T9: sin marcar se lee «Sin observación». Producción: 59 | verde |
| RF-12 | T8/T10: campo de 3 renglones (`altoObservacion` 83), ancho 360, alineado en la fila. A 390 px ocupa el renglón (T10) | verde |
| RF-13 | T8: tras recargar, WA-LPN264 abre marcada con su texto | verde |
| RF-14 | T8: desmarcar y volver a marcar devuelve el texto. T13: desmarcar y Guardar → `observaciones = ""` en la base | verde |
| RF-15 | «029/RF-15» (1449). T8: «Falta cerrar» no nombra la observación de PRUEBA-026-REC. No se cerró una bitácora en vivo (a la de prueba le faltan otras secciones) | verde |
| RF-16 | T10: el ensayo de densidad sin resultado ni «cumple» sale con la casilla marcada y deshabilitada y «Observación *». Con «Cumple» se libera | verde |
| RF-17 | Por construcción: `SeccionNotas` no se tocó | verde |
| RF-18 | T8: en la cerrada del 4-oct, la observación se ve en solo lectura y sin casilla. «Sin observación» en una cerrada: por construcción (`CampoObservacion` sin `editable`) | verde |
| RF-19 | T9: una persona nueva solo ofrece L, ED, EN, Novedad y la casilla | verde |
| RF-20 | T9: sin selectores de entrada y salida. Producción: 0 «Entrada» en el 16-oct | verde |
| RF-21 | T9: «Conductor Prueba: Escriba sus horas laboradas (L) o su novedad.» y no se guarda. Mensaje en el verificador | verde |
| RF-22 | T9: Natalia Riaño, «07:00 a 18:00», 11 h trabajadas y 6 h 30 min extra calculadas | verde |
| RF-23 | T9: en la misma fila sale «6 h 30 min extra en el día: pasa de las 2…». `horasNoCuadran` sin cambios | verde |
| RF-24 | T11: Laboratorio con «Granulometrías» y «Ensayos de obra» | verde |
| RF-25 | «029/RF-25, RF-28» (9078): los materiales viejos no salen. T6 y T11: abiertas y cerradas | verde |
| RF-26 | «029/RF-26» (9067). T11: fecha, ensayo y hora, ubicación, edad, resultado, cumple, responsable, WhatsApp | verde |
| RF-27 | «029/RF-27» (9096). T11: 7 días por defecto. «No cumple» → 6 | verde |
| RF-28 | 9078 (orden). T11: del 9-oct hacia atrás; páginas de 15 con `usePaginacion` | verde |
| RF-29 | T11: «Ver bitácora» abre la del 3-oct de PRUEBA-018 | verde |
| RF-30 | Por construcción: la pestaña no tiene acciones de edición; la ruta solo tiene GET | verde |
| RF-31 | T11: «Cumple» puesto a la densidad del 3-oct en la bitácora → la ruta la devuelve `cumple=si` | verde |
| RF-32 | T6: fuera las obras con el módulo apagado (`filtroDeModulo`); permiso `laboratorio:listar`. La vista de residente no se miró en vivo; usa el mismo alcance que granulometrías | verde |
| RF-33 | «029/RF-33» (9009). T5: sin fila en `whatsapp_dias` para el 25-oct. Producción: 0 días futuros tras borrar el 24-oct | verde |
| RF-34 | T5: excepción `fecha` «El día del reporte no puede ser posterior a hoy.» pendiente | verde |

## Requisitos no funcionales

| RNF | Resultado |
| --- | --- |
| La inicial sugerida en menos de 1 s | Viene con el GET del día, sin otra petición. El cálculo tarda ~400 ms (T4) |
| «Ensayos de obra» en menos de 2 s con un mes | ~420 ms con 1-sep a 19-oct en dev (T6) |
| Una columna a menos de 768 px | T10: a 390 px, ancho 390 sin desplazamiento; casilla y campo en el renglón entero |

## Notas

- **Clics por referencia:** en este panel, el clic por referencia de las herramientas de Chrome a veces no activa un botón (`Pressable`). En la T13 el primer intento de RF-14 no guardó por eso. Con clic por coordenadas sí. Es de la herramienta de prueba, no del panel.
- **Capturas en producción:** la captura de Chrome se colgaba en la bitácora de producción (36 personas y 20 máquinas). La comprobación se hizo leyendo la página con JavaScript.
- **Datos de prueba en dev:**
  - mensajes PRUEBA-029-T5-1 y -2;
  - la fila WA-LPN264 760→790 en la bitácora del 9-oct, ya sin observación;
  - la recicladora PRUEBA-026-REC con 455 h;
  - la densidad del 3-oct con «Cumple».
  - No se suben a R2.
- **Fuera de alcance, para la spec 030:** exportar «Ensayos de obra» a Excel (D2).

## Veredicto

**La spec 029 está cumplida.** RF-1 a RF-34 en verde y los RNF medidos. Está publicada en producción el 2026-10-19.
