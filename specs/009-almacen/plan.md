# Plan técnico — Spec 009

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya está y no hay que tocar

- **Permisos.** La spec 008 dejó la fila `almacen` en la tabla: gerencia y almacenista con
  `ver`, `listar`, `escribir` y `anular`; residente con `ver` y `listar`. `requerirPermiso`
  responde el 403 con quién sí puede (008/RF-13). Cubre RF-28 y RF-29 sin tocar la tabla.
- **Alcance por obra.** `filtroDeObra` y `alcanzaLaObra` (`features/servidor/alcance.ts`)
  limitan al almacenista y al residente a su obra, y dejan a la gerencia en todas (RF-1).
- **Ruta y pantalla.** `/panel/almacen`, su enlace en el menú y `pantalla-almacen.tsx` ya
  existen como provisionales (008). Aquí se llena la pantalla; la ruta no se mueve.
- **Búsqueda sin tildes.** `normalizar` (`shared/rules/texto.ts`) y `useListadoFiltrado`
  hacen la búsqueda de RF-22 y dan la clave con la que se compara el nombre repetido (RF-3).
- **Componentes.** `MarcoPantalla`, `useListado`, `Tabla`, `Selector`, `Campo`, `Modal`,
  `Aviso`, `Etiqueta` y `Boton` del panel; el contrato `anulacion` (motivo obligatorio);
  `fechaDeJornada` y `fechaDeJornadaZod` para la fecha de hoy en Colombia.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/almacen.ts` | **Nuevo.** `UNIDADES_ALMACEN` (id, nombre, abreviatura): bulto, kg, t, m, m², m³, L, gal, und, rollo, caja. `IDS_UNIDAD` y `nombreDeUnidad` | 2, 31 |
| `src/shared/rules/almacen.ts` | **Nuevo, puro.** Cantidades en centésimas; validación de un movimiento; totales y stock; historial con saldo; filtro por periodo y tipo; rechazos de salida, anulación, baja y cambio de unidad, con su texto | 5, 7, 9, 10, 13, 15, 17–21, 25, 26 |
| `src/db/servidor/esquema.ts` + migración `0010_…` | Tablas `almacen_materiales` y `almacen_movimientos`, enum `tipo_movimiento_almacen` (ver «Modelo de datos») | 1–3, 6, 8, 11, 23–25, 27, 30 |
| `src/db/servidor/cliente.ts` | `baseServidorSerializable()`: la misma base, con los lotes en aislamiento `Serializable` | 7, 15, 16, 26 |
| `src/features/servidor/respuestas.ts` | `duplicadoDe` conoce `ux_almacen_material_nombre` (campo `nombre`); el conflicto de serialización (`40001`) responde 409 con texto claro | 3, 16 |
| `src/features/panel/contratos.ts` | `materialNuevo`, `materialEditado`, `movimientoNuevo` (unión por `tipo`), filas `MaterialDeAlmacenFila` y `MovimientoDeAlmacenFila` | 2, 4, 5, 8, 11, 13, 17, 20 |
| `src/features/panel/cliente-api.ts` | `api.almacen.materiales` (listar, crear, corregir, darDeBaja) y `api.almacen.movimientos` (listar, registrar, anular) | — |
| `src/app/api/panel/almacen/materiales+api.ts` | **Nueva.** `GET` materiales con totales; `POST` alta | 1–3, 17, 18, 28, 29, 31 |
| `src/app/api/panel/almacen/materiales/[id]+api.ts` | **Nueva.** `PATCH` nombre y unidad | 3–5, 28 |
| `src/app/api/panel/almacen/materiales/[id]/baja+api.ts` | **Nueva.** `POST` baja lógica si no tiene stock | 6, 7, 28 |
| `src/app/api/panel/almacen/movimientos+api.ts` | **Nueva.** `GET` historial de un material; `POST` ingreso o salida | 8–16, 20, 21, 23, 27, 28, 30 |
| `src/app/api/panel/almacen/movimientos/[id]/anular+api.ts` | **Nueva.** `POST` anulación con motivo | 24–28 |
| `src/features/panel/pantalla-almacen.tsx` | Deja de ser provisional: obra (gerencia), búsqueda, tabla de materiales con stock, y botones de registrar solo para quien escribe | 1, 17, 19, 22, 28, 29 |
| `src/features/panel/ventana-material.tsx` | **Nueva.** Alta y corrección de un material | 2–5, 31 |
| `src/features/panel/ventana-movimiento.tsx` | **Nueva.** Registrar ingreso o salida | 8–15, 30 |
| `src/features/panel/historial-almacen.tsx` | **Nueva.** Historial de un material, filtros y anulación | 20, 21, 23–27 |
| `scripts/verificar-reglas.ts` | Casos de catálogo y reglas (ver «Estrategia de verificación»); las tablas nuevas entran en la prueba de ancho | todas las de reglas |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. El almacén no viaja al celular.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `tipo_movimiento_almacen` = `ingreso | salida` (pgEnum: son dos y no van a crecer sin
    una spec).
  - `almacen_materiales`: `id`, `obra_id` (no nulo), `nombre`, `nombre_normalizado`,
    `unidad` (texto con el tipo del catálogo), `creado_por`, `creado_en`, `actualizado_en`,
    `eliminado_en`. Índice único **parcial** `ux_almacen_material_nombre` sobre
    `(obra_id, nombre_normalizado) where eliminado_en is null` (RF-3, y que un material dado
    de baja pueda volver a registrarse).
  - `almacen_movimientos`: `id`, `obra_id`, `material_id`, `tipo`, `fecha` (date, texto),
    `cantidad` (`numeric(14,2)`, con `check (cantidad > 0)`), `para_que` (salidas),
    `observacion` (ingresos), `registrado_por`, `creado_en`, `anulado_en`, `anulado_por`,
    `motivo_anulacion`. Índices por `material_id` y por `(obra_id, fecha)`. **No lleva
    `actualizado_en` ni ruta de edición**: un movimiento no se modifica (RF-23).
- **Migraciones**: `npm run db:generate:servidor` debe dejar `drizzle/servidor/0010_*.sql`
  con dos `CREATE TABLE`, un `CREATE TYPE` y los índices; `npm run db:migrar:servidor` la
  aplica en Neon. Solo añade: no toca tablas existentes.
- **Compatibilidad**: sin impacto en teléfonos; ninguna tabla nueva entra al pull.

## Algoritmo / reglas

Todo en `src/shared/rules/almacen.ts`, puro, con cantidades en **centésimas enteras** para
que sumar 0,1 + 0,2 no dé 0,30000000000000004.

1. `aCentesimas(texto)` acepta coma o punto y hasta dos decimales; `null` si no es un número
   así. `formatearCantidad(centesimas, unidad)` → «2,5 m³».
2. `validarMovimiento({ tipo, fecha, cantidad, paraQue }, hoy)` → lista de faltas por campo:
   cantidad no mayor que cero (RF-9), fecha posterior a hoy (RF-10), salida sin «para qué»
   (RF-13).
3. `totalesDelMaterial(movimientos)` → `{ ingresado, salido, stock }`, contando **solo los
   no anulados** (RF-17, RF-18, RF-25).
4. `rechazoDeSalida(stock, cantidad, unidad)` → `null` o «No hay suficiente: quedan 70
   bultos.» (RF-15). Una salida por exactamente el stock se acepta.
5. `rechazoDeAnulacion(movimiento, stock, unidad)` → para un ingreso, si `stock − cantidad
   < 0`: «Si se anula este ingreso quedarían −30 bultos…» (RF-26). Anular una salida
   siempre se puede.
6. `rechazoDeBaja(stock, unidad)` → `null` si es cero; si no, «Todavía quedan 12 bultos…»
   (RF-7).
7. `rechazoDeCambioDeUnidad(cuantosMovimientos)` → rechazo si tiene alguno, **anulados
   incluidos**: un movimiento anulado sigue a la vista con su cantidad, y cambiarle la
   unidad cambiaría lo que dice (RF-5).
8. `historialConSaldo(movimientos)` → en orden de registro, cada movimiento con el stock que
   dejó; los anulados salen marcados y sin saldo (RF-20, RF-25).
9. `filtrarMovimientos(movimientos, { desde, hasta, tipo })` (RF-21).

El servidor usa las mismas funciones para decidir y para redactar el rechazo; la pantalla
las usa para avisar antes de enviar.

## Decisiones técnicas

- **La salida, la anulación y la baja se deciden dentro de un lote `Serializable`** (una
  sola sentencia que inserta o actualiza *solo si* el stock calculado lo permite). Si dos
  salidas del mismo material chocan, Postgres aborta la segunda con `40001`. La ruta la
  **reintenta una vez**: con la primera ya guardada, el reintento ve el stock real y, si no
  alcanza, responde el rechazo normal de RF-15 con lo que queda. Solo si vuelve a chocar
  responde 409: «Otro movimiento de este material se registró al mismo tiempo. Revise el
  stock y vuelva a intentarlo.» (RF-16). → Se descartó **guardar el stock en una columna** y restarle con un
  `UPDATE … where stock >= cantidad`: es seguro ante choques, pero el stock dejaría de salir
  solo de los movimientos (RF-18) y una anulación mal encadenada lo desalinearía para
  siempre. Se descartó también **la sentencia sola en el aislamiento normal**
  (`ReadCommitted`): las dos salidas leen el mismo stock antes de que la otra termine y las
  dos pasan; es justo el caso de RF-16.
- **La base serializable es una segunda instancia en `cliente.ts`**, construida con
  `neon(url, { isolationLevel: 'Serializable' })`. El driver solo aplica ese nivel a los
  lotes (`db.batch`); el resto de consultas del sistema sigue igual. → Se descartó cambiar el
  nivel de la base de siempre: afectaría a todas las rutas sin necesidad.
- **Cantidades como `numeric(14,2)` en la base y centésimas enteras en las reglas.** → Se
  descartó `real`/`double`: pierde exactitud en sumas, y el stock de un almacén es una suma
  larga.
- **La unidad es un texto con el tipo del catálogo, no un pgEnum.** Es lo mismo que se hizo
  con los cargos (002): añadir una unidad a la lista no exige una migración de tipo. La
  validación la hace el contrato con `IDS_UNIDAD`. → Se descartó el pgEnum por esa migración.
- **El nombre repetido se detiene con un índice único sobre el nombre normalizado**, que
  escribe el servidor con `normalizar`. → Se descartó comprobarlo con una consulta previa:
  dos altas simultáneas pasarían las dos.
- **Ingreso y salida en una sola tabla con `tipo`.** El stock es una suma con signo sobre
  una tabla y el historial es una lista ordenada. → Se descartaron dos tablas: obligarían a
  unir y ordenar dos consultas para cada historial y cada total.
- **«El stock que dejó» se calcula al consultar**, en orden de registro y sin los anulados.
  → Se descartó guardarlo en cada fila: una anulación posterior lo dejaría falso en todas las
  filas siguientes.
- **Gerencia elige la obra en la pantalla** y la manda en el alta de materiales; el
  almacenista y el residente trabajan siempre en la suya y el servidor ignora lo que manden.
  Un movimiento toma la obra de su material. → Se descartó aceptar `obraId` de cualquiera:
  un almacenista podría registrar en otra obra.

## Impacto en la sincronización

Sin impacto en la sincronización. El almacén vive solo en el panel.

## Contrato de API

Todas abren con `requerirPermiso(peticion, 'almacen', …)` y filtran con `alcance.ts`.
Errores: 400 validación (con `campos`), 403 permiso u obra ajena, 404 si no existe o no es
de su obra, 409 duplicado, stock insuficiente, anulación o baja imposible, o choque
simultáneo.

| Método y ruta | Acción | Petición | Respuesta |
| --- | --- | --- | --- |
| `GET /api/panel/almacen/materiales?obraId=` | `listar` | `obraId` solo lo usa gerencia | `MaterialDeAlmacenFila[]` vigentes: nombre, unidad, obra, ingresado, salido, stock, cuántos movimientos |
| `POST /api/panel/almacen/materiales` | `escribir` | `{ nombre, unidad, obraId? }` | 201 con la fila |
| `PATCH /api/panel/almacen/materiales/[id]` | `escribir` | `{ nombre?, unidad? }` | 200; 409 si cambia la unidad y tiene movimientos |
| `POST /api/panel/almacen/materiales/[id]/baja` | `escribir` | — | 200; 409 con lo que queda si hay stock |
| `GET /api/panel/almacen/movimientos?materialId=&desde=&hasta=&tipo=` | `listar` | | `MovimientoDeAlmacenFila[]` con quién registró y anuló (nombre, aunque esté de baja) y saldo |
| `POST /api/panel/almacen/movimientos` | `escribir` | `{ tipo: 'ingreso', materialId, fecha, cantidad, observacion? }` o `{ tipo: 'salida', materialId, fecha, cantidad, paraQue }` | 201; 409 si no alcanza el stock |
| `POST /api/panel/almacen/movimientos/[id]/anular` | `anular` | `{ motivo }` | 200; 409 si dejaría el stock negativo o ya estaba anulado |

`registrado_por` y `anulado_por` salen siempre de la sesión, nunca del cuerpo (RF-27, RF-30).

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - catálogo: once unidades con id y nombre únicos (RF-31);
  - `aCentesimas`: «2,5» y «2.5» → 250, «0,001» y «abc» → `null`;
  - RF-9: cantidad 0 y negativa rechazadas; RF-10: mañana rechazada, hoy aceptada; RF-13:
    salida sin «para qué» rechazada, ingreso sin observación aceptado;
  - RF-17/18/25: 100 ingresado, 30 salido → stock 70; con la salida anulada → 100;
  - RF-15: sacar 80 con 70 → rechazo que dice «70 bultos»; sacar 70 → aceptado;
  - RF-26: anular un ingreso de 100 con stock 70 → rechazo con «−30»; anular una salida →
    aceptado;
  - RF-7: baja con stock 12 → rechazo con «12»; con 0 → aceptada;
  - RF-5: cambio de unidad con un movimiento anulado → rechazado; sin movimientos → aceptado;
  - RF-20: saldo en orden de registro, anulados sin saldo; RF-21: filtro por periodo y tipo;
  - la prueba de ancho de tablas incluye las tablas nuevas.
- **Demo manual** (la de la spec), como almacenista `prueba.almacen`: registrar «Cemento» en
  bultos; ingresar 100; sacar 30 «para cuneta PR 3»; ver stock 70; intentar sacar 80 y ver
  el rechazo con 70; anular la salida con motivo y ver 100 con la salida marcada; registrar
  «cemento» otra vez y ver el rechazo; entrar como residente y ver lo mismo sin botones.
  **Escribe en la base real y nada se borra: se pide permiso antes.**
- **RF-16 contra Neon**: dos salidas simultáneas del mismo material por más de lo que queda
  entre las dos; debe quedar una y la otra con 409. Se hace sobre el material de la demo.
- **Comprobaciones extra**: `npx expo export --platform web` y `grep DATABASE_URL
  dist/client` vacío, porque hay rutas nuevas que leen la base.

## Riesgos

- **Falsos choques de serialización**: Postgres puede abortar una salida sin choque real si
  lee más filas de las necesarias. Se reduce con el índice por `material_id`. Se detecta
  porque el usuario vería el 409 sin que nadie más esté registrando. El reintento único de la
  ruta ya absorbe el caso aislado; si pasa seguido, se revisa el plan de la consulta.
- **Saldo histórico negativo**: con anulaciones de ingresos antiguos, el saldo de una fila
  intermedia del historial puede quedar por debajo de cero aunque el stock actual no. RF-26
  mira el stock actual, que es lo que pide la spec. Si OCC lo ve raro, es un cambio de spec,
  no un arreglo del plan.
- **Unidad que falta en la lista**: se añade al catálogo y se despliega; no toca la base.
- **Migración**: solo crea tablas nuevas. Si hubiera que revertir, no hay datos de otras
  tablas en juego.
