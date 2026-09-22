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

---

## Cambio del 2026-09-17 — anular solo la gerencia y la lista de materiales de OCC

Dos cosas sin relación entre sí, que se hacen en el mismo cambio porque llegaron juntas. La
primera es de una línea; la segunda es un catálogo nuevo, como el presupuesto de la spec 004.

### 1. Anular pasa a ser de la gerencia (RF-38, RF-39)

Ya está casi hecho por cómo se construyó el módulo: la tabla de permisos de
`src/shared/rules/permisos.ts` tiene la acción `anular` por separado de `escribir`, el botón
del historial se pinta con `alcanza(rol, 'almacen', 'anular')` y la ruta
`movimientos/[id]/anular+api.ts` abre con `requerirPermiso(peticion, 'almacen', 'anular')`.

**El cambio es quitar `'anular'` de la fila del almacenista en `almacen`.** Con eso:

- **RF-39, la pantalla** — el historial deja de ofrecer el botón, sin tocar
  `historial-almacen.tsx`.
- **RF-39, el servidor** — la ruta responde 403 sola, con el texto que arma
  `motivoDeRechazo` desde la misma tabla (008/RF-13), que pasará a decir que la anulación la
  hace la gerencia. Eso es exactamente lo que quedó pendiente de comprobar contra el servidor
  en 008/T8.
- **RF-38** — la gerencia (`admin`) conserva las cuatro acciones y no se toca.

El comentario de la tabla explica hoy que el almacenista anula lo suyo; pasa a decir por qué
ya no, con su fecha. El caso del guion que afirma lo contrario se invierte.

Lo que **no** se hace: ninguna vía para que el almacenista pida la anulación desde el panel.
Queda escrito como fuera de alcance; se lo pide a gerencia por fuera.

### 2. El material se elige de la lista de OCC (RF-32 a RF-37)

Mismo camino que el presupuesto de la 004, y por las mismas razones: 351 nombres con tildes,
comillas de pulgadas y calibres no se copian a mano sin erratas.

**Script `npm run materiales`** (`scripts/importar-materiales.ts`), hermano de
`importar-presupuesto.ts`: lee `docs/materiales y equipos.xlsx`, hoja `MATERIALES`, y escribe
`src/shared/catalogos/materiales.json`, que no se edita a mano. De cada fila toma **solo la
columna C**, el nombre. El código, la unidad y el precio se descartan a propósito: el precio
está fuera de alcance y la unidad la elige el almacenista (RF-34).

- Se queda con las filas cuya columna A es un código de material (`B…`), que es lo que
  separa los datos de los encabezados y de las franjas de título.
- **Repetidos (RF-35):** se comparan sin tildes, sin mayúsculas y sin espacios de más —la
  misma normalización que ya usa la búsqueda del panel— y se conserva la primera aparición,
  con la escritura del documento. De 367 filas salen 351 nombres.
- **Falla en voz alta:** si no encuentra el encabezado esperado, si una fila con código no
  tiene nombre, o si salen menos de 300 nombres, no escribe nada y dice en qué fila fue. Una
  lista vacía o a medias sería peor que no correr el script.

**Catálogo `src/shared/catalogos/materiales.ts`**, como `presupuesto.ts`: tipa el JSON,
expone `MATERIALES_DE_OCC` y la clave `CLAVE_OTRO_MATERIAL = 'otro'`. Va en `catalogos/`
—no en una tabla de la base— porque es una lista de referencia igual para todas las obras;
lo que se guarda en la base sigue siendo el material de la obra con su nombre.

**Alta del material** (`pantalla-almacen.tsx`): el campo de texto «Nombre» pasa a ser un
`Selector` con los 351 nombres más «Otro», y el campo de texto solo aparece cuando se elige
«Otro» (RF-33). La búsqueda dentro del selector ya es la que pide RF-36 —`filtrarOpciones`
ignora tildes y mayúsculas—, así que no hay nada nuevo que escribir para eso. Lo que se
manda al servidor sigue siendo un nombre, elegido o escrito: **la petición no cambia de
forma**.

**El servidor no cambia.** Con «Otro» cualquier nombre es válido, así que validar contra la
lista no añadiría nada, y RF-3 (no repetir un nombre vigente en la obra) ya trata igual a los
dos caminos. Tampoco hay migración: ni una columna nueva.

**La ventana de corrección se queda con su campo de texto** (RF-4). Corregir es arreglar una
errata de un material que ya existe, y uno registrado con «Otro» no está en la lista: dejarlo
como selector obligaría a elegir otra cosa para poder guardar.

**Nada de lo registrado se toca (RF-37):** los materiales existentes se listan y se mueven
igual; el catálogo solo alimenta el formulario de alta.

### Qué se comprueba

En `scripts/verificar-reglas.ts`:

- **Permisos:** el almacenista alcanza `escribir` pero no `anular` en `almacen`; el `admin`
  sí; el residente sigue solo en `ver` y `listar`; el texto de `motivoDeRechazo` para anular
  nombra a la gerencia.
- **Catálogo:** 351 nombres, ninguno vacío, ninguno repetido con la normalización de la
  búsqueda, y unos cuantos del anexo A presentes tal como los escribe OCC. Que buscar
  «cemento» y «acero» devuelva lo suyo con `filtrarOpciones`.

**Script:** correrlo sobre el Excel y confirmar el conteo; sobre una copia con el encabezado
movido, ver que falla nombrando la fila y no escribe.

**Demo en el navegador** (reiniciando `npm run web`): registrar un material desde la lista y
otro con «Otro»; abrir un historial con movimientos como `prueba.almacen` y **no ver el botón
de anular**; verlo como gerencia; comprobar que los materiales de antes siguen con su unidad.

### Riesgos

- **Un almacén sin salida para un error.** Si la gerencia no está disponible, el almacenista
  convive con un movimiento equivocado hasta que alguien lo anule. Es lo que pidió gerencia y
  queda escrito; si estorba en la obra, se revierte quitando una palabra de la tabla.
- **Un selector de 351 opciones.** El buscador lo hace usable, pero hay que verlo: si la
  lista se siente lenta o el nombre se corta, se trata como en la 004 —etiqueta recortada y
  texto completo en el `detalle`—.
- **Nombres del INVIAS que no son los de OCC en obra** («Cemento Asfaltico 60-70» donde el
  almacén dice «cemento»). Para eso está «Otro», y por eso la lista no es cerrada.
- **El Excel cambia de forma.** El script se detiene sin escribir, como el del presupuesto.


## Cambio del 2026-09-22 — quién entrega y quién recibe; descargar el almacén en Excel (RF-40 a RF-50)

Dos mitades. **El nombre** es un campo más en cada movimiento, con su migración, su regla y su
columna. **La descarga** es una ruta nueva que arma un `.xlsx` con `exceljs` y un botón que lo
guarda; el contenido de las hojas lo decide una función pura, para poder probarlo sin abrir
Excel.

### Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/db/servidor/esquema.ts` | `almacen_movimientos.responsable` text **nulo** (los movimientos anteriores no lo tienen). Migración con `db:generate:servidor`; se aplica en Neon **con permiso de Diego**. | RF-40, RF-41, RF-44 |
| `src/shared/rules/almacen.ts` | `MovimientoPorValidar.responsable`; `validarMovimiento` añade la falta bajo el campo `responsable` con el texto según el tipo: `sinEntregadoPor` («Escriba quién entregó el material.») y `sinRecibidoPor` («Escriba quién recibió el material.»). Solo espacios cuenta como vacío. | RF-40 a RF-42 |
| `src/features/panel/contratos.ts` | `movimientoNuevo`: `responsable` obligatorio en las dos ramas (≤ 120), con los mensajes de la regla. `MovimientoDeAlmacenFila.responsable: string \| null`. | RF-40 a RF-42, RF-44 |
| `src/features/almacen-obra/servidor/movimientos.ts` | `MovimientoPorInsertar.responsable` y `sentenciaDeMovimiento` lo inserta; `historialDelMaterial` lo lee. | RF-40, RF-41, RF-43 |
| `src/app/api/panel/almacen/movimientos+api.ts` | Pasa `responsable` a la regla y a la sentencia. | RF-42 |
| `src/features/panel/ventana-movimiento.tsx` | `Campo` «Entregado por» (ingreso) o «Recibido por» (salida), obligatorio, con la falta de la regla. Cambiar el tipo conserva lo escrito: es la misma persona si se equivocó de tipo. | RF-40 a RF-42 |
| `src/features/panel/historial-almacen.tsx` | Columna «Entregó / recibió»; «—» en los anteriores. Para caber (ver Riesgos) «Para qué / observación» baja de 330 a 180 y pasa a varios renglones. | RF-43, RF-44 |
| `src/features/almacen-obra/exportar.ts` | **Nuevo, puro.** `hojasDelAlmacen(movimientos, materiales)` devuelve las filas de las dos hojas ya decididas: encabezados, orden, textos («Ingreso», «Salida», «Anulado» / «Vigente»), cantidades en número (centésimas / 100), fechas como `Date`, y las existencias con `totalesDelMaterial` (la misma regla de la pantalla). `nombreDelArchivo(codigo \| null, hoy)`. Sin I/O ni `exceljs`: es lo que se prueba en el guion. | RF-46 a RF-50 |
| `src/features/almacen-obra/servidor/excel.ts` | **Nuevo, solo servidor.** Lee los movimientos (materiales de baja incluidos) y los materiales vigentes del alcance, los pasa por `hojasDelAlmacen` y escribe el libro con `exceljs` (encabezado en negrita, anchos, formato de fecha y de dos decimales). **Es el único archivo que importa `exceljs`**, igual que `almacen.ts` es el único que sabe de R2. | RF-45 a RF-49 |
| `src/app/api/panel/almacen/exportar+api.ts` | **Nuevo.** `GET ?obraId=`: guardia `almacen/listar`, alcance como el listado de materiales (el almacenista y el residente, su obra; la gerencia, la pedida o todas), y responde el archivo con su `Content-Disposition`. | RF-45, RF-50 |
| `src/features/panel/cliente-api.ts` | `api.almacen.descargar(obraId)`: pide la ruta, y si responde bien devuelve el `Blob` y el nombre del archivo; si no, el mismo `ErrorApi` de siempre. | RF-45 |
| `src/features/panel/pantalla-almacen.tsx` | Botón «Descargar en Excel», para todos los que ven el almacén; la gerencia descarga la obra del filtro o todas. Guarda el archivo con un enlace temporal (`URL.createObjectURL`). | RF-45, RF-50 |
| `package.json` | `exceljs` pasa de `devDependencies` a `dependencies` (aprobado por Diego). `npm install` para que el `package-lock.json` deje de marcarla como de desarrollo. | — |
| `scripts/verificar-reglas.ts` | Casos del nombre obligatorio y de las hojas (ver Verificación). | RF-42, RF-46 a RF-50 |

**Lo que se reutiliza:** `totalesDelMaterial` y `cantidadDeLaBase` (el stock de la hoja es el
de la pantalla), `filtroDeObra` y `veTodasLasObras` (el alcance de la descarga es el del
listado), `DESFASE_COLOMBIA_MS` (la hora de registro en la de la obra), `ErrorApi` y
`mensajeDe` (los errores de la descarga se dicen como los demás).

### Modelo de datos

- **Servidor:** una columna, `almacen_movimientos.responsable text null`. Nula a propósito:
  los movimientos anteriores no la tienen y no se inventa (RF-44). Que sea obligatoria en los
  nuevos lo exige la regla y el contrato, no la base: un `NOT NULL` obligaría a rellenar los
  viejos. Migración `0013` con `npm run db:generate:servidor`; `db:migrar:servidor` **solo
  con visto bueno de Diego**, porque es la base de producción.
- **Móvil:** nada. El almacén no baja al celular.

### Decisiones técnicas

- **Una columna `responsable` y no dos (`entregado_por`, `recibido_por`).** *Descartado:* dos
  columnas. Un movimiento es ingreso **o** salida, así que una de las dos estaría siempre
  vacía y cada lector tendría que saber cuál mirar. El rótulo cambia con el tipo; el dato es
  el mismo: la persona del otro lado del mostrador.
- **Nula en la base, obligatoria en la regla.** *Descartado:* `NOT NULL` con un valor por
  defecto para los viejos («Sin registrar»). Sería escribir en la evidencia un dato que nadie
  dijo; y la spec pide mostrarlos sin nombre (RF-44).
- **El contenido de las hojas en una función pura, aparte de `exceljs`.** *Descartado:* armar
  las filas dentro de la ruta al escribir el libro. Así no se podría probar en el guion qué
  dice cada fila sin leer un `.xlsx`, y la regla del stock quedaría repetida.
- **`exceljs` en un solo archivo del servidor.** *Descartado:* importarla en la ruta. Si mañana
  hay que cambiar de librería —o el VPS se niega a correrla— se reescribe un archivo, como con
  R2. Y se comprueba que no entra al bundle del cliente.
- **La descarga con `fetch` + `Blob` + enlace temporal.** *Descartado:* un enlace directo
  `<a href="/api/panel/almacen/exportar">`. Con el enlace, un 403 o un 500 se descargaría como
  un archivo roto o abriría una página de error; con `fetch`, el error se dice en el panel
  como cualquier otro. La cookie viaja igual (mismo origen).
- **Sin filtros de periodo ni de tipo** (decisión de la spec, RF-45 y Fuera de alcance): la
  ruta no los lee.
- **Fechas como fecha, no como texto** (RF-49): la fecha del movimiento es un día (`Date` a
  medianoche, formato `aaaa-mm-dd`); la de registro y la de anulación, la hora de la obra.
  Excel no guarda zona horaria, así que se escribe ya corrida a Colombia; si se escribiera en
  UTC, un movimiento de las 8 p. m. aparecería al día siguiente.

### Impacto en la sincronización

Ninguno: el almacén no viaja al celular.

### Contrato de API

- `POST /api/panel/almacen/movimientos` — igual que hoy, más `responsable` (texto ≤ 120,
  obligatorio en ingreso y salida). Sin él o con solo espacios → **400** con
  `campos.responsable` y el texto de la regla según el tipo.
- `GET /api/panel/almacen/movimientos?materialId=` — cada movimiento trae `responsable`
  (`null` en los anteriores).
- `GET /api/panel/almacen/exportar?obraId=` — **nuevo**. Guardia `requerirPermiso(peticion,
  'almacen', 'listar')`. Alcance: el almacenista y el residente, su obra (el parámetro no
  cuenta); la gerencia, la obra pedida o todas. **200** con el libro,
  `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y
  `Content-Disposition: attachment; filename="almacen-OBR-001-2026-09-22.xlsx"`. **403** sin
  permiso. Sin movimientos, 200 con las hojas vacías. Solo lecturas: Neon por HTTP no afecta.

### Estrategia de verificación

En `scripts/verificar-reglas.ts`:

- **Nombre obligatorio:** ingreso sin `responsable`, con solo espacios, y salida sin él → la
  falta bajo `responsable` con su texto de tipo; con él → sin esa falta. El contrato rechaza
  los dos y acepta 120 caracteres pero no 121.
- **Hojas:** con dos materiales (uno de baja con un movimiento), un ingreso, una salida con
  decimales y un ingreso anulado: Movimientos trae las tres filas (la de baja incluida) con su
  obra, tipo, cantidad en número (2.5, no «2,5»), responsable («—» en uno anterior) y el
  anulado marcado con quién, cuándo y motivo; Existencias trae solo el vigente, con los totales
  de `totalesDelMaterial` (el anulado no cuenta); la fecha del movimiento es un `Date`.
- **Nombre del archivo:** con código, «almacen-OBR-001-2026-09-22.xlsx»; sin él,
  «almacen-todas-las-obras-2026-09-22.xlsx».

Comprobación técnica temprana (primera tarea de la descarga): que `exceljs` corre en la ruta del
servidor de desarrollo **y** en el `expo export`, y que no aparece en `dist/client`.

Demo en Chrome, sobre PRUEBA-016 (almacén de prueba): ingreso sin «Entregado por» → rechazo;
con él y una salida con «Recibido por» → se ven en el historial; un movimiento anterior se ve
con «—»; descargar el Excel y abrirlo (con `exceljs` desde un guion, o a mano): dos hojas, el
anulado marcado, existencias iguales a la pantalla, cantidades numéricas.

### Riesgos

- **Que `exceljs` no empaquete en la salida `server` de Expo, o no corra en el VPS.** Usa
  módulos de Node (`stream`, `zlib`). Se prueba lo primero, con una ruta mínima, antes de
  escribir nada más; si falla, se para y se vuelve a Diego. Revertir es quitar la ruta: el
  resto del cambio no depende de ella.
- **Que `exceljs` se cuele en el bundle del cliente** (pesado y con código de servidor). Solo la
  importa `excel.ts`, que solo importa la ruta; se comprueba con el `grep` sobre `dist/client`.
- **La tabla del historial ya casi llena el ancho:** hoy suma 1105 (+ separaciones = 1233 de
  1280). Una columna más de 150 la pasaría y ocultaría la última, que es la del botón de
  anular. Se compensa con «Para qué / observación» de 330 a 180 y varios renglones: la suma
  queda igual. Se mira en Chrome.
- **Migración en producción.** Añadir una columna nula no toca las filas ni bloquea la tabla en
  la práctica. Se aplica con permiso; si hubiera que revertir, la columna se puede dejar (nadie
  la exige en la base).
- **Un almacén grande.** El libro se arma en memoria. Hoy son decenas de movimientos; aun con
  decenas de miles cabe de sobra. Si algún día no, se pasa a escribirlo por partes.
