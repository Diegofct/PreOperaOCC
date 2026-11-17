# Plan técnico — Spec 047

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

> Estado: **Borrador, espera la aprobación de Diego** · Fecha: 2026-11-17.

## La idea en una línea

La requisición de pagos de OCC es **una cabecera con líneas**, y no cabe en `solicitudes_pago` (una fila = un beneficiario y un valor, con un concepto de lista cerrada y un «para qué» obligatorio). Va en **tablas propias** (cabecera, líneas, historia, importaciones), toma su número de la misma secuencia `requisicion_numero` de la 046 y paga cada línea con la tabla `pagos` de siempre, que gana un tercer dueño posible. Así reutiliza las reglas del pago de la 037 (`faltasDelPago`, `estadoTrasPagos`, anular) sin mezclar dos formas de requisición en una tabla.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/requisicion-occ.ts` (nuevo) | Reglas puras: estados y su nombre, `esViernes`, faltas de la cabecera (viernes, pasado) y de cada línea, abierta o cerrada, quién actúa en cada estado (`porQueNoPuede`), estado tras responder, tras pagar y tras anular un pago (reusa `estadoTrasPagos` y `pagoDeLaCompra` de `pagos.ts`), totales pedido y a pagar, vencida, faltan por responder, orden de la bandeja | RF-4 a RF-14, RF-19 a RF-51, RF-74, RF-77, RF-80, RF-81 |
| `src/shared/rules/requisicion-occ-ia.ts` (nuevo) | Instrucciones y texto citado para la IA; normalizar la lectura: sin filas vacías, de título ni de total; sin imputar ni respuestas; pesos redondeados y marcados; lo ilegible vacío y marcado; lectura cortada = sin propuesta | RF-60, RF-63 a RF-67, RF-78, D11 |
| `src/shared/rules/permisos.ts` | Sin módulo nuevo: crear y armar = `solicitudes·escribir` en OCC (Encargado de OCC, Gerencia); autorizar, devolver y cancelar = `aprobaciones` (Administradora, Gerencia); pagar = `tesoreria` (Auxiliar, Administradora, Gerencia). Se comprueba y, si falta, se ajusta la fila | RF-4, RF-26, RF-44, RF-74 |
| `src/db/servidor/esquema.ts` | Tablas y columnas de «Modelo de datos» | RF-2, RF-5, RF-10, RF-15, RF-20, RF-37, RF-39, RF-68 |
| `src/features/requisiciones/servidor/requisicion-occ.ts` (nuevo) | Crear (con el choque de viernes como 409), agregar, cambiar y quitar líneas (cambiar = reemplazar), adjuntar RUT y cuenta, enviar, devolver, cancelar, responder líneas, detalle y lista; cada cambio en un `batch` con su evento y la versión en la condición del `update` | RF-1 a RF-42, RF-75, RF-76, RF-82 |
| `src/features/requisiciones/servidor/importar-occ.ts` y `con-ia-occ.ts` (nuevos) | Subir el Excel, guardarlo en el almacén privado y leerlo por detrás con `llamarConEsquema`, como `almacen-obra/servidor/importaciones.ts` y `con-ia.ts` (202, `en_curso`/`lista`/`fallida`, vencimiento); confirmar agrega las líneas revisadas | RF-59 a RF-70, RF-78, RF-79 |
| `src/features/requisiciones/exportar-occ.ts` (nuevo, puro) y `servidor/excel-occ.ts` (nuevo) | Qué dice cada celda (puro) y el libro con `exceljs`, siguiendo `almacen-obra/exportar.ts` + `servidor/excel.ts` | RF-52 a RF-58 |
| `src/features/tesoreria/servidor/pagos.ts` | `registrarPagoDeLineaOcc` (tope = valor de la línea menos lo pagado, en la misma sentencia, como las compras); `anularPago` recalcula también la línea y la requisición; la bandeja de Tesorería suma las líneas OCC por pagar | RF-43 a RF-48, RF-80, RF-81 |
| `src/features/requisiciones/servidor/requisiciones.ts` | La lista de OCC junta también las de pagos OCC (RF-3); la creación de la 046 deja de aceptar OCC (RF-1); la bandeja de Elemental suma las de pagos OCC En autorización con la marca «OCC» (RF-49, RF-50) | RF-1, RF-3, RF-49 a RF-51, RF-71 |
| `src/app/api/panel/requisiciones-occ/…` (nuevas rutas) | Ver «Contrato de API» | todas las de API |
| `src/features/panel/requisiciones-occ.ts` (nuevo) | Tipos del contrato que comparten panel y servidor | — |
| `src/features/requisiciones/occ/*.tsx` (nuevos) | Nueva requisición (viernes), detalle con la tabla de líneas, ventana de línea (con adjuntos), autorizar línea por línea con motivo, importar y revisar lo propuesto, historia, descargar | RF-5 a RF-42, RF-52, RF-59 a RF-70 |
| `src/features/requisiciones/pantalla-requisiciones.tsx` | En OCC, «Nueva requisición» abre la de pagos OCC; la lista muestra las tres clases | RF-1, RF-3 |
| `src/features/tesoreria/pantalla-pagos.tsx` / `formulario-de-pago.tsx` | Sección «OCC por viernes» con las líneas autorizadas por pagar; el mismo formulario de pago | RF-43 a RF-47 |
| `scripts/verificar-reglas.ts` | Casos de las dos reglas nuevas y del Excel de ejemplo | ver «Verificación» |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. El celular no ve requisiciones.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `estado_requisicion_occ` (enum): `borrador`, `en_autorizacion`, `devuelta`, `autorizada`, `no_autorizada`, `pagada_en_parte`, `pagada`, `cancelada`.
  - `requisiciones_occ`: `id`, `numero_requisicion` (de `nextval('requisicion_numero')`, único), `viernes` (date, `check` día de la semana = 5), `estado`, `elaborada_por`, `creada_en`, `enviada_en`, `ronda` (cuántas veces se envió), `version`, `actualizada_en`. **Índice único parcial `(viernes)` donde `estado not in ('pagada','no_autorizada','cancelada')`**: es lo que hace RF-8 y RF-82 sin transacción.
  - `requisicion_occ_lineas`: `id`, `requisicion_id`, `orden`, `fecha_solicitud`, `beneficiario`, `concepto`, `especificaciones`, `proveedor`, `valor` (bigint, > 0), `observaciones`, `rut_media_id`, `cuenta_media_id` (opcionales), `respuesta` (`autorizada`/`no_autorizada`, nula), `motivo_respuesta`, `respondida_por`, `respondida_en`, `quitada_en`/`quitada_por`, `reemplazada_en`/`reemplazada_por_linea`, `creada_por`, `creada_en`. `check`: NO autorizada exige motivo (RF-77); quitada y reemplazada no van juntas. Las vigentes son las que no tienen `quitada_en` ni `reemplazada_en`.
  - `requisicion_occ_eventos`: historia (`paso`, `motivo`, `cambios` jsonb, `por`, `en`), como `solicitud_pago_eventos`. Al devolver guarda en `cambios` las respuestas que tenían las líneas (RF-35).
  - `requisicion_occ_importaciones`: `id`, `requisicion_id` (nula si crea una nueva), `media_id`, `estado` (`en_curso`/`lista`/`fallida`/`confirmada`/`descartada`), `propuesta` jsonb, `motivo`, `vence_lectura_en`, `creada_por`, `creada_en` (como `almacen_importaciones`).
  - `pagos`: columna nueva `requisicion_occ_linea_id`; `ck_pago_dueno` pasa a «uno de los tres».
  - `dueno_media`: valor nuevo `requisicion_occ` (el Excel importado, el RUT y la cuenta).
  - ~~El comprobante de un pago de línea va en `documentos_del_grupo` con `empresa_id = 'occ'`, sin columna nueva ahí.~~ **Cambiado al implementar (T16, 2026-11-17):** la Auxiliar, que paga, no entra a OCC, y Documentos de una empresa no tiene la clase «Comprobante de pago». El comprobante va como archivo de la requisición (dueño `requisicion_occ`, como el RUT y la cuenta) y el pago lo apunta con `pagos.comprobante_media_id` (migración 0049, solo `neondb`).
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0048_*.sql`. Se aplica **solo en `neondb`** (desarrollo); producción la recibe en el despliegue de la tanda, con 0042–0047.
- **Compatibilidad**: los teléfonos no cambian. Las RQ de OCC de la 046 y las SC/SP de OCC siguen en sus tablas, sin tocarse (RF-71, RF-72).

## Algoritmo / reglas

1. **Crear** (RF-5 a RF-8, RF-82): la regla valida el viernes; el servidor inserta; si el índice parcial choca, responde 409 con el id de la abierta.
2. **Cambiar una línea** (RF-19, RF-36, RF-37): un `batch` que inserta la línea nueva (mismo `orden`, adjuntos heredados si no vienen otros) y marca la vieja `reemplazada_en`, condicionado a la versión y a `estado in ('borrador','devuelta')`. **Quitar** marca `quitada_en` (RF-20).
3. **Enviar** (RF-21, RF-22): exige al menos una línea vigente y que todas pasen `faltasDeLaLinea`; pone las respuestas vigentes en nulo **solo en las líneas de esta ronda** (las respondidas antes quedaron en el evento de devolución) y sube `ronda`.
4. **Responder** (RF-26 a RF-33, RF-77): llegan varias respuestas con la versión; la regla rechaza a quien la elaboró y la NO autorizada sin motivo; si después de guardarlas no queda ninguna vigente sin respuesta, la regla da `autorizada` o `no_autorizada` (RF-29, RF-30).
5. **Pagar** (RF-44, RF-46, RF-47, RF-80, RF-81): `insert … select … where` que compara con lo ya pagado de la línea en la misma sentencia; después se recalcula el estado con la regla (todas las autorizadas pagadas = `pagada`; algo pagado = `pagada_en_parte`).
6. **Importar** (RF-59 a RF-70): el Excel pasa a texto citado con `libroConNombres` + el armado de `textoDelExcelParaImportar`; la IA devuelve las filas con su cita; la regla limpia y marca; la propuesta vive en la importación hasta que se confirma o vence a un día. Confirmar valida cada línea con `faltasDeLaLinea` (lo marcado vacío tiene que llenarse antes).

## Decisiones técnicas

- **Tablas propias** para la requisición de OCC → se descartó una cabecera que agrupe filas de `solicitudes_pago` porque cada fila exige concepto de lista cerrada, «para qué» y «para cuándo», y la lista y la bandeja de la 046 mostrarían cada línea como una requisición aparte.
- **Pagos en la misma tabla `pagos`**, con un tercer dueño → se descartó una tabla de pagos de OCC aparte porque Tesorería («Pagos» del rango, anular, comprobante) ya suma esa tabla, y la futura spec de Tesorería querría todo en un sitio.
- **«Una por viernes» con índice único parcial** → se descartó comprobarlo con una consulta previa, porque sin transacciones interactivas dos creaciones a la vez pasarían las dos (RF-82).
- **Cambiar una línea = reemplazarla, también en Borrador** → se descartó editar en el sitio mientras está en Borrador porque el principio 4 no deja sobrescribir y así hay una sola forma de cambiar, la misma de la 046 (RF-94).
- **RUT y cuenta como columnas de media en la línea** → se descartó `documentos_del_grupo` con un dueño nuevo porque son dos archivos fijos por línea, sin clase, vencimiento ni búsqueda; al reemplazar la línea se heredan.
- **IA sobre texto citado del Excel, como la 042** → se descartó leer el Excel con reglas fijas por columna porque Diego pidió IA (D7) y las planillas reales cambian de columnas; la cita deja comprobar cada valor contra su fila.
- **Permisos con los módulos que ya existen** → se descartó un módulo `requisicion_occ` porque quién crea, aprueba y paga es exactamente lo de `solicitudes`, `aprobaciones` y `tesoreria`.

## Impacto en la sincronización

Sin impacto en la sincronización: es solo panel.

## Contrato de API

Toda ruta abre con `requerirSesion`; el alcance es la empresa OCC (`alcance.ts`); la versión va en el cuerpo de todo lo que cambia y un choque responde **409** «Cambió mientras la tenía abierta» (RF-75). 403 sin permiso, 404 si no la ve (RF-73), 422 con las faltas por campo o por línea.

- `GET /api/panel/requisiciones-occ` — la lista de OCC (también entra en la lista de la 046, RF-3).
- `POST /api/panel/requisiciones-occ` `{ viernes }` → 201 `{ id, numero }`; **409** `{ existente: { id, numero, estado } }` (RF-8).
- `GET /api/panel/requisiciones-occ/[id]` — cabecera, líneas vigentes, totales, historia, qué puede hacer quien mira.
- `POST …/[id]/lineas` · `PUT …/[id]/lineas/[lineaId]` · `POST …/[id]/lineas/[lineaId]/quitar` — `{ version, … }`.
- `POST …/[id]/lineas/[lineaId]/adjunto?clase=rut|cuenta` — multipart; mismo tope y tipos que los adjuntos de la 037.
- `POST …/[id]/paso` `{ version, accion: 'enviar'|'devolver'|'cancelar', motivo? }`.
- `POST …/[id]/respuestas` `{ version, respuestas: [{ lineaId, respuesta, motivo? }] }`.
- `POST …/[id]/lineas/[lineaId]/pagos` `{ fecha, valor, medio, referencia?, comprobante? }`; anular con la ruta que ya existe `POST /api/panel/pagos/[id]/anular`.
- `GET …/[id]/excel` — el `.xlsx` (RF-52).
- `POST /api/panel/requisiciones-occ/importaciones` multipart `{ archivo, requisicionId? }` → **202** `{ importacionId }`; 422 si no es Excel (RF-79). `GET …/importaciones/[id]` (estado y propuesta), `POST …/importaciones/[id]/confirmar` `{ version, viernes?, lineas }`, `POST …/importaciones/[id]/descartar`.
- `GET /api/panel/requisiciones/bandeja` y la bandeja de Tesorería: incluyen las de OCC (RF-43, RF-49).

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: viernes válido y no viernes, viernes pasado con la fecha de Colombia; faltas de la línea (cada campo, valor 0, fecha futura); RF-12 con el número de línea; transiciones permitidas y no permitidas por estado y por rol; quien la elaboró no responde (RF-32); NO autorizada sin motivo (RF-77); cierre en autorizada o no_autorizada; totales pedido y a pagar con el ejemplo del Excel (14 líneas, 2 NO autorizadas); estados de pago con pagos parciales y anulados; vencida; la normalización de la IA con una lectura simulada del Excel de ejemplo (fila de títulos, total, filas vacías con `false`, centavos 684.829,21 → 684.829 marcado, columna «Autorizado» ignorada).
- **Demo manual**: la de «Criterios de finalización» de la spec, en PRUEBA-047 (empresa OCC de `neondb`), con una cuenta de Encargado de OCC, una de Administradora y una de Auxiliar; más: crear dos veces el mismo viernes; devolver y reenviar; anular un pago de una línea pagada.
- **Comprobaciones extra**: la IA lee la llave de Anthropic solo desde el servidor, como la 042: tras la tarea de importación, `npx expo export --platform web` y `grep` de `DATABASE_URL` y de la llave sobre `dist/client`, vacío. Las tablas de líneas del panel, sumadas, caben en `MaxContentWidthPanel`.

## Riesgos

- **La tabla de líneas es ancha** (10 columnas en el Excel): se pasa del ancho del panel y el botón queda fuera. Se muestran N.º, beneficiario, concepto, especificaciones, valor, adjuntos, respuesta y acciones; fecha, proveedor y observaciones en el detalle de la línea. Se mide antes de dar la tarea por hecha.
- **La IA lee mal un valor**: cada valor va con su cita de fila y la persona confirma; nada entra sin confirmar (RF-62).
- **Memoria del servidor de desarrollo**, que ya se cayó leyendo Excel grandes: la planilla de OCC es pequeña (39 filas), pero se limita el archivo (20 MB y 200 filas, como la 042).
- **Migración 0048 en la base equivocada**: se aplica con el script de desarrollo y se anota que producción la espera con las demás.
- **Revertir**: las tablas son nuevas y la columna de `pagos` es nula; volver atrás es quitar las rutas del menú de OCC y que vuelva a pedirse con la RQ de la 046.
