# Validación — Spec 037, Tesorería: solicitudes de pago, pagos y cortes

> Fecha: 2026-10-29 · Tarea T20

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «037/», 10 pruebas, líneas 12749 a 12986);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **633 verificaciones correctas** (10 pruebas de la 037) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-29, al cerrar la T19 y otra vez en la T20.

**Desarrollo** (`neondb`; migración `0036_purple_khan` aplicada **solo aquí**):
- **T6:** la migración (enum `estado_solicitud_pago`, tablas `solicitudes_pago`, `solicitud_pago_eventos` y `pagos`, quinto dueño de `documentos_del_grupo`), revisada antes de aplicarla: sin `DELETE`, `UPDATE`, `DROP TABLE` ni `cascade`.
- **T7 a T13:** cada ruta contra el dev server con sesiones temporales en `sesiones_web` y personas PRUEBA-037, mirando la **respuesta cruda**. La T13 recorrió las rutas con la sesión del almacenista: 18 respuestas sin valores ni comprobantes de las solicitudes ajenas.
- **T14 a T19:** en Chrome, en `127.0.0.1:8081` con sesiones temporales —aparte de la sesión del usuario en `localhost`—, con datos de demo PRUEBA-037 en Consorcio Antioquia y OCC. El selector de archivos de Windows se reemplazó en la pestaña por un PDF de prueba que dispara el mismo `change`.
- **T20, la demo de la spec** de punta a punta contra la API (abajo, «Criterios de finalización»), los casos límite y la medición con 500 solicitudes.
- **Limpieza acotada:** solo lo PRUEBA-037. Al final: 0 solicitudes de pago y de compra, eventos, pagos, cortes, documentos, usuarios, sesiones y obras PRUEBA-037; 0 `media` huérfana; los 6 objetos reales de R2 (compartido con producción) borrados con un DELETE firmado por clave y releídos (204 y luego 404). Scripts temporales borrados y pestaña de Chrome cerrada.

**Producción:** sin tocar. La 037 sube con la T23 de la 033 (migraciones 0031 a 0036 en orden, antes de la imagen), cuando el usuario lo pida.

## Arreglos que salieron de las demos

- **T10 (cambio frente al plan):** la sentencia única «insertar si cabe» no es segura en *read committed*; el pago de una compra corre en una transacción serializable con un reintento (anotado en `plan.md`).
- **T14 a T16:** «Devuelta» repetida, «1 abiertas», mensajes largos que deformaban las filas, vencimientos en los adjuntos de una solicitud, cifras con punto.
- **T17:** la gerencia veía «Devuelta: corrígela», que le habla a quien pidió → «Devuelta» para quien no puede corregir, **también en el detalle de Compras (036)**; fecha cruda en «Anular un pago»; Medio desalineado con Referencia.
- **T18:** «Abrir» desde Pagos ponía `?solicitud=` sin abrir nada, porque `useParametroDeDireccion` es estado de cada componente; la solicitud abierta la lleva ahora la pantalla de arriba. El mismo fallo dejaba en **Compras (036)** las pestañas Solicitudes/Gasto encima del detalle: arreglado igual.
- **T19:** «Ver» del consolidado no elegía la fila (clave doble). El script de limpieza borraba cortes por una columna que no existe (`creado_por`) y un `.catch` lo callaba → `registrado_por`.

## RF por RF

### Los módulos y quién los ve

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | T14: Solicitudes de pago en la obra, OCC y Geolab en lugar de «en construcción»; vistas en Chrome. | Cumple |
| RF-2 | T7 en vivo: residente y almacenista en su obra, laboratorista en Geolab, Encargado en OCC, gerencia en todas; operador 403; T14 en Chrome. | Cumple |
| RF-3 | T17 a T19 en Chrome: Tesorería con sus cuatro pestañas; filtros Para, Estado, fechas, «Solo urgentes» y búsqueda. Regla «037/RF-10, RF-21, RF-22». | Cumple |
| RF-4 | T17 a T19 en Chrome: la auxiliar ve Solicitudes de pago, Compras por pagar y Cortes sin botones, sin la pestaña Pagos. T20: bandeja 200, `pasos` vacío. | Cumple |
| RF-5 | Regla «037/RF-5, RF-9, RF-11, RF-12, RF-16»; T20: la auxiliar rechaza → 403, registra un corte → 403; el Encargado aprueba → 403. | Cumple |
| RF-5a | Regla «037/RF-5a, RF-23»; T13: 18 respuestas al almacenista limpias; T16 en Chrome: en la ajena, sin cifras, pagos ni adjuntos, y la historia sin montos. | Cumple |

### Pedir un pago

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-6 | Regla «037/RF-6, RF-8»; T7 en vivo; T15 en Chrome (formulario con cuenta de cobro adjunta). | Cumple |
| RF-7 | Regla «037/RF-7»; T20: SP-0027 enviada con quién y cuándo. | Cumple |
| RF-8 | Regla «037/RF-6, RF-8»; T7: 422 con todas las faltas; T15 en Chrome: cada falta junto a su campo. | Cumple |
| RF-9 | Regla de pasos; T8 en vivo (solo quien pidió; aprobada 409); T16 en Chrome: el almacenista corrige su devuelta; la residente cancela con motivo. | Cumple |

### Aprobar, rechazar o devolver

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-10 | Regla «037/RF-10, RF-21, RF-22»; T17 en Chrome: cifras 3 / 1 (faltan $ 2.500.000) / 1; T20: la urgente nueva de primera. | Cumple |
| RF-11 | Regla «037/RF-11»; T17 en Chrome: $ 3.000.000 bloquea, aprobada por $ 2.500.000; T20: por $ 3.000.000 de $ 3.200.000. | Cumple |
| RF-12 | T8 en vivo (sin motivo 422; rechazada no se reabre); T17 en Chrome: SP-0025 devuelta con motivo. | Cumple |

### Registrar el pago

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-13 | Regla «037/RF-13, RF-15»; T17 en Chrome: fecha, valor, medio, referencia y comprobante PDF. | Cumple |
| RF-14 | Regla «037/RF-14, RF-16, RF-19»; T17 en Chrome y T20: anticipo → Pagada en parte; saldo → Pagada. | Cumple |
| RF-15 | T9 en vivo y T20: pago de más → 422 «Ese pago pasa de lo que falta: faltan $ 1.800.000.». | Cumple |
| RF-16 | T9 en vivo (anulado otra vez 409); T17 en Chrome: el saldo anulado queda tachado con el motivo y vuelve a Pagada en parte. | Cumple |

### Compras por pagar

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-17 | T10 en vivo; T18 en Chrome: SC-0544 con lo que falta; T20: SC-0545 sale en la lista. | Cumple |
| RF-18 | T10 en vivo; T18 en Chrome: anticipo de $ 500.000 con comprobante; T20: pagada del todo, sale de la lista. | Cumple |
| RF-19 | Regla «037/RF-14, RF-16, RF-19»; T18 en Chrome: «Pagada en parte · Pagado $ 500.000»; T20: pagado 980.000 de 980.000. | Cumple |

### Seguir las solicitudes

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-20 | Regla «037/RF-9, RF-20»; T16/T17 en Chrome: historia en palabras, pagos con comprobante, fecha y hora. | Cumple |
| RF-21 | Regla de orden y marcas; T14 en Chrome: abiertas arriba, «Vencida» y «Devuelta: corrígela». | Cumple |
| RF-22 | Regla de búsqueda; T14 en Chrome: «sp22» deja solo SP-0022. | Cumple |

### Pagos y cortes

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-23 | Regla «037/RF-5a, RF-23»; T12 en vivo; T18 en Chrome: $ 5.400.000 en 5 pagos, sin el anulado; la auxiliar 403. | Cumple |
| RF-24 | T19 en Chrome: elegir, último corte con diferencia, historial, registrar y anular con motivo; la auxiliar sin formulario ni Anular. | Cumple |
| RF-25 | T19 en Chrome: consolidado con «Desactualizado» y total; se actualiza al registrar y anular. | Cumple |
| RF-26 | T20: un corte de hoy cambia la tarjeta de Proyectos en Inicio ({120.000.000, 10-sep} → {88.000.000, hoy}) y anulado vuelve. Por construcción: `empresas.ts` no se tocó. | Cumple |

### Reglas transversales

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-27 | T7 a T12 en vivo: permiso y lugar en el servidor en cada ruta. | Cumple |
| RF-28 | T8/T11 en vivo y T20: la de la obra al Encargado 404; al operador 403, también por dirección. | Cumple |
| RF-29 | Por construcción: ninguna ruta `DELETE` en la 037 (revisado) ni `cascade` en la migración; pagos, cortes y adjuntos se anulan y se quedan. | Cumple |
| RF-30 | T8 en vivo y T20: aprobar y cancelar a la vez con la misma versión → 200 y 409, un solo evento. T10: pagos de una compra a la vez, ver «Pendiente». | Cumple |

## Requisitos no funcionales

| Requisito | Qué lo cubre | Resultado |
| --- | --- | --- |
| Bandeja con 500 solicitudes en menos de 2 s | T20: 500 solicitudes de pago; bandeja de Tesorería 816, 515 y 506 ms; lista de la obra 651, 649 y 649 ms (dev server local contra Neon). | Cumple |
| Todo en español; pesos con separador de miles | Por construcción (`enPesos`); visto en Chrome. | Cumple |
| Dos pasos a la vez no se pisan | RF-30. | Cumple |

## Casos límite

| Caso | Qué lo cubre | Resultado |
| --- | --- | --- |
| Residente que cambia de obra | Por construcción: la solicitud es del lugar (`obra_id`); el alcance es el de la obra de quien consulta. | Cumple |
| Persona retirada | T20: con la persona desactivada, su solicitud sigue con su nombre y gerencia la aprueba (200). | Cumple |
| Obra inactiva | T7 y T20: pedir → 409 «La obra no está activa…»; la abierta se sigue pagando (201, pagada). Con una obra PRUEBA, no una real. | Cumple |
| Compra anulada después de pagada | T20: el pago sigue y sale en Pagos con «Compra anulada»; otro pago → 409. | Cumple |
| Pago distinto de la factura | Por construcción (D3): se paga lo que se paga y lo que falta queda por pagar; no hay «cerrar con saldo». | Cumple |
| Pruebas en dev con R2 compartido | Todo con PRUEBA-037 y limpieza acotada objeto por objeto (arriba). | Cumple |

## Criterios de finalización

La demo de la spec, corrida el 2026-10-29 (T20) contra dev:
- un residente PRUEBA-037 pide un pago urgente a un transportador con la cuenta de cobro adjunta → SP-0027, Enviada;
- gerencia la ve de primera en Tesorería y la devuelve; el residente la corrige y la reenvía; gerencia la aprueba por $ 3.000.000 de $ 3.200.000;
- gerencia registra un anticipo de $ 1.200.000 con comprobante (Pagada en parte); uno de más → 422 con lo que falta; el saldo (Pagada);
- la compra SC-0545 sale en Compras por pagar; gerencia la paga, sale de la lista y su solicitud dice pagado 980.000 de 980.000;
- gerencia registra un corte de la obra: sale en el consolidado y en la tarjeta de Inicio; lo anula y la tarjeta vuelve;
- el Encargado de OCC: la de la obra 404, aprobar la de OCC 403; la auxiliar consulta sin pasos; el operador 403;
- limpieza acotada de lo PRUEBA-037.

Cada paso de pantalla se vio antes en Chrome, uno por uno, en las T14 a T19.

## Pendiente y decisiones para el usuario

- **El reintento de los pagos de compra no se vio funcionar.** Con 6 y 12 pagos a la vez directos a la base entraron exactamente los que cabían, pero Postgres no abortó ninguna transacción, así que el camino del reintento (`conReintentoSiChoca`) no se ejecutó. Por la API, dos a la vez dieron 201 y 422.
- **Dos escrituras por paso.** Cada paso toma primero la versión y después escribe el pago y el evento. Si la conexión se cae justo entre las dos, la solicitud quedaría con el estado nuevo sin su complemento. Es el mismo patrón de Compras (036); no se probó ese corte.
- **Comprobante antes del pago.** El comprobante se sube y luego se registra el pago que lo cita; si el pago falla, el comprobante queda en los adjuntos de la solicitud.
- **Cambios en la 036 y la 033:** en Compras, la columna «Pago», «Devuelta» para quien no corrige y las pestañas que ya no quedan sobre el detalle. En `pantalla-finanzas.tsx`, el contenido sale como `InformacionFinanciera`, y quien no registra ni anula no ve esos botones. Todo esto se vio en Chrome.
- **`CarpetaDeDocumentos`** ganó `titulo` y `sinPrecio`; en Documentos (034) y en la ficha (035) los valores por defecto dejan todo igual, pero no se volvió a mirar ahí en Chrome.
- **Numeración:** en dev la serie ya va por SP-0027 y SC-0546 por las pruebas; en producción empieza en SP-0001.
- **Producción:** con la T23, las migraciones **0031 a 0036** en orden antes de la imagen nueva.
