# Plan técnico — Spec 023

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya está y no hay que tocar

- **La bandeja de la 021**: recepción tolerante (`propuestaDeIa` es `looseObject` y la
  categoría es texto libre), resolución **al leer** contra los catálogos de la obra
  (`resolverPropuesta`), `faltasDelReporte` con todas las faltas por renglón, corrección con
  `version`, aprobación por pasos con ids deterministas (`idDeterminista` en
  `features/whatsapp/servidor/aprobacion.ts`). Los campos y la categoría nuevos entran **sin
  cambiar el esquema 2**: la integración no necesita una versión nueva del contrato.
- **Los archivos ya llegan y se guardan**: `TIPOS_DE_ARCHIVO_WHATSAPP` acepta Word y Excel, y
  `…/archivo` los sube a R2 (021/RF-7, RF-52). Lo que falta es solo que la IA los **lea**.
- **El almacén** (009): `validarMovimiento`, `rechazoDeSalida`, `totalesDelMaterial`,
  `sentenciaDeMovimiento` (el stock se comprueba en la misma sentencia que escribe),
  `baseServidorSerializable` + `conReintentoSiChoca` (RF-16), el catálogo de materiales de OCC
  y la lista cerrada de unidades (`shared/catalogos/almacen`).
- **Control Cantera** (010): `validarViaje`, `viajesDelDiaEnSql` (la misma consulta muestra los
  viajes del día y los fija al cerrar la bitácora), `ViajeDelParte` dentro del `jsonb` del parte.
- **Personas**: el acceso es `rol` + credenciales. Una persona con rol `operador`, **sin
  `credenciales_web` y sin código de activación**, no entra a ningún lado: es como hoy están
  los cadeneros y los ayudantes. `rolSugerido`, `operaVehiculos` y `IDS_CARGO` en
  `shared/catalogos/cargos.ts`.
- **`normalizar`** y `palabras` para comparar nombres sin tildes ni mayúsculas.

## Módulos y archivos

### Integración (fuera de este repo, en `C:\dev\n8n-evolutionapi`)

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `scripts/lector_archivos.js` | **Nuevo.** Lector de `.xlsx` y `.docx` en JavaScript puro con `zlib` (ver Decisiones): abre el ZIP, lee `sharedStrings`, `styles` (formatos de hora y fecha) y cada hoja **visible** en el orden del libro; devuelve texto con `=== Hoja: NOMBRE ===` y una fila por renglón con las celdas separadas por ` \| `, cada celda con el valor **como se ve** (7:30 → `07:30`, texto tal cual). Del Word: párrafos y tablas (celdas con ` \| `). Recorta a 150 000 caracteres y añade `[ARCHIVO RECORTADO: se leyeron N de M hojas]`. Un error (no es ZIP, cifrado, `.xls`, `.doc`) devuelve el motivo en vez de texto | 3–8 |
| `scripts/probar_lector.js` | **Nuevo.** Corre el lector sobre el «Formato Horas Extras» y sobre un `.docx` de prueba, e imprime lo que vería la IA | 3–6 |
| `scripts/generar_workflow_clasificar.py` | Inserta el lector en el nodo «Armar petición». La consulta trae el `base64` también de Excel y Word. El archivo leído va a la IA como `document` de **texto** (`source.type = 'text'`) con el nombre del archivo como título. Si no se pudo leer, la línea del adjunto dice por qué. **Esquema** (como instrucción, igual que hoy): categoría `reporte_almacen`; `personal[].cargo_hoja`; `viajes[].vale`; `almacen: { ingresos: [{ material, cantidad, unidad, entregado_por, observacion }], salidas: [{ material, cantidad, unidad, recibido_por, para_que }] }`. **Instrucciones** nuevas: el reporte de personal en archivo (fecha del encabezado «DIA 05 MES 10 AÑO 2026», todas las hojas juntas, una persona una vez, el nombre de la hoja en `cargo_hoja`, sin las columnas de horas extra), la plantilla del almacén y el número de vale (del texto o de la foto del vale, tal como se escribe) | 1–17, 18–21, 50, 62 |
| `vps/compose.yaml`, `docker-compose.yml` | `NODE_FUNCTION_ALLOW_BUILTIN: zlib` en el servicio `n8n` | 3, 6 |
| `plantilla_reporte_whatsapp.md` | La línea «Vale:» en cada viaje | 50 |
| `plantilla_reporte_almacen.md` | Ya escrita; queda como versión 1 | 18–21 |

### PreOperaOCC

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/db/servidor/esquema.ts` + migración `0020_…` | `cantera_viajes.vale` (texto, nulo; `check char_length(vale) between 1 and 30`) e índice `(obra_id, lower(vale)) where vale is not null`; `almacen_movimientos.mensaje_whatsapp_id`; `usuarios.registrado_por` y `usuarios.mensaje_whatsapp_id` (nulos, con su referencia) | 41–44, 55, 37, 38, 68 |
| `src/shared/rules/cantera.ts` | `valeLimpio(texto)` (recorta; vacío → `null`, RF-44), `faltaDeVale` (más de 30 → mensaje, RF-55), `mismoVale(a, b)` (sin distinguir mayúsculas, RF-56), `avisoDeValeRepetido(vale, viajes)` → el viaje donde ya está o `null` (RF-45). `validarViaje` mira el largo | 41–45, 55, 56 |
| `src/shared/rules/almacen.ts` | `unidadDeTexto` («bultos», «Bto», «kg», «m3», «mts» → slug de la lista cerrada, o `null`); `saldoDelReporte` (ordena los movimientos del reporte por fecha, ingresos antes que salidas en el mismo día, y recorre el stock leído; devuelve la falta de cada salida que no alcanza, con el texto de `rechazoDeSalida`) | 30, 33, 34 |
| `src/shared/rules/whatsapp.ts` | Categoría `reporte_almacen` → destino nuevo `almacen`, rótulo «Reporte de almacén». `ReporteDelDia.almacen: MovimientoDelReporte[]` (tipo, `materialId` o `materialNuevo { nombre, unidad }`, lo escrito, cantidad en centésimas, unidad escrita, responsable, para qué, observación). `ViajeDelReporte.vale`. `PersonaDelReporte.cargoPropuesto`. `resolverPropuesta` lee `almacen`, `vale` y `cargo_hoja`. `faltasDelReporte` añade la sección `almacen`: material sin elegir ni registrar, nombre nuevo que ya existe, unidad distinta de la del material, falta quién entregó o recibió, falta para qué, cantidad ≤ 0 y el saldo de `saldoDelReporte`. `cargoDeHoja` («CONDUCTORES» → conductor, «OPERADORES» → operador, «CONTROLADORAS» → controlador_vial, «TOPOGRAFIA» → topografo, y el nombre de cualquier cargo de la lista en singular o plural; lo demás → `null`). `posiblesCoincidencias(nombre, personas)`: las personas con **dos o más palabras en común**, sin contar las de menos de tres letras («de», «la») | 11–17, 18–21, 26–34, 50, 62, 65 |
| `src/features/panel/contratos.ts` | `propuestaDeIa`: `almacen`, `viajes[].vale`, `personal[].cargo_hoja` (opcionales). `reporteCorregido`: `almacen` (máx. 60), `viajes[].vale`, `personal[].cargoPropuesto`. `viajeNuevo.vale` opcional y `valeRepetidoConfirmado` opcional. `personasDesdeLaBandeja` (`version`, lista de `{ seccion, renglon, nombre, cargo }`) | 19, 20, 41–45, 51, 57–66 |
| `src/features/cantera/servidor/parte.ts` | `'vale', v.vale` en `viajesDelDiaEnSql`: se ve en la sección y se fija al cerrar | 47, 48 |
| `src/features/bitacoras/tipos.ts` | `ViajeDelParte.vale?` (ausente en los fijados antes, RF-49) | 47–49 |
| `src/app/api/panel/cantera/viajes+api.ts` | Guarda `vale`. Si el vale ya está en otro viaje vigente de la obra y no viene `valeRepetidoConfirmado` → `409 { aviso, viajeRepetido }`, sin guardar. La lectura trae `vale` | 41–46, 56 |
| `src/features/cantera/servidor/viajes.ts` | `viajesConVale(obraId, vale)`: los vigentes de la obra con ese vale, para el aviso | 45 |
| `src/features/whatsapp/servidor/bandeja.ts` | Los catálogos de la obra suman los **materiales del almacén con su unidad y su stock** (si la obra lleva almacén) y el cargo de cada persona. El detalle añade, por renglón: `posiblesCoincidencias` de cada persona no reconocida y el aviso de vale repetido de cada viaje | 26, 45, 65 |
| `src/features/whatsapp/servidor/personas.ts` | **Nuevo.** Registra las personas pedidas desde la bandeja: una sola sentencia `insert … on conflict do nothing` con id determinista (mensaje + sección + renglón), `rol = 'operador'`, sin credenciales, `obra_id` = la del mensaje, `cargo`, `registrado_por`, `mensaje_whatsapp_id`, y `usuario` generado (`wa.` + nombre sin tildes + 4 cifras del id). Después guarda en la propuesta el `usuarioId` de cada renglón (misma corrección con `version`) | 57–68 |
| `src/app/api/panel/whatsapp/propuestas/[id]/personas+api.ts` | **Nueva.** `POST`, permiso `whatsapp:aprobar` | 57, 58, 66 |
| `src/features/whatsapp/servidor/almacen.ts` | **Nuevo.** La aprobación de un reporte de almacén (ver Algoritmo) | 22, 25–40, 53, 54 |
| `src/features/whatsapp/servidor/aprobacion.ts` | Con destino `almacen` llama a `almacen.ts` en vez de abrir la bitácora (RF-40). Los viajes llevan `vale` | 35, 40, 50 |
| `src/features/almacen-obra/servidor/movimientos.ts` | `historialDelMaterial` lee `mensaje_whatsapp_id` → `desdeWhatsapp` | 38 |
| `src/features/panel/whatsapp/propuesta-reporte.tsx` | Sección **Almacén**: ingresos y salidas editables; el material se elige o se registra nuevo (lista de OCC u «Otro» + unidad de la lista cerrada); stock disponible al lado de cada salida. En **Personal**: «Registrar» en cada no reconocida, con sus posibles coincidencias, y «Registrar todas las no reconocidas» (ventana con el cargo propuesto de cada una, cambiable, y casilla para excluir). En **Viajes**: el vale, editable, con el aviso de repetido | 19–21, 26–28, 33, 45, 51, 57–66 |
| `src/features/panel/ventana-viaje.tsx`, `listado-viajes.tsx` | Campo «N.º de vale» (opcional); en el listado, el vale debajo de la volqueta (columna «Volqueta y vale»: una columna propia no cabe en 888, ver notas de T4); el 409 de vale repetido se muestra en la ventana con el botón «Guardar igual». `ErrorApi.cuerpo` lleva la respuesta entera para leer el 409 | 41–46 |
| `src/features/panel/pantalla-partes.tsx` | El vale en la sección Control Cantera de la bitácora, cuando lo hay | 47–49 |
| `src/features/panel/historial-almacen.tsx` | La marca «desde WhatsApp» en el historial | 38 |
| `src/features/panel/cliente-api.ts` | `api.whatsapp.registrarPersonas`; `vale` y `valeRepetidoConfirmado` en los viajes | — |
| `scripts/verificar-reglas.ts` | Casos de las reglas nuevas (ver Verificación) | todas las de reglas |

Los permisos **no cambian** en `permisos.ts`: la bandeja ya es de gerencia y residente
(`whatsapp:aprobar`) y el almacenista sigue sin ella (RF-24). Que el residente apruebe
movimientos de almacén y registre personas sale de que la ruta de la bandeja pide su propio
permiso, no `almacen:escribir` ni `personas:escribir` (RF-22, RF-23, RF-58, RF-59), igual que
los viajes en la 021.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.** Nada viaja al celular.
- **Servidor** (`src/db/servidor/esquema.ts`), migración `0020`:
  - `cantera_viajes.vale text null`, `check (vale is null or char_length(vale) between 1 and 30)`,
    índice `ix_cantera_viaje_vale on (obra_id, lower(vale)) where vale is not null`. **No
    único**: un repetido se avisa y se deja guardar (RF-45).
  - `almacen_movimientos.mensaje_whatsapp_id text null references whatsapp_mensajes(id)`.
  - `usuarios.registrado_por text null references usuarios(id)` y
    `usuarios.mensaje_whatsapp_id text null references whatsapp_mensajes(id)`.
  - El vale de los viajes **fijados** va dentro del `jsonb` del parte (`ViajeDelParte.vale`):
    sin columna en `partes_de_obra`.
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0020_….sql`. Producción
  con `scripts/migrar-produccion.ts` **antes** de levantar la imagen nueva.
- **Compatibilidad**: los teléfonos no se enteran. Las columnas nuevas son nulas: viajes,
  movimientos y personas anteriores se leen igual (RF-49). La imagen vieja ignora las columnas
  nuevas, así que migrar antes no rompe lo que está corriendo.

## Algoritmo / reglas

**Leer un archivo** (integración, nodo «Armar petición»):

1. Foto → bloque `image`; PDF → bloque `document` en base64 (como hoy, RF-1, RF-2).
2. `.xlsx` → `lector_archivos.leerExcel(bytes)`; `.docx` → `leerWord(bytes)`. El texto va en un
   bloque `document` de tipo texto, con el nombre del archivo como título (RF-3 a RF-6, RF-10).
3. Formato de celda (RF-5): si la celda tiene un número con formato de hora (formatos 18–21,
   45–47 o uno propio con `h` y `mm`), se escribe `HH:MM`; con formato de fecha, `AAAA-MM-DD`;
   un texto, tal cual («6:00Pm»). Las celdas vacías se omiten; una fila vacía no se escribe.
4. Más de 150 000 caracteres → se recorta por hojas completas y se avisa en el texto (RF-8).
5. Si no se puede leer → la línea del adjunto dice `(no se pudo leer: <motivo>)` y la
   instrucción obliga a `requiere_revision` con ese motivo (RF-7).

**Reporte de almacén** (`features/whatsapp/servidor/almacen.ts`, RF-22 a RF-40):

1. Mensaje pendiente, versión y obra al alcance (como la 021). La obra con
   `almacen_activo = false` → 400 con el motivo (RF-25).
2. `faltasDelReporte` (sección `almacen`) con los materiales vigentes y su stock leídos ahora.
   Cualquier falta → 400 con todas (RF-26 a RF-34, RF-36).
3. Ids deterministas: cada material nuevo (mensaje + `material` + nombre normalizado: dos
   renglones con el mismo material nuevo dan **un** material) y cada movimiento (mensaje +
   `almacen` + renglón).
4. **Un lote serializable** con dos sentencias:
   - `insert into almacen_materiales … on conflict do nothing` con los nuevos (RF-28, RF-29; el
     índice único por nombre vigente rechaza el repetido que llegue entre medias).
   - **Una sola** sentencia con todos los movimientos, que primero comprueba en SQL, por
     material, que **stock actual + ingresos del reporte − salidas del reporte ≥ 0** y que los
     materiales sigan vigentes. Si no se cumple, la sentencia **lanza un error a propósito**
     (un `cast` que falla con el texto `stock_insuficiente`): el lote entero se deshace, incluidos
     los materiales nuevos (RF-35). Si los ids ya existen (reintento), no inserta nada y sigue.
5. Error `stock_insuficiente` → se vuelve a leer y se responde 409 con las faltas de
   `saldoDelReporte` (otra salida entró en medio, 009/RF-16). Error `40001` →
   `conReintentoSiChoca`.
6. `registrado_por` = quien aprueba; `mensaje_whatsapp_id` = el mensaje (RF-37). Se marca el
   mensaje aprobado igual que en la 021, sin `parte_id` (RF-40).

La comprobación del orden por fechas (RF-34) la hace la regla pura con lo leído; la guarda en
SQL solo repite lo que puede cambiar entre leer y escribir —el saldo final por material—, igual
que `sentenciaDeMovimiento` repite «el stock alcanza».

**Personas desde la bandeja** (`features/whatsapp/servidor/personas.ts`, RF-57 a RF-68):

1. Mensaje pendiente, versión y obra al alcance; permiso `whatsapp:aprobar`.
2. Cada pedido: nombre recortado y no vacío; cargo de `IDS_CARGO` o nulo (RF-60, RF-61); el
   renglón existe en la propuesta y no tiene persona elegida.
3. Una sentencia `insert into usuarios … on conflict do nothing` con todos (RF-66). El `usuario`
   generado no se va a usar para entrar (no hay credenciales, RF-64), pero la columna es
   obligatoria y única entre vigentes; con las 4 cifras del id determinista no choca.
4. Se guarda la propuesta con el `usuarioId` de cada renglón (la corrección de la 021, con
   `version`). Si se descarta después, las personas quedan (RF-67).

**Vale** (RF-41 a RF-52, RF-55, RF-56): la regla limpia y mide; la ruta del módulo busca
`viajesConVale` y, si hay y no viene confirmado, responde 409 con el viaje. La bandeja no
bloquea por vale repetido: lo muestra como aviso en el renglón. Un viaje registrado no se
modifica (no hay ruta para cambiar el vale, RF-52).

## Decisiones técnicas

- **Leer Excel y Word en el nodo Code de n8n con `zlib` de Node** → se descartó el nodo
  «Extract from File» (lee una sola hoja y no lee Word), un contenedor aparte con LibreOffice o
  Python (otro servicio, más memoria en un VPS que ya tiene límites) y leerlos en PreOperaOCC (la
  IA corre en n8n, antes de que el panel reciba nada). `.xlsx` y `.docx` son ZIP con XML; leerlos
  son unas 200 líneas sin dependencias. Requiere `NODE_FUNCTION_ALLOW_BUILTIN=zlib`.
- **El archivo va a la IA como documento de texto, no convertido a PDF ni a imagen** → se
  descartó convertirlo a PDF (otro programa en el VPS) y pegar el texto en el mensaje (la IA
  confunde el contenido del archivo con el texto del chat; con el bloque `document` y el título
  sabe de dónde sale cada dato).
- **El lector se escribe como archivo propio y el generador lo incrusta** → se descartó
  escribirlo dentro de la cadena del generador: así se prueba con `node` sobre el Excel real antes
  de tocar n8n.
- **Sin esquema 3** → la propuesta es `looseObject` y la categoría es texto: los campos nuevos
  entran por el esquema 2. Se descartó subir la versión, que obligaría a desplegar n8n y el panel
  en el mismo minuto.
- **Personas: acción aparte, antes de aprobar** → se descartó registrarlas dentro de la
  aprobación: RF-67 dice que quedan aunque se descarte el reporte, y el residente tiene que ver a
  la persona reconocida (y su cargo) antes de aprobar. Los materiales, en cambio, se crean dentro
  de la aprobación (RF-27, RF-35): un material sin movimientos no le sirve a nadie.
- **Almacén: todo en un lote serializable con una guarda que lanza error** → se descartó la
  guarda que solo «no inserta» (en un lote, la sentencia de los materiales nuevos se confirmaría
  igual y quedarían materiales sueltos), y se descartó insertar movimiento por movimiento (sin
  transacción interactiva, una salida podría quedar sin su ingreso).
- **Vale repetido: 409 con confirmación** → se descartó guardar y avisar después (el aviso llega
  cuando ya no hay nada que decidir) y un índice único (RF-45 deja guardarlo).
- **Vale como texto sin normalizar** (solo se recortan los extremos) → se descartó quitar guiones
  o espacios para comparar: la spec dice que se guarda como se escribe y que solo las mayúsculas
  no cuentan (RF-43, RF-56).
- **Persona nueva con `rol = 'operador'` y sin credenciales** → se descartó un rol nuevo «sin
  acceso» (migración del enum y una fila más en la tabla de permisos para algo que ya resuelve no
  tener credenciales).
- **`cargoDeHoja` en la regla, además de lo que proponga la IA** → la IA pone el nombre de la
  hoja (`cargo_hoja`) y el servidor lo traduce a un cargo con su propia regla, como hace con las
  abscisas y las horas: no confía en la IA para elegir de una lista cerrada.

## Impacto en la sincronización

Sin impacto en la sincronización. Ni el pull ni el outbox cambian: los viajes, el almacén, la
bandeja y las personas registradas desde ella son del servidor. Una persona nueva con cargo
Conductor u Operador no llega a ningún celular hasta que la gerencia le emita un código.

## Contrato de API

**Integración**: sin cambios de ruta ni de guardia. La entrega lleva los campos nuevos dentro de
`propuesta` (esquema 2).

**Panel** (guardia de cookie; obra al alcance con `alcance.ts`):

- `POST /api/panel/whatsapp/propuestas/:id/personas` — `whatsapp:aprobar`. Cuerpo
  `{ version, personas: [{ seccion: 'personal' | 'maquinaria', renglon, nombre, cargo | null }] }`
  → `201 { version, personas: [{ renglon, usuarioId }] }` · `400` (nombre vacío, cargo que no
  existe, renglón que no existe o ya tiene persona) · `404` · `409` (la propuesta cambió o ya no
  está pendiente).
- `POST /api/panel/whatsapp/propuestas/:id/aprobar` — sin cambio de forma; con destino `almacen`
  responde `200 { movimientos, materialesNuevos }` · `400 { faltas }` · `409` (stock que cambió,
  propuesta que cambió).
- `POST /api/panel/cantera/viajes` — `vale?` y `valeRepetidoConfirmado?` → `201` · `409 { error,
  aviso: 'valeRepetido', viaje: { id, fecha, hora, volqueta } }` · `400` (vale de más de 30).
- `GET /api/panel/cantera/viajes`, la sección Control Cantera del parte y
  `GET /api/panel/almacen/movimientos`: traen `vale` y `desdeWhatsapp`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - `valeLimpio`, `faltaDeVale`, `mismoVale`, `avisoDeValeRepetido`: «F-0458», « 0458 A », «12.345»
    se guardan como se escriben (recortados); solo espacios → nulo; 31 caracteres → falta;
    «f-0458» = «F-0458»; «F-0458» ≠ «F0458»; anulado no cuenta (RF-43 a RF-45, RF-55, RF-56).
  - `validarViaje` con vale largo (RF-55).
  - `unidadDeTexto`: «bultos», «Bto», «kg», «m3», «mts», «galones», desconocida → nula (RF-30).
  - `saldoDelReporte`: salida que alcanza con el ingreso del mismo día; salida anterior al ingreso
    que no alcanza; material nuevo empieza en cero; dos salidas que juntas superan (RF-33, RF-34).
  - `faltasDelReporte` sección almacén: material sin elegir, nombre nuevo que ya existe, unidad
    distinta, sin quién entregó, sin quién recibió, sin para qué, fecha futura — todas a la vez
    (RF-27 a RF-33, RF-36).
  - `destinoDeCategoria('reporte_almacen') === 'almacen'` y su rótulo (RF-18).
  - `resolverPropuesta` con `almacen`, `vale` y `cargo_hoja` (RF-19 a RF-21, RF-50, RF-62).
  - `cargoDeHoja`: CONDUCTORES, OPERADORES, CONTROLADORAS, TOPOGRAFIA, «Operador», INGENIEROS →
    nulo, «OFICIO VARIOS (2)» → nulo (RF-62).
  - `posiblesCoincidencias`: «OSCAR OLIVERO» con «Oscar Olivero Pérez» (sí), con «Oscar Velandia»
    (no, una palabra), «JOSE DE LA CRUZ» con «José de Ávila» (no: «de» no cuenta) (RF-65).
  - Contratos: `personasDesdeLaBandeja` sin nombre o con cargo inexistente; `viajeNuevo` con vale.
  - Ancho: la tabla de viajes con la columna nueva sigue dentro de 1366 puntos (005/RF-20).
- **Integración**: `node scripts/probar_lector.js` sobre el «Formato Horas Extras»: 7 hojas, sus
  nombres, 37 personas, `07:30` y `6:00Pm`; sobre un `.docx` de prueba con tabla; sobre un `.xls`
  renombrado → motivo. Luego `--ids` con un mensaje de prueba en `occ_whatsapp` de desarrollo.
- **Demo manual**: los pasos 1 a 7 de los criterios de finalización de la spec, primero con
  `curl` contra desarrollo y después con n8n real en el grupo de prueba.
- **Comprobaciones extra**: pedir `POST …/personas` como almacenista → 403; como residente de
  otra obra → 404; `POST /api/panel/personas` como residente sigue en 403 (RF-59);
  `POST /api/panel/almacen/movimientos` como residente sigue en 403 (RF-23).

## Riesgos

- **`zlib` no llega al nodo Code** (n8n 2.x corre el código en un *task runner* y puede no pasarle
  la variable). Se detecta en la primera ejecución («Module 'zlib' is disallowed»). Salida: la
  variable del runner (`N8N_RUNNERS_…`) o leer el ZIP con `DecompressionStream`, que es estándar
  y no necesita permiso. Se prueba en el n8n del PC **sin levantar Evolution** (nunca dos
  sesiones de WhatsApp a la vez).
- **La IA lee mal una hora del Excel o un vale de una foto borrosa.** Lo frena la aprobación
  humana; el vale se puede dejar vacío (RF-42).
- **Desplegar n8n antes que el panel**: llegaría `reporte_almacen` a un panel que no lo conoce;
  la bandeja lo muestra con su nombre crudo y no lo deja aprobar (destino `ninguno`). Orden:
  migración → imagen del panel → n8n.
- **Personas duplicadas** si el residente registra a alguien que ya existía con otro nombre. Lo
  reduce RF-65; si pasa, la gerencia da de baja la sobrante (la persona no tiene movimientos de
  acceso ni preoperacionales).
- **Excel enorme** (un consolidado del mes): se recorta y se avisa (RF-8); el residente decide.
- **El Excel del 5 de octubre ya está en producción** como «administrativo»: para volver a
  clasificarlo hay que borrar su `clasificacion` y su `entregado_en` en `occ_whatsapp` y correr
  `--ids`; la entrega reemplaza la propuesta porque sigue pendiente y sin corregir (021/RF-5).
  Si alguien ya la corrigió, no se reemplaza: se descarta y se reenvía el archivo.
- **Reversión**: las columnas nuevas son nulas y nada viejo las lee; volver a la imagen anterior
  deja de mostrar el vale y la sección de almacén sin perder datos. En n8n, reimportar el
  workflow anterior.
