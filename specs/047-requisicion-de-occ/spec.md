# Spec 047 — Requisición de pagos de OCC, con su formato, autorización línea por línea e importación con IA

> Estado: **Cumplida el 2026-11-17** (`validacion.md`, 82/82 RF, pantallas revisadas en el navegador) · **Aprobada por Diego el 2026-11-17** (entrevista D1–D7, dudas D8–D10 y clarificación D11–D12 del mismo día) · Fecha: 2026-11-17 · Tercera de la tanda 045–048 (plan del 2026-11-13). **Modifica la 046** (RF-87 y RF-88: la requisición de OCC deja de ser la genérica que va directo a la Administradora). Entrevista con Diego del 2026-11-17 (D1–D7). Formato de origen: `assets/Formato requisiciones pagos OCC.xlsx`, hoja REQUISICIONES. · **Modificada por la spec 049** (2026-11-18): el Excel de la requisición de OCC lleva Kontrola de autor y la línea «Generado con Kontrola · Grupo HS» en el pie de página de impresión, nunca en una celda — ver `specs/049-marca-kontrola-y-logos/spec.md`

## Contexto y objetivo

OCC no pide como una obra. Cada semana arma **una sola requisición de pagos** para el viernes de entrega: una planilla con una línea por cada cosa que hay que pagar —la soldadura de un tanque, los filtros de una volqueta, la estadía de alguien, la reposición de la caja menor—, con el beneficiario, el concepto, el equipo al que va (la placa), el proveedor y el valor. La Administradora o la Gerencia revisa la planilla y escribe, línea por línea, **«Autorizado»** o **«NO Autorizado»**, y lo autorizado se paga. Hoy eso se hace en Excel y por fuera del panel. Desde la 046, OCC pide con la requisición genérica de las obras, pero esa no sirve para la forma de trabajar de OCC: es una por gasto, se aprueba o se rechaza entera y no tiene beneficiario ni placa por línea. Esta spec le da a OCC su propio formato, el del Excel, dentro del panel: una requisición por viernes, autorizada línea por línea, que pasa a pago y se descarga en el mismo Excel. Además, la IA puede leer la planilla que OCC ya tiene hecha y armar las líneas, para no volver a teclearla.

## Usuarios / actores

- **Encargado de OCC** (panel web): arma la requisición de la semana, le agrega líneas a mano o las importa con IA, la envía, la corrige si se la devuelven y la descarga.
- **Administradora de Elemental** (panel web): autoriza o no autoriza cada línea, devuelve la requisición para corregir y la cancela. Anula pagos.
- **Gerencia** (panel web, rol `admin`): todo lo anterior. También puede armar la requisición de OCC.
- **Auxiliar Administrativa** (panel web): paga lo autorizado, línea por línea, en Tesorería. No autoriza.
- **Operador**, **Residente**, **Director de Obra**, **Director de Proyectos**, **Almacenista**, **Laboratorista** y **Encargado de planta**: sin cambios; no ven las requisiciones de OCC.

## Historias de usuario

- H1: Como Encargado de OCC quiero armar en el panel la requisición de pagos de la semana con el mismo formato del Excel, para dejar de mandarla por fuera.
- H2: Como Encargado de OCC quiero subir la planilla que ya tengo y que la IA arme las líneas, para no teclearla dos veces.
- H3: Como Administradora de Elemental quiero autorizar o no autorizar cada línea, porque casi siempre se aprueba la mayoría y se dejan por fuera unas pocas.
- H4: Como Auxiliar Administrativa quiero ver solo lo autorizado de cada viernes y pagarlo línea por línea.
- H5: Como Encargado de OCC quiero descargar la requisición en el formato de siempre, con lo autorizado y lo que no, para el archivo y para el banco.

## Requisitos funcionales (criterios de aceptación en EARS)

### La requisición de pagos de OCC (H1)

- RF-1: EL SISTEMA crea las requisiciones nuevas de OCC con el formato **Requisición de pagos OCC** de esta spec, en lugar de la requisición de compra o de pago de la 046.
- RF-2: EL SISTEMA da a cada requisición de pagos OCC un número del consecutivo RQ del grupo, el mismo de la 046 (RF-5 de la 046).
- RF-3: EL SISTEMA muestra la requisición de pagos OCC en Requisiciones de OCC, junto con las requisiciones RQ y las solicitudes SC y SP de OCC anteriores a esta spec.
- RF-4: EL SISTEMA deja crear una requisición de pagos OCC al Encargado de OCC y a la Gerencia.
- RF-5: EL SISTEMA guarda en la cabecera de la requisición la **fecha del viernes de entrega** y **quién la elaboró**, que es quien la creó.
- RF-6: SI la fecha de entrega no es un viernes, ENTONCES EL SISTEMA no guarda la requisición y lo dice junto a la fecha.
- RF-7: SI la fecha de entrega es anterior a hoy, contado con la fecha de Colombia, ENTONCES EL SISTEMA no guarda la requisición y lo dice junto a la fecha.
- RF-8: SI ya hay una requisición de pagos OCC abierta para ese mismo viernes, ENTONCES EL SISTEMA no crea otra y ofrece abrir la que ya existe (D6).
- RF-9: EL SISTEMA da por abierta una requisición de pagos OCC mientras no está Pagada, No autorizada ni Cancelada.
- RF-10: EL SISTEMA guarda en cada línea la **fecha de solicitud**, el **beneficiario**, el **concepto**, las **especificaciones** (por ejemplo, la placa del equipo), el **proveedor**, el **valor en pesos** y unas **observaciones**.
- RF-11: EL SISTEMA numera las líneas de una requisición 1, 2, 3… en el orden en que están.
- RF-12: SI una línea no tiene fecha de solicitud, beneficiario o concepto, o su valor no es mayor que cero, ENTONCES EL SISTEMA no guarda la requisición y dice qué línea y qué le falta.
- RF-13: SI la fecha de solicitud de una línea es posterior a hoy, contado con la fecha de Colombia, ENTONCES EL SISTEMA no guarda la requisición y dice qué línea.
- RF-14: EL SISTEMA guarda el valor de cada línea en pesos enteros, sin centavos, como los pagos de la 037 (D11).
- RF-15: EL SISTEMA deja adjuntar en cada línea, opcionales, el **RUT** y la **cuenta bancaria** del beneficiario (D5).
- RF-16: EL SISTEMA muestra en cada línea si tiene o no RUT y cuenta bancaria adjuntos.
- RF-17: EL SISTEMA no pide en las líneas de OCC un ítem de la planificación a imputar, ni de costo directo ni de costo indirecto (D1).
- RF-18: EL SISTEMA trata la reposición de caja menor como una línea más, con el valor que escribe quien la pide; no calcula lo gastado en la caja (D4).

### Armar y enviar (H1)

- RF-19: MIENTRAS una requisición de pagos OCC está en **Borrador**, EL SISTEMA deja a quien la elaboró, y a la Gerencia, agregar, cambiar y quitar líneas.
- RF-20: CUANDO se quita una línea de un Borrador, EL SISTEMA la marca como quitada, con quién y cuándo, y no la muestra entre las vigentes; no la borra (constitución, principio 4).
- RF-21: CUANDO quien la elaboró envía la requisición, EL SISTEMA la deja **En autorización**, en el paso de la Administradora de Elemental.
- RF-22: SI se envía una requisición sin ninguna línea, ENTONCES EL SISTEMA no la envía y lo dice.
- RF-23: MIENTRAS una requisición está En autorización o después, EL SISTEMA no deja agregarle líneas: lo que llegue después va a la del viernes siguiente (D6).
- RF-24: MIENTRAS una requisición está en Borrador, En autorización o Devuelta, EL SISTEMA deja a quien la elaboró cancelarla con un motivo.
- RF-25: MIENTRAS una requisición no tiene ninguna línea pagada y no está Cancelada, EL SISTEMA deja cancelarla con un motivo a la Administradora de Elemental y a la Gerencia.

### Autorizar línea por línea (H3)

- RF-26: MIENTRAS una requisición está En autorización, EL SISTEMA deja a la Administradora de Elemental y a la Gerencia marcar cada línea **Autorizada** o **NO autorizada** (D2, D3).
- RF-27: CUANDO alguien marca una línea NO autorizada, EL SISTEMA pide el motivo y lo guarda en la línea (D10).
- RF-77: SI se marca una línea NO autorizada sin motivo, ENTONCES EL SISTEMA no guarda esa respuesta y lo dice junto a la línea (D10).
- RF-28: EL SISTEMA deja guardar las respuestas de unas líneas y dejar otras para después, sin cerrar la autorización.
- RF-29: CUANDO todas las líneas vigentes tienen respuesta y al menos una quedó Autorizada, EL SISTEMA deja la requisición **Autorizada** y la lleva a Tesorería para pagar.
- RF-30: CUANDO todas las líneas vigentes quedaron NO autorizadas, EL SISTEMA deja la requisición **No autorizada**, sin poder volver a abrirse.
- RF-31: EL SISTEMA guarda en cada línea quién la autorizó o no la autorizó y cuándo.
- RF-32: SI quien va a autorizar o no autorizar una línea es quien elaboró la requisición, ENTONCES EL SISTEMA no lo deja (D12 de la 046).
- RF-33: EL SISTEMA no deja cambiar el valor de una línea al autorizarla: si el valor no cuadra, se marca NO autorizada con su motivo o se devuelve la requisición.
- RF-34: MIENTRAS una requisición está En autorización, EL SISTEMA deja a la Administradora de Elemental y a la Gerencia **devolverla** a quien la elaboró, con qué debe corregirse.
- RF-35: CUANDO se devuelve una requisición, EL SISTEMA guarda en la historia las respuestas que ya tenían sus líneas, y al reenviarse todas las líneas vuelven a esperar respuesta.
- RF-36: MIENTRAS una requisición está **Devuelta**, EL SISTEMA deja a quien la elaboró agregar, cambiar y quitar líneas, como en Borrador, y reenviarla.
- RF-37: CUANDO se cambia una línea de una requisición devuelta, EL SISTEMA marca como reemplazada la línea de antes, con cuándo y en qué corrección; no la borra (RF-94 de la 046).
- RF-38: CUANDO una requisición queda Autorizada o No autorizada, EL SISTEMA no deja cambiar las respuestas de sus líneas.
- RF-39: EL SISTEMA guarda en la historia de la requisición cada envío, devolución, respuesta, cancelación y pago, con quién, cuándo y el motivo si lo hay.

### El total (H3, H4)

- RF-40: EL SISTEMA muestra en la requisición el **total pedido** (la suma de las líneas vigentes).
- RF-41: EL SISTEMA muestra en la requisición el **total a pagar**, que es la suma solo de las líneas Autorizadas (D6).
- RF-42: MIENTRAS una requisición está En autorización, EL SISTEMA muestra cuántas líneas faltan por responder.

### Pagar (H4)

- RF-43: EL SISTEMA muestra a la Auxiliar Administrativa, en Tesorería, las líneas Autorizadas por pagar de cada requisición de pagos OCC, agrupadas por viernes de entrega.
- RF-44: EL SISTEMA deja registrar uno o varios pagos de cada línea Autorizada, con fecha, valor, medio y, opcionales, referencia y comprobante, como la 037 (RF-13, RF-14), a la Auxiliar Administrativa, a la Administradora de Elemental y a la Gerencia (D12).
- RF-80: SI un pago haría que lo pagado de una línea pase de su valor, ENTONCES EL SISTEMA no lo registra y dice cuánto le falta por pagar, como la 037 (RF-15) (D12).
- RF-81: EL SISTEMA muestra cada línea Autorizada como **Sin pagar**, **Pagada en parte** o **Pagada**, según lo pagado contra su valor (D12).
- RF-45: EL SISTEMA no deja registrar un pago de una línea NO autorizada.
- RF-46: MIENTRAS hay algo pagado y alguna línea Autorizada no está Pagada del todo, EL SISTEMA deja la requisición **Pagada en parte**.
- RF-47: CUANDO todas las líneas Autorizadas están Pagadas del todo, EL SISTEMA deja la requisición **Pagada**.
- RF-48: EL SISTEMA deja anular el pago de una línea a la Administradora de Elemental y a la Gerencia, con motivo, y recalcula lo pagado de la línea y el estado de la requisición, como la 046 (RF-42) y la 037 (RF-16).

### Bandeja de Elemental (H3)

- RF-49: EL SISTEMA muestra las requisiciones de pagos OCC En autorización en la bandeja Requisiciones de Elemental, con la marca «OCC» y su viernes de entrega.
- RF-50: EL SISTEMA ordena esas requisiciones en la bandeja por el viernes de entrega más cercano.
- RF-51: EL SISTEMA marca **Vencida** una requisición de pagos OCC cuando su viernes de entrega ya pasó y no está Pagada, No autorizada ni Cancelada.

### Descargar en Excel (H5)

- RF-52: EL SISTEMA deja descargar cada requisición de pagos OCC en Excel, con el formato de la hoja REQUISICIONES de OCC: título, fecha del viernes de entrega, elaborado por, total a pagar y una fila por línea (D6).
- RF-53: EL SISTEMA no incluye en la descarga las columnas de ítem a imputar (D1).
- RF-54: EL SISTEMA escribe en la columna de observaciones de la descarga «Autorizado» o «NO Autorizado» con el motivo, y las observaciones de quien la pidió.
- RF-55: EL SISTEMA escribe en la columna de visto bueno de la descarga el nombre de quien respondió cada línea y la fecha.
- RF-56: EL SISTEMA escribe en las columnas de RUT y cuenta bancaria de la descarga si cada línea los tiene adjuntos.
- RF-57: MIENTRAS una requisición no está Autorizada, EL SISTEMA escribe su estado en la descarga, para que no se confunda con una ya autorizada.
- RF-58: EL SISTEMA deja descargar la requisición a quien la ve.

### Importar con IA (H2)

- RF-59: MIENTRAS una requisición está en Borrador o Devuelta, EL SISTEMA deja a quien puede armarla (RF-19, RF-36) subir un archivo de requisición para que la IA proponga sus líneas (D7).
- RF-78: EL SISTEMA acepta para importar el archivo Excel de requisición de pagos con el formato de OCC (D9).
- RF-79: SI el archivo subido no es un Excel, ENTONCES EL SISTEMA no lo lee y dice qué archivo se espera (D9).
- RF-60: CUANDO se sube un archivo para crear una requisición nueva, EL SISTEMA propone también el viernes de entrega que trae el archivo, y aplica RF-6 a RF-8.
- RF-61: EL SISTEMA muestra lo que la IA leyó como líneas propuestas, para revisarlas y corregirlas antes de agregarlas a la requisición.
- RF-62: EL SISTEMA no agrega ninguna línea propuesta sin que quien importa la confirme.
- RF-63: EL SISTEMA no inventa datos: lo que la IA no puede leer de una línea (un valor, una fecha, un beneficiario) lo deja vacío y marcado para completarlo.
- RF-64: EL SISTEMA no toma como líneas las filas vacías, la fila de títulos ni la del total del archivo.
- RF-65: EL SISTEMA no toma del archivo las columnas de ítem a imputar ni las respuestas «Autorizado» o «NO Autorizado»: las líneas importadas llegan sin respuesta.
- RF-66: SI la lectura de la IA queda cortada antes de terminar el archivo, ENTONCES EL SISTEMA no propone una parte de las líneas y dice que el archivo no se leyó entero, como la 042 (RF-67).
- RF-67: SI el archivo no trae ninguna línea que la IA reconozca, ENTONCES EL SISTEMA lo dice y no cambia la requisición.
- RF-68: EL SISTEMA guarda el archivo importado con la requisición, para consultarlo después.
- RF-69: SI la IA no está disponible, ENTONCES EL SISTEMA lo dice y deja seguir armando la requisición a mano.
- RF-70: CUANDO quien importa confirma las líneas propuestas, EL SISTEMA las deja en la requisición como cualquier otra línea: se pueden cambiar y quitar mientras esté en Borrador o Devuelta, y siguen la misma autorización, pago y descarga (D8).

### Las de OCC anteriores a esta spec

- RF-71: EL SISTEMA deja terminar con su formato y su paso único las requisiciones RQ de OCC de la 046 y las solicitudes SC y SP de OCC que estén abiertas el día del cambio.
- RF-72: EL SISTEMA no cambia ni borra la historia de ninguna requisición o solicitud de OCC anterior a esta spec.

### Reglas transversales

- RF-73: EL SISTEMA muestra las requisiciones de pagos OCC a quienes hoy ven Requisiciones de OCC (RF-87 de la 046), y a la Auxiliar Administrativa sus líneas por pagar en Tesorería (RF-43); no las muestra a nadie más, ni por su dirección.
- RF-74: EL SISTEMA comprueba en el servidor quién puede crear, enviar, autorizar, devolver, cancelar y pagar.
- RF-82: SI dos personas crean a la vez una requisición para el mismo viernes, ENTONCES EL SISTEMA crea solo una y a la segunda le ofrece abrirla, como RF-8.
- RF-75: SI dos personas actúan a la vez sobre la misma requisición o la misma línea, ENTONCES EL SISTEMA deja pasar la primera y a la segunda le dice que cambió, sin pisar en silencio.
- RF-76: EL SISTEMA no borra requisiciones, líneas, adjuntos, archivos importados ni pagos: se cancelan, se quitan, se reemplazan o se anulan con motivo (constitución, principio 4).

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**: Requisiciones de OCC (nueva requisición de pagos con su viernes, líneas, adjuntos por línea, importar con IA, enviar, cancelar, descargar en Excel); la bandeja Requisiciones de Elemental (autorizar línea por línea, devolver); Tesorería (pagar lo autorizado por línea).
- [x] **API**: crear, armar, enviar, cancelar, autorizar por línea, devolver, pagar y anular pagos de la requisición de pagos OCC; importar con IA; descargar en Excel.
- [ ] **Sincronización**: no cambia.
- [x] **Datos**: la requisición de pagos OCC con su viernes de entrega, sus líneas (con adjuntos, respuesta, motivo y quién respondió), las líneas quitadas o reemplazadas, el archivo importado y el pago por línea.
- [x] **Reglas**: viernes válido y uno abierto por viernes, validación de líneas, estados (Borrador, En autorización, Devuelta, Autorizada, No autorizada, Pagada en parte, Pagada, Cancelada), totales, quién actúa en cada estado y la normalización de lo que propone la IA; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Una requisición con 40 líneas se abre, se autoriza y se descarga en menos de 2 s.
- Importar una planilla como la del Excel de ejemplo (14 líneas) propone sus líneas en menos de 60 s.
- Todo el texto en español; valores en pesos con separador de miles; fechas con el calendario de Colombia.

## Casos límite

- **Sin señal**: no aplica; es solo panel. El operador y el celular no cambian.
- **Evidencia firmada**: no toca preoperacionales ni bitácoras. Una requisición Autorizada o Pagada no se edita: los pagos se anulan con motivo y la requisición se cancela si no tiene pagos.
- **Primer arranque**: OCC sin ninguna requisición de pagos muestra la lista vacía con el botón para crear la del próximo viernes; sus RQ, SC y SP anteriores se ven igual.
- **Ya existe la del viernes**: crear otra para el mismo viernes abre la existente (RF-8); si la existente ya se envió, la nueva va a otro viernes.
- **Viernes festivo**: se acepta igual; la fecha es la que escoge OCC.
- **Beneficiario repetido** (Wilman Luna en cuatro líneas): son cuatro líneas, cada una con su respuesta y su pago.
- **Mismo equipo en dos conceptos** (Volqueta LLQ 377): no se juntan; el texto de especificaciones es libre.
- **Línea autorizada y luego el pago anulado**: la línea sigue Autorizada y vuelve a estar por pagar.
- **La Gerencia la elaboró**: la autoriza la Administradora u otra persona de la Gerencia (RF-32).
- **Sin ninguna Administradora activa**: la requisición espera y la autoriza la Gerencia, como la 046 (RF-74 y RF-75 de la 046).
- **Archivo importado con fórmulas** (`50000*4`, `1000000 - lo gastado`): se propone el resultado; si no hay resultado guardado, el valor queda vacío y marcado (RF-63). Si el resultado trae centavos (684.829,21), se propone en pesos enteros (684.829) y queda marcado para revisarlo (D11).
- **Pago anulado de una línea Pagada**: la línea vuelve a Pagada en parte o Sin pagar, y la requisición también (RF-48).
- **Archivo importado con fechas en otro formato** o sin año: lo que no es claro queda vacío y marcado.
- **Importar dos veces el mismo archivo** en el mismo Borrador: las líneas se proponen de nuevo y quien importa decide cuáles confirma (RF-62).
- **Quien elaboró ya no está** (inactivo o retirado) con la requisición Devuelta: la Administradora o la Gerencia la cancelan con motivo (RF-25).
- **Pruebas en dev**: lo de prueba lleva PRUEBA-047 y vive solo en la base de desarrollo; nunca se siembra ni se migra a producción.

## Fuera de alcance

- Amarrar las líneas de OCC a la planificación o a un ítem de costo directo o indirecto (D1; la 048 amarra solo las de obra).
- Llevar la caja menor: registrar sus gastos y calcular la reposición sola (D4; irá con la spec de Tesorería).
- Rehacer Tesorería de Elemental como control financiero del grupo (será su propia spec).
- Una cadena de aprobación de varios pasos para OCC, o un Administrador de OCC aparte (D3).
- Autorizar un valor menor que el pedido en una línea (RF-33).
- Un maestro de beneficiarios o de proveedores, o reusar el RUT y la cuenta de una requisición anterior (D5).
- Amarrar la línea al equipo de OCC por su placa: las especificaciones son texto libre.
- Importar con IA requisiciones de las obras o de GeoLab.
- Importar con IA desde PDF o fotos de la planilla (D9).
- Avisos o sugerencias de la IA sobre lo importado: repetidos, beneficiarios escritos de dos formas, valores fuera de lo usual (D8).
- Avisos por correo, WhatsApp o notificaciones.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (viernes, uno por viernes, validación de líneas, estados, totales, permisos, normalización de la IA) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en PRUEBA-047 (desarrollo): el Encargado de OCC importa `assets/Formato requisiciones pagos OCC.xlsx`, revisa las 14 líneas propuestas, agrega una a mano y la envía; la Administradora autoriza 12 y no autoriza 2 con motivo; el total a pagar cuenta solo las 12; la Auxiliar paga 5 (Pagada en parte) y luego el resto (Pagada); se descarga el Excel y muestra Autorizado / NO Autorizado, el visto bueno y el total; crear otra para el mismo viernes abre la existente.

## Decisiones

- D1 (2026-11-17): sin columnas de ítem a imputar; OCC no se amarra a la planificación (decisión 5 del plan del 13-nov).
- D2 (2026-11-17): se autoriza línea por línea, como el Excel.
- D3 (2026-11-17): autorizan la Administradora de Elemental o la Gerencia, en un solo paso.
- D4 (2026-11-17): la caja menor es una línea normal con valor a mano.
- D5 (2026-11-17): RUT y cuenta bancaria por línea, opcionales.
- D6 (2026-11-17): descarga en Excel; lo autorizado pasa a pago de la Auxiliar; el total a pagar cuenta solo lo autorizado; una requisición abierta por viernes de entrega.
- D7 (2026-11-17): la IA lee el archivo de requisición que se le importe y arma las líneas.
- D8 (2026-11-17): «que la IA ayude con la optimización» es eso mismo: el archivo se importa, se lee, se muestra y queda sujeto a cambios y a la autorización. No hay avisos ni sugerencias aparte.
- D9 (2026-11-17): la IA lee el Excel de requisición de pagos de OCC, el de `assets/Formato requisiciones pagos OCC.xlsx`; ni PDF ni fotos.
- D10 (2026-11-17): el motivo es obligatorio al marcar una línea NO autorizada.
- D11 (clarificación, 2026-11-17): valores en pesos enteros, como los pagos de la 037; los centavos de un archivo importado se redondean y quedan marcados.
- D12 (clarificación, 2026-11-17): cada línea Autorizada se puede pagar en uno o varios pagos, nunca por encima de su valor, como la 037.

## Dudas abiertas

Ninguna: las tres de la entrevista se resolvieron el 2026-11-17 (D8–D10).
