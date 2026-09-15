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
