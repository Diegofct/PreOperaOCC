# Validación — Spec 030, Módulo de Reportes

> Fecha: 2026-10-20 · Fase 7 del flujo SDD (tarea T23)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «030/», con su línea);
- una prueba en vivo, con la tarea en que se hizo;
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

La IA de n8n se probó con mensajes de mantenimiento en la T21. El clasificador con
`mantenimientos[]` quedó publicado en el VPS el 2026-10-20.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **513 verificaciones correctas** (25 pruebas de la 030: líneas 9142 a 9724) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-20, antes del despliegue. Después no cambió el código.

**Desarrollo** (`neondb`, obra «Pruebas spec 018 (laboratorio)»):
- **T7:** 10 inserts en transacciones deshechas. Las 6 indebidas se rechazan y las 4 válidas pasan.
- **T8 a T10:** las rutas, con sesiones temporales de Diego (gerencia) y Natalia (residente), borradas al terminar.
- **T11:** los 7 libros de Excel, abiertos con `exceljs`.
- **T12 a T16 y T19:** en Chrome con la sesión de gerencia del usuario.
- **T18:** el POST de integración con `PRUEBA-030-T18-1`, `-1B`, `-2`, `-3` y `-4`.

**Producción** (`preoperaocc`, T22, 2026-10-20):
- Migración 0027 aplicada: 3 tablas nuevas y 28 migraciones.
- Imagen `918f3ae6669f` (respaldo `c7b71f1b4bae`). Healthy, y el vecino y el panel responden 200.
- Sin sesión, `/api/panel/reportes/*` → 401.
- Las 7 pestañas, llamadas con las funciones del servidor en solo lectura, para CONSORCIO MAGDALENA:
  - **semana del 12 al 18-oct:** 27 máquinas, 36 personas, 4 ítems, 36 viajes, 2 ensayos (1 no cumple), 7 días de clima, Mantenimiento sin historial;
  - **mes de octubre:** 27 máquinas, 44 personas y 14 bitácoras abiertas; el Excel de Personal pesa 41 KB.

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | «030/RF-1» (9505): gerencia y residente sí, los demás roles no. T6: «Reportes» en el menú | verde |
| RF-2 | T8: la residente que pide otra obra recibe la suya; gerencia sin obra → 400. T12: selector de obra solo para gerencia | verde |
| RF-3 | T12 a T15: las 7 pestañas | verde |
| RF-4 | «030/RF-4» (9142, 9153, 9164): lunes a domingo, día y mes, flechas. T12: la flecha pasa del 5-oct al 28-sep | verde |
| RF-5 | T12: abre en la semana actual y en Máquinas. Sin `tipo` ni `fecha`, `pedidoDeReporte` da la semana de hoy | verde |
| RF-6 | Por construcción: `partesDelPeriodo` lee las bitácoras no anuladas, abiertas o cerradas. Producción: el mes de octubre incluye 14 abiertas | verde |
| RF-7 | T12: el aviso `AvisoDeAbiertas`. Producción: 14 abiertas en octubre en MAGDALENA | verde |
| RF-8 | T12 a T15: las cifras de cada pestaña | verde |
| RF-9 | «030/RF-9» (9532, 9542, 9569). T11: 7 libros con tildes bien y números como `number`. T16: 200 `.xlsx`. Producción: `reporte-personal-01-2026-10-01-2026-10-31.xlsx` | verde |
| RF-10 | «030/RF-10» (9591). T16: título, periodo con la hora y la tabla, en carta horizontal | verde |
| RF-11 | «030/RF-11…» (9293). T8: 26 máquinas, incluidas las de bitácora de otra obra | verde |
| RF-12 | T12: el día y la semana con lecturas, avance y operador | verde |
| RF-13 | «030/RF-13 a RF-16» (9272). T12: botón verde «Sí» | verde |
| RF-14 | 9272: un avance de 0 cuenta como «No». T12: botón rojo «No» | verde |
| RF-15 | 9272. T12: «Sin bitácora» en la semana del 5-oct | verde |
| RF-16 | 9272: el operador sale del preoperacional; si no hay, «Sin operador». T8: el operador | verde |
| RF-17 | 9293: horas y kilómetros por el medidor del tipo | verde |
| RF-18 | 9293: totales y días. T12: una columna por día con Sí/No y su avance | verde |
| RF-19 | 9293: promedio por día trabajado. T12: el mes de septiembre con el detalle «Por día» de PRUEBA-VOL-T17 | verde |
| RF-20 | T10/T12: el estado de mantenimiento junto a la máquina, con enlace a la pestaña | verde |
| RF-21 | 9293. T10: la cifra `mantenimientosVencidos` | verde |
| RF-22 | Enums `clase_mantenimiento` (migración 0027). T13: aceite, preventivo y correctivo | verde |
| RF-23 | «030/RF-23 a RF-25» (9178): los intervalos de arranque. T10: el GET de intervalos trae 13 tipos con el de arranque | verde |
| RF-24 | T10: la residente → 403. T13: «Configurar intervalos» solo para gerencia | verde |
| RF-25 | 9178: el intervalo de la máquina gana al del tipo. T13: el de 5 h → «vencido hace 10 h»; «Volver al del tipo» → 250 h | verde |
| RF-26 | «030/RF-26 a RF-28» (9191). T13: aceite a 440 → «en 235 h» | verde |
| RF-27 | 9191: `sin_registro`. Producción: sin servicios registrados, ninguna máquina sale vencida | verde |
| RF-28 | 9191: al día, próximo (90 %), vencido, sin registro y «Revise lecturas», con sus textos | verde |
| RF-29 | T10/T13: «Pendiente desde el 19-oct» → Marcar resuelto → «Resuelto el 19-oct»; resolver otra vez → 409 | verde |
| RF-30 | Por construcción: `FUERA_DE_SERVICIO` (en mantenimiento, fuera de servicio, no apto) en `reportes/servidor/mantenimientos.ts`, con su etiqueta y su cifra. No se puso en vivo un vehículo en ese estado | verde |
| RF-31 | «030/RF-31» (9219). T13: el correctivo y la vencida primero | verde |
| RF-32 | T10/T13: la ventana Registrar; sin lectura toma la registrada (455) y guarda quién | verde |
| RF-33 | «030/RF-33» (9233). T10: lectura 470 → 201 con el aviso | verde |
| RF-34 | T13: historial con su origen y su estado; el de WhatsApp sale como «WhatsApp» (T19) | verde |
| RF-35 | T7: la anulación sin motivo la rechaza la base. T10: 400 / 200 / 409. T13: «Anulado» con quién y motivo, y deja de contar | verde |
| RF-36 | 9615, 9689. T18: PRUEBA-030-T18-1 → un mantenimiento `whatsapp`. T21: la IA da `aceite`, `correctivo` y `preventivo` en los mensajes reales | verde |
| RF-37 | 9642. T18: fecha del hecho del mensaje; una fecha futura no se guarda. T21: «hoy» → 2026-10-20 | verde |
| RF-38 | T18: sin lectura → la del día de la máquina | verde |
| RF-39 | 9642: «TFO 427» reconocida con `reconocerMaquina`. T21: la salida real de la IA, con los catálogos de MAGDALENA en producción, reconoce la TFO427 sin faltas | verde |
| RF-40 | 9670, 9724. T18: PRUEBA-030-T18-2 → excepción. T19: completada en Chrome con PRUEBA-026-VIBRO | verde |
| RF-41 | T18: PRUEBA-030-T18-3 («ya quedó reparada») → correctivo resuelto. T21: «ya quedó reparada la pajarita» → `resuelto: true` sin clase | verde |
| RF-42 | T18: PRUEBA-030-T18-1B, el mismo aceite en otro mensaje → repetido, con un solo registro (el id sale de máquina + clase + día) | verde |
| RF-43 | T18: las notas de la bitácora siguen | verde |
| RF-44 | «030/RF-44, RF-45» (9361). T8: 46 personas | verde |
| RF-45 | 9361: horas reportadas y calculadas. T14: «Incapacitado» y «+6,5 extra» | verde |
| RF-46 | «030/RF-46 a RF-48, RF-50» (9386). T14: semana del 5-oct, 46 personas, 689 h | verde |
| RF-47 | 9386. T14: octubre con «Incapacitado: 2 días» y el detalle por día | verde |
| RF-48 | 9386: los dos avisos. T14: «+2 h extra el 3-oct» | verde |
| RF-49 | T14: filtro por cargo y «natalia riano» sin tildes | verde |
| RF-50 | 9386. T14: las cifras | verde |
| RF-51 | «030/RF-51, RF-52» (9407). T15: sub-base 1.372,88 m³ en 4 días, con «Por día» | verde |
| RF-52 | 9407: las «otras» aparte | verde |
| RF-53 | «030/RF-53» (9444), sin anulados. T15: 21 viajes (PRT017 con 20). Producción: 36 viajes en la semana del 12-oct. Sin m³, como se corrigió al planear | verde |
| RF-54 | «030/RF-54» (9463). T15: 12 ensayos, la lista de los que no cumplen y «Ver bitácora» | verde |
| RF-55 | «030/RF-55» (9474). T15: el 8-oct con franjas y notas. Producción: 7 días | verde |
| RF-56 | Por construcción: `reporteDe` corre en el servidor con `horarioEfectivo` y `medidorDeClase`, las mismas reglas de la bitácora | verde |
| RF-57 | Por construcción: `usePaginacion` (15) en las 4 pantallas de pestañas | verde |
| RF-58 | T12: a 390 px, 390 de ancho y una columna. Las tablas usan el desplazamiento del panel (spec 026) | verde |

## Requisitos no funcionales

| RNF | Resultado |
| --- | --- |
| Cada pestaña en menos de 3 s con un mes | Producción, octubre de MAGDALENA (27 máquinas, 44 personas): Máquinas 0,80 s, Personal 0,56 s, Actividades 0,32 s, Mantenimiento y Calidad 0,22 s, Cantera y Clima 0,12 s. Se midió con las funciones del servidor, sin la red al navegador |
| El Excel abre con tildes y números | T11: 7 libros abiertos con `exceljs`, con números como `number`. Producción: el de Personal del mes sale en 0,35 s. No se abrió en Microsoft Excel |
| Impresión en carta horizontal sin cortar filas | «030/RF-10» (9591): `@page` carta horizontal y `break-inside: avoid` en las filas. T16: la vista con 370 filas. No se imprimió en papel |

## Notas

- **T21 (2026-10-20):** la API acepta el esquema de 16 `anyOf` y la IA sacó bien la clase y `resuelto` en 4
  mensajes. «La pajarita» y «la motoniveladora» van a «No se pudo guardar» porque el mensaje no dice cuál
  equipo es (RF-40):
  - «pajarita» no está en `contexto_obra.md`;
  - MAGDALENA tiene dos motoniveladoras.
- **Clasificador publicado en el VPS** el 2026-10-20 16:52 UTC. Lo publicó el usuario con
  `bash sql/publicar_clasificador_030.sh`, porque el modo automático de Claude Code no lo dejaba.
  - 4 flujos activos.
  - Cola sin errores.
  - Respaldo en `respaldos/clasificar_antes_030.json`.
- **14 bitácoras abiertas en octubre** en CONSORCIO MAGDALENA: los reportes las incluyen y lo avisan (RF-7). Sus datos pueden cambiar hasta que se cierren.
- **Datos de prueba en dev:**
  - mensajes `PRUEBA-030-T18-1`, `-1B`, `-2`, `-3` y `-4`;
  - los mantenimientos de PRUEBA-026-REC y PRUEBA-026-VIBRO.
  - No se subió nada a R2.
- **Cambio respecto del plan:** «Imprimir» no es una ruta, es una ventana con `paginaParaImprimir` (T16).

## Veredicto

**La spec 030 está cumplida.**
- RF-1 a RF-58 en verde y los RNF medidos.
- Está en producción desde el 2026-10-20: migración 0027 e imagen `918f3ae6669f`.
- El clasificador de n8n con los mantenimientos está publicado desde el 2026-10-20.
