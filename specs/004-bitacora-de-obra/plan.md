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
