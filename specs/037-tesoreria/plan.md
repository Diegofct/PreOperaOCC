# Plan técnico — Spec 037

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Decisiones

- **El mismo patrón de Compras (036), en archivos propios.** Las solicitudes de pago son de un lugar (obra, OCC o Geolab; Elemental no pide), con número por identidad de Postgres (`SP-0001`), estados en una regla pura, `version` para que dos pasos no se pisen (`tomarLaVersion`), historia en una tabla de eventos y nada se borra. Se copian las piezas que son iguales y se **reutilizan** las que ya son genéricas: `VentanaDeMotivo`, el alcance por lugar (`alcanzaLaEmpresa`, `alcanzaLaObraDeLaRuta`), el buscador común, la carpeta de Documentos.
- **Reglas en `rules/pagos.ts`**: estados (enviada, devuelta, aprobada, pagada_en_parte, pagada, rechazada, cancelada), conceptos y medios de pago (listas en la regla, `text` con `check` en la base, como los catálogos de la ficha), `numeroDePago`, `faltasPorCampo` de la solicitud, `PASOS` con `porQueNoPuedeDar` (corregir y cancelar, quien pidió; aprobar, rechazar, devolver, registrar y anular pagos, gerencia con `tesoreria`), `faltasDelPago` (fecha, valor entero > 0, medio, y que no pase de lo que falta), `estadoTrasPagos(aprobado, pagado)`, `estaVencida`, orden de la bandeja y del lugar, resumen, y quién ve el valor.
- **El almacenista y los valores (RF-5a, D1)**: regla `veElValorDelPago(rol, pedidaPor, yo)` = todos menos el almacenista, y el almacenista solo en las suyas. En las de otros, el servidor no le manda el valor, ni los pagos, ni los adjuntos (una cuenta de cobro dice cuánto). Como la 036, el campo no se manda: ni en `null`.
- **Un pago es de una solicitud de pago o de una compra** (tabla `pagos`, `check` de exactamente uno). Así «Pagos» (RF-23) suma de los dos lados con una sola consulta, y las compras se pagan sin solicitud aparte (D4).
- **No pagar de más, sin carreras** (RF-15, RF-30):
  - en una solicitud de pago, el pago toma la versión de la solicitud, como cada paso de la 036;
  - en una compra (que no tiene versión), el pago se inserta con **una sola sentencia** `insert … select … where (lo pagado vigente + este) <= valor de la compra`: si otro pago entró antes, la condición falla y se responde 409 con lo que falta. No hace falta tocar la tabla `compras`.
    > Cambio en la T10: esa sentencia corre en una transacción **serializable** con un reintento si choca (`conReintentoSiChoca`), como el Almacén (009): en «read committed» la subconsulta no ve un pago que otro está guardando a la vez.
- **Estado de pago de una compra**: no se guarda; se calcula de sus pagos vigentes (pagada, en parte, sin pagar). Se lee en Compras por pagar y en el detalle de la solicitud de compra (RF-19), solo para quien `veLosValores` (036).
- **Adjuntos de una solicitud de pago** van en `documentos_del_grupo` con un quinto dueño, `solicitud_pago_id`, y el lugar `'pago'` con sus clases: cuenta de cobro, factura, cotización, RUT, certificación bancaria, comprobante de pago, otro. El **comprobante de un pago de compra** se adjunta a su solicitud de compra, con la clase nueva «Comprobante de pago» en el lugar `'solicitud'` (lleva precio: el almacenista no la ve). El pago guarda `documento_id` del comprobante, opcional.
- **Tesorería de Elemental** es una pantalla con pestañas en la dirección (`?pestana=`), como Recursos Humanos: Solicitudes de pago (bandeja), Compras por pagar, Pagos (solo gerencia, `veLosPagos`) y Cortes.
- **Cortes** reutiliza lo de la 033 sin cambiarlo: la pantalla `PantallaInformacionFinanciera` (con un selector de Elemental, OCC, Geolab o una obra) y las rutas `cortes`, `cortes/:id/anular` y `cortes/consolidado`. El consolidado vuelve a tener pantalla, arriba (D7). La auxiliar consulta (D9): la fila `finanzas` le suma `ver` y `listar`, sin `escribir` ni `anular`.
- **Permisos**: `solicitudes` (la 033) ya da pedir a residente, almacenista, laboratorista, Encargado y gerencia, y sirve para pagos igual que para compras; `tesoreria` de gerencia ya tiene todo, y la auxiliar `ver` y `listar`.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/pagos.ts` (nuevo) | Estados, conceptos, medios, número SP, faltas por campo, pasos, faltas del pago, estado tras pagos, vencidas, orden, resumen, `veElValorDelPago`, `veLosPagos`, filtros de la bandeja | RF-5 a RF-16, RF-20 a RF-23, RF-30 |
| `src/shared/rules/documentos.ts` | Lugar `'pago'` con sus clases; «Comprobante de pago» en `'solicitud'` y entre las de precio | RF-6, RF-13, RF-18 |
| `src/shared/rules/permisos.ts` | `finanzas` de la auxiliar: `ver`, `listar` | RF-4, RF-24 |
| `src/db/servidor/esquema.ts` + migración `0036_*` | Enum `estado_solicitud_pago`; tablas `solicitudes_pago`, `solicitud_pago_eventos`, `pagos`; `solicitud_pago_id` y el `check` de cinco dueños en `documentos_del_grupo` | RF-6 a RF-18, RF-29 |
| `src/features/tesoreria/servidor/solicitudes-pago.ts` (nuevo) | Lugar, listar, crear, detalle (sin valores para el almacenista en las ajenas), corregir, pasos, bandeja con filtros y resumen | RF-1 a RF-12, RF-20 a RF-22, RF-27, RF-28 |
| `src/features/tesoreria/servidor/pagos.ts` (nuevo) | Registrar y anular pagos de una solicitud o de una compra; compras por pagar; pagos por rango con total por lugar | RF-13 a RF-19, RF-23 |
| `src/features/compras/servidor/solicitudes.ts` | El detalle de la solicitud de compra suma lo pagado de cada compra, para quien ve los valores | RF-19 |
| `src/features/documentos/servidor/documentos.ts` | El dueño `solicitud_pago`, con el alcance de la solicitud y sin adjuntos ajenos para el almacenista | RF-6, RF-5a, RF-28 |
| `src/app/api/panel/solicitudes-pago/…+api.ts` (nuevos) | `GET/POST ?empresa=|obraId=`, `GET/PUT [id]`, `POST [id]/paso`, `POST [id]/pagos` | los de servidor |
| `src/app/api/panel/tesoreria/…+api.ts`, `compras/[id]/pagos+api.ts`, `pagos/[id]/anular+api.ts` (nuevos) | Bandeja, compras por pagar, pagos por rango; pagar una compra; anular un pago | RF-3, RF-10, RF-16 a RF-18, RF-23 |
| `src/features/tesoreria/*.tsx` (nuevos) | Lista del lugar, formulario, detalle con historia y pagos, pantalla de Tesorería con sus cuatro pestañas, ventanas de aprobar y de pagar | RF-1 a RF-25 |
| `src/features/compras/vista-de-la-solicitud.tsx` | En Compras, el estado de pago de cada compra | RF-19 |
| `src/features/empresas/paginas-de-empresa.tsx` | `solicitudes-pago` y `tesoreria` dejan de estar en construcción | RF-1, RF-3 |
| `scripts/verificar-reglas.ts` | Casos de todo lo de reglas | — |

## Modelo de datos

**Local**: sin cambios.

**Servidor** (migración `0036_*`, aditiva salvo el `check` de una tabla todavía vacía en producción; **solo en dev** hasta la T23 de la 033):
- Enum **`estado_solicitud_pago`**: enviada, devuelta, aprobada, pagada_en_parte, pagada, rechazada, cancelada.
- **`solicitudes_pago`**: `id`; `numero` (identidad, único); `empresa_id` (solo occ o geolab) u `obra_id`, uno; `estado`; `beneficiario`, `beneficiario_documento` (vacío si no); `concepto` (`check` con la lista); `para_que`; `valor` (bigint > 0); `valor_aprobado` (bigint, nulo hasta aprobar, entre 1 y el valor); `para_cuando`; `urgente`; `pedida_por`, `pedida_en`; `version`; `actualizada_en`. Índices por obra, empresa y bandeja.
- **`solicitud_pago_eventos`**: `id`, `solicitud_pago_id`, `paso`, `motivo`, `cambios` (jsonb), `por`, `en`.
- **`pagos`**: `id`; `solicitud_pago_id` **o** `compra_id` (→ `compras`), uno; `fecha`; `valor` (bigint > 0); `medio` (`check`: transferencia, consignación, cheque, efectivo); `referencia`; `documento_id` (→ `documentos_del_grupo`, nulo); `registrado_por`, `registrado_en`; `anulado_en`, `anulado_por`, `motivo_anulacion` (`check` como en compras). Índices por solicitud, por compra y por fecha.
- **`documentos_del_grupo`** + `solicitud_pago_id`, índice, y el `check` del dueño con las cinco.

Nada se borra: no hay rutas `DELETE` ni `on delete cascade` (RF-29).

## Riesgos

- **Un valor al almacenista por accidente**: como en la 036, una prueba en vivo revisa la respuesta cruda de cada ruta con una sesión de almacenista que pidió una solicitud y no otra.
- **Pagar de más con dos pagos a la vez a la misma compra**: se prueba en vivo con dos peticiones simultáneas; la segunda debe dar 409.
- **El `check` de `documentos_del_grupo`** cambia por tercera vez antes de producción: en el despliegue van 0033 a 0036 en orden.
- **Tesorería de Elemental reúne cuatro pantallas**: se parten en tareas y se miran en Chrome una por una.
- R2 es compartido con producción: lo de prueba lleva PRUEBA-037 y se borra objeto por objeto.

## Verificación

- En cada tarea: `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, y nota en `tareas.md`.
- Pruebas en vivo con sesiones temporales (gerencia, residente, almacenista, Encargado de OCC, auxiliar, operador); demo en Chrome en `127.0.0.1:8081` (la sesión del usuario en `localhost` no se toca).
- Al final, `validacion.md` RF por RF y limpieza acotada de lo PRUEBA-037 (filas y objetos de R2).
