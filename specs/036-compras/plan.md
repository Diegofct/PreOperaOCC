# Plan técnico — Spec 036

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Decisiones

- **Una solicitud es de un lugar, no de una persona**: `obra_id` **o** `empresa_id` (solo `occ` o `geolab`), exactamente uno, con un `check` como el de `documentos_del_grupo`. Así el residente nuevo hereda las de su obra (caso límite) y el alcance se decide con lo que ya existe: `alcanzaLaEmpresa` y `alcanzaLaObraDeLaRuta`, como en Documentos. El lugar sale de la dirección (`?empresa=` / `?obraId=`), nunca se elige (RF-7).
- **El número SC** es una columna `numero` con identidad de Postgres (`generated always as identity`): consecutivo del grupo, sin carreras entre dos que envían a la vez. La pantalla lo muestra como `SC-0001` (`numeroDeSolicitud`). Un envío que falla puede dejar un hueco en la serie; no se rellena.
- **Los estados y los pasos viven en una regla pura**, `rules/compras.ts`: `PASOS` dice desde qué estado se puede hacer cada paso (corregir, cancelar, aprobar, rechazar, devolver, registrar compra, recibir) y `puedeDar(paso, persona, solicitud)` quién: aprobar, rechazar, devolver y registrar la compra, gerencia (`compras: aprobar/escribir`); corregir y cancelar, quien la pidió; recibir, quien ve Solicitudes de compra de ese lugar. El servidor y la pantalla usan la misma regla: un botón que no se puede pulsar no se muestra, y si llega igual la petición, el servidor dice que no.
- **El estado se guarda** (enum `estado_solicitud_compra`: enviada, devuelta, aprobada, comprada, recibida_en_parte, recibida, rechazada, cancelada) y se recalcula en el servidor después de registrar una compra, anularla o recibir: `estadoTrasComprasYRecibos(renglones)`, también pura y con pruebas. Guardarlo deja ordenar y filtrar la bandeja con un índice, sin calcular 500 solicitudes en cada carga (no funcional).
- **Un solo paso a la vez** (no funcional): la solicitud lleva `version` y cada paso escribe con `where version = ?`, como la ficha (035) y el contrato (031); con una versión vieja responde 409 «La solicitud cambió; vuelve a cargarla».
- **La historia (RF-23)** va en `solicitud_compra_eventos`: paso, motivo, qué cambió (al aprobar con cantidades bajadas: renglón, antes y después, RF-13), quién y cuándo. Los motivos de rechazo, devolución, cancelación y anulación viven aquí, no en la solicitud.
- **Los adjuntos van en `documentos_del_grupo`** (spec 034) con un cuarto dueño, `solicitud_id`, como la persona en la 035: subir, abrir, descargar, anular con motivo, el tipo real del archivo y el tope de 20 MB ya están hechos y probados (RF-17). El lugar `'solicitud'` en `rules/documentos.ts` trae sus clases: cotización, orden de compra, factura, remisión, foto, ficha técnica, otro. El permiso de esos documentos es el de `solicitudes` (o `compras` para gerencia) y su alcance, el de la solicitud. La tabla es de la 0033, que todavía no está en producción: cambiar el `check` no toca datos reales.
- **Los valores y el almacenista (RF-31)**: regla `veLosValores(rol)` = todos menos el almacenista. Para él el servidor arma la solicitud **sin** valor estimado, sin valor de las compras y **sin los adjuntos de clase cotización, orden de compra y factura** (que llevan precios); ve proveedor, fotos, fichas técnicas y remisiones. No se manda en `null`: no se manda, como el salario en la 035.
- **Compras y renglones**: una compra cubre uno o varios renglones de la misma solicitud (`compra_renglones`), y un renglón está en una sola compra vigente; anular una compra (gerencia, con motivo) libera sus renglones. Así caben los dos proveedores de RF-19 sin repartir un renglón entre dos.
- **Recibir** escribe filas en `recepciones_compra` (renglón, cantidad, fecha, nota, adjunto opcional de clase remisión o foto). Lo recibido de un renglón es la suma; si pasa de lo aprobado se guarda igual y la pantalla marca la diferencia (caso límite). No toca el Almacén (RF-22).
- **Material del catálogo**: el renglón guarda `material_id` (→ `almacen_materiales`) y también copia la descripción y la unidad, para que un material dado de baja se siga leyendo (caso límite). El selector usa la ruta de materiales del Almacén que ya existe, solo en obras con Almacén encendido.
- **Obra inactiva** (`obras.activa = false`): no deja crear solicitudes nuevas; los pasos de las abiertas siguen (caso límite).
- **Solicitudes de pago** se queda «en construcción» (RF-6): ya es una página aparte en el menú (`solicitudes-pago`), no hay que tocarla.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/compras.ts` (nuevo) | Estados y sus nombres, `PASOS`, `puedeDar`, `faltasDeLaSolicitud` (renglones, cantidades > 0, fecha no pasada), `faltasDeLaCompra` (valor > 0, renglones aprobados y libres), `estadoTrasComprasYRecibos`, `estaVencida`, `ordenDeLaBandeja`, `resumenDeLaBandeja`, `veLosValores`, `numeroDeSolicitud` | RF-5, RF-7 a RF-21, RF-24, RF-25, RF-31 |
| `src/shared/rules/permisos.ts` | `compras` de gerencia suma `escribir` y `anular` (registrar y anular compras); `solicitudes` sin cambios (la 033 ya la dejó) | RF-2, RF-4, RF-5 |
| `src/shared/rules/documentos.ts` | `'solicitud'` en `LugarDeDocumentos` con sus clases | RF-7, RF-17, RF-20 |
| `src/db/servidor/esquema.ts` + migración `0035_*` | Enum `estado_solicitud_compra`; tablas `solicitudes_compra`, `solicitud_compra_renglones`, `solicitud_compra_eventos`, `compras`, `compra_renglones`, `recepciones_compra`; `solicitud_id` y el `check` de cuatro dueños en `documentos_del_grupo` | RF-7 a RF-23, RF-30 |
| `src/features/compras/servidor/solicitudes.ts` (nuevo) | `solicitudesDelLugar`, `bandejaDelGrupo` (filtros y resumen), `solicitudDe` (con historia, compras, recibos, adjuntos; sin valores para quien no `veLosValores`), `crear`, `corregir`, `darPaso` (cancelar, aprobar, rechazar, devolver), `recibir`, `buscar` | RF-1 a RF-15, RF-20 a RF-26, RF-28 a RF-31 |
| `src/features/compras/servidor/compras.ts` (nuevo) | `registrarCompra`, `anularCompra`, `gastoPorLugar(desde, hasta)` | RF-16 a RF-19, RF-27 |
| `src/features/documentos/servidor/documentos.ts` | El dueño `solicitud` en `duenoDelPedido`, `moduloDelDueno` y `documentoAlAlcance`, con el alcance de la solicitud y el filtro de clases con precio para el almacenista | RF-17, RF-29, RF-31 |
| `src/app/api/panel/solicitudes-compra/…+api.ts` (nuevos) | `GET/POST ?empresa=|obraId=` (listar y crear), `GET/PUT [id]` (ver y corregir), `POST [id]/paso` (cancelar, aprobar, rechazar, devolver), `POST [id]/recibir`, `POST [id]/compras` (registrar) | todos los de servidor |
| `src/app/api/panel/compras/…+api.ts` (nuevos) | `GET` bandeja con filtros (lugar, estado, urgencia, fechas, texto) y resumen; `GET gasto?desde=&hasta=`; `POST [id]/anular` | RF-3, RF-12, RF-26, RF-27, RF-30 |
| `src/features/compras/pantalla-solicitudes.tsx` (nuevo) | Solicitudes de compra de una obra, OCC o Geolab: abiertas arriba, cerradas abajo, marcas «Devuelta: corrígela» y «Vencida», búsqueda, botón «Nueva solicitud» | RF-1, RF-2, RF-7, RF-24 a RF-26 |
| `src/features/compras/formulario-de-solicitud.tsx` (nuevo) | Crear y corregir: renglones (texto o material del catálogo), para cuándo, urgencia, para qué, proveedor y valor sugeridos, adjuntos | RF-7 a RF-11 |
| `src/features/compras/vista-de-la-solicitud.tsx` (nuevo) | El detalle con su historia, compras, recibos y adjuntos; los botones de los pasos según `puedeDar`; registrar compra y recibir en ventanas | RF-11, RF-13 a RF-23 |
| `src/features/compras/pantalla-compras.tsx` (nuevo) | Compras de Elemental: resumen, bandeja con filtros, el detalle (la misma vista), y la pestaña «Gasto» por lugar y fechas (solo gerencia) | RF-3, RF-4, RF-12, RF-27 |
| `src/features/empresas/paginas-de-empresa.tsx` | `compras` y `solicitudes-compra` dejan de estar en construcción | RF-1, RF-3 |
| `scripts/verificar-reglas.ts` | Casos de todo lo de reglas | — |

## Modelo de datos

**Local**: sin cambios.

**Servidor** (migración `0035_*`, aditiva salvo el `check` de una tabla todavía vacía en producción; **solo en dev** hasta la T23 de la 033):
- Enum **`estado_solicitud_compra`**: enviada, devuelta, aprobada, comprada, recibida_en_parte, recibida, rechazada, cancelada.
- **`solicitudes_compra`**: `id`; `numero` (integer, identidad, único); `empresa_id` (→ `empresas`, solo occ o geolab) o `obra_id` (→ `obras`); `estado`; `para_cuando` (date); `urgente` (bool); `para_que`; `proveedor_sugerido` (texto, vacío si no); `valor_estimado` (bigint, nulo); `pedida_por` (→ `usuarios`), `pedida_en`; `version`; `actualizada_en`. `check`: un solo lugar; `valor_estimado > 0` si lo hay. Índices `(obra_id, estado)`, `(empresa_id, estado)`, `(estado, urgente, para_cuando)`.
- **`solicitud_compra_renglones`**: `id`, `solicitud_id`, `orden`, `descripcion`, `material_id` (→ `almacen_materiales`, nulo), `cantidad` y `cantidad_aprobada` (numeric(14,2); la aprobada nula hasta aprobar, 0 si se quitó), `unidad`. `check`: cantidad > 0, aprobada entre 0 y la cantidad.
- **`solicitud_compra_eventos`**: `id`, `solicitud_id`, `paso` (texto de `rules/compras.ts`), `motivo`, `cambios` (jsonb), `por`, `en`.
- **`compras`**: `id`, `solicitud_id`, `proveedor`, `valor` (bigint, > 0), `fecha`, `factura` (texto, vacío si no), `registrada_por`, `registrada_en`, `anulada_en`, `anulada_por`, `motivo_anulacion` (`check` como en documentos).
- **`compra_renglones`**: `compra_id`, `renglon_id` (llave de los dos). Que un renglón no esté en dos compras vigentes lo revisa el servidor dentro de la misma transacción que registra.
- **`recepciones_compra`**: `id`, `solicitud_id`, `renglon_id`, `cantidad` (numeric(14,2), > 0), `fecha`, `nota`, `documento_id` (→ `documentos_del_grupo`, nulo), `por`, `en`.
- **`documentos_del_grupo`** + `solicitud_id` (→ `solicitudes_compra`, nulo), índice `(solicitud_id, fecha)`, y el `check` del dueño con las cuatro.

Nada se borra: no hay rutas `DELETE` ni `on delete cascade` (RF-30).

## Riesgos

- **Un valor por accidente al almacenista**: cualquier respuesta que no pase por `solicitudDe` podría llevarlo, y también los adjuntos con precio. Se arma en un solo lugar, y una prueba en vivo revisa la respuesta cruda de cada ruta (lista, detalle, bandeja, documentos) con una sesión de almacenista.
- **Pasos a la vez**: aprobar mientras quien pidió cancela. La `version` lo resuelve; se prueba en vivo con dos peticiones seguidas con la misma versión.
- **El `check` de `documentos_del_grupo`** cambia por segunda vez antes de producción: la 0033, la 0034 y la 0035 se aplican en orden en el despliegue, como dice la memoria del proyecto.
- **Pantallas nuevas grandes** (formulario con renglones, detalle con muchos estados): se parten en las tareas para verlas en Chrome una por una.
- R2 es compartido con producción: lo de prueba lleva PRUEBA-036 y se borra objeto por objeto.

## Verificación

- En cada tarea: `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, y nota en `tareas.md`.
- Pruebas en vivo con sesiones temporales (gerencia, residente, almacenista, Encargado de OCC, operador); demo en Chrome con las sesiones de los otros roles en `127.0.0.1:8081` (la sesión del usuario en `localhost` no se toca).
- Al final, `validacion.md` RF por RF y limpieza acotada de lo PRUEBA-036 (filas y objetos de R2).
