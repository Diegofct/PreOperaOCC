# Tareas — Spec 010

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas

- [x] T1. `shared/rules/cantera.ts`: abscisa (opciones, validación y forma) y `validarViaje`, con
      sus casos. (RF-11 a RF-19, RF-34)
      Hecho cuando: en verde 26 opciones de PR y 40 de metros; «PR 5 + 300», «PR 25 + 975» y
      «PR 0 + 050»; falta de PR y de metros nombradas; PR 26, metros 980 y 310 rechazados;
      destino sitio con PR, origen igual al destino, fecha de mañana y viaje sin conductor
      rechazados, cada uno bajo su campo.

- [x] T2. `shared/rules/cantera.ts`: `volquetaElegible`, `conductorElegible`, `filtrarViajes` y
      `estadoCanteraDelParte`; en `parte.ts`, la sección `cantera` del índice. Con sus casos.
      (RF-8, RF-21, RF-25, RF-28, RF-31, RF-35 a RF-37)
      Hecho cuando: en verde que solo la volqueta operativa de la obra es elegible; que
      `cadenero_1` no conduce y `conductor` sí; el filtro por los cuatro criterios sin esconder
      anulados; los cuatro estados de la sección; y que el índice trae «Control Cantera» con su
      conteo, dice «Sin viajes» con cero y `bloqueosDelCierre` no cambia.

## Datos

- [x] T3. Tablas de sitios, materiales y viajes, enum de tipo de sitio y columna nula
      `partes_de_obra.cantera`, con su migración aplicada en Neon. `ViajeDelParte` en
      `bitacoras/tipos.ts`. (RF-1, RF-2, RF-3, RF-7, RF-15, RF-16, RF-18, RF-23, RF-29)
      Hecho cuando: `0011_*.sql` solo crea el tipo, las tres tablas con sus llaves, índices y
      `check`, y añade la columna nula; se aplica en Neon y una consulta lista las tres tablas y la
      columna, con los partes existentes en `null`. *Toca la base real: se pide permiso.*

## Servidor

- [x] T4. Contratos y `api.cantera` / `api.partes.cantera`; `duplicadoDe` con los dos índices.
      (RF-1 a RF-4, RF-7, RF-10 a RF-16, RF-34)
      Hecho cuando: en verde que `viajeNuevo` rechaza destino obra sin metros y destino sitio con
      PR, y que los duplicados van bajo `nombre`; los tres comandos en verde.

- [x] T5. Rutas de sitios y materiales: listar, registrar, corregir y dar de baja. (RF-1 a RF-6,
      RF-32, RF-33)
      Hecho cuando: con peticiones desde la sesión de gerencia en Chrome, en «Consorcio
      Antioquia»: alta de un sitio y un material de prueba → 201; el mismo nombre con otras tildes
      → 409 bajo `nombre`; corrección → 200; baja → 200 y deja de salir en las opciones.
      *Escribe en Neon: se pide permiso y se usan nombres de prueba reconocibles.*

- [x] T6. Ruta de opciones y rutas de viajes: registrar (con aviso de bitácora cerrada), listar por
      periodo y anular. (RF-7 a RF-25, RF-30, RF-34, RF-35)
      Hecho cuando: con peticiones desde la sesión de gerencia: las opciones traen solo volquetas
      operativas de la obra y conductores con cargo que conduce; un viaje a la obra en PR 5 + 300
      → 201 con su abscisa; sin metros → 400 bajo `metros`; origen igual al destino → 400; el
      listado lo trae con quién y cuándo; anularlo → 200 y sigue en el listado marcado. *Escribe
      en Neon: se pide permiso.*

- [x] T7. Cierre del parte que fija los viajes y ruta `partes/[id]/cantera`. (RF-26, RF-27, RF-29,
      RF-31, RF-36, RF-37)
      Hecho cuando: la sentencia de cierre lleva el `jsonb_agg` de los viajes vigentes; la ruta
      devuelve los vigentes de un parte abierto; y un parte cerrado antes del cambio responde
      el estado «cerrado antes del control de cantera». Se comprueba contra la base **sin cerrar
      ningún parte**; el cierre real va en la demo de T11.

## Panel

- [x] T8. Pantalla de Control Cantera: sitios y materiales con alta, corrección y baja. (RF-1 a
      RF-6, RF-32, RF-33)
      Hecho cuando: en Chrome con gerencia se ven las dos tablas con los datos de prueba, el
      residente no tendría botones (revisado en código) y las tablas caben (prueba de ancho).

- [x] T9. Ventana de viaje: fecha y hora, material, volqueta, conductor, origen, destino y, si el
      destino es la obra, PR y metros con el selector del panel; aviso de bitácora cerrada. (RF-7
      a RF-19, RF-30, RF-34, RF-35)
      Hecho cuando: en Chrome, sin guardar, PR y metros aparecen solo con destino obra, el origen
      no ofrece la obra, y guardar sin metros o con origen igual al destino marca el campo.

- [x] T10. Listado de viajes por periodo, con filtros y anulación, y la sección «Control
      Cantera» de solo lectura en la bitácora con su entrada en el índice. (RF-20 a RF-28,
      RF-31, RF-37)
      Hecho cuando: en Chrome el listado muestra el viaje de prueba con «PR 5 + 300», los filtros
      lo ocultan y lo muestran, y la bitácora de ese día trae la sección con su conteo en el índice.

## Validación

- [ ] T11. Validación final: recorrido RF por RF de la spec y demo manual. (Todas)
      Hecho cuando: cada RF tiene su comprobación con resultado, la demo de la spec está hecha
      con `prueba.planta` y `residente1` (las entradas y el cierre de la bitácora los hace Diego,
      en un día acordado), `expo export` sin error con `grep DATABASE_URL dist/client` vacío, los
      tres comandos en verde y la spec marcada como Cumplida.

## Notas de ejecución

- **Antes de T1 (2026-09-16):** Diego decidió dos precisiones que el plan ya suponía y que se
  anotaron en la spec: solo se ofrecen volquetas **operativas** (RF-8) y la abscisa lleva los
  metros **con tres cifras** (RF-17).
- **T1**: `src/shared/rules/cantera.ts` con `DESTINO_OBRA`, `OPCIONES_DE_PR` (26),
  `OPCIONES_DE_METROS` (40), `formatearAbscisa`, `MENSAJES_DE_VIAJE`, `validarAbscisa` y
  `validarViaje`. Decisiones al escribirlo:
  - Las faltas van por campo con los nombres del contrato que vendrá en T4 (`materialId`,
    `vehiculoId`, `conductorId`, `origenId`, `destino`, `pr`, `metros`, `fecha`, `hora`).
  - **Con destino que no es la obra, un PR o unos metros que lleguen se rechazan** («El PR y los
    metros solo se anotan cuando el destino es la obra.»), en vez de descartarlos en silencio.
    RF-15 dice que no se guardan; rechazarlos cumple eso y delata un formulario que se quedó con
    los datos de la obra. La pantalla (T9) los limpiará al cambiar el destino, así que no debería
    verse nunca desde el panel.
  - La hora es `HH:MM` de 00:00 a 23:59; «7:30» se rechaza. Solo se mira el día para RF-19: una
    hora posterior a la de ahora, hoy mismo, se acepta.
  Cinco casos nuevos (173 verificaciones).
- **T2**: en `cantera.ts`, `volquetaElegible` (obra, tipo `volqueta`, estado `operativo`, sin baja),
  `conductorElegible` (obra, activa, sin baja, cargo con `operaVehiculos`), `filtrarViajes` y
  `canteraDelParte` —el plan la llamaba `estadoCanteraDelParte`; devuelve estado, viajes y aviso—.
  Sus tres estados: `vigentes` (abierto; «Todavía no hay viajes de cantera registrados para este
  día.» si no hay), `fijados` (cerrado; «Ese día no se registraron viajes de cantera.» si la lista
  fijada está vacía) y `antes_del_control` (cerrado sin nada fijado: «Esta bitácora se cerró antes
  de que existiera el control de cantera.»). En `parte.ts`, título «Control Cantera», id `cantera`
  después de `laboratorio`, y `SeccionDelParte.detalle` para que con cero viajes el índice diga «–
  sin viajes» (`no_aplica`) en vez de «○ sin registrar»; `secciones-con-indice.tsx` lo usa.
  **Decisión no prevista en el plan:** `ConteosDelParte.cantera` es **opcional** y, ausente, la
  sección no sale en el índice. Hasta que T10 le pase el conteo, la bitácora sigue como está, en vez
  de enseñar una entrada «comprobando» que nunca termina. `bloqueosDelCierre` no se tocó. Cinco
  casos nuevos (178 verificaciones).
- **T3**: `tipoSitioCantera`, `canteraSitios`, `canteraMateriales` y `canteraViajes` en
  `esquema.ts`, y `partes_de_obra.cantera` (jsonb nula, **sin** valor por defecto); `ViajeDelParte`
  en `bitacoras/tipos.ts` (hora, material, volqueta, conductor, origen, destino o `null`,
  `destinoObra`, `pr`, `metros`: nombres, no ids). Tres `check`: destino/abscisa, origen distinto
  del destino y formato de la hora (este último no estaba en el plan). **Defecto evitado antes de
  generar:** el `check` de destino aceptaba un viaje a la obra sin PR, porque en Postgres una
  restricción que da nulo pasa; se añadió `pr is not null and metros is not null`. Migración
  `0011_third_vivisector.sql`: solo `CREATE TYPE`, tres `CREATE TABLE`, `ADD COLUMN "cantera" jsonb`,
  llaves e índices. Aplicada en Neon el 2026-09-16 con permiso de Diego. Consultado: las tres tablas
  (9, 8 y 17 columnas), el tipo con cantera/planta/otro, los tres `check`, los índices únicos
  parciales y el de obra-fecha, la columna nula sin valor por defecto, y los 5 partes existentes con
  `cantera` en `null`. **Ninguno de esos 5 partes está cerrado**, así que el estado «cerrada antes
  del control de cantera» no se podrá ver en la demo; queda cubierto por su caso. `db:generate` del
  celular: «No schema changes». Tres comandos en verde (178 verificaciones).
- **T4**: en `contratos.ts`, `TIPOS_SITIO` y `ETIQUETA_TIPO_SITIO`; `sitioNuevo`/`sitioEditado`,
  `materialDeCanteraNuevo`/`Editado` (con `obraId` que solo usa gerencia); `viajeNuevo`; las filas
  `SitioDeCanteraFila`, `MaterialDeCanteraFila`, `ViajeFila`, `OpcionesDeCantera`,
  `ViajeRegistrado`/`ViajeAnulado` (con `aviso`), `ConsultaDeViajes` y `CanteraDelParteFila`. En
  `cliente-api.ts`, `api.cantera.{opciones, sitios, materiales, viajes}` y `api.partes.cantera`. En
  `respuestas.ts`, los dos índices de nombre bajo `nombre`. **Cambio en la regla de T1:** la
  comprobación del destino y la abscisa salió de `validarViaje` a `faltasDelDestino`, que usan la
  regla y el `superRefine` del contrato; así el contrato no reescribe la regla ni necesita «hoy».
  La fecha futura sigue en la ruta. Dos casos nuevos y dos asertos más en el de duplicados (180
  verificaciones).
- **T5**: rutas `cantera/sitios+api.ts` (GET, POST), `sitios/[id]+api.ts` (PATCH),
  `sitios/[id]/baja+api.ts` (POST) y las tres equivalentes de `materiales`. Lo compartido en
  `src/features/cantera/servidor/catalogos.ts`: `condicionDeObra` (la gerencia pide obra; los demás,
  la suya), `obraParaRegistrar` (400 bajo `obraId` si gerencia no la dice o no existe; aviso de
  pedir obra si el encargado no tiene), lecturas y «al alcance». Se escribieron las funciones de los
  dos catálogos por separado y no una genérica sobre dos tablas. La baja no tiene condición (RF-5):
  un sitio usado se da de baja igual.
  **Comprobado el 2026-09-16** desde la sesión de gerencia en Chrome, sobre «Consorcio Antioquia»
  (permiso de Diego): sitio sin obra → 400 `campos.obraId` «Elija la obra.»; tipo «botadero» → 400
  `campos.tipo`; «Prueba Cantera T5» cantera → 201 con su obra; « prueba cántera t5 » → 409
  `campos.nombre`; «Prueba Afirmado T5» → 201; «PRUEBA AFÍRMADO T5» → 409 `campos.nombre`; los
  dos en su listado; corrección a «Prueba Cantera T5 corregida» planta y «Prueba Afirmado T5
  corregido» → 200; bajas → 200; baja otra vez → 404; los dos fuera del listado. **Paso añadido que
  no estaba en lo propuesto a Diego (dicho en el momento):** volver a registrar «Prueba Cantera T5
  corregida» tras su baja → 201 (el índice parcial lo permite, caso límite de RF-3); ese segundo
  sitio se dio de baja enseguida. Al terminar, 0 sitios y 0 materiales vigentes en la obra. **Queda
  en la base** (dado de baja): dos sitios y un material de prueba. «Deja de salir en las
  opciones» se comprueba con la ruta de opciones en T6; aquí se vio con el listado, que solo trae
  vigentes. `expo export` sin error y `grep DATABASE_URL dist/client` vacío. 180 verificaciones.
- **T6**: rutas `cantera/opciones+api.ts` (GET), `cantera/viajes+api.ts` (GET por periodo, POST) y
  `cantera/viajes/[id]/anular+api.ts` (POST). Lo compartido en
  `src/features/cantera/servidor/viajes.ts`: `leerViajes` (con los nombres de hoy: el listado
  refleja correcciones, la bitácora cerrada no), `condicionDePeriodo`, `avisoDeBitacoraCerrada`
  (RF-30, con un texto para registro y otro para anulación), `opcionesDeLaObra` (lo elegible lo
  deciden `volquetaElegible` y `conductorElegible`) y `eleccionesAjenas`, que **compara lo elegido
  contra esas mismas opciones**: lo que el panel ofrece y lo que el servidor acepta no pueden
  discrepar. Decisiones al escribirlo: las opciones exigen una obra (la gerencia la dice); el
  listado exige `desde` y `hasta`, con `desde ≤ hasta` y como mucho un año; los filtros por
  volqueta, material y sitios van en la pantalla sobre lo que llegó (T10).
  **Comprobado el 2026-09-16** desde la sesión de gerencia en Chrome (permiso de Diego). Solo
  lectura primero: las opciones de «Consorcio Antioquia» traen **solo VOL-01** (no CAM-405 ni
  EXC-01) y **solo Pedro Cartagena** (operador; no la residente ni los accesos de prueba), sin sitios
  ni materiales porque los de T5 están de baja (RF-6 visto); sin obra → 400 «Elija la obra.».
  Después: sitio «Prueba Cantera T6» y material «Prueba Afirmado T6» → 201 y aparecen en las
  opciones; viaje a la obra con PR 5 y sin metros → 400 bajo `metros`; con destino igual al origen →
  400 bajo `destino`; con CAM-405 como volqueta → 400 bajo `vehiculoId`; con fecha 2099-01-01 → 400
  bajo `fecha`; el viaje de hoy 07:30, VOL-01, Pedro Cartagena, de «Prueba Cantera T6» a la obra en
  PR 5 + 300 → 201 con `aviso` nulo (ese día no hay bitácora cerrada) y registrado por Diego; el
  listado de hoy lo trae; periodo invertido → 400; anularlo → 200; otra vez → 409 «Este viaje ya
  estaba anulado.»; en el listado sigue, anulado por Diego con su motivo. **Sin comprobar aquí**:
  el `aviso` con una bitácora cerrada (no hay ninguna; va en la demo de T11). **Quedan en la base**
  (vigentes): el sitio «Prueba Cantera T6», el material «Prueba Afirmado T6» y el viaje anulado.
  `expo export` sin error y `grep DATABASE_URL dist/client` vacío. 180 verificaciones.
- **T7**: `src/features/cantera/servidor/parte.ts` con `viajesDelDiaEnSql(obra, fecha)`
  —el `jsonb_agg` de los viajes vigentes con nombres, en orden de hora—, `viajesParaFijarAlCerrar`
  y `canteraDeUnParte` (lee el parte, comprueba la obra y deja decidir a `canteraDelParte`; los
  vigentes solo se consultan con el parte abierto). La **misma consulta** fija al cerrar y muestra
  antes de cerrar. `cerrar+api.ts` pone `cantera` en la misma sentencia que `cerrado_en`. Ruta
  nueva `partes/[id]/cantera+api.ts` con permiso de `bitacoras`/`listar`.
  **Riesgo comprobado antes de probar:** si Drizzle hubiera escrito sin tabla las columnas del parte
  dentro del `update`, la subconsulta habría comparado `v.obra_id` consigo misma y fijado los viajes
  de todas las obras y días. Se generó el SQL del cierre con `toSQL()` sin ejecutarlo: sale
  `v.obra_id = "partes_de_obra"."obra_id"` y `v.fecha = "partes_de_obra"."fecha"`. Correcto.
  **Contra Neon, solo lectura:** la consulta del día corre y devuelve `[]` para el 2026-09-16 (el
  único viaje está anulado y se excluye). Los 5 partes (del 9 al 15 de septiembre) están abiertos,
  sin anular y con `cantera` nulo. **Pendiente:** la ruta de la sección no se pudo probar porque el
  servidor de desarrollo se detuvo solo durante la tarea; y la forma de un viaje **vigente**
  dentro del `jsonb` no se ha visto (no hay ninguno). `typecheck`, `lint` y `verificar` (180) en
  verde; `expo export` sin error y `grep DATABASE_URL dist/client` vacío.
  **Cierre de T7 (Diego reinició el servidor):** desde la sesión de gerencia, `partes/:id/cantera`
  del parte del 2026-09-15 y del 2026-09-09 → 200 `{ estado: 'vigentes', viajes: [], aviso:
  «Todavía no hay viajes de cantera registrados para este día.» }`; un id inexistente → 404 «No existe
  ese parte.». El estado `antes_del_control` no se puede ver contra la base (no hay partes
  cerrados) y queda cubierto por su caso; el cierre real y la forma de un viaje vigente fijado, en la
  demo de T11. Sin escrituras en esta tarea.
- **T8**: `pantalla-cantera.tsx` deja de ser provisional y hay `catalogos-cantera.tsx`. **Decisión no
  escrita en el plan:** el módulo trabaja sobre **una obra a la vez**; la gerencia la elige arriba y,
  hasta elegirla, solo ve el aviso de que la elija (un viaje necesita las volquetas, conductores y
  sitios de una obra). Los demás, la suya. Al cambiar de obra, las secciones se montan de nuevo.
  Sitios (nombre y tipo) y materiales (nombre) con formulario, tabla, corrección en ventana (el
  nombre repetido se queda bajo su campo) y baja con confirmación que dice que los viajes lo siguen
  nombrando. Formularios y botones **solo para quien escribe**; el residente ve las tablas (revisado
  en código). La pantalla lleva un contador de cambios de catálogo para que el formulario de viaje
  (T9) recargue sus opciones. **Error mío corregido antes de compilar:** había puesto `Confirmado`
  vacío donde iba el aviso de error de cada sección; ahora es un `Aviso` de error.
  **Comprobado en Chrome el 2026-09-16** con gerencia, **sin escribir**: sin obra elegida, solo el
  selector y el aviso; con «Consorcio Antioquia», las dos tablas con «Prueba Cantera T6» (Cantera) y
  «Prueba Afirmado T6»; «Dar de baja» muestra «Prueba Cantera T6 deja de ofrecerse como origen o
  destino de viajes nuevos. No se borra: los viajes que ya lo usaron lo siguen nombrando.» y se
  canceló; «Corregir» abre la ventana con nombre y tipo y se canceló. Consultado después: el sitio
  y el material siguen iguales. Tres comandos en verde y la prueba de ancho de tablas pasa.
- **T9**: `ventana-viaje.tsx` y la sección «Viajes» de `pantalla-cantera.tsx` con «Registrar viaje»
  (solo quien escribe), el mensaje de hecho y el `aviso` de bitácora cerrada (RF-30). Opciones de
  `api.cantera.opciones`, pedidas de nuevo cuando cambian sitios o materiales. Fecha y hora con las
  de ahora en la obra; con una sola volqueta o un solo conductor, ya elegidos. Origen solo sitios;
  destino «La obra» primero y los sitios; PR y metros solo con destino obra, y **se borran al cambiar
  a otro destino** (RF-15). Con PR y metros elegidos, un aviso «Llegada: PR 5 + 300». Si a la obra le
  falta sitio, material, volqueta o conductor, la ventana lo dice en vez de enseñar listas vacías.
  **Dos defectos del selector del panel (spec 007) hallados en Chrome y corregidos en
  `componentes.tsx`:**
  1. **El selector no escribía su mensaje de error**, solo pintaba el borde rojo: se veía que algo
     faltaba pero no qué, y el color quedaba como única señal. Ahora lo escribe debajo, como el
     campo de texto. Afecta a todos los selectores del panel (almacén, personas, etc.).
  2. **Dentro de una ventana, el buscador del selector no recibía el cursor**: la ventana de fuera
     recuperaba el foco y lo dejaba en «Cerrar», y lo tecleado no filtraba (con Enter se elegía la
     primera opción, «PR 0»). Causa: React Native Web activa la capa de arriba un instante después
     de crearse el buscador. Se pide el foco en la siguiente vuelta, con la capa ya activa.
  **Comprobado en Chrome el 2026-09-16** con gerencia, **sin guardar ningún viaje**: la ventana abre
  con 2026-09-16, la hora de ahora, VOL-01 y Pedro Cartagena elegidos; el origen ofrece solo
  «Prueba Cantera T6»; el destino, «La obra» y ese sitio; con «La obra» aparecen PR y metros; en el
  PR, el cursor queda en «Buscar en PR de llegada» y «5» deja PR 5, 15 y 25; sin material, origen ni
  metros, «Registrar viaje» marca «Elija el material.», «Elija el origen.» y «Faltan los metros de
  llegada.» bajo sus campos, sin enviar; al cambiar el destino a «Prueba Cantera T6», PR y metros
  desaparecen, y con el mismo sitio de origen marca «El origen y el destino no pueden ser el mismo
  sitio.». Consultado después: sigue habiendo un solo viaje (el anulado de T6). **Sin comprobar
  aquí:** un registro real desde la ventana y el aviso de bitácora cerrada (T11). Tres comandos en
  verde (180 verificaciones).
- **T10**: `listado-viajes.tsx` en la sección «Viajes» (periodo Desde/Hasta con la última semana por
  defecto; filtros de volqueta, material, origen y destino con opciones **sacadas de los viajes del
  periodo**, para que sirvan al residente y a sitios dados de baja; tabla con fecha y hora, volqueta,
  conductor, material, origen, destino como «Obra, PR 5 + 300», quién registró y cuándo, y, si está
  anulado, quién, cuándo y el motivo entero; «Anular» con motivo solo para quien anula, y el aviso de
  RF-30 si llega). En `pantalla-partes.tsx`, la sección «Control Cantera» de solo lectura después de
  Control Calidad de Obra, pedida arriba como las fotos para dar el conteo al índice (`null` mientras
  carga; sin entrada si el parte se cerró antes del módulo), con nota de que se registran en el módulo
  y quedan fijados al cerrar. El revisor de estilo rechazó fijar el periodo desde un efecto: se decide
  al escribir en las fechas.
  **Viaje de prueba registrado desde la ventana el 2026-09-16 (lo pidió Diego):** fecha 2026-09-15
  —no hoy, porque el 15 ya tiene bitácora abierta y así no hubo que abrir otra—, 07:30, «Prueba
  Afirmado T6», VOL-01, Pedro Cartagena, de «Prueba Cantera T6» a la obra; en el PR, «5» filtró y en
  metros «300» dejó solo «+ 300»; la ventana mostró «Llegada: PR 5 + 300» y al guardar se cerró con
  «Viaje registrado: VOL-01 con Prueba Afirmado T6, de Prueba Cantera T6 a la obra en PR 5 + 300.», sin
  aviso (la bitácora del 15 está abierta). **Comprobado en Chrome:** el listado de 2026-09-10 a
  2026-09-16 trae los dos viajes (el anulado de T6 con su motivo, y este con «Anular»); desde
  2026-09-16 queda solo el anulado, y desde 2026-09-10 vuelven los dos. En la bitácora del 15, la
  sección «Control Cantera (1)» con la fila del viaje y «Obra, PR 5 + 300»; el índice «● Control
  Cantera 1», y el pie «Falta llenar» **no** la nombra (RF-36). En la del 14, «– Control Cantera · sin
  viajes» y «Todavía no hay viajes de cantera registrados para este día.». **Sin comprobar a mano:**
  los filtros de volqueta, material y sitios (los dos viajes tienen los mismos valores; cubierto por
  el caso de `filtrarViajes`) y anular desde el listado. Tres comandos en verde; la prueba de ancho
  cuenta las tablas nuevas. **Queda en la base:** el viaje vigente del 15.
