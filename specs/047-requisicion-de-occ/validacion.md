# Validación — Spec 047, Requisición de pagos de OCC

> Fecha: 2026-11-17 · Base: `neondb` (desarrollo), servidor de Diego en `127.0.0.1:8081` · `npm run verificar` (1032), `npm run typecheck` y `npm run lint` en verde · Exportación web sin errores y sin secretos en `dist/client`.

**Veredicto: CUMPLIDA — 82/82 RF.** El servidor y las reglas se comprobaron primero por la API; las pantallas de la T16 a la T20 se revisaron después en el navegador, con las cuentas `prueba047.*` de Encargado de OCC, Administradora y Auxiliar (ver «Revisión en el navegador» al final).

Comprobaciones: **P** = prueba «047/» en `scripts/verificar-reglas.ts`; **V** = en vivo por la API, con las cuentas `prueba047.*` (notas de la T8 a la T21); **B** = en la base; **C** = revisando el código; **N** = en el navegador (Chrome sin ventana, 2026-11-17 por la tarde).

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-1 | OCC crea la de pagos, no la de la 046 | V: RQ de la 046 en OCC → 422 (T8) | ✅ |
| RF-2 | Número RQ de la secuencia de la 046 | P; V: RQ-0010 a RQ-0015 seguidas de la RQ-0009 de la 046 | ✅ |
| RF-3 | En Requisiciones de OCC, junto con las anteriores | V: la lista de OCC trae `pagosOcc` y las RQ/SC/SP (T8) · N: la tabla en pantalla, RQ-0010 a RQ-0017 encima de las anteriores | ✅ |
| RF-4 | Crean el Encargado de OCC y la Gerencia | P; V: la Administradora → 403 | ✅ |
| RF-5 | Viernes y quién la elaboró | V: «elaborada por Encargado OCC (prueba 047)» | ✅ |
| RF-6 | Si no es viernes, no | P; V: un jueves → 422; B: `check` de viernes | ✅ |
| RF-7 | Viernes pasado, no | P | ✅ |
| RF-8 | Una abierta por viernes, ofrece la existente | P; V: 409 con RQ-0010 y con RQ-0014; B: índice único parcial | ✅ |
| RF-9 | Abierta mientras no está Pagada, No autorizada ni Cancelada | P; V: con RQ-0011 cancelada se creó RQ-0012 el mismo viernes | ✅ |
| RF-10 | Los campos de cada línea | V: las 15 líneas de RQ-0014 | ✅ |
| RF-11 | Numeradas 1, 2, 3 | V: tres líneas numeradas; tras quitar y reemplazar, las vigentes siguen 1, 2 | ✅ |
| RF-12 | Sin fecha, beneficiario o concepto, o valor 0, no | P; V: sin concepto → 422 junto al campo | ✅ |
| RF-13 | Fecha de solicitud futura, no | P | ✅ |
| RF-14 | Pesos enteros | P (regla y contrato) | ✅ |
| RF-15 | RUT y cuenta por línea, opcionales | V: RUT de RQ-0010; líneas sin adjuntos se envían | ✅ |
| RF-16 | Se ve si tiene RUT y cuenta | V: `rutMediaId` en el detalle · N: «Sin RUT / Sin cuenta» en la tabla y «RUT: no · Cuenta: no» al autorizar | ✅ |
| RF-17 | Sin ítem a imputar | P (contrato y descarga sin esas columnas); C | ✅ |
| RF-18 | Caja menor como línea normal | V: la 13 de RQ-0014, $684.829 | ✅ |
| RF-19 | En Borrador arman quien la elaboró y la Gerencia | P | ✅ |
| RF-20 | Quitar marca, no borra | V y B: la 3 de RQ-0010 con `quitada_en` | ✅ |
| RF-21 | Enviar → En autorización | V | ✅ |
| RF-22 | Sin líneas no se envía | P | ✅ |
| RF-23 | Enviada no admite líneas | P; V: 409 | ✅ |
| RF-24 | Quien la elaboró cancela hasta Devuelta, con motivo | P; V: RQ-0012 (sin motivo → 422) | ✅ |
| RF-25 | Administradora y Gerencia cancelan sin pagos | P; V: RQ-0015 Autorizada cancelada; con un pago → 409 | ✅ |
| RF-26 | Autorizada o NO autorizada, línea por línea | P; V | ✅ |
| RF-27 | Motivo de lo NO autorizado | P; V: el motivo queda en la línea y en la descarga | ✅ |
| RF-77 | Sin motivo no se guarda | P; V: 400 desde el contrato; B: `check` | ✅ |
| RF-28 | Guardar una parte | V: «faltan 1» | ✅ |
| RF-29 | Todas respondidas y alguna autorizada → Autorizada, a Tesorería | P; V: RQ-0010 y RQ-0014; aparecen en `por-pagar` | ✅ |
| RF-30 | Todas NO → No autorizada | P | ✅ |
| RF-31 | Quién respondió y cuándo | V: `respondida` en el detalle y el visto bueno en la descarga | ✅ |
| RF-32 | Nadie responde lo suyo | P | ✅ |
| RF-33 | No se cambia el valor al autorizar | C: el contrato de respuestas no lleva valor | ✅ |
| RF-34 | Devolver con qué corregir | V: sin motivo → 422, con motivo → Devuelta | ✅ |
| RF-35 | Las respuestas quedan en la historia; al reenviar, todas esperan | V: el evento `devuelta` guarda la respuesta de la línea 1; reenviada, las dos en nulo | ✅ |
| RF-36 | Devuelta: arma quien la elaboró | P | ✅ |
| RF-37 | Cambiar marca la de antes como reemplazada | V y B: dos líneas reemplazadas en RQ-0010 | ✅ |
| RF-38 | Cerrada, no se cambian respuestas | P; V: 409 | ✅ |
| RF-39 | Historia de cada paso | V: los eventos de creada a pago y anular_pago | ✅ |
| RF-40 | Total pedido | P; V: $5.495.541 en RQ-0014 | ✅ |
| RF-41 | Total a pagar, solo lo autorizado | P; V: $3.955.541 | ✅ |
| RF-42 | Cuántas faltan por responder | P; V: `faltanPorResponder` | ✅ |
| RF-43 | Tesorería: líneas autorizadas por pagar, por viernes | V: `por-pagar` (el Encargado → 403) · N: la pestaña «OCC por viernes» con RQ-0016, pagada en dos pagos ($100.000 + $215.112) hasta quedar Pagada | ✅ |
| RF-44 | Pagos de cada línea, con comprobante opcional | V: 15 pagos de RQ-0014; uno con comprobante en RQ-0010 | ✅ |
| RF-80 | Nunca de más | P; V: 422 «faltan $ 200.000» | ✅ |
| RF-81 | Sin pagar, en parte, pagada por línea | P; V | ✅ |
| RF-45 | La NO autorizada no se paga | P; V: 422 | ✅ |
| RF-46 | Pagada en parte | P; V: RQ-0014 tras la primera tanda | ✅ |
| RF-47 | Pagada | P; V: RQ-0010 y RQ-0014 | ✅ |
| RF-48 | Anular con motivo y recalcular | P; V: RQ-0010 vuelve a Pagada en parte; la Auxiliar → 403 | ✅ |
| RF-49 | En la bandeja de Elemental con «OCC» y viernes | V: RQ-0013 en `pagosOcc` · N: la sección «Requisiciones de pagos de OCC · 2 esperan autorización» con «OCC», viernes y «Faltan 1» | ✅ |
| RF-50 | Por viernes | P | ✅ |
| RF-51 | Vencida | P | ✅ |
| RF-52 | Descarga con el formato de OCC | P; V: RQ-0010, RQ-0013 y RQ-0014 abiertos con `exceljs` | ✅ |
| RF-53 | Sin columnas de imputar | P; V | ✅ |
| RF-54 | «Autorizado» / «NO Autorizado: motivo» | P; V | ✅ |
| RF-55 | Visto bueno con nombre y fecha | P; V | ✅ |
| RF-56 | RUT y cuenta Sí/No | P; V | ✅ |
| RF-57 | Estado mientras no está autorizada | P; V: RQ-0013 | ✅ |
| RF-58 | Descarga quien la ve | V: el Residente → 404 | ✅ |
| RF-59 | Subir la planilla en Borrador o Devuelta | V: con y sin requisición | ✅ |
| RF-78 | Acepta el Excel de OCC | V: tu planilla, lista en 20 s | ✅ |
| RF-79 | Si no es Excel, lo dice | P; V: un PDF → 422 | ✅ |
| RF-60 | Propone el viernes del archivo y aplica RF-6 a RF-8 | P; V: el jueves 12 marcado; para el 4-dic → 409 con RQ-0013 | ✅ |
| RF-61 | Muestra lo leído para revisar y corregir | V: la propuesta con sus 14 líneas · N: la ventana de revisión, con el aviso del jueves, la 13 resaltada «Revisar el valor», una observación corregida y la 14 sacada → RQ-0017 con 13 líneas | ✅ |
| RF-62 | Nada entra sin confirmar | V: la requisición no cambia hasta confirmar | ✅ |
| RF-63 | Lo ilegible, vacío y marcado | P | ✅ |
| RF-64 | Sin filas vacías, de títulos ni de total | P; V: las filas con `FALSO` no salieron | ✅ |
| RF-65 | Sin imputar ni respuestas | P; V: las observaciones llegaron sin «Autorizado» | ✅ |
| RF-66 | Lectura cortada: sin propuesta | P; C (`llamarConEsquema`) | ✅ |
| RF-67 | Sin líneas reconocidas, lo dice | P | ✅ |
| RF-68 | El archivo queda con la requisición | V: `planillas` de RQ-0014 y su descarga | ✅ |
| RF-69 | Sin IA, se sigue a mano | C: sin llave, la importación queda fallida con su mensaje; armar a mano no la usa | ✅ |
| RF-70 | Lo confirmado es una línea más | V: las importadas se autorizaron, pagaron y descargaron como las demás | ✅ |
| RF-71 | Las de OCC de antes terminan con su formato | C: sus tablas y rutas no cambiaron; la lista las sigue trayendo | ✅ |
| RF-72 | Su historia no cambia | C | ✅ |
| RF-73 | La ven quienes ven Requisiciones de OCC y la Auxiliar | P; V: el Residente → 403/404 en lista, detalle, archivos y descarga | ✅ |
| RF-74 | El servidor comprueba quién | P; V: cada 403 de arriba | ✅ |
| RF-82 | Dos a la vez el mismo viernes: una sola | B: índice único; C: el 409 con la ganadora | ✅ |
| RF-75 | Sin pisar en silencio | V: versión vieja → 409; dos respuestas a la vez → 200 y 409 | ✅ |
| RF-76 | No se borra nada | B: líneas quitadas y reemplazadas siguen; pagos anulados marcados | ✅ |

## Revisión en el navegador (2026-11-17, tarde)

Chrome sin ventana contra el servidor de Diego en el puerto 8081, una sola pestaña y sin recargas de más.

1. **Administradora**, `/panel/elemental/requisiciones`: la sección de OCC arriba con RQ-0016 y RQ-0013. En RQ-0016, «Autorizar línea por línea»: NO autorizado sin motivo → «Diga por qué no se autoriza.» junto al campo y no guarda; Autorizado → «RQ-0016 autorizada: pasa a Tesorería para pagar», total a pagar $315.112, el paso en la historia. RQ-0013 devuelta con motivo → «Devuelta», el motivo arriba en rojo. «Descargar Excel» genera `Requisicion de pagos OCC RQ-0016 2026-11-20.xlsx` (encabezado, viernes, elaborado por, total a pagar 315.112, la línea con «Autorizado», RUT y cuenta «No» y el visto bueno «Administradora (prueba 047) · 2026-11-17»).
2. **Auxiliar**, Tesorería → «OCC por viernes»: la línea de RQ-0016; pago de $100.000 (queda «Pagado $100.000», falta $215.112) y luego el resto, que el formulario propone solo → «RQ-0016 quedó pagada» y la lista vacía. No se adjuntó comprobante en esta pasada (se probó por la API en la T12).
3. **Encargado de OCC**, `/panel/occ/requisiciones` → «Importar planilla» con `assets/Formato requisiciones pagos OCC.xlsx`: la IA leyó 14 líneas por $5.375.541 en menos de un minuto, avisó que el 2026-11-12 no es viernes y que la 13 traía centavos (684829,21 → $684.829), la 13 resaltada con su fila. Se escribió una observación en la 13, se sacó la 14 y se agregó: **RQ-0017**, Borrador, 13 líneas, $4.475.541, la observación guardada y «Importó 13 líneas…» en la historia.

Dos detalles corregidos al revisar: la lista de OCC mostraba «Devuelta» y «Devuelta: corrígela» juntas (ahora solo la segunda, como en la 046), y la tarjeta de Tesorería decía «De 0 viernes distintos» con la lista vacía (ahora «Nada pendiente»).

Datos que quedaron en `neondb`: RQ-0013 Devuelta, RQ-0016 Pagada, RQ-0017 en Borrador para el 20-nov. Nada de esto va a producción.

## Cambios sobre el plan

- El comprobante del pago de una línea va como archivo de la requisición (`pagos.comprobante_media_id`, migración **0049**, solo `neondb`) y no en Documentos: la Auxiliar, que paga, no entra a OCC, y Documentos de una empresa no tiene la clase «Comprobante de pago».
- En la pestaña «Pagos» de Tesorería, un pago de OCC no se anula desde ahí (sin la versión de su requisición respondería 409): dice «En RQ-…» y se anula en su requisición.
