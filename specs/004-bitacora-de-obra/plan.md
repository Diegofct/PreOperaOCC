# Plan técnico — Spec 004

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## Las dos decisiones de fondo

**El parte reemplaza a la bitácora, pero no la borra.** La tabla `bitacoras` se queda tal
cual con lo que ya se registró por máquina, de solo lectura (RF-36). El parte nuevo vive en
`partes_de_obra`, que es otra tabla. Migrar los registros viejos al formato nuevo sería
reescribir evidencia, y eso no se hace.

**Las secciones van como listas JSON dentro de la misma fila, no en tablas hijas.** El
driver de Postgres habla por HTTP y no da transacciones interactivas: guardar el parte en
cinco tablas serían cinco sentencias que pueden quedarse a medias, y el residente se
encontraría un parte con la maquinaria guardada y el personal no. En una sola fila es un
`UPDATE` que ocurre entero o no ocurre. La bitácora ya guardaba así sus actividades desde la
Fase 2; esto extiende esa decisión, no la inventa.

El precio es que sumar las horas de máquina de un mes obliga a desplegar el JSON. Se asume:
el parte se escribe y se lee entero todos los días, y las cuentas del mes son ocasionales.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/festivos.ts` | **Nuevo.** Festivos de Colombia calculados, no listados | RF-40 |
| `src/shared/rules/horas.ts` | **Nuevo.** Jornada, extras, nocturnas y franjas de clima | RF-17, RF-18, RF-26..28, RF-38..42 |
| `src/shared/catalogos/bitacora.ts` | **Nuevo.** Condiciones de clima y materiales con su unidad | RF-26, RF-29 |
| `src/features/bitacoras/tipos.ts` | Los tipos de las cinco secciones | RF-9..RF-32 |
| `src/db/servidor/esquema.ts` | Tabla `partes_de_obra` con índice único parcial por obra y día | RF-1, RF-2, RF-7 |
| `src/app/api/panel/partes/**` | Rutas: consultar, abrir, guardar, cerrar y anular | RF-1..RF-8, RF-34..37 |
| `src/features/panel/pantalla-partes.tsx` | **Nuevo.** Siete secciones en vez de una tarjeta por máquina. Sustituye a `pantalla-bitacoras.tsx`, que se retira | todas las de captura |
| `src/features/panel/pantalla-partes.tsx` | Las bitácoras por máquina anteriores, de solo lectura, al pie del parte | RF-36 |
| El módulo de bitácora del celular | Se retira | Superficie móvil |
| `scripts/verificar-reglas.ts` | Casos de horas, festivos y clima | RF-17, RF-27, RF-28, RF-38..42 |

Se reutiliza: `horasDeMaquina` y `validarHorometros` de `jornada.ts` para la sección de
maquinaria —ya probadas y sin tocar—, el almacén de imágenes con `duenoTipo: 'bitacora'`,
que ya lo aceptan el esquema y los dos endpoints de media, y `nombreDeCargo` de la spec 002
para la sección de personal.

## Lo que no se calcula

**Dinero, no.** Las horas se clasifican —ordinarias, extras, nocturnas, y si el día fue
domingo o festivo— y ahí se para. Convertirlas a pesos exige el salario de cada persona, el
tope semanal y las reglas de liquidación: eso es una nómina, y está fuera de alcance.

**El tope de 42 horas semanales, tampoco.** Desde el 15 de julio de 2026 esa es la jornada
máxima legal en Colombia. Ocho horas diarias de lunes a sábado son cuarenta y ocho. El parte
clasifica el día; la semana es de quien liquida. Conviene que OCC lo sepa.

**El área y el volumen, por ahora tampoco.** Se escriben a mano hasta que se defina qué
unidad usa cada actividad.

## Decisiones técnicas

- **Festivos calculados y no una lista** → se descartó la lista porque caduca cada 31 de
  diciembre y el día que caduca nadie se entera: el parte deja de marcar los festivos y las
  horas de ese día se cuentan como cualquier otra.
- **La salida anterior a la entrada es medianoche cruzada, no un error** (RF-42) → lo pide
  un caso límite de la spec, y el requisito que decía lo contrario se corrigió.
- **El clima sí rechaza el tramo invertido** → ahí no hay medianoche que cruzar: el clima se
  registra dentro del día de la obra.
- **Cada fila de sección se auto-describe** —guarda el nombre además de la clave— igual que
  las respuestas del preoperacional: un parte de 2026 tiene que seguir leyéndose aunque el
  catálogo de materiales cambie.

## Impacto en la sincronización

El parte **no viaja al celular** en ninguna dirección. Se retira la entidad `bitacora` de la
cola de subida y la ruta `/api/movil/bitacoras`. El pull no cambia.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`, contra los módulos puros: la jornada completa sin extras,
el almuerzo descontado, lo que pasa de ocho horas como extra, el recargo nocturno desde las
siete, la jornada que cruza la medianoche, el domingo marcado, los tramos de clima que se
pisan y los que cubren el día, y los festivos —incluido el año en que dos caen el mismo
lunes—.

Demo manual: llenar un parte completo, cerrarlo, comprobar que los medidores avanzaron,
anularlo con motivo y abrir otro para el mismo día.

## Riesgos

- **Retirar la bitácora del celular deja sin pantalla al jefe de obra que hoy la usa ahí.**
  Hay que avisarle antes, no después.
- **El parte es un formulario largo.** Si guardar no conserva lo escrito a lo largo del día,
  se pierde una tarde de trabajo. El guardado parcial (RF-5) no es comodidad, es lo que hace
  usable el módulo.

---

# Cambio del 2026-09-14/15 — parte completo, observaciones, foto sin guardar y medidas

> Cubre RF-45 a RF-60 de la spec (Req2 a Req5 de OCC y la corrección del 15). Lo de arriba
> sigue en pie; esto se suma.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/dimensiones.ts` | **Nuevo.** `calcularDimensiones`: área = longitud × ancho si están las dos; volumen = longitud × ancho × alto si están las tres; si falta un factor, se respeta el valor escrito a mano. Redondeo a dos decimales | RF-58..60 |
| `src/shared/rules/parte.ts` | `bloqueosDelCierre` pide las siete secciones, observaciones en cada máquina y foto en al menos una actividad; con día sin trabajo, solo clima, notas y foto del día. `validarDiaSinTrabajo` nueva. `seccionesDelParte` titula «Control Calidad de Obra» —el id `laboratorio` no cambia— y marca «no aplica» lo que un día sin trabajo no exige | RF-49..55 |
| `src/features/bitacoras/tipos.ts` | `MaquinaDelParte.observaciones` | RF-45, RF-46 |
| `src/features/bitacoras/parte.ts` | `construirMaquina` guarda las observaciones; `construirActividadDelParte` pasa las medidas por `calcularDimensiones` | RF-45, RF-58..60 |
| `src/db/servidor/esquema.ts` | `partes_de_obra.sin_trabajo` (booleano, `false` por defecto) y `motivo_sin_trabajo` | RF-53..55 |
| `src/features/panel/contratos.ts` | Observaciones de la máquina, id de actividad con tope, `sinTrabajo` y `motivoSinTrabajo` en la edición y en `ParteFila` | RF-45, RF-47, RF-53 |
| `src/app/api/panel/partes/[id]+api.ts` | Guarda lo nuevo; rechaza marcar día sin trabajo con filas registradas o sin motivo | RF-45, RF-53, RF-55 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | Cuenta las fotos en `media` y responde **todos** los bloqueos | RF-50..56 |
| `src/constants/theme.ts` + `src/features/panel/componentes.tsx` | `Campo` con `lineas`: área de texto de varias líneas, con su alto mínimo en el tema | RF-45 |
| `src/features/panel/pantalla-partes.tsx` | Observaciones por máquina; id de actividad al añadir y foto inmediata; área y volumen calculados; nombre nuevo de la sección; casilla de día sin trabajo con motivo | RF-45..49, RF-53..60 |
| `scripts/verificar-reglas.ts` | Casos nuevos y ajuste de los que esperaban el rechazo antiguo de RF-8 | — |

Se reutiliza: `idDeFila` (`bitacoras/tipos.ts`), la ruta de foto del parte —ya acepta
cualquier `item`—, `SubirFoto`, `validarAvance` y `mensajeDeAvance` (`jornada.ts`),
`parteEditable`, `requerirPermiso` y `alcanzaLaObra`.

## Modelo de datos

- **Servidor**: dos columnas nuevas en `partes_de_obra`, con migración aditiva. Las filas
  existentes quedan con `sin_trabajo = false`, que es lo que eran.
- **Observaciones de la máquina**: van dentro del JSON de `maquinaria`, sin columna. Un
  parte viejo que no las trae se lee como texto vacío.
- **Local (celular)**: sin cambios. El parte no viaja al teléfono.

## Decisiones técnicas

- **El id de la actividad nace en el navegador al pulsar «Añadir actividad»**, y con él la
  foto se sube en el acto. *Descartado:* guardar la sección sin avisar al elegir la foto,
  porque se guardarían también las filas a medio escribir de las demás actividades. Una
  foto de una actividad que nunca se guardó no se pinta, porque el parte solo pinta las fotos
  de actividades que existen (RF-48). El archivo se queda en el almacén: nada se borra.
- **Área y volumen en una regla pura que llaman la pantalla y el servidor.** *Descartado:*
  calcular solo en pantalla, porque una petición hecha por fuera guardaría números que no
  cuadran. El servidor recalcula y manda.
- **Día sin trabajo en columnas propias.** *Descartado:* una frase convenida dentro de las
  notas, porque el cierre tendría que interpretar texto para saber qué exigir.
- **El cierre responde todos los bloqueos juntos.** *Descartado:* seguir mandando el primero,
  porque RF-50 pide nombrar todo lo que falta. El contrato de orden que documenta
  `bloqueosDelCierre` deja de ser necesario y su comentario se reescribe.
- **Las fotos las cuenta la ruta de cierre** y se las pasa a la regla ya contadas (fotos del
  día e ids de actividad con foto). *Descartado:* que la regla consulte `media`, porque
  dejaría de ser pura (constitución §3).
- **RF-56 sale por construcción**: la regla solo corre al cerrar, y un parte ya cerrado no se
  vuelve a cerrar. No hace falta distinguir fechas.

## Impacto en la sincronización

Ninguno. El parte es exclusivo del panel (ver arriba).

## Contrato de API

- `PATCH /api/panel/partes/:id` — guardia `bitacoras/escribir` y `parteEditable`, como hoy.
  Nuevos campos opcionales: `maquinaria[].observaciones`, `sinTrabajo`, `motivoSinTrabajo`.
  Respuestas 400: marcar día sin trabajo con máquinas, personas o actividades (se mira lo
  que llega en la misma petición o, si no llega, lo guardado); día sin trabajo sin motivo.
  Como Neon no da transacciones, la comprobación y el `UPDATE` van en la misma sentencia
  condicionada cuando la petición no trae esas secciones.
- `POST /api/panel/partes/:id/cerrar` — 400 con todos los bloqueos en un solo mensaje.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`: 3 × 4 da área 12; sin ancho se respeta el área escrita;
2 × 3 × 0,5 da volumen 3; un parte vacío nombra las siete secciones; una máquina sin
observaciones se nombra; ninguna actividad con foto bloquea y una ya no; un día sin trabajo
con clima, notas y foto cierra; día sin trabajo con una máquina se rechaza; sin motivo se
rechaza; el índice titula «Control Calidad de Obra».

Demo manual en el navegador (reiniciando `npm run web` tras tocar las rutas): intentar cerrar
un parte vacío y leer las siete faltas; añadir una actividad y subirle foto sin guardar;
escribir largo 3 y ancho 4 y ver área 12; observaciones de VOL-01 en el área de texto;
marcar un domingo como día sin trabajo con motivo y cerrarlo solo con clima, notas y foto.

## Riesgos

- **Los partes abiertos hoy con secciones vacías dejan de poder cerrarse.** Es lo que pidió
  OCC, pero hay que avisar a los residentes antes de desplegar.
- **Casos de verificación que comparan textos** del cierre antiguo: se ajustan en la misma
  tarea que cambia la regla, no después.
- **Fotos huérfanas** de actividades descartadas ocupan espacio en el almacén. Son pocas y
  pequeñas; limpiarlas sería borrar, y no se hace.

---

# Cambio del 2026-09-16 — catálogos reales de OCC: ensayos y actividades del presupuesto

RF-61 a RF-74, anexos A y B. Lo de arriba sigue en pie; esta sección solo añade.

No toca API de Expo: son pantallas del panel con los componentes que ya existen (`Selector`,
`Campo`, `Tabla`), rutas `+api.ts` ya escritas y reglas puras. Por eso no se consultó
`expo-overview` para este cambio.

## Lo que hay hoy y obliga a diseñar con cuidado

Al guardar, el servidor **reconstruye cada fila desde el catálogo**:

- `construirActividadDelParte` pone `nombre = nombreDeActividad(clave)`. Con el catálogo nuevo,
  una actividad de prueba («excavacion») guardada otra vez se quedaría con el slug como nombre.
- `construirMaterial` devuelve `null` si el material no está en la lista, y la ruta responde
  400 a **toda** la sección. Con la lista nueva, un parte abierto con un material de prueba no
  podría volver a guardar su control de calidad.

Hay 5 partes abiertos (del 9 al 15 de septiembre) y pueden tener filas de las listas de
prueba. Cambiar solo los catálogos rompería RF-63 y RF-71 en ellos. La pieza central de este
plan es **conservar las filas heredadas tal como se guardaron**.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `scripts/importar-presupuesto.ts` | **Nuevo.** Lee `docs/preupuesto.xlsx` y escribe `src/shared/catalogos/presupuesto.json`. Toma las filas con número entero en la columna C; ítem de la D, descripción de la H (espacios colapsados) y unidad de la I, normalizada. Quita repetidos por ítem y **falla** si un mismo ítem trae dos descripciones o dos unidades, o si una unidad no se reconoce, nombrando la fila. Ordena por ítem (2.8 antes que 2.14.1) | RF-64 |
| `package.json` | Script `presupuesto` → `tsx scripts/importar-presupuesto.ts` (sin dependencias nuevas: `exceljs` ya está) | RF-64 |
| `src/shared/catalogos/presupuesto.json` | **Generado**, no se edita a mano: `[{ item, descripcion, unidad }]`, 31 filas | RF-64 |
| `src/shared/catalogos/presupuesto.ts` | **Nuevo.** `UNIDADES_DE_ACTIVIDAD` (`m3` m³, `m2` m², `m` m, `kg` kg, `und` Und, `m3_km` m³-km), `ACTIVIDADES_DEL_PRESUPUESTO` (el JSON tipado), `actividadPorItem`, `etiquetaDeActividad` («4.1.8 · Excavación…»), `etiquetaDeUnidad` y `CLAVE_OTRA_ACTIVIDAD = 'otra'` | RF-64..66, RF-70 |
| `src/shared/catalogos/bitacora.ts` | `ENSAYOS_DE_CALIDAD`: los 17 del anexo A, con clave estable y nombre, escritos a mano. Salen `MATERIALES_LABORATORIO`, `materialPorId`, `nombreDeMaterial`, `cantidadLegible`, `UnidadMaterial` y `ETIQUETA_UNIDAD`: las filas viejas se describen solas y nada nuevo los usa. El comentario «pendiente de validación por OCC» se reescribe | RF-61, RF-63 |
| `src/shared/rules/dimensiones.ts` | `resolverCantidad(unidad, dimensionesResueltas, cantidadEscrita)` → `{ cantidad, cantidadCalculada, origen }`: con m³ y volumen, el volumen; con m² y área, el área; con m y longitud, la longitud; si no, lo escrito o nada | RF-67..69, RF-74 |
| `src/shared/rules/parte.ts` | `faltasDeActividad` (otra sin cuál → `texto`; otra sin unidad → `unidad`) y `faltaObservacionDelEnsayo`, con sus mensajes. `bloqueosDelCierre` **no cambia**: cuenta filas, y una fila heredada cuenta | RF-24, RF-70, RF-72 |
| `src/features/bitacoras/tipos.ts` | `ActividadDelParte` gana `item?`, `unidad?` y `cantidad?` (opcionales: los partes viejos no los traen). Nuevo `EnsayoDelParte { id, ensayo, nombre, observacion }` y `FilaDeControlDeCalidad = MaterialDelParte \| EnsayoDelParte`, con `esEnsayo(fila)` | RF-61, RF-63, RF-67, RF-71 |
| `src/features/bitacoras/parte.ts` | `construirActividadDelParte` usa el presupuesto: nombre = descripción, `item`, `unidad` de la lista (o la elegida si es otra), cantidad por `resolverCantidad`. Devuelve `null` si la clave no es del presupuesto ni «otra». `construirEnsayo` nuevo. `conservarHeredadas(pedidas, guardadas)`: una fila que llega con el id de una **fila heredada** guardada se queda como estaba. Sale `construirMaterial` | RF-63..71 |
| `src/db/servidor/esquema.ts` | Solo el tipo de `laboratorio`: `$type<FilaDeControlDeCalidad[]>()`. **Sin migración** | RF-61, RF-63 |
| `src/features/panel/contratos.ts` | `actividadDelParte` gana `unidad` (enum de las seis, opcional) y `cantidad` (`numeroOpcional`), con `superRefine` que llama a `faltasDeActividad`. `ensayoDelParte`: `{ id?, ensayo?, observacion? }`, que o trae ensayo y observación (con `faltaObservacionDelEnsayo`) o solo el id de una fila heredada. `ActividadDelParteFila` y la fila de control de calidad, con los campos nuevos opcionales | RF-61, RF-67, RF-70, RF-72 |
| `src/app/api/panel/partes/[id]+api.ts` | Si llegan actividades o control de calidad, lee lo guardado (junta la lectura con la del día sin trabajo, que ya existe) y construye con `conservarHeredadas`. 400 si una actividad no es del presupuesto ni otra, si un ensayo no es de la lista o si un id no es de una fila heredada de ese parte | RF-61..74 |
| `src/features/panel/pantalla-partes.tsx` | **Actividades:** selector con las 31 más «Otra actividad», etiqueta con número de ítem; al lado, «Unidad» de solo lectura, o selector de unidad si es otra; «Cantidad (m³)» calculada y de solo lectura cuando sale de una medida, con la ayuda «Del volumen» / «Del área» / «De la longitud»; las filas heredadas, de solo lectura con su nombre y medidas, y con «Quitar». **Control Calidad de Obra:** selector de ensayo y observación en área de texto, «Añadir ensayo»; las filas heredadas (materiales) de solo lectura con «Quitar»; la tabla de solo lectura mezcla las dos con columnas «Ensayo o material» y «Observación o cantidad» | RF-61..74 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver abajo); salen los de `cantidadLegible` y el de materiales repetidos | — |
| `AGENTS.md` | En «No edites a mano», añadir `src/shared/catalogos/presupuesto.json` (`npm run presupuesto`) | — |

Se reutiliza: `filtrarOpciones`, que ya busca en etiqueta y detalle, así que «4.1.8» y
«excavación» encuentran la misma opción sin tocar el `Selector`; `calcularDimensiones`; el
`Campo` con `soloLectura` y `multilinea`; `idDeFila`; la ruta de foto, que ya acepta cualquier
`item`; y la prueba de ancho de tablas.

**No se toca** `src/features/bitacoras/actividades.ts`: su lista es la de la bitácora vieja por
máquina (`construirActividad`, rutas `movil/bitacoras` y `panel/bitacoras`), que se conserva
como histórico. Mezclar los dos catálogos haría que una bitácora vieja cambiara de nombres.

## Modelo de datos

- **Servidor: sin migración.** `actividades` y `laboratorio` ya son `jsonb`. Lo nuevo va
  dentro de cada fila:
  - Actividad: `item` («4.1.8», o `null` en otra), `unidad` (la etiqueta congelada, «m³») y
    `cantidad` (número o `null`). La descripción del presupuesto queda en `nombre`, como hoy.
  - Control de calidad: una fila nueva es `{ id, ensayo, nombre, observacion }`. Las filas
    viejas `{ id, material, nombre, cantidad, unidad }` se quedan como están.
- **Cómo se distingue lo heredado**: una actividad **sin la propiedad `unidad`** se guardó antes
  del cambio (toda actividad nueva la lleva, también «otra»). Una fila de control de calidad
  **con `material`** es un material viejo. No se añade versión ni marca: la forma lo dice.
- **Local (celular)**: sin cambios. El parte no viaja al teléfono.

## Decisiones técnicas

- **El presupuesto se genera con un script desde el Excel.** *Descartado:* escribir a mano las
  31 descripciones en un `.ts`. Tienen hasta 350 caracteres y comillas de pulgadas: una errata
  pasaría desapercibida, y la spec deja fuera editarlo desde el panel porque «se actualiza
  desde el documento de OCC». El script es esa actualización. Es el mismo camino que ya siguen
  los formatos del preoperacional (`npm run formatos`).
- **Los 17 ensayos, a mano.** *Descartado:* leer el Word con script. Hace falta descomprimir el
  `.docx`, y `jszip` solo está como dependencia de `exceljs`; usarlo directamente sería una
  dependencia nueva sin aprobación (constitución §8) para 17 nombres cortos que no van a
  cambiar a menudo.
- **La clave de una actividad es su número de ítem** («4.1.8»). *Descartado:* un slug inventado
  («excavacion_estructuras_entibado»): el ítem ya es el identificador de OCC, es estable y no
  choca con las claves de la lista de prueba. Esas claves no se reutilizan nunca.
- **Unidades propias del presupuesto**, en su catálogo. *Descartado:* reutilizar
  `UNIDADES_ALMACEN`. No tiene m³-km, tiene bultos, rollos y cajas que no son de un ítem de
  pago, y atar las dos listas haría que un cambio en el almacén moviera el parte.
- **La unidad y el nombre los pone el servidor.** El navegador manda la clave, y solo en
  «otra» manda la unidad. Si la unidad de una actividad del presupuesto viniera del cliente,
  bastaría con editar la petición para medir el acero en m³.
- **Filas heredadas: se conservan por id, sin reconstruir.** *Descartado 1:* guardar en ellas lo
  que diga el navegador: un nombre del cliente es justo lo que `parte.ts` prohíbe.
  *Descartado 2:* traducir las claves de prueba a ítems del presupuesto: «Excavación» no dice
  si es la 4.1.1, la 4.1.2 o la 4.1.8, así que traducir sería inventar el dato. *Descartado 3:*
  rechazar el guardado mientras haya filas viejas: bloquearía los 5 partes abiertos. En pantalla
  se ven de solo lectura y se pueden quitar, porque quitar una fila de un parte abierto se
  puede hacer hoy con cualquier fila.
- **Control de calidad en la misma columna `laboratorio`**, con dos formas de fila. *Descartado:*
  una columna nueva `control_calidad` con migración. Obligaría a sumar dos columnas en el
  cierre, en el índice y en la lectura, y el id de la sección ya es `laboratorio` (RF-49). La
  forma de cada fila basta para distinguirlas.
- **La cantidad calculada sigue la regla del área y el volumen**: calculada y de solo lectura
  cuando hay de dónde sacarla, a mano cuando no, y la escrita a mano se respeta solo si no se
  puede calcular. *Descartado:* dejarla siempre editable, que contradice RF-68 («tomará ese
  valor»).
- **Cantidad con m³ y volumen escrito a mano** (sin las tres medidas): RF-68 dice «tenga
  volumen», no «volumen calculado», así que se toma ese volumen. Igual con el área.

## Impacto en la sincronización

Ninguno. El parte es exclusivo del panel: no hay pull, outbox ni ingesta del celular que
cambien.

## Contrato de API

`PATCH /api/panel/partes/:id`, con la guardia `bitacoras/escribir` y `parteEditable`, como hoy.

- `actividades[]`: `{ id, clave, texto?, unidad?, cantidad?, descripcion, observaciones,
  longitud, ancho, alto, area, volumen }`.
  - `clave` del presupuesto → nombre, ítem y unidad del catálogo; `unidad` se ignora.
  - `clave = 'otra'` → exige `texto` y `unidad` (400 bajo el campo, con el mensaje de la regla).
  - `id` de una actividad heredada de ese parte → se conserva guardada; el resto se ignora.
  - Otra clave → 400 «Esa actividad no está en la lista.».
- `laboratorio[]`: `{ id?, ensayo, observacion }` o `{ id }`.
  - Ensayo de la lista con observación → fila nueva. Sin observación → 400 «Escriba la
    observación del ensayo. Si no hay nada que anotar, escriba "Sin observaciones".».
  - Ensayo que no es de la lista → 400 «Ese ensayo no está en la lista.».
  - Solo `id` de un material heredado de ese parte → se conserva. Id que no es → 400.
- El mismo ensayo repetido no se rechaza (RF-73).
- **Sin transacciones (Neon por HTTP):** entre leer lo guardado y el `UPDATE`, otro computador
  podría quitar una fila heredada. Lo peor que pasa es que el segundo guardado la vuelva a
  dejar, porque la tomó de lo que leyó. No se pierde nada y no se inventa nada. Es el mismo
  margen que ya acepta el día sin trabajo.
- `GET /api/panel/partes` y `.../partes/:id` no cambian: devuelven el `jsonb` tal cual.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`:

- **Catálogo:** 31 actividades con ítem único; todas con una unidad de las seis; 4.1.8 en m³,
  10.1 en kg, 12.9 en Und, 13.1 y 13.9 en m³-km, 6.1.18.1 en m²; ninguna con ítem «otra»;
  «4.1.8» y «excavación» encuentran la 4.1.8 con `filtrarOpciones`. 17 ensayos, con claves y
  nombres únicos.
- **`resolverCantidad`:** m³ con 3 × 4 × 0,5 → 6 calculada; m³ sin alto y 9 escrito → 9 a mano;
  m² con 3 × 4 → 12; m con longitud 25 → 25; kg con medidas y 500 escrito → 500 a mano; Und sin
  nada → `null`; m³ con volumen escrito 7 y sin medidas → 7.
- **Faltas:** otra sin cuál y otra sin unidad, nombradas cada una bajo su campo; ensayo sin
  observación y con espacios en blanco, rechazado; «Sin observaciones», aceptado.
- **Construcción:** una actividad del presupuesto guarda la descripción completa, el ítem y la
  unidad del catálogo aunque el cliente mande otra unidad; otra guarda su texto y su unidad; una
  clave desconocida da `null`; una fila heredada con su id queda idéntica aunque el cliente
  mande otro nombre o medidas; un id ajeno no se conserva.
- **Cierre:** un parte con solo un material heredado en control de calidad no nombra esa
  sección como falta.

**Script de importación:** correrlo y confirmar 31 filas; romper a propósito una copia del
Excel (una unidad «mts») y ver que falla nombrando la fila.

**Demo en el navegador** (reiniciando `npm run web`):

- Buscar «4.1.8» y «acero» en el selector.
- Ver «m³» al lado.
- Largo 3, ancho 4 y alto 0,5 → cantidad 6 fija.
- 10.1 → cantidad escrita a mano.
- Otra actividad sin unidad → error bajo el campo.
- Dos «Densidad en campo», una sin observación → error.
- Una actividad o un material de prueba ya guardados en un parte abierto: siguen igual al
  guardar otra vez.
- El cierre real va en la T11 de la spec 010, el día que Diego acuerde.

## Riesgos

- **Filas heredadas que se transforman al guardar.** Se detecta con el caso de construcción y en
  la demo, mirando el `jsonb` antes y después. Se revierte volviendo a la versión anterior de
  la ruta: los datos no cambian de forma, solo se añaden campos.
- **El Excel cambia de forma** (otra hoja, columnas corridas). El script falla en voz alta en vez
  de generar una lista vacía o corrida: exige encontrar el encabezado «DESCRIPCIÓN» en la H y
  «UND.» en la I.
- **Ítems que Excel guarda como número** (8.1 frente a 8.10). Se lee el texto que muestra la
  celda y no su valor; el caso de verificación confirma los ítems del anexo B.
- **Selector con descripciones largas.** Una opción de 350 caracteres puede desbordar la lista o
  empujar la fila. Se revisa en Chrome; si pasa, la etiqueta del selector se recorta y la
  descripción completa va en el `detalle`, que sigue siendo buscable.
- **Filas viejas de prueba que nadie quita.** Se ven de solo lectura para siempre en ese parte.
  Es lo que dicen RF-63 y RF-71; si Diego prefiere limpiar los partes de prueba, lo hace él
  quitándolas desde la pantalla.

---

## Cambio del 2026-09-17 — la actividad sin su número de ítem (RF-75 a RF-77)

Es el cambio más pequeño de esta spec: **no toca datos, ni API, ni reglas**. Solo cambia el
texto con el que se ofrece y se lee una actividad.

### Qué se guarda, y por qué no cambia

Lo guardado ya está bien: `nombre` es la descripción del presupuesto, sin número (lo pone
`construirActividadDelParte` desde el catálogo), y el número vive aparte, en `item`. Ese
campo **se queda**: es la llave con la que el servidor sabe qué actividad del presupuesto se
eligió y lo único que permitiría cruzar el parte con el presupuesto más adelante. Decisión de
Diego del 2026-09-17: el número se va de la pantalla, no de la base.

Por lo mismo, el `valor` de cada opción del selector sigue siendo el ítem («4.1.8»): es la
clave que viaja en la petición, no un texto que alguien lea.

### El único cambio

`etiquetaDeActividad`, en `src/shared/catalogos/presupuesto.ts`, devuelve hoy
`«4.1.8 · Excavación…»` y pasa a devolver solo la descripción. Con eso caen los tres RF a la
vez:

- **RF-75** — la lista de actividades del panel se arma con esa función
  (`pantalla-partes.tsx`, las `opciones`), así que deja de enseñar el número al elegir.
- **RF-76** — el buscador del selector filtra sobre la etiqueta (`filtrarOpciones`), de modo
  que al salir el número de la etiqueta deja de encontrarse por él. No hay que tocar el
  buscador.
- **RF-77** — la actividad ya registrada y el parte se pintan con `fila.nombre`, que nunca
  tuvo el número. No hay nada que hacer, y hay que comprobarlo mirando, no suponiéndolo.

Se actualizan los comentarios que explican la decisión contraria: el bloque de
`etiquetaDeActividad` («el número va delante porque es por donde busca quien conoce el
presupuesto») y el comentario de las `opciones` en `pantalla-partes.tsx`. Cambiar la decisión
sin cambiar el comentario deja el archivo mintiendo.

### Qué se comprueba

- El caso del guion que hoy exige que «4.1.8» encuentre la actividad pasa a exigir lo
  contrario: «4.1.8» no encuentra nada y «excavación» sí. Es el mismo caso, invertido.
- En el navegador: abrir Actividades, ver la lista sin números, buscar «acero» y encontrar,
  buscar «10.1» y no encontrar, y ver una actividad ya guardada del parte del 16 sin número.

### Riesgos

- **Dos actividades que se parecen.** Sin el número, lo que las separa es el final de la
  frase. Las 31 descripciones son distintas entre sí (comprobado sobre el catálogo generado),
  y el selector muestra la descripción completa; si alguna se recorta en pantalla, se trata
  como el riesgo ya anotado del cambio anterior: la etiqueta se recorta y el texto completo
  va en el `detalle`.
- **Que alguien de OCC busque por número** y crea que la actividad no está. Es lo que Diego
  decidió; queda escrito en los casos límite de la spec.
