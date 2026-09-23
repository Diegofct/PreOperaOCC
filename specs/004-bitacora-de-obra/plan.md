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


## Cambio del 2026-09-22 — vuelve el número de ítem; cuándo, quién y dónde de cada ensayo (RF-78 a RF-89)

Dos mitades independientes. **Actividades** es casi solo pantalla: deshace la T31 y cambia cómo
nace una fila nueva. **Ensayos** añade datos, regla, contrato y pantalla, pero sin migración.

### Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/presupuesto.ts` | `etiquetaDeActividad` vuelve a `«4.1.8 · Excavación…»`. Se reescribe su comentario (hoy explica la decisión contraria). | RF-78, RF-79, RF-81 |
| `src/shared/rules/parte.ts` | `faltasDeActividad` gana el caso «sin elegir» (`clave` vacía → campo `clave`, «Elija la actividad.»). Nueva `faltasDelEnsayo(ensayo)`: sin hora de inicio, sin hora de fin, fin no posterior al inicio, sin responsable, sin ubicación, y las faltas del PR y los metros con `validarAbscisa`; cada una con su campo y su mensaje. `faltaObservacionDelEnsayo` se queda (RF-72 sigue) y `faltasDelEnsayo` la incluye. `bloqueosDelCierre` **no cambia**. | RF-83, RF-85, RF-88, RF-89 |
| `src/shared/rules/cantera.ts` | Nada: se reutilizan `OPCIONES_DE_PR`, `OPCIONES_DE_METROS`, `validarAbscisa` y `formatearAbscisa`. | RF-87 |
| `src/features/bitacoras/tipos.ts` | `EnsayoDelParte` gana `horaInicio?`, `horaFin?`, `responsable?` y `ubicacion?: { pr, metros } \| { lugar }`, **opcionales** porque los ensayos guardados no los traen. Nueva `esEnsayoAnterior(ensayo)` = no tiene `horaInicio`. | RF-84 a RF-89 |
| `src/features/bitacoras/parte.ts` | `EnsayoPedido` con los campos nuevos. `construirEnsayo(pedido, guardado?)`: si `guardado` es un ensayo anterior con el mismo id y el pedido no trae los campos nuevos, se construye como antes (ensayo + observación); en otro caso exige `faltasDelEnsayo` vacío y guarda los cuatro datos, con el responsable y el lugar recortados. | RF-84 a RF-89 |
| `src/features/panel/contratos.ts` | `ensayoDelParte` acepta `horaInicio`, `horaFin` (`HH:MM`), `responsable` (≤ 120), `ubicacion` (`{ pr, metros }` enteros o `{ lugar }` ≤ 160). **La forma** la valida zod; **si faltan** lo decide el servidor, porque solo él sabe si el id es de un ensayo anterior. `actividadDelParte.clave` pasa a aceptar vacío para que el rechazo diga «Elija la actividad.» en vez de «Falta la actividad.»: el `superRefine` llama a `faltasDeActividad`. `EnsayoDelParteFila` con los campos opcionales. | RF-83 a RF-88 |
| `src/app/api/panel/partes/[id]+api.ts` | En `laboratorio`, busca el guardado de cada id y se lo pasa a `construirEnsayo`; si hay faltas, 400 con los mensajes de `faltasDelEnsayo` (todos, uno por renglón, como el cierre). La lectura de lo guardado ya existe (`guardado.laboratorio`). | RF-85, RF-88, RF-89 |
| `src/features/panel/pantalla-partes.tsx` — Actividades | Opciones con «Otra actividad» **primero**. «Añadir actividad» nace con `clave: ''` (hoy `opciones[0]`). Falta bajo el selector tras pulsar Guardar, con la misma regla. | RF-78, RF-80, RF-82, RF-83 |
| `src/features/panel/pantalla-partes.tsx` — Control Calidad de Obra | `FilaControlDeCalidad` con `horaInicio`, `horaFin`, `responsable`, `tipoUbicacion` (`pr` o `lugar`), `pr`, `metros`, `lugar` y `anterior`. Por ensayo: dos `SelectorDeHora` («Inicio», «Fin»), `Campo` «Responsable», `Selector` «Ubicación» («PR y metros» u «Otro lugar») y, según lo elegido, dos `Selector` de PR y metros o un `Campo` «Lugar». Un ensayo **anterior** se ve con su ensayo y su observación, editables como hoy, y sin los campos nuevos. Tabla de solo lectura con las columnas nuevas. | RF-84 a RF-89 |
| `scripts/verificar-reglas.ts` | Se invierten los casos de la T31 y se añaden los del ensayo (ver *Verificación*). | Todos |

**Lo que se reutiliza y no se escribe de nuevo:** `SelectorDeHora` (016), `validarAbscisa` y
las listas de PR y metros (010), `minutosDeHora` (horas), `conservarHeredadas` (el recorrido
de la sección ya existe; el ensayo anterior **no** es una fila heredada: sigue editable) y
`filtrarOpciones`, que busca sobre la etiqueta, así que RF-79 cae solo al volver el número a la
etiqueta.

### Modelo de datos

**No cambia ningún esquema.** Ni `src/db/servidor/esquema.ts` ni `src/db/local/schema.ts`: los
ensayos viven en el `jsonb` `partes_de_obra.laboratorio`, y las cuatro propiedades nuevas van
dentro de cada fila, como las observaciones por persona de la 016. Sin migración.

- Un ensayo guardado antes del cambio se lee igual: los campos nuevos no están, y el tipo los
  declara opcionales (RF-89).
- La actividad no cambia de forma: el ítem ya se guarda en `clave` e `item` desde el
  2026-09-16. Lo que vuelve es enseñarlo.
- **Teléfonos sin actualizar:** no aplica. El parte es solo del panel.

### Decisiones técnicas

- **Ubicación como `{ pr, metros } | { lugar }`, no tres columnas sueltas.** *Descartado:*
  `pr`, `metros` y `lugar` como campos independientes y nulos. Permitiría guardar un PR **y** un
  lugar a la vez, o ninguno, y cada lector tendría que decidir cuál manda. Con la unión, un
  ensayo tiene una ubicación de una sola forma, que es lo que dice RF-87.
- **Las faltas del ensayo las decide el servidor con lo guardado, no el contrato.**
  *Descartado:* exigirlas en el `superRefine` de zod, como hoy la observación. El contrato no
  sabe si un id es de un ensayo anterior, y rechazaría al guardar la sección un ensayo viejo
  que nadie tocó (RF-89). La pantalla aplica la misma regla, `faltasDelEnsayo`, para marcar
  bajo cada campo antes de enviar.
- **«Anterior» se reconoce por la forma guardada (sin `horaInicio`), no por una fecha.**
  *Descartado:* comparar la fecha del parte con el 2026-09-22. Un parte de antes del cambio
  puede seguir abierto y recibir ensayos nuevos, que sí deben pedir los datos; y es el mismo
  criterio que ya distingue materiales y actividades heredadas (`esMaterialHeredado`,
  `esActividadHeredada`).
- **El ensayo anterior sigue editable en su ensayo y su observación.** *Descartado:*
  congelarlo como una fila heredada de solo lectura. Hoy se puede corregir su observación, y
  quitarle eso sería un cambio que la spec no pide; RF-89 solo dice que no se le exigen los
  datos nuevos, y completarlos está fuera de alcance, así que no se ofrecen.
- **«Ubicación» como selector de dos opciones que arranca en «PR y metros».** *Descartado:*
  una casilla «No aplica PR». El selector nombra las dos formas por igual y deja claro cuál está
  en uso; la casilla esconde la segunda. Arranca en PR porque la mayoría de los ensayos de la
  guía se hacen en la vía; el PR y los metros siguen en blanco, así que no se inventa nada.
- **La etiqueta de la actividad con el número, en el mismo sitio de siempre.** *Descartado:*
  poner el número en el `detalle` de la opción. `filtrarOpciones` también busca en el detalle,
  pero el selector lo pinta debajo y en pequeño, y la spec pide el número **delante** (RF-78).
- **La actividad sin elegir se rechaza con «Elija la actividad.» desde la regla.**
  *Descartado:* dejar el `textoObligatorio` del contrato, que diría «Falta la actividad.». El
  mensaje debe ser el mismo en pantalla y en el servidor, y la pantalla lo toma de la regla.

### Impacto en la sincronización

Ninguno. Ni el pull, ni la outbox, ni el orden de `seq`, ni la ingesta cambian: el parte no
viaja al celular ni sale de él.

### Contrato de API

`PATCH /api/panel/partes/:id`, con `requerirPermiso('bitacoras','escribir')` y `parteEditable`,
como hoy. El alcance por obra ya lo da `parteEditable`.

- `actividades[]`: igual que hoy, más: `clave` vacía → 400 «Elija la actividad.».
- `laboratorio[]`: `{ id?, ensayo, observacion, horaInicio, horaFin, responsable, ubicacion }`
  o `{ id }` (material heredado, como hoy).
  - Ensayo nuevo o ensayo guardado con los datos nuevos: exige los cuatro → 400 con lo que
    falta, uno por renglón («Falta la hora de inicio del ensayo.», «La hora de fin del ensayo
    tiene que ser posterior a la de inicio.», «Falta el responsable del ensayo.», «Falta el PR»,
    «Faltan los metros», «Falta el lugar del ensayo.»).
  - `id` de un ensayo **anterior** de ese parte que llega sin los datos nuevos → se guarda con
    su ensayo y su observación, como antes (RF-89).
  - Forma inválida (hora que no es `HH:MM`, metros fuera de la lista) → 400 del contrato.
- **Sin transacciones (Neon por HTTP):** la decisión «anterior o no» sale de la lectura de lo
  guardado que la ruta ya hace. Si entre la lectura y el `UPDATE` otro computador guardara ese
  ensayo con los datos nuevos, el segundo guardado lo dejaría sin ellos: el mismo margen que ya
  se acepta con las filas heredadas. No se pierde nada que se haya escrito en ese guardado.
- `GET` no cambia: devuelve el `jsonb` tal cual.

### Estrategia de verificación

En `scripts/verificar-reglas.ts`:

- **Actividades:** el caso de la T31 se invierte: la etiqueta de la 4.1.8 empieza por
  «4.1.8 · »; `filtrarOpciones` con «4.1.8» y con «10.1» encuentra la 4.1.8 y la 10.1;
  «excavacion» sigue encontrándola; «4.1.9» encuentra la 4.1.9 y la 4.1.96 (caso límite).
  `faltasDeActividad` con `clave` vacía da «Elija la actividad.».
- **`faltasDelEnsayo`:** completo con PR y metros → sin faltas; completo con lugar → sin faltas;
  sin inicio, sin fin, sin responsable (y con solo espacios), sin ubicación, con PR sin metros,
  con lugar vacío → la falta de cada uno en su campo; fin igual al inicio y fin anterior →
  rechazados; sin observación → la de RF-72.
- **`construirEnsayo`:** uno nuevo completo guarda los cuatro datos recortados; uno nuevo sin
  responsable da `null`; uno con el id de un ensayo anterior y sin datos nuevos se guarda con su
  ensayo y su observación (RF-89); la ubicación nunca sale con PR y lugar a la vez.
- **Contrato:** `ensayoDelParte` rechaza una hora «7.30» y unos metros de 30.

Demo en Chrome, sobre PRUEBA-016 (abrir un parte nuevo de un día pasado, porque el de hoy está
anulado):

- Actividades: la lista empieza por «Otra actividad» y enseña «4.1.8 · …»; buscar «4.1.8» y
  «10.1» encuentra; «Añadir actividad» sale en blanco y guardar así marca «Elija la
  actividad.»; una actividad guardada se ve con su número.
- Ensayos: añadir uno y guardar sin nada marca cada falta; fin antes del inicio se rechaza;
  con PR y metros se guarda; otro con «Otro lugar» se guarda; al recargar siguen ahí.
- RF-89: con `fetch` interceptado en la página, un ensayo del `GET` sin los datos nuevos se ve
  con su ensayo y su observación, sin los campos nuevos y sin error (no hay ensayos reales
  guardados; se comprueba antes con una lectura).

### Riesgos

- **Que el guardado de la sección rechace un ensayo viejo que nadie tocó.** Es el fallo que
  más duele: el residente no podría guardar Control Calidad de Obra en un parte que ya tenía
  ensayos. Lo cubren el caso de `construirEnsayo` con un anterior y la demo interceptada. Si
  pasara en producción, la salida inmediata es revertir `construirEnsayo` a exigir solo ensayo
  y observación: los datos nuevos guardados no se pierden, solo dejan de exigirse.
- **La tabla de solo lectura no cabe.** Hoy suma 720 (240 + 480). Con las columnas nuevas se
  mantiene en 720: Ensayo 200, Cuándo y dónde 180 (horas arriba, PR o lugar abajo), Responsable
  140 y Observación 200, más las separaciones. Se comprueba mirando un parte cerrado o anulado
  en Chrome.
- **Una fila de ensayo muy larga en edición.** Son siete campos. Van en `FilaDeFormulario`, que
  ya parte en renglones; la observación sigue en su propio renglón, como hoy.
- **Revertir la T31 a medias.** Si cambia la etiqueta pero no las pruebas, `verificar` falla,
  que es lo que se quiere: el caso invertido es la comprobación.

## Cambio del 2026-09-23 — se llama «bitácora», y gerencia ve las de todas las obras

> Todo lo de arriba es el plan de la spec y de sus cambios anteriores, y **no cambia**.
> Este bloque cubre RF-90 a RF-96.

### Qué se descubrió al leer el código

Tres cosas que deciden la forma del trabajo:

1. **El menú ya dice «Bitácoras»** (`src/shared/rules/permisos.ts:318`). De ahí venía la
   incoherencia: el menú con un nombre y la pantalla con otro. **No se toca.**
2. **El servidor ya manda lo que hace falta para RF-92.** `GET /api/panel/partes?fecha=`
   devuelve **todas** las bitácoras de ese día dentro del alcance de la sesión, ordenadas por
   nombre de obra (`partes+api.ts:71-79`). No hay que tocar el endpoint: la pantalla las recibe
   y las tira en una sola línea, `pantalla-partes.tsx:265`.
3. **Cambiar el texto de una regla arrastra su prueba.** `src/shared/rules/parte.ts:659` dice
   «No se puede cerrar el parte todavía:» y `scripts/verificar-reglas.ts:1454` lo comprueba
   **literal**. Se cambian los dos en la misma tarea (constitución §5).

### Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/pantalla-partes.tsx` | Los textos visibles: título, botón de abrir, avisos de cierre y anulación. Y el **selector de obra**, que hoy solo existe cuando no hay ninguna bitácora ese día. | RF-90, RF-92 a RF-96 |
| `src/features/panel/pantalla-inicio.tsx` | «Parte del día» → «Bitácora del día»; «Llenar el parte de hoy» → «Llenar la bitácora de hoy». | RF-90 |
| `src/features/panel/secciones-con-indice.tsx` | Los textos del índice que nombran el documento. | RF-90 |
| `src/shared/rules/parte.ts` | Solo el texto de `bloqueosDelCierre`. **La lógica no se toca.** | RF-90 |
| `scripts/verificar-reglas.ts` | El caso de `bloqueosDelCierre`, que compara el texto literal. Va en la **misma** tarea. | RF-90 |
| `src/app/api/panel/partes+api.ts` y `partes/[id]*` | Los **textos** de 15 mensajes de rechazo. Ni rutas, ni forma, ni códigos. | RF-90 |
| `src/features/panel/pantalla-partes.tsx` (histórico) | Donde se nombran las bitácoras del formato viejo, pasan a «bitácoras por máquina». | RF-91 |

**Lo que NO se toca, y por qué.** Los identificadores del código —`parte`, `partes`,
`ParteFila`, `api.partes`, `partesDeObra`, `pantalla-partes.tsx`, la ruta `/api/panel/partes`—
se quedan como están. La spec lo puso en «Fuera de alcance»: renombrarlos es un diff enorme que
no cambia nada de lo que ve OCC, y la tabla tiene filas escritas apuntándole. **La regla
práctica de este cambio: si lo lee una persona, cambia; si lo lee el compilador, no.**

### Modelo de datos

**Sin cambios de esquema.** Ni local, ni servidor, ni migraciones. `partes_de_obra` se queda
con su nombre.

### Algoritmo / reglas

**No hay regla de negocio nueva.** Lo único con forma de algoritmo es cuál bitácora se enseña,
que hoy es una línea y pasa a ser una elección:

1. El día trae `partes`, ya ordenadas por nombre de obra (lo hace el servidor).
2. **Gerencia** elige obra en un selector que lista **todas** sus obras, cada una con lo que
   tiene ese día: «Cerrada», «Abierta», «Anulada» o nada (RF-92, RF-95).
3. Elegida una obra:
   - si tiene bitácora viva, se muestra;
   - si solo tiene anuladas, se muestra la última, marcada «Anulado» (RF-96);
   - si no tiene ninguna, sale el botón de abrirla (RF-94, RF-95).
4. **Dentro de una misma obra**, si hay una anulada y una viva, se sigue mostrando la viva: es
   el modelo de RF-7 —se anula y se abre otra— y no cambia.
5. **El residente no ve selector**: su obra es la de su sesión y solo tiene una (RF-35).
6. Sin obra elegida todavía, se preselecciona la primera que tenga bitácora ese día; si ninguna
   la tiene, ninguna, y sale el selector para abrir.
7. La obra elegida **se conserva al cambiar de día** si esa obra existe, para poder recorrer
   los días de una misma obra hacia atrás sin volver a elegirla en cada uno.

### Decisiones técnicas

- **Un solo selector de obra, que sirve para ver y para abrir** → se descartó poner dos
  controles (uno para elegir cuál se mira y otro para elegir cuál se abre) porque son la misma
  pregunta —«¿de qué obra?»— y dos controles obligan a entender la diferencia antes de usarlos.
  Con uno, elegir una obra sin bitácora enseña el botón de abrirla, que es lo que se quería.
- **El estado es el `obraId` elegido, no el `parteId`** → se descartó guardar el id de la
  bitácora porque al cambiar de día ese id ya no existe y habría que recalcularlo; con el
  `obraId`, cambiar de día mantiene la obra y busca la bitácora que le toque (paso 7).
- **El selector dice qué tiene cada obra ese día** («Cerrada», «Abierta», «Anulada») → se
  descartó una lista pelada de obras porque obliga a entrar en cada una para saber cuáles
  faltan por llenar, que es justo lo que gerencia quiere ver de un vistazo.
- **No se toca el endpoint** → se descartó añadirle un `obraId` al `GET` para pedir una sola.
  Ya devuelve todas las del alcance y son dos o tres filas; filtrar en el servidor añadiría un
  viaje por cada cambio de obra para ahorrar unos bytes.
- **Los identificadores se quedan en «parte»** → se descartó renombrarlos a la vez. Sería un
  diff de cientos de líneas en el archivo más grande del panel (2397), con riesgo real de
  romper algo, para no cambiar nada de lo que ve OCC. Si algún día se hace, es su propia tarea
  y no mezclada con un cambio de comportamiento.
- **El texto de la regla se cambia con su prueba en la misma tarea** → se descartó separarlas:
  `verificar-reglas.ts` compara el texto literal, así que separarlas deja el guion en rojo, y
  la constitución §5 no admite una tarea que no cierre en verde.

### Impacto en la sincronización

**Sin impacto.** Ni pull, ni `outbox`, ni `seq`, ni idempotencia, ni reevaluación. El módulo es
solo del panel; el celular no lleva bitácoras desde la spec 004.

### Contrato de API

**Sin cambios de contrato.** Ninguna ruta se añade, se quita ni cambia de forma; las guardias y
el filtro por obra siguen igual. Lo único que cambia son los **textos** de 15 mensajes de
rechazo, que el panel muestra tal cual:

- `partes+api.ts`: «No se puede abrir **la bitácora** de un día que no ha llegado.», «Falta
  decir de qué obra es **la bitácora**.», «No se pudo abrir **la bitácora**.»
- `partes/[id]/anular+api.ts`: «No existe **esa bitácora**.» (×2) y «**Esa bitácora** ya estaba
  anulada.»
- `partes/[id]+api.ts`: «Una máquina no puede estar dos veces en **la misma bitácora**.», «Ese
  equipo no es de la obra de **esta bitácora**.», «Una persona no puede estar dos veces en **la
  misma bitácora**.», y «No existe **esa bitácora**.» (×2)
- `partes/[id]/cerrar+api.ts`, `cantera+api.ts` y `foto+api.ts`: «No existe **esa bitácora**.»

Recordar la trampa del CLI: **el servidor de desarrollo no recompila `+api.ts` en caliente**.
Tras tocarlos hay que reiniciar `npm run web` o se sigue sirviendo el texto viejo.

### Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: no se añaden casos —no hay regla nueva— pero **se corrige
  el existente** de `bloqueosDelCierre` (línea 1454), que compara el texto literal. Es la única
  prueba automática que este cambio toca.
- **Comprobación de que no queda ni un «parte» a la vista**, que es lo que de verdad cierra
  RF-90: un `grep` sobre los textos visibles, no sobre el código. Se corre al final, sobre
  `src/features/panel/`, `src/app/api/panel/partes*` y `src/shared/rules/parte.ts`, buscando
  «el parte», «un parte», «ese parte», «este parte», «del parte» y «Parte d». Debe devolver
  solo comentarios y nombres de variables.
- **Demo manual**, con dos obras y el mismo día:
  1. Con una sola obra con bitácora: se ve, y la pantalla dice de qué obra es (RF-93).
  2. Abrir la de la segunda obra **el mismo día**: se puede, y el selector pasa a ofrecer las
     dos (RF-92, RF-95). *Hoy esto es imposible.*
  3. Cambiar entre las dos sin salir del día (RF-92).
  4. Anular una y comprobar que la otra obra sigue viéndose, y que la anulada sigue accesible
     desde el selector marcada «Anulado» (RF-96).
  5. Retroceder un día con una obra elegida: se mantiene la obra (paso 7 del algoritmo).
  6. Entrar como **residente**: sin selector, solo su obra, todo en «bitácora» (RF-35, RF-90).
  7. Provocar un rechazo del servidor y leer que dice «bitácora» (RF-90).
- **Comprobaciones extra**: se tocan rutas `+api.ts` → **reiniciar `npm run web`** antes de la
  demo. No se leen secretos nuevos ni se añaden pantallas al operador.

### Riesgos

- **Que el cambio de texto se coma una palabra que era identificador** y rompa la compilación o,
  peor, una comparación. *Se detecta:* `npm run typecheck` para lo primero; `npm run verificar`
  para lo segundo, que es exactamente lo que pasaría con `bloqueosDelCierre`. *Se revierte:*
  archivo por archivo.
- **Que quede un «parte» suelto en una pantalla poco visitada.** El compilador no lo ve. *Se
  detecta:* el `grep` de textos visibles de arriba, que por eso es un paso de la validación y no
  una comprobación al ojo.
- **Que preseleccionar obra cambie lo que ve el residente.** Es quien más usa el módulo y no
  debería notar nada. *Se detecta:* paso 6 de la demo. *Se mitiga:* el selector solo se pinta
  para quien ve todas las obras, con la misma condición `esGerencia` que ya existe.
- **Que al cambiar de día con una obra elegida se enseñe la bitácora de otra obra.** Sería peor
  que el defecto actual: se estaría mirando un día de otra obra sin notarlo. *Se detecta:* paso
  5 de la demo. *Se mitiga:* RF-93 obliga a decir siempre de qué obra es, incluso con una sola.
