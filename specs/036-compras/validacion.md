# Validación — Spec 036, Compras: solicitudes de compra del grupo

> Fecha: 2026-10-29 · Tarea T19

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «036/», líneas 12257 a 12674);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **623 verificaciones correctas** (14 pruebas de la 036) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-29, al cerrar la T19.

**Desarrollo** (`neondb`; migración `0035_complete_eternals` aplicada **solo aquí**):
- **T6:** la migración (seis tablas, el enum y el cuarto dueño de `documentos_del_grupo`), revisada antes de aplicarla: sin `DELETE`, `UPDATE` ni `DROP TABLE`.
- **T7 a T13:** cada ruta contra el dev server con sesiones temporales en `sesiones_web` y personas PRUEBA-036 (gerencia, residentes, almacenista, Encargado de OCC, laboratorista, auxiliar de RR. HH., operador). Se miró la **respuesta cruda**. La T13 recorrió todas las rutas de la 036 con la sesión del almacenista y revisó sus 20 respuestas contra los valores y las clases con precio.
- **T14 a T18:** en Chrome, en `127.0.0.1:8081` con sesiones temporales —aparte de la sesión del usuario en `localhost`—, con datos de demo PRUEBA-036 en Consorcio Antioquia y OCC. El selector de archivos de Windows se reemplazó en la pestaña por un archivo de prueba que dispara el mismo `change`.
- **T19, la demo de la spec** de punta a punta contra la API (abajo, «Criterios de finalización»), los casos límite que faltaban y la medición con 500 solicitudes.
- **Limpieza acotada:** solo lo PRUEBA-036, en cada tarea y al final: 0 solicitudes, renglones, eventos, compras, enlaces, recepciones, adjuntos de solicitud, usuarios, sesiones y obras de prueba; ningún archivo huérfano en `media`; los objetos reales de R2 (compartido con producción) borrados con un DELETE firmado por clave y releídos (404): 3 en la T11, 5 en la T13, 5 al cerrar. Scripts temporales borrados.

**Producción:** sin tocar. La 036 sube con la T23 de la 033 (migraciones 0031 a 0035 en orden, antes de la imagen), cuando el usuario lo pida.

## Arreglos que salieron de las demos

- **T14:** una devuelta mostraba «Devuelta» y «Devuelta: corrígela» a la vez; «1 abiertas» → «1 abierta».
- **T15:** el mensaje largo de cada falta deformaba la fila de los renglones; junto al campo, el texto corto («Mayor que cero.»), y el largo sigue saliendo del servidor.
- **T16:** los adjuntos de una solicitud mostraban cifras, columna y campo de vencimiento (los soportes no vencen); «(renglones 1)» → «(renglón 1)»; faltaba el soporte usado en «Lo que ha llegado».
- **T17:** el tope de la cantidad aprobada se decía con punto («120.5») → «120,5».
- **T8 (prueba, no código):** el Encargado de OCC aprobando una solicitud **de una obra** dio 404 y no 403: es lo acordado (lo ajeno no existe); el caso bueno es la de OCC, que da 403.

## RF por RF

### Los módulos y quién los ve

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | T14: Solicitudes de compra en la obra, OCC y Geolab en lugar de «en construcción» (`paginas-de-empresa.tsx`); vistas en Chrome las tres. | Cumple |
| RF-2 | T7 en vivo: residente y almacenista en su obra, laboratorista en Geolab, Encargado en OCC, gerencia en todas; los demás lugares → 403. T14 en Chrome: el Encargado ve solo la de OCC. | Cumple |
| RF-3 | T12 en vivo (filtros por lugar, estado, urgencia, fechas y texto); T17 en Chrome (Para = OCC). Regla «036/RF-3, RF-26, RF-27». | Cumple |
| RF-4 | T12 en vivo: la auxiliar lista la bandeja (200); T17 en Chrome: abre una solicitud sin ningún botón. | Cumple |
| RF-5 | Regla «036/RF-5, RF-11, RF-13 a RF-16, RF-20» (solo gerencia aprueba, rechaza, devuelve y compra; ni el Encargado ni la auxiliar). T8/T9 en vivo: 403 al residente, al Encargado y a la auxiliar. | Cumple |
| RF-6 | Por construcción: Solicitudes de pago es otra página del menú (`solicitudes-pago`) y sigue «en construcción»; la 036 no la toca. | Cumple |

### Pedir una compra

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-7 | T7 en vivo (lugar sin elegir, renglones con material del catálogo, opcionales); T15 en Chrome (formulario con catálogo, para cuándo, urgencia, para qué, proveedor, valor y cotización). | Cumple |
| RF-8 | Regla «036/RF-8» (SC-0001); T6: números seguidos; T7: enviada con su evento. | Cumple |
| RF-9 | Reglas «036/RF-7 a RF-10» y «036/RF-9, RF-10»; T7: 422 con todas las faltas; T15 en Chrome: cada falta junto a su campo. | Cumple |
| RF-10 | Las mismas reglas (ayer no; hoy sí); T7: fecha pasada → 422; el formulario no deja elegir antes de hoy. | Cumple |
| RF-11 | Regla de pasos (solo quien la pidió, solo enviada o devuelta); T8 en vivo: otro residente 403, aprobada 409; T16 en Chrome: el almacenista corrige su devuelta y la residente cancela con motivo. | Cumple |

### Aprobar, rechazar o devolver

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-12 | Regla «036/RF-12, RF-24, RF-25» (orden y resumen); T12 en vivo; T17 en Chrome: «Esperan aprobación 3», la urgente primero. | Cumple |
| RF-13 | Regla «036/RF-13» (bajar, quitar con 0, no subir, todo en 0 no); T8 en vivo (evento antes/después); T17 en Chrome: 130 bloquea, 100 → «de 120,5 a 100». | Cumple |
| RF-14 | T8 en vivo (sin motivo 422; rechazada no se reabre, 409); T17 en Chrome: SC-0028 rechazada, sin botones. | Cumple |
| RF-15 | T8 en vivo (devuelta; quien pidió la corrige y vuelve a enviada); T16/T17 en Chrome: el motivo arriba del detalle. | Cumple |

### Registrar la compra

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-16 | T9 en vivo; T17 en Chrome: compra del acero por $ 2.450.000 con FE-8812. | Cumple |
| RF-17 | T11 en vivo (cotización, factura, foto; tipo real, tope, anular solo gerencia); T15 y T17 en Chrome (cotización desde el formulario, factura al registrar). | Cumple |
| RF-18 | Regla «036/RF-16, RF-18, RF-19» (0 y centavos); T9 en vivo: 422. | Cumple |
| RF-19 | Las reglas de compra y de estado; T9 en vivo: dos compras con dos proveedores → comprada; T17 en Chrome: la primera compra deja la solicitud aprobada. | Cumple |

### Recibir

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-20 | Regla «036/RF-20»; T10 en vivo; T16 en Chrome: 18 de 30 con nota y la foto de soporte. | Cumple |
| RF-21 | Regla «036/RF-19, RF-21»; T10 en vivo: recibida en parte y luego recibida; T19: lo mismo en la demo. | Cumple |
| RF-22 | T10 en vivo: `almacen_movimientos` igual antes y después (20 → 20). Por construcción: `recibir` no escribe en el Almacén. | Cumple |

### Seguir las solicitudes

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-23 | T8 a T10 en vivo (eventos con quién, cuándo y motivo); T16 en Chrome: la historia en palabras, compras, recibos y adjuntos. | Cumple |
| RF-24 | Regla de orden; T14 en Chrome: abiertas (urgente primero) y luego cerradas. | Cumple |
| RF-25 | Regla de marcas («se vence al día siguiente»); T14 en Chrome: «Vencida» y «Devuelta: corrígela». | Cumple |
| RF-26 | Regla «036/RF-3, RF-26, RF-27» (número, renglones, proveedor, quien pidió, sin tildes); T12 en vivo («camara» → «Cámara»); T14 en Chrome («sc28»). | Cumple |
| RF-27 | Regla `veElGasto`; T12 en vivo (sin anuladas; auxiliar y residente 403); T18 en Chrome: $ 915.000 en 2 compras, la anulada no cuenta. | Cumple |

### Reglas transversales

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-28 | T7 a T12 en vivo: el lugar se revisa en el servidor en cada ruta (403 en la lista ajena, 404 en la solicitud ajena). | Cumple |
| RF-29 | T8/T11 en vivo: la solicitud y sus adjuntos ajenos → 404, también por dirección. | Cumple |
| RF-30 | Por construcción: no hay rutas `DELETE` en `solicitudes-compra` ni en `compras` (revisado), ni `on delete cascade`; T9: la compra anulada se queda, marcada; T11: el adjunto anulado se queda. | Cumple |
| RF-31 | Regla «036/RF-31» y «036/RF-17, RF-31»; T13: 20 respuestas crudas al almacenista sin valores ni clases con precio; T14 a T16 en Chrome: sin columna de valor, sin campo y sin esas clases. | Cumple |

## Requisitos no funcionales

| Requisito | Qué lo cubre | Resultado |
| --- | --- | --- |
| La bandeja con 500 solicitudes en menos de 2 s | T19: 511 solicitudes en la base; bandeja de Compras 940, 537 y 533 ms; lista de la obra 760, 677 y 684 ms (dev server local contra Neon). | Cumple |
| Todo en español; pesos con separador de miles | Por construcción (`enPesos`, «$ 2.450.000»); visto en Chrome. | Cumple |
| Dos pasos a la vez no se pisan | T8 en vivo: rechazar y cancelar a la vez con la misma versión → 200 y 409, un solo evento. | Cumple |

## Casos límite

| Caso | Qué lo cubre | Resultado |
| --- | --- | --- |
| Residente que cambia de obra | Por construcción: la solicitud es del lugar (`obra_id`), no de la persona; el alcance es el de la obra de quien consulta. | Cumple |
| Persona retirada o desactivada | T19: la solicitud de una persona desactivada sigue en la bandeja con su nombre y gerencia la rechaza. | Cumple |
| Obra inactiva | T7: no deja crear (409) y la lista dice `sePuedePedir` falso; T14: el aviso en pantalla. | Cumple |
| Material del catálogo dado de baja | Por construcción: el renglón copia descripción y unidad; el material solo se revisa al pedir o corregir. | Cumple |
| Llega más de lo pedido | Regla «036/RF-19, RF-21» (de más cuenta como completo); T19: 6 de 5 → recibida, el detalle dice 6; T16: la etiqueta «N de más». | Cumple |
| Pruebas en dev con R2 compartido | Todo lo de prueba con PRUEBA-036 y limpieza acotada, objeto por objeto (arriba). | Cumple |

## Criterios de finalización

La demo de la spec, corrida el 2026-10-29 (T19) contra dev:
- una residente PRUEBA-036 pide en su obra 2 renglones urgentes con una cotización (SC-0034) y la ve enviada;
- gerencia la ve de primera en Compras, la devuelve («Diga la marca del cemento»); la residente la corrige y la reenvía; gerencia la aprueba bajando la varilla de 40 a 30;
- gerencia registra la compra con proveedor, valor y factura; la residente la ve comprada con el valor y sus dos soportes; el almacenista, sin valores, sin cotización y sin factura;
- el almacenista recibe el cemento completo y 20 de 30 varillas (recibida en parte) y luego el resto (recibida);
- el Encargado de OCC no ve la de la obra (404) ni aprueba una de OCC (403); el operador no entra al módulo (403);
- limpieza acotada de lo PRUEBA-036.

Cada paso de pantalla se vio antes en Chrome, uno por uno, en las T14 a T18.

## Pendiente y decisiones para el usuario

- **Dos escrituras por paso.** Cada paso toma primero la versión (y el estado) y después escribe la historia, las cantidades, la compra o lo recibido. Si la conexión se cae justo entre las dos, la solicitud quedaría con el estado nuevo sin su complemento. Es el mismo patrón de la ficha (035); no se probó ese corte.
- **Adjuntos después de guardar.** Los del formulario y la factura de la compra se suben cuando la solicitud o la compra ya quedaron; si uno falla, lo hecho queda y el aviso dice qué archivo no subió.
- **Decisiones de detalle** (cambiar cualquiera es poco): «para qué» no es obligatorio (RF-9 no lo pide); la fecha de compra futura no se rechaza (RF-16 no lo pide); el servidor le acepta al almacenista un valor estimado aunque el formulario no se lo muestre ni él lo vea después.
- **Numeración:** en dev la serie ya va por SC-0035 por las pruebas; en producción empieza en SC-0001.
- **Carpeta de documentos** (`CarpetaDeDocumentos`): ganó título, `sinPrecio` y ocultar vencimientos en una solicitud; en Documentos (034) y en la ficha de RR. HH. (035) los valores por defecto dejan todo igual, pero no se volvió a mirar en Chrome. La ruta de Documentos de OCC sí se volvió a probar en vivo (T11).
- **Producción:** con la T23, las migraciones **0031 a 0035** en orden antes de la imagen nueva.
