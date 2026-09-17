# Tareas — Spec 009

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Catálogo y reglas

- [x] T1. Catálogo de unidades en `shared/catalogos/almacen.ts`, con sus casos. (RF-2, RF-31)
      Hecho cuando: en verde que hay once unidades con id, nombre y abreviatura únicos, y que
      `nombreDeUnidad` devuelve el nombre de una conocida.

- [x] T2. `shared/rules/almacen.ts`: `aCentesimas`, `formatearCantidad` y `validarMovimiento`,
      con sus casos. (RF-9, RF-10, RF-13)
      Hecho cuando: en verde que «2,5» y «2.5» dan 250, que «0,001» y «abc» se rechazan, que
      cantidad cero o negativa, fecha de mañana y salida sin «para qué» dan su falta, y que un
      ingreso de hoy sin observación pasa.

- [x] T3. `shared/rules/almacen.ts`: totales y stock, rechazos de salida, anulación, baja y
      cambio de unidad, historial con saldo y filtro, con sus casos. (RF-5, RF-7, RF-15,
      RF-17, RF-18, RF-20, RF-21, RF-25, RF-26)
      Hecho cuando: en verde los casos del plan: stock 70 y 100 con la salida anulada; sacar 80
      con 70 rechazado nombrando «70 bultos» y sacar 70 aceptado; anular un ingreso de 100 con
      stock 70 rechazado con «−30»; baja con 12 rechazada y con 0 aceptada; cambio de unidad con
      un movimiento anulado rechazado; saldo en orden de registro y anulados sin saldo; filtro
      por periodo y tipo.

## Datos

- [x] T4. Tablas `almacen_materiales` y `almacen_movimientos` y el enum de tipo, con su
      migración aplicada en Neon. (RF-1, RF-3, RF-6, RF-23, RF-27, RF-30)
      Hecho cuando: `db:generate:servidor` deja `drizzle/servidor/0010_*.sql` solo con
      `CREATE TYPE`, dos `CREATE TABLE`, el `check` de cantidad y los índices (el único,
      parcial); `db:migrar:servidor` la aplica y una consulta a Neon lista las dos tablas.

- [x] T5. `baseServidorSerializable()` en `cliente.ts`; en `respuestas.ts`, el duplicado de
      nombre de material y el conflicto `40001`. (RF-3, RF-16)
      Hecho cuando: `duplicadoDe('ux_almacen_material_nombre')` devuelve el campo `nombre` (con
      su caso), un `40001` se responde 409 con el texto del plan, y los tres comandos en verde.

## Servidor

- [x] T6. Contratos del almacén en `contratos.ts` y `api.almacen` en `cliente-api.ts`. (RF-2,
      RF-4, RF-5, RF-8, RF-11, RF-13, RF-17, RF-20, RF-31)
      Hecho cuando: `movimientoNuevo` rechaza una salida sin `paraQue` y una unidad fuera del
      catálogo (con sus casos), y los tres comandos en verde.

- [x] T7. Rutas de materiales: `GET` y `POST` `materiales`, `PATCH materiales/[id]` y
      `POST materiales/[id]/baja`. (RF-1 a RF-7, RF-17, RF-18, RF-28, RF-29, RF-31)
      Hecho cuando: con peticiones desde la sesión de gerencia abierta en Chrome, el alta
      devuelve 201; el mismo nombre con otras tildes devuelve 409 con `campos.nombre`; el
      listado trae el material con stock 0; y la baja de un material sin movimientos devuelve
      200. Reiniciado `npm run web` antes.
      *Escribe en Neon: se pide permiso y se usa un nombre de prueba reconocible.*

- [x] T8. Rutas de movimientos: `GET` y `POST` `movimientos` y `POST movimientos/[id]/anular`,
      en lote serializable con un reintento. (RF-8 a RF-16, RF-20, RF-21, RF-23 a RF-28,
      RF-30)
      Hecho cuando: con peticiones desde la sesión de gerencia en Chrome, sobre el material
      de prueba, un ingreso de 100 y una salida de 30 devuelven 201; una salida de 80 devuelve
      409 nombrando 70; la anulación de la salida devuelve 200 y el listado da stock 100; y dos
      salidas simultáneas de 60 dejan una sola guardada. *Escribe en Neon: se pide permiso.*

## Panel

- [x] T9. Pantalla de Almacén: obra para gerencia, búsqueda, tabla de materiales con
      ingresado, salido y stock, «Sin stock» con texto, y botones solo para quien escribe;
      ventana de alta, corrección y baja. (RF-1 a RF-7, RF-17, RF-19, RF-22, RF-28, RF-29,
      RF-31)
      Hecho cuando: en Chrome con gerencia se ve la tabla del material de prueba, la búsqueda
      encuentra «cemento» sin tilde ni mayúscula, y la prueba de ancho de tablas sigue en verde.

- [x] T10. Ventana de movimiento: ingreso y salida, con el aviso de stock antes de enviar.
      (RF-8 a RF-15, RF-30)
      Hecho cuando: en Chrome la ventana de salida exige «para qué», avisa si la cantidad supera
      el stock mostrado, y un ingreso actualiza el stock de la tabla al guardarse.

- [x] T11. Historial de un material: movimientos con fecha, tipo, cantidad, quién, para qué y
      saldo; filtros de periodo y tipo; anular con motivo. (RF-20, RF-21, RF-23 a RF-27)
      Hecho cuando: en Chrome el historial muestra la salida anulada marcada y sin saldo, los
      filtros la ocultan y la muestran, y no hay botón de editar ni de borrar un movimiento.

## Validación

- [x] T12. Validación final: recorrido RF por RF de la spec y demo manual. (Todas)
      Hecho cuando: cada RF tiene su comprobación con resultado, la demo de la spec está hecha
      con `prueba.almacen` y con `residente1` (las entradas las hace Diego), `npx expo export
      --platform web` termina sin error con `grep DATABASE_URL dist/client` vacío, los tres
      comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1**: `src/shared/catalogos/almacen.ts` con las once unidades (slugs `bulto`, `kilogramo`,
  `tonelada`, `metro`, `metro_cuadrado`, `metro_cubico`, `litro`, `galon`, `unidad`, `rollo`,
  `caja`), `IDS_UNIDAD`, `unidadPorId`, `nombreDeUnidad` y `abreviaturaDeUnidad`. La
  abreviatura es lo que va detrás de una cantidad («70 bultos», «2,5 m³», «4 und»), y es la que
  usarán los mensajes de rechazo de T3. `abreviaturaDeUnidad` no estaba en el plan: sale de ahí.
  Un slug desconocido se muestra tal cual en vez de esconderse. Dos casos nuevos (150
  verificaciones). No reutiliza `UnidadMaterial` de `catalogos/bitacora.ts`: esa lista es del
  control de calidad del parte y va pegada a materiales fijos.
- **T2**: `aCentesimas` acepta coma o punto, signo y hasta dos decimales, y **rechaza «1.000»**
  (se leería como tres decimales) en vez de tomarlo por un bulto: el separador de miles no se
  admite al escribir. `formatearCantidad` se hace a mano, sin `toLocaleString`, para que el texto
  sea idéntico en Node, navegador y servidor; el menos es «−». `validarMovimiento(movimiento,
  hoy)` devuelve **todas** las faltas con su campo (`cantidad`, `fecha`, `paraQue`), para
  pintarlas bajo el campo como en la 007; también rechaza una fecha mal formada y una cantidad
  ilegible (`null`). Cuatro casos nuevos (154 verificaciones).
- **T3**: `MovimientoRegistrado` (id, tipo, fecha, cantidad en centésimas, `registradoEn` ISO,
  `anulado`), `totalesDelMaterial`, `rechazoDeSalida`, `rechazoDeAnulacion`, `rechazoDeBaja`,
  `rechazoDeCambioDeUnidad`, `historialConSaldo` y `filtrarMovimientos`. Diferencias con el plan:
  - `rechazoDeCambioDeUnidad` recibe también la unidad actual y la nueva: dejar la misma no es un
    cambio, y el mensaje nombra la unidad en que están los movimientos. Sugiere dar de baja y
    registrar de nuevo (solo posible si no hay stock, RF-7).
  - `rechazoDeAnulacion` rechaza además un movimiento **ya anulado** («Este movimiento ya estaba
    anulado.»), que el contrato de API del plan ya preveía como 409.
  - El orden del historial es de registro con empate por `id` (UUID v7), y devuelve del más
    antiguo al más reciente; la pantalla decide si lo invierte.
  - Los textos exactos: «No alcanza: quedan 70 bultos y la salida es de 80 bultos.», «No se puede
    anular este ingreso: el stock quedaría en −30 bultos, porque parte de lo que entró ya salió.
    Anule antes las salidas que correspondan.» y «No se puede dar de baja: todavía quedan 12
    bultos. Registre la salida de lo que queda antes.»
  Siete casos nuevos, con el recorrido de la demo (161 verificaciones).
- **T4**: `tipoMovimientoAlmacen`, `almacenMateriales` y `almacenMovimientos` en `esquema.ts`, con
  el tipo de unidad importado por ruta relativa (drizzle-kit). Migración
  `0010_happy_human_robot.sql`: `CREATE TYPE`, dos `CREATE TABLE` (el `check` de cantidad va
  dentro), seis llaves foráneas, el índice único parcial y dos índices; nada sobre tablas
  existentes. Aplicada en Neon el 2026-09-15. Consultado: `almacen_materiales` con 9 columnas,
  `almacen_movimientos` con 13, el tipo con `ingreso` y `salida`, los cinco índices, la
  restricción `ck_almacen_movimiento_cantidad`, las dos tablas vacías y las 5 personas intactas.
  `db:generate` del celular: «No schema changes». Las tablas nuevas **no** entran en
  `esquemaServidor` (el objeto de consultas relacionales), igual que `partes_de_obra` y
  `llantas`, ni en los disparadores de `actualizado_en`, que son de las réplicas del celular:
  la corrección de un material pone `actualizado_en` en su propia sentencia (T7).
- **T5**: `baseServidorSerializable()` en `cliente.ts`, una segunda instancia con
  `neon(url, { isolationLevel: 'Serializable' })`. **Solo rige dentro de `db.batch`**: una
  consulta suelta con esta base corre en el aislamiento normal, así que T8 mete cada salida,
  anulación y baja en un `batch` aunque sea de una sentencia. En `respuestas.ts`:
  `esChoqueDeSerializacion`, `MENSAJE_DE_CHOQUE`, `responder` convierte un `40001` en 409 con ese
  texto, y `conReintentoSiChoca(operacion)` repite **una** vez solo ante un `40001`. El reintento
  no estaba como función en el plan (lo hacía «la ruta»): se sacó a un ayudante para probarlo sin
  base y para que las tres rutas de T7 y T8 lo usen igual. `duplicadoDe` conoce
  `ux_almacen_material_nombre` → «Ya hay un material con ese nombre en el almacén de esta obra.»,
  campo `nombre`. Tres casos asíncronos nuevos, con el error envuelto como lo envuelve Drizzle
  (`cause.code`), y uno más en el de duplicados (164 verificaciones). `expo export` sin error y
  `grep DATABASE_URL dist/client` vacío. **Sin comprobar contra Neon** que el choque ocurre de
  verdad: es el «Hecho cuando» de T8.
- **T6**: en `contratos.ts`, `materialNuevo` (nombre, unidad de la lista, `obraId` que solo usa
  gerencia), `materialEditado` (parcial), `movimientoNuevo` (unión discriminada por `tipo`: el
  ingreso con observación opcional, la salida con `paraQue` obligatorio) y las filas
  `MaterialDeAlmacenFila` y `MovimientoDeAlmacenFila`, más `ConsultaDeMovimientos` para el filtro.
  Decisiones al escribirlo:
  - **Las cantidades van en centésimas enteras en las respuestas** y como texto escrito («2,5»)
    en las peticiones; el contrato las convierte con `aCentesimas`. Así «1.000» se rechaza igual
    en el formulario y en una petición hecha por fuera.
  - **Los textos de las faltas salen de la regla**: se añadió `MENSAJES_DE_MOVIMIENTO` a
    `shared/rules/almacen.ts` y `validarMovimiento` lo usa. El contrato y la regla dicen lo mismo.
  - La fecha futura (RF-10) **no** va en el contrato sino en la ruta (T8), con
    `validarMovimiento` y `fechaDeJornada()`: un contrato que cambia de veredicto según la hora no
    se puede probar.
  - El contrato no acepta quién registra ni la obra del movimiento: los pone el servidor.
  En `cliente-api.ts`, `api.almacen.materiales` (listar, crear, corregir, darDeBaja) y
  `api.almacen.movimientos` (listar con filtro, registrar, anular). Tres casos nuevos (167
  verificaciones).
- **T7**: rutas `materiales+api.ts` (GET, POST), `materiales/[id]+api.ts` (PATCH) y
  `materiales/[id]/baja+api.ts` (POST). Lo compartido va en
  `src/features/almacen-obra/servidor/materiales.ts` (lectura al alcance, movimientos en forma de
  regla, totales con `totalesDelMaterial`, y las guardas en SQL `stockEnSql` y
  `sinMovimientosEnSql`). La carpeta **no** se llama `almacen`: ya existe
  `features/media/servidor/almacen.ts`, que es el de imágenes (R2). Decisiones al escribirlo:
  - **El stock del listado lo calcula la regla** con los movimientos leídos, no un `sum` en SQL:
    una regla, un solo sitio. El SQL de stock solo existe como guarda de las escrituras, dentro
    de un lote serializable, y la ruta vuelve a leer y responde con la regla si la guarda no deja.
  - La baja y el cambio de unidad corren con `conReintentoSiChoca` y su guarda (stock en cero;
    sin movimientos). El cambio de unidad rechazado va bajo el campo `unidad`.
  - Regla nueva `aDecimal` (centésimas → «2.50» para `numeric`) con su caso; ida y vuelta exacta.
  - La gerencia sin `obraId` recibe 400 bajo `obraId`; un almacenista sin obra, 400 con el aviso
    de pedir su obra.
  **Comprobado el 2026-09-15** con peticiones desde la sesión de gerencia en Chrome, sobre
  «Consorcio Antioquia» (permiso de Diego): sin obra → 400 `campos.obraId`; unidad «bultos» →
  400 `campos.unidad`; alta de «Prueba Cemento T7» en bultos → 201 con stock 0 y 0 movimientos;
  «  prueba cémento t7 » → 409 `campos.nombre`; corrección a «Prueba Cemento T7 gris» en
  kilogramos (sin movimientos) → aplicada; baja → aplicada; baja otra vez, corregir el dado de
  baja y corregir un id inexistente → 404. Consulta a Neon: una sola fila, nombre y unidad
  corregidos, `nombre_normalizado` sin tilde, creada por `admin` y dada de baja; el listado ya no
  la trae. `expo export` sin error y `grep DATABASE_URL dist/client` vacío. **Sin comprobar aún**:
  el rechazo del cambio de unidad y de la baja con stock (necesitan movimientos, T8) y el acceso
  del residente y del almacenista (necesitan sus sesiones; T12). 168 verificaciones.
- **T8**: rutas `movimientos+api.ts` (GET historial filtrado, POST ingreso o salida) y
  `movimientos/[id]/anular+api.ts` (POST). Lo compartido en
  `src/features/almacen-obra/servidor/movimientos.ts`: `historialDelMaterial` (nombres de quien
  registró y anuló, aunque estén de baja; saldo con `historialConSaldo` sobre **todo** el
  historial y el filtro aplicado después, para que el saldo no cambie al filtrar),
  `leerMovimiento` y `sentenciaDeMovimiento`. Decisiones al escribirlo:
  - El movimiento se guarda con **un `insert … select … where`** en SQL escrito, dentro del lote
    serializable: la obra se copia del material en la base, el material tiene que seguir vigente
    y, si es salida, el stock tiene que alcanzar. Los parámetros llevan tipo (`::date`,
    `::numeric`, el enum), porque en un `insert … select` Postgres los toma como texto.
  - La fecha futura se rechaza en la ruta con `validarMovimiento` y `fechaDeJornada()`, con
    todas las faltas bajo su campo. Los rechazos de stock van bajo `cantidad`.
  - La anulación de un ingreso lleva la guarda «stock − cantidad ≥ 0» y toda anulación la de
    `anulado_en is null`, así que dos anulaciones a la vez no anulan dos veces.
  **Comprobado el 2026-09-15** desde la sesión de gerencia en Chrome, con el material «Prueba
  Cemento T8» en bultos en «Consorcio Antioquia» (permiso de Diego): ingreso de 100 → 201, saldo
  100; salida de 30 «Prueba T8: cuneta PR 3» → 201, saldo 70, registrada por Diego; salida de 80
  → 409 «No alcanza: quedan 70 bultos y la salida es de 80 bultos.»; ingreso con fecha de mañana
  → 400 bajo `fecha`; listado 100/30/70; **cambiar la unidad → 409** (RF-5) y **dar de baja → 409
  con «quedan 70 bultos»** (RF-7), que T7 dejó pendientes; anular el ingreso → 409 con «−30
  bultos» (RF-26); anular la salida → 200 y stock 100; anularla otra vez → 409 «Este movimiento ya
  estaba anulado.»; **dos salidas de 60 lanzadas a la vez → una 201 (saldo 40) y la otra 409 «No
  alcanza: quedan 40 bultos…»** (RF-16); stock final 100/60/40 con 3 movimientos; el historial
  trae la salida anulada sin saldo y con quién la anuló; el filtro por tipo da 2 salidas. `expo
  export` sin error y `grep DATABASE_URL dist/client` vacío. 168 verificaciones.
  **Límite de la prueba de simultaneidad:** las dos peticiones salieron a la vez del navegador,
  pero no hay forma de ver desde fuera si llegaron a chocar dentro de Postgres (40001 o guarda) o
  si el servidor de desarrollo las atendió una tras otra. El resultado es el correcto en los dos
  casos; la protección de la base está cubierta por su diseño y por los casos de T5, no por esta
  prueba. Probarlo directo contra la base escribiría otra salida de prueba: queda a decisión de
  Diego.
  **Quedan en la base** (nada se borra): el material «Prueba Cemento T8» con stock 40, su ingreso,
  la salida de 30 anulada y la salida de 60 «simultánea A».
- **T9**: `pantalla-almacen.tsx` deja de ser provisional y hay `ventana-material.tsx` para corregir.
  - Formulario de alta (nombre, unidad de la lista y, solo para gerencia, obra), búsqueda por
    nombre, unidad y obra, filtro por obra para gerencia, tabla con material, unidad, obra,
    ingresado, salido y stock (en cero, la etiqueta «Sin stock», RF-19) y acciones «Corregir» y
    «Dar de baja» **solo para quien escribe**: el residente ve la tabla sin formulario ni botones.
  - Los anchos de la tabla ya reservan la columna de acciones para los botones de T10 y T11
    (1236 de 1280; la prueba de ancho la cuenta).
  - «Dar de baja» con stock no pide confirmación: muestra arriba el texto de `rechazoDeBaja`, el
    mismo que respondería el servidor.
  - En la ventana, con movimientos la unidad sale de solo lectura con el texto de
    `rechazoDeCambioDeUnidad`, en vez de ofrecer un selector que el servidor rechazaría.
  **Comprobado en Chrome el 2026-09-15** con gerencia, **sin escribir en la base**: se ve «Prueba
  Cemento T8» con 100 / 60 / 40 bultos y su obra; «cemento» la encuentra y «tuberia» deja la
  tabla vacía con «Ningún material coincide»; «Dar de baja» muestra «Prueba Cemento T8: No se
  puede dar de baja: todavía quedan 40 bultos…» sin pedir confirmación; «Corregir» abre la
  ventana con la unidad bloqueada y el aviso; «Cancelar» la cierra sin guardar. **Defecto
  hallado y corregido**: dentro de la fila de campos el aviso de la ventana no se partía y se
  salía por la derecha; se movió encima del formulario, como en la ventana de vehículos, y se
  volvió a mirar. **Sin comprobar a mano**: la etiqueta «Sin stock» (el único material vigente
  tiene 40), el alta desde el formulario y la vista del residente y del almacenista (T12). 168
  verificaciones.
- **T10**: `ventana-movimiento.tsx`, abierta con los botones «Ingreso» y «Salida» de cada
  fila (solo quien escribe). Fecha de texto con hoy por defecto (el panel no tiene selector de
  fecha y el del parte, con «día anterior / siguiente», no sirve aquí), cantidad con la unidad en
  la etiqueta, «Para qué se usará» en la salida y observación de varias líneas en el ingreso. El
  aviso de stock insuficiente se calcula **mientras se escribe** con `rechazoDeSalida` y
  desactiva el botón; las demás faltas (`validarMovimiento`) se pintan al intentar guardar. Lo que
  responda el servidor bajo `cantidad`, `fecha` o `paraQue` se queda en la ventana. Al guardar,
  la tabla se vuelve a pedir: el stock no se suma en la pantalla. Con cuatro botones, «Dar de
  baja» baja a una segunda línea dentro de su columna. **Comprobado en Chrome sin escribir**: la
  ventana de salida muestra «Stock actual: 40 bultos.»; con 80 dice «No alcanza: quedan 40
  bultos y la salida es de 80 bultos.» y el botón queda desactivado; con 10 y sin «para qué»
  marca «Escriba para qué se usará lo que sale.» y no envía; la de ingreso con fecha de mañana y
  sin cantidad marca las dos faltas y no envía. Consultado después: el material sigue con stock
  40 y 3 movimientos. **Ingreso real hecho por Diego** (2026-09-15): 10 bultos a «Prueba Cemento
  T8» desde la ventana; la tabla pasó de 40 a 50 bultos al guardar.
- **T11**: `historial-almacen.tsx`, una sección debajo de la tabla (no una ventana: siete
  columnas no caben en una), abierta con «Historial» en cada fila, **también para el residente**.
  Del más reciente al más antiguo; fecha, tipo, cantidad con signo, «Stock que dejó» (— si está
  anulado), quién registró y cuándo, para qué u observación y, si está anulado, «Anulado por X el
  … : motivo» con la etiqueta «Anulado». Filtros Desde / Hasta (texto AAAA-MM-DD, con aviso si está
  mal escrito) y Tipo, con `filtrarMovimientos` sobre el historial completo: el saldo no cambia al
  filtrar. Sin botones de editar ni borrar; «Anular» solo con permiso `anular`, en una ventana
  con motivo obligatorio. Si la anulación dejaría el stock negativo, la ventana muestra el texto
  de `rechazoDeAnulacion` y solo «Entendido», sin pedir motivo. El historial se vuelve a pedir
  cuando cambia el stock del material (anulación, o ingreso/salida con el historial abierto). La
  página guarda el id del material y no la fila, para leer el stock nuevo tras recargar. Tres
  comandos en verde.
  **Comprobado en Chrome el 2026-09-16** con gerencia, **sin escribir**: el historial de «Prueba
  Cemento T8» trae los 4 movimientos del más reciente al más antiguo (+10 → 50, −60 → 40, −30
  anulada sin saldo con «Anulado por Diego… : Prueba T8: salida registrada por error», +100 →
  100), cada uno con quién y cuándo; «Salidas» deja 2 filas; «Desde 2026-09-16» deja la tabla vacía
  con «Ningún movimiento coincide…»; «15/09» avisa «La fecha va en formato AAAA-MM-DD.» sin filtrar;
  «Anular» sobre el ingreso de 100 dice «…el stock quedaría en −50 bultos…» y solo «Entendido»;
  «Anular» sobre el de 10 pide motivo y sin él marca «Escriba por qué se anula.» y no envía.
  Consultado después: stock 50, 4 movimientos, 1 anulado. **Defecto hallado y corregido**: el
  motivo de la anulación se cortaba en un renglón («Prueb…»); `Celda` recibe ahora `lineas`
  (uno por defecto) y el historial usa 3 para el «para qué» y 5 para la anulación. Vuelto a mirar:
  se lee entero. Tres comandos en verde.
- **T12, primera pasada (2026-09-16) — sin cerrar.** `verificar` (168), `typecheck` y `lint` en
  verde; `expo export` sin error y `grep DATABASE_URL dist/client` vacío. Recorrido RF por RF:
  | RF | Comprobación | Resultado |
  | --- | --- | --- |
  | 1 | Material con su obra; listado filtrado por `alcance.ts`; alta del almacenista con su obra | verde en código y API (gerencia); almacenista pendiente de demo |
  | 2, 31 | Casos 2031, 2044, 2251; alta en T7 | verde |
  | 3 | Índice único parcial; caso 1794; 409 bajo `nombre` en T7 | verde |
  | 4 | Corrección de nombre en T7 | verde |
  | 5 | Caso 2183; 409 en T8; unidad bloqueada en la ventana (T9) | verde |
  | 6, 7 | Caso 2174; baja en T7 y 409 con stock en T8; aviso sin confirmar en T9 | verde |
  | 8 | Caso 2110; ingreso en T8; ingreso de Diego desde la ventana (T10) | verde |
  | 9 | Casos 2088, 2238; `check` en la base | verde |
  | 10 | Caso 2088; 400 bajo `fecha` en T8; ventana en T10 | verde |
  | 11, 13 | Casos 2088, 2221; ventana en T10 | verde |
  | 12, 14 | Retirados | — |
  | 15 | Caso 2147; 409 en T8; aviso en vivo en T10 | verde |
  | 16 | Casos 2494 y siguientes; dos salidas a la vez en T8 | verde, con el límite anotado en T8 |
  | 17, 18 | Caso 2131; listado de T7/T8; tabla de T9 | verde |
  | 19 | Etiqueta «Sin stock» en `pantalla-almacen.tsx` | **pendiente de demo** (ningún material vigente está en cero) |
  | 20 | Caso 2190; historial en T11 | verde |
  | 21 | Caso 2268; filtros en T11 | verde |
  | 22 | Búsqueda en T9 | verde |
  | 23 | Sin rutas de edición ni borrado; sin botones en T11 | verde |
  | 24, 25, 27 | Anulación en T8; historial en T11 | verde |
  | 26 | Caso 2157; 409 en T8; ventana en T11 | verde |
  | 28 | Casos 1276, 1309; `requerirPermiso` y obra de la sesión en las rutas | verde en reglas y código; **pendiente de demo** con `prueba.almacen` |
  | 29 | Caso 1309; pantalla sin formulario ni acciones de escritura para quien no escribe | **pendiente de demo** con `residente1` |
  | 30 | `registrado_por` desde la sesión; «Diego» en el historial | verde |
  Alcance: sin precios, proveedor, factura, traslados ni informes; nada fuera de la spec salvo los
  arreglos de `Celda` (`lineas`) y del aviso de la ventana, ambos de presentación. Constitución: la
  regla vive en `shared/rules` y la usan pantalla y servidor; nada se borra; secretos solo en
  `+api.ts`, comprobado.
  **Falta para cerrar**: la demo con `prueba.almacen` (registrar, ingresar, sacar, anular y ver
  «Sin stock») y con `residente1` (ver tabla e historial sin botones de escribir). Las entradas las
  hace Diego.
- **T12, cierre (2026-09-16):** Diego hizo la demo con `prueba.almacen` y con `residente1` y la dio
  por buena («Ya lo probé con ambas cuentas»). Con eso quedan comprobados RF-19, RF-28 y RF-29, y
  la spec pasa a **Cumplida**. No se vio desde aquí el detalle de cada paso de esa demo.

---

## Cambio del 2026-09-17 (RF-32 a RF-39)

Cinco tareas. T13 es independiente de las demás y se puede hacer y ver sola; T14 a T16 son la
lista de materiales, en el orden de siempre —datos, catálogo, pantalla—; T17 valida el cambio
entero.

- [x] T13. Anular deja de ser del almacenista. (RF-38, RF-39)
      En `permisos.ts`, quitar `'anular'` de `almacenista` en el módulo `almacen`, y que el
      comentario diga por qué, con la fecha. Invertir el caso del guion que hoy afirma que el
      almacenista anula.
      Hecho cuando: en el guion, el almacenista alcanza `escribir` y no `anular` en `almacen`,
      el `admin` sí, el residente sigue en `ver` y `listar`, y `motivoDeRechazo` para anular
      nombra a la gerencia; los tres comandos en verde.

- [x] T14. Script `npm run materiales`. (RF-35, anexo A)
      `scripts/importar-materiales.ts` lee `docs/materiales y equipos.xlsx`, hoja
      `MATERIALES`, toma solo la columna C, descarta repetidos con la normalización de la
      búsqueda y escribe `src/shared/catalogos/materiales.json`. Entrada en `package.json`.
      Hecho cuando: corre y deja 351 nombres; con el encabezado movido en una copia, falla
      nombrando la fila y **no escribe**; los tres comandos en verde.

- [x] T15. Catálogo `materiales.ts` con su caso. (RF-32, RF-35, RF-36)
      Tipa el JSON, expone `MATERIALES_DE_OCC` y `CLAVE_OTRO_MATERIAL`, con el bloque de
      comentario que explica por qué es catálogo del código y no tabla de la base.
      Hecho cuando: en el guion, 351 nombres, ninguno vacío ni repetido normalizando, los del
      anexo A presentes tal como los escribe OCC, y `filtrarOpciones` encuentra «cemento» y
      «acero»; los tres comandos en verde.

- [x] T16. El alta del material elige de la lista, con «Otro». (RF-32, RF-33, RF-34, RF-37)
      En `pantalla-almacen.tsx`, el campo «Nombre» pasa a `Selector` con los nombres más
      «Otro»; el campo de texto aparece solo con «Otro» y es obligatorio entonces. La unidad
      sigue como está (RF-34) y la ventana de corrección no se toca (RF-4).
      Hecho cuando: en Chrome, se registra un material de la lista y otro con «Otro»; con
      «Otro» y sin escribir nada no se puede guardar; los materiales ya registrados siguen
      listándose y admitiendo movimientos; los tres comandos en verde.

- [x] T17. Validación del cambio RF por RF con demo. (RF-32 a RF-39)
      Hecho cuando: cada RF tiene su comprobación con resultado escrito; la demo del plan está
      hecha —registrar desde la lista y con «Otro», el historial **sin** botón de anular como
      `prueba.almacen` y **con** él como gerencia—; `expo export` sin error y
      `grep DATABASE_URL dist/client` vacío; los tres comandos en verde; la spec vuelve a
      **Cumplida**.
      *La demo escribe en la base real: pedir permiso y nombres antes.*

### Notas de ejecución del cambio del 2026-09-17

- **T13**: el cambio fue quitar `'anular'` de `almacenista` en el módulo `almacen` de
  `permisos.ts`. No hizo falta tocar ni la pantalla ni la ruta: el botón del historial se
  pinta con `alcanza(rol, 'almacen', 'anular')` y `anular+api.ts` abre con
  `requerirPermiso(peticion, 'almacen', 'anular')`, así que los dos siguen a la tabla. El
  comentario del módulo explica ahora por qué la gerencia se quedó con la anulación, y se
  corrigió el del encabezado de `historial-almacen.tsx`, que decía «anular es solo de quien
  escribe» y había dejado de ser verdad.
- El caso que afirmaba que el almacenista lleva su módulo **entero** se partió: escribir sí,
  anular no, y el encargado de planta sigue anulando en cantera (la 010 no cambió). Caso
  nuevo «en el almacén solo anula la gerencia», con el texto del 403: «No puede anular este
  registro: lo hace la gerencia.» Se comprobó que fallaba antes de tocar la tabla.
- 191 verificaciones (eran 190); `typecheck` y `lint` sin hallazgos. No se tocó base de
  datos ni nada que lea un secreto, así que no hubo migración ni `expo export`.
- **Falta verlo en el navegador**: que `prueba.almacen` abra un historial y no vea el botón,
  y que la gerencia sí. Va en T17, con el resto de la demo.
- Anotado y **no tocado** (fuera de T13): en `pantalla-almacen.tsx` el aviso de la baja de un
  material y el resto del módulo siguen igual; la corrección de un material sigue con campo
  de texto libre, como dice el plan.
- **T14**: `scripts/importar-materiales.ts`, hermano del de presupuesto, con su entrada en
  `package.json`. Lee la hoja `MATERIALES` por nombre —la otra, EQUIPOS, ni se abre— y toma
  solo la columna C. **351 materiales, con 16 filas repetidas ofrecidas una sola vez**, que
  es lo que decía el anexo A. Decisiones al escribirlo:
  - El encabezado de la columna se busca como la fila que dice «MATERIALES» en la C **con la
    A vacía**: el título de la hoja también lo dice, pero ocupa la fila entera.
  - Las filas de datos son las que traen código del INVIAS (`^[A-Z]\d+$`) en la columna A.
    Los títulos y los encabezados no lo tienen.
  - Los repetidos se comparan con `normalizar` de `shared/rules/texto.ts`, la misma del
    buscador del panel: dos nombres que el buscador no puede distinguir no salen dos veces.
  - **Orden alfabético**, no el del documento, que no está ordenado del todo. Se compara sin
    tildes para que «Ácido» no quede al final.
  - **Salida: un JSON de nombres a secas.** El código del INVIAS, la unidad y el precio se
    descartan; lo que se guarda en la base sigue siendo el nombre.
  - Guarda mínima: menos de 300 nombres se trata como lista rota, no como lista corta.
- **T14, fallos probados** (sobre copias, con el JSON bueno intacto —mismo `md5` antes y
  después—): encabezado cambiado → «No encontré el encabezado «MATERIALES» en la columna C»;
  fila con código y sin nombre → «Fila 10: el material B002001 no tiene nombre.»; hoja con
  tres materiales → «Solo encontré 3 materiales…, y se esperan al menos 300.» Los tres con
  código de salida 1 y sin escribir nada.
- **T14, fuera del guion**: `AGENTS.md` suma `materiales.json` a la lista de archivos que no
  se editan a mano, junto a su comando. 191 verificaciones, `typecheck` y `lint` en verde;
  los casos del catálogo van en T15, que es donde entra al código de la aplicación.
- **T15**: `src/shared/catalogos/materiales.ts` tipa el JSON y expone `MATERIALES_DE_OCC` y
  `CLAVE_OTRO_MATERIAL`. **La lista son nombres a secas, sin id inventado**: lo que se guarda
  de un material es su nombre, y una clave propia habría que traducirla al guardar y dejaría
  sin ninguna a los materiales escritos a mano antes de este cambio (RF-37). El nombre
  elegido y el escrito con «Otro» entran por el mismo camino, así que el servidor no cambia.
- **T15, casos** (dos, 193 verificaciones): la lista llega con 351 nombres, ninguno vacío ni
  con espacios de sobra, ninguno repetido normalizando, cuatro del anexo A presentes con sus
  tildes, y ninguno que se llame «otro» —que es lo que haría chocar la salida de RF-33—; y el
  buscador encuentra «cemento», «acero» y «adoquin» sin tilde, con `filtrarOpciones`, el mismo
  del selector. Se comprobó que fallaban antes de escribir el catálogo.
- **T15**: `typecheck` y `lint` en verde. No se tocó base de datos ni nada que lea un secreto.
- **T16**: en `pantalla-almacen.tsx`, «Nombre del material» pasó a un `Selector` con las 351
  opciones, y el campo de texto —ahora «¿Cuál?»— solo aparece con «Otro» (RF-32, RF-33). Lo
  que se manda al servidor sigue siendo un nombre, elegido o escrito, así que la ruta no se
  tocó. La unidad y la obra se quedaron como estaban (RF-34). El error del servidor bajo
  `nombre` se pinta bajo el selector, o bajo «¿Cuál?» cuando es lo que se está escribiendo.
- **T16, decisión tomada en el navegador**: **«Otro» va primero en la lista**, no al final
  como «Otra actividad» en el parte. Con 351 opciones, al final hay que recorrerlas todas, y
  al buscar «otro» salen antes nueve geotextiles cuyo nombre dice «u Otros». Es la opción a la
  que se llega cuando la búsqueda no encontró nada: tiene que verse sin buscar.
- **T16, revisado en Chrome sin guardar** (sesión de gerencia, `/panel/almacen`): la lista
  abre con «Otro» arriba y los materiales detrás en orden alfabético; escribir «adoquin» sin
  tilde saca los cuatro «Adoquín» (RF-36); al elegir «Otro» aparece «¿Cuál?» con su ayuda y el
  botón sigue deshabilitado hasta llenarlo. **No se registró ningún material**: eso escribe en
  la base real y va en T17, con Diego.
- **T16**: 193 verificaciones, `typecheck` y `lint` en verde.

### T17 — validación del cambio del 2026-09-17

| RF | Cómo se comprobó | Resultado |
| --- | --- | --- |
| 32 | Demo de Diego: registró un material eligiéndolo de la lista | verde |
| 33 | Demo de Diego: registró otro con «Otro», escribiendo el nombre | verde |
| 34 | La unidad se sigue eligiendo aparte, también con «Otro» | verde |
| 35 | Caso del catálogo: 351 nombres, ninguno repetido normalizando | verde |
| 36 | En Chrome: «adoquin» sin tilde saca los cuatro «Adoquín» | verde |
| 37 | Los materiales de antes siguen listándose y admitiendo movimientos | verde |
| 38 | Demo de Diego: la gerencia **sí** ve «Anular» en el historial | verde |
| 39 | Demo de Diego con `prueba.almacen`: el botón **ya no aparece**; el 403 del servidor sale de la misma tabla, con su caso en el guion | verde en pantalla y en reglas; el 403 no se provocó a mano |

**Hallado en la demo, y no es un defecto:** al almacenista no se le ofrece elegir obra al
registrar un material. Es lo que dicen 009/RF-1 y 008/RF-5 —registra siempre en la suya, y el
servidor se la pone «mande lo que mande»—, así que ofrecerle el selector sería ofrecerle algo
que el servidor ignora. Queda anotado porque a Diego le llamó la atención la diferencia con
la gerencia.

**Cierre:** `npx expo export --platform web` sin error, `grep DATABASE_URL dist/client` vacío,
`dist` borrado. 193 verificaciones, `typecheck` y `lint` en verde. **La spec 009 vuelve a
Cumplida.**
