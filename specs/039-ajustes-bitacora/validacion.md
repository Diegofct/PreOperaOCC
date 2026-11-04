# Validación — Spec 039, ajustes a la bitácora

> Fecha: 2026-11-04 · Tarea T16

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «039/» en el nombre);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de cada tarea en `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado: queda en «Lo que no se probó».

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **656 verificaciones correctas** (18 pruebas nombradas «039/»; se borraron 16 del desglose de horas y 3 del horario del día, y se actualizaron las de 025, 029 y 030 que daban por hecho el cálculo de horas o la foto por actividad) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |

**Desarrollo** (`neondb`; migración `0038_stiff_black_cat` aplicada **solo aquí**, 39 migraciones):
- **T5:** la migración es una sola sentencia, `ALTER TABLE "partes_de_obra" ADD COLUMN "secciones_sin_registro" jsonb DEFAULT '{}'::jsonb NOT NULL`. No toca filas.
- **T6, T7, T8:** e2e contra el dev server y llamando a `guardarEnBitacora`, con datos `PRUEBA-039-…` borrados por id (20 ✓, 10 ✓ y 5 ✓).
- **T9 a T14:** en Chrome, con la sesión de gerencia del usuario en `localhost:8081`. A 1366 px, simulado con el ancho de `#root`. A 390 px, con el panel montado en `iframe`s de 390 px, porque Chrome estaba maximizado y no se dejaba achicar.
- **T15:** la instrucción de clasificar mandada a la API de Anthropic con la misma petición que arma el flujo, con un reporte real del 8-oct y el Excel real de horas extras (5 casos).
- **T16:** e2e final (abajo) y medición.
- **Limpieza acotada:** solo lo `PRUEBA-039` y las dos bitácoras abiertas para mirar en Chrome. Al final: 0 bitácoras, 0 vehículos, 0 usuarios y 0 sesiones de prueba. Una foto `PRUEBA` subida a R2 en la T6, borrada con 204. Los mensajes reales usados en la T15, borrados del scratchpad. Scripts temporales borrados. En Chrome no se generó ninguna contraseña ni código: las ventanas se abrieron y se cancelaron.

**Producción:** sin tocar. Va con la T23 de la 033 (ver «Para desplegar»).

### e2e final (T16)

Por las rutas reales del dev server, con una sesión temporal de un usuario `PRUEBA-039-T16` (gerencia) y un vehículo `PRUEBA-039-T16` (odómetro 990.5), para que cerrar no mueva el medidor de un equipo real. Bitácoras de la obra «Pruebas spec 018», del 9-jun-2025 (D1) y el 10-jun-2025 (D2). **10 ✓, limpieza 0 filas.**

1. Abrir D1: propone 990.5 del vehículo; el parte no trae `horario`; sin marcas.
2. D1 guarda 990.5 → 1010.25 y rechaza 1010.257 (400).
3. Abrir D2: propone 1010.25, la final de D1, con origen «bitácora».
4. Corregir la final de D1 a 1012.5 cambia la inicial de D2.
5. Marcar Maquinaria con una máquina se rechaza (400).
6. Personal 10 h con 2 extra diurnas se guarda sin aviso ni cálculo; clima y marcas de Notas y Fotografía guardadas.
7. Cerrar con Fotografía marcada sin motivo se rechaza: «Fotografía del día: falta el motivo de «No se tomaron fotos».»
8. Con el motivo, cierra; el vehículo queda en 1012.5 km.
9. La cerrada conserva las marcas y sus motivos.
10. D2: una persona con entrada y salida y sin horas se guarda sin calcular.

## Medición (requisitos no funcionales)

| Qué | Contra el dev server | Requisito |
| --- | --- | --- |
| Abrir una bitácora | 1,30 s (en frío) y 0,58 s | ≤ 1,5 s ✓ |
| Cerrar una bitácora | 1,14 s | ≤ 1,5 s ✓ |
| Leer el día (`GET /api/panel/partes`, con las lecturas anteriores entre obras) | 0,42 – 0,73 s (5 veces) | sin requisito propio; en la T7 daba 0,7 – 1,2 s con 44 bitácoras |

- **Lectura anterior entre obras en una sola consulta:** por construcción. `lecturasAnteriores` busca la última final de los equipos de la obra con un solo `select … where vehiculo_id in (…)` sobre las bitácoras de todas las obras (T7). Si en producción el volumen lo vuelve lento, el plan deja limitar la búsqueda a 90 días.
- **La migración solo agrega una columna:** comprobado al leerla (T5).
- **Las bitácoras cerradas no cambian:** por construcción. `propagarFinales` solo toca la siguiente bitácora **abierta**; ninguna tarea escribe en bitácoras cerradas. Las horas viejas se muestran solo si fueron reportadas, porque `horasDeLaPersona` ya no calcula (RF-6).

## RF por RF

### Fotos (H1)

| RF | Cómo se comprobó |
| --- | --- |
| RF-1 | Prueba «039/RF-1, RF-2» (cierre sin foto por actividad). Chrome (T9): la actividad ya no trae botón de foto. |
| RF-2 | Prueba «039/RF-1, RF-2» y «039/RF-11, RF-12». e2e T16 pasos 7–8: con Fotografía marcada y motivo, cierra. |
| RF-3 | `foto+api` ignora `?item=` (T6, e2e 20 ✓). Chrome (T9): solo «Añadir fotografía» en Fotografía del día. |
| RF-4 | Prueba «… solo para «Fotografía del día», sin actividad (039/RF-4)» (contrato). e2e T8: la foto aprobada queda como `media` sin actividad, quita la marca de Fotografía, se ve en la sección y no se repite (5 ✓). |
| RF-5 | `fotosDeLaBitacora` ya no filtra `item_key` (T6). e2e T6: una foto por actividad aparece en la sección y se quita; el arreglo de `quitar+api` decodifica el id «principal:…». |

### Horas (H2)

| RF | Cómo se comprobó |
| --- | --- |
| RF-6 | Prueba «039/RF-6». e2e T16 paso 6: 10 h y 2 ED se guardan tal cual. |
| RF-7 | `validarPersonaDelParte` sin cambios; sus pruebas de la 025 siguen en verde (pasos de media hora, ED+EN ≤ L, ≤ 16 h). |
| RF-8 | Prueba «039/RF-7, RF-8». e2e T16 paso 10. Chrome (T9): «Horas no reportadas» en la bitácora. |
| RF-9 | Prueba «030/RF-44, 039/RF-9». T8: el GET de partes, el resumen y Reportes ya no leen el horario; e2e T16 paso 1 (sin `horario`). Chrome: la bitácora sin «Horario de este día» ni aviso de +2 h (T9); Reportes > Personal con «No reportadas» (T10). |
| RF-10 | T15: la instrucción toma L, HED y HEN tal como vienen; probado con el Excel real de horas extras (con una columna L y horas agregadas): L 11 / ED 1 / EN 1, L 9.5 / ED 0.5, HFD marcada para revisión, celdas vacías vacías. |

### «No aplica» por sección (H3)

| RF | Cómo se comprobó |
| --- | --- |
| RF-11 | Prueba «039/RF-11, RF-12». Chrome (T9): las cuatro casillas con su texto; Maquinaria, Notas y Fotografía marcadas y guardadas. |
| RF-12 | Prueba «039/RF-11, RF-12». e2e T16 paso 7 (sin motivo no cierra y dice cuál falta). Chrome (T9): con la marca se esconde «Añadir máquina» / «Añadir fotografía» y la sección sale de «Falta llenar». |
| RF-13 | Prueba «039/RF-13». e2e T16 paso 5. e2e T6 y T8: una foto subida o aprobada quita la marca de Fotografía. |
| RF-14 | Prueba «039/RF-14». e2e T16 paso 9. Chrome (T9): «no aplica» en el índice. |

### Medidores (H4)

| RF | Cómo se comprobó |
| --- | --- |
| RF-15 | Pruebas «039/RF-15» (×2) y «039/RF-15 a RF-17». Chrome (T9): «43641,5» se guarda como 43641.5. T15: la IA copia «4.250,32» como texto y el sistema la lee. |
| RF-16 | Pruebas «039/RF-16» (Vehículos) y del contrato `lecturaParcial`. e2e T16 paso 2 (dos decimales sí, tres no). |
| RF-17 | Pruebas «039/RF-15 a RF-17» y «039/RF-17, D4». Chrome: bitácora (T9), Reportes > Máquinas «1771.7» y Mantenimiento «5836.6 h», «vencido hace 215.1 h» (T10). |
| RF-18 | Prueba «029/RF-5, RF-9» ampliada en la T9. Chrome (T9): «Queda por debajo de la final del día anterior (43642, 3-oct). Revise la lectura; se puede guardar igual.» |

### Inicial ← final (H5)

| RF | Cómo se comprobó |
| --- | --- |
| RF-19 | Prueba «039/RF-19». e2e T7 (máquina en otra obra). e2e T16 pasos 1 y 3 (del vehículo y de la bitácora anterior). |
| RF-20 | `completarIniciales` en el guardado automático, la aprobación manual y «No se pudo guardar» (T4, T7); e2e T7. |
| RF-21 | Prueba «039/RF-21». e2e T7 y e2e T16 paso 4. |
| RF-22 | Pruebas «039/RF-22» (×2). |
| RF-23 | Chrome (T9): la inicial propuesta con «(propuesta, falta guardar)», y el cierre la sigue pidiendo hasta guardar. |

### Formularios (H6)

| RF | Cómo se comprobó |
| --- | --- |
| RF-24 | Por construcción en `componentes.tsx` (T12): tres anchos uniformes en los formularios de alta, gaps de 12 y 20, `Campo`/`Selector` sin ancho que llenan su renglón (T14). Chrome: Vehículos, Contrato, Compras, Almacén, Cantera, Calidad, Cortes. |
| RF-25 | `AccionesFormulario` ordena secundario → peligro → principal, a la derecha, también con un `Acciones` anidado (19 formularios), y sin botones no pinta nada (T12, T13). Chrome: «Corregir» vehículo, «Completar» de WhatsApp, «Dar acceso». A 390 px (iframes): bitácora, Vehículos, Contrato, Compras y ficha de RRHH, un campo por renglón. |
| RF-26 | T13 y T14: bitácora de obra (a 1366 px la observación baja bajo los campos; nombres que envuelven), WhatsApp (propuesta, «Completar», «Descartar»), ventanas `ventana-*` y 19 ventanas cortas a 520 px en Compras, Tesorería, Contrato, OCC, Cortes, Laboratorio, Cantera, Almacén, viajes, Mantenimiento y RRHH. |

### RRHH (H7)

| RF | Cómo se comprobó |
| --- | --- |
| RF-27 | Chrome (T11): la pestaña «Accesos y contraseñas» con 58 personas del grupo; Empresa = OCC → 52 de 58. |
| RF-28 | Chrome (T11, T13): ficha de un conductor con «Códigos»; ficha de una residente con «Dar acceso», ventana con su confirmación (cancelada, sin generar). Mismas reglas y la misma `VentanaDeSecreto` que la lista. |

### Dudas resueltas

- **D1** (marcas solo desde el panel): la IA no tiene campos de marcas; por construcción.
- **D2** (motivo obligatorio en Notas): prueba «039/RF-11, RF-12»; Chrome (T9).
- **D3** (se respeta una inicial escrita a mano): `propagarFinales` solo cambia una inicial vacía o igual a la final vieja (e2e T7).
- **D4** (Reportes y exportaciones en blanco): prueba «039/RF-17, D4» (Excel y PDF); Chrome (T10).

## Casos límite

| Caso | Cómo se comprobó |
| --- | --- |
| Bitácoras viejas con horas calculadas | `horasDeLaPersona` sin L devuelve `null` («Horas no reportadas»); la entrada y la salida se siguen viendo (Chrome T9, con una fila de 07:00–17:00). |
| Foto subida por actividad y como foto del día | `unificarFotosDelDia` descarta por `sha256` (prueba de la 027; e2e T8, aprobar dos veces no la repite). |
| Máquina que cambia de obra | e2e T7. |
| Final corregida con el día siguiente cerrado | `propagarFinales` no salta a otra si la siguiente está cerrada (e2e T7). |
| «4.250» en un horómetro | Prueba «039/RF-15»: 4.25; el aviso de RF-18 lo hace notar (Chrome T9, con «43641,5» frente a 43642). |
| Día sin trabajo | Sin cambios; la casilla «Ese día no se trabajó» sigue en Chrome (T9) y las marcas no salen en un día sin trabajo (`SinRegistro`). |

## Lo que no se probó

- **La bitácora de OCC con datos:** dev no tiene ninguna. Usa los mismos componentes que la de obra; su «Anular» y sus «Corregir» quedaron angostos (T13, T14) sin verse con datos.
- **El selector único de fotos de la propuesta de WhatsApp en Chrome:** dev no tiene una propuesta pendiente con fotos. El contrato y `guardarEnBitacora` sí se probaron (T8).
- **La descarga del Excel de Reportes en el navegador:** su contenido está cubierto por las pruebas de `hojasDelReporte`.
- **La instrucción de n8n en el n8n local o en el VPS:** se probó contra la API con la misma petición; el flujo **no** se desplegó. El Excel real de horas extras no trae columna L: con el formato de hoy, las horas laboradas quedan vacías y no se calculan.
- **El barrido de secretos del bundle web** (`expo export` + `grep`) no se repitió: esta spec no agrega variables de entorno ni lecturas de secretos en el cliente.
- **La app móvil:** fuera de alcance; sigue con lecturas enteras. Su mensaje «no puede ir hacia atrás» ahora muestra la lectura sin miles («1240 h»), porque comparte `validarMedidor` con el panel (T10).

## Para desplegar (T23 de la 033)

1. Migraciones en orden: 0031 → 0038 (`0038_stiff_black_cat`, solo agrega `partes_de_obra.secciones_sin_registro`).
2. El panel con la 039.
3. n8n: reimportar `workflows/occ-clasificar-mensajes.json` (solo cambia el nodo «Armar petición»: lecturas como texto, L/HED/HEN). Va **junto** con el panel: el panel ya acepta las lecturas como número o texto, así que el orden entre los dos no rompe nada.
