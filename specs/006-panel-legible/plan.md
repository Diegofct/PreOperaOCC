# Plan técnico — Spec 006

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Tres cambios de presentación y ninguno de datos. La spec declara **Datos** y
**Sincronización** sin marcar, y este plan lo respeta: no hay migración, no hay tipo nuevo
en la cola, no hay nada que baje al celular. Lo que sí toca son **Reglas**, porque dos
decisiones que hoy viven dentro de una pantalla o dentro de una ruta pasan a ser funciones
puras — que es donde la constitución dice que tienen que estar.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/constants/theme.ts` | Tokens nuevos: `Grosor`, `AnchoLadoBarra`, `AnchoMinimoBarraCentrada`, `AnchoIndiceDeSecciones`, `AnchoContenidoConIndice`, `AnchoMinimoDosColumnas` | 1, 3, 5, 6, 16 |
| `src/constants/medidas.ts` **(nuevo)** | Módulo puro con lo que es un número: `Spacing`, los anchos máximos, `Radio`, `Grosor` y los cinco anchos de esta spec. `theme.ts` lo reexporta | — |
| `src/constants/paleta.ts` | Ningún color nuevo. Se corrige el comentario de `Panel.accionSuave`, que hoy dice que es «para el enlace activo de la barra» y la barra no lo usa | 14 |
| `src/features/panel/barra-navegacion.tsx` | `enlaces` pierde `flex: 1`; marca y cuenta pasan a dos columnas de base idéntica; régimen de dos renglones en ventana estrecha; anillo de foco en la pastilla | 1, 2, 3, 4 |
| `src/shared/rules/parte.ts` **(nuevo)** | `seccionesDelParte()` y `bloqueosDelCierre()`, puras | 8, 9, 12, 13, 29 |
| `src/shared/rules/jornada.ts` | `sumarDias`, `restarDias` y `PERIODOS` unificados: hoy hay **cuatro** copias de la misma aritmética | 18, 19, 20 |
| `src/features/panel/secciones-con-indice.tsx` **(nuevo)** | `DisposicionConIndice`, `IndiceDeSecciones`, `MarcoDeSecciones`, `SeccionEnMarco`, `PieDeSeccion` | 5, 6, 7, 10, 11, 14, 16, 17 |
| `src/features/panel/usar-parametro-direccion.ts` **(nuevo)** | Lo que hoy está enterrado en `usar-listado-filtrado.ts` para `?buscar=`, generalizado a cualquier clave | 30 |
| `src/features/panel/usar-listado-filtrado.ts` | Pasa a usar el ayudante de arriba en vez de su copia privada | 30 |
| `src/features/panel/marco.tsx` | `MarcoPantalla` acepta `refDesplazamiento?` **opcional**; las otras nueve pantallas no se enteran | 10 |
| `src/features/panel/componentes.tsx` | `Tabla` gana `variante?: 'tarjeta' \| 'desnuda'`; se retira `Bloque`. **`Seccion` no se toca** | 5, 6 |
| `src/features/panel/pantalla-partes.tsx` | Las secciones pasan al marco único; índice con estado; histórico solo si está cerrado; tabla histórica más estrecha | 5-17, 28, 29 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | Usa `bloqueosDelCierre()` en vez de su lógica en línea. Mismos mensajes, mismos códigos | 13 |
| `src/app/api/panel/preoperacionales+api.ts` | `?periodo=`, ventana sobre las dos fechas, `recibidoEn` en la respuesta, motivo del vacío | 18-24 |
| `src/features/panel/contratos.ts` | `PreoperacionalFila` gana `recibidoEn`; la respuesta del día gana `motivoVacio` | 21, 24 |
| `src/features/panel/cliente-api.ts` | El listado acepta periodo | 18 |
| `src/features/panel/pantalla-preoperacionales.tsx` | Selector de periodo, columna «Llegó», marca de retraso, vacíos que explican | 18-25, 30 |
| `scripts/verificar-reglas.ts` | Presupuesto de ancho por archivo; casos de las reglas nuevas; dos pares de contraste | 5, 8, 13, 20 |

**Antes de crear nada se buscó qué reutilizar**, y sale bastante: `PERIODOS` y `restarDias`
ya existen en `resumen+api.ts`; la persistencia en la dirección ya existe dentro de
`usar-listado-filtrado.ts`; `validarAvance` y `mensajeDeAvance` ya son puras en `jornada.ts`
y las usa el cierre; el anillo de foco por estado propio ya es un patrón establecido en
`componentes.tsx`; `filtroDeObra` ya centraliza el alcance. Lo único verdaderamente nuevo
son las dos piezas de disposición y las dos reglas del parte.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.**
- **Servidor** (`src/db/servidor/esquema.ts`): **sin cambios.** `recibido_en`, `iniciado_en`,
  `enviado_en` y `cerrada_en` ya existen y ya están pobladas; lo único que faltaba era
  leerlas.
- **Migraciones**: ninguna. No se corre `db:generate` ni `db:generate:servidor`.
- **Compatibilidad**: no aplica. Un teléfono que no se actualice se comporta igual, porque
  nada de esto llega al teléfono.

## Algoritmo / reglas

Dos funciones puras nuevas en `src/shared/rules/parte.ts`, sin I/O y sin importar nada de
`features/` — la misma disciplina que ya sigue `fusion.ts`.

**`seccionesDelParte(conteos): SeccionDelParte[]`** (RF-7, 8, 9, 29)

1. Devuelve las secciones **en el mismo orden en que se pintan**. El orden es dato de la
   regla, no del JSX: así el índice no puede desalinearse del documento. Es el mismo truco
   que `modulosVisibles` ya usa para la barra.
2. Secciones de lista: `cuantos > 0 ⇒ 'lleno'`, si no `'vacio'`.
3. Notas: `'lleno'` si al recortar espacios queda algo.
4. Fotografía: mientras el conteo sea `null` —aún cargando— el estado es `'desconocido'`,
   nunca un falso «vacío».
5. Histórico: entra en la lista **solo si hay alguna bitácora vieja cerrada** (RF-28), y
   nunca cuenta como pendiente (RF-29).
6. La entrada no es `ParteFila` sino una forma mínima de conteos, para que `shared/rules` no
   dependa de `features/panel`.

**`bloqueosDelCierre(parte): string[]`** (RF-13)

Devuelve, en español y ya redactado, lo que impide cerrar. Son exactamente las tres
comprobaciones que hoy hace `cerrar+api.ts` en línea:

1. Parte vacío: ninguna máquina, ninguna persona y ninguna actividad — las tres a la vez.
2. Por cada máquina, `validarAvance(clase, inicial, final)`; el texto sale de
   `mensajeDeAvance`, que ya existe.
3. Por cada persona, falta la entrada o la salida.

Lista vacía significa «se puede cerrar». **La ruta pasa a llamar a esta función** en vez de
repetir la lógica, así que el índice y el servidor no pueden discrepar — principio 3 de la
constitución. Los mensajes y los códigos de estado no cambian ni una coma.

**La ventana del periodo** (RF-20), en `preoperacionales+api.ts`:

```
desde = medianoche en obra de (hoy − PERIODOS[periodo])
hasta = desde + (PERIODOS[periodo] + 1) días
incluir la fila si  (iniciado_en ∈ [desde, hasta))  O  (recibido_en ∈ [desde, hasta))
```

El `O` es el requisito entero: con solo `iniciado_en`, el acta de VOL-01 —iniciada el 09-03,
recibida el 09-07— se queda fuera de «última semana», que empieza el 09-05. Es el caso que
originó la spec.

## Decisiones técnicas

- **La barra se centra dando a marca y cuenta la misma base de flex** (`flexBasis:
  AnchoLadoBarra` con `flexGrow: 1` en las dos, y `enlaces` sin `flex`) → se descartó
  `justifyContent: 'center'` sobre la fila porque centra los enlaces **en el hueco sobrante**,
  no en la barra: marca y cuenta no miden lo mismo, y la cuenta además cambia de ancho con el
  nombre de cada persona. También se descartó `position: 'absolute'` sobre los enlaces:
  centra de verdad, pero no aporta altura, no puede envolver y al estrecharse se monta encima
  del logotipo. Con bases iguales el centrado no depende del ancho del centro, que es lo que
  hace que se vea igual con 4 módulos que con 7 (RF-2).
- **En ventana estrecha, dos renglones explícitos** por debajo de `AnchoMinimoBarraCentrada`
  → se descartó dejar que `flexWrap` lo resolviera solo, porque lo primero que baja de
  renglón es la cuenta y los enlaces vuelven a quedarse pegados a la marca: el defecto de hoy
  con otro disfraz (RF-3).
- **El índice y el marco van en un archivo nuevo**, no en `componentes.tsx` → se descartó
  meterlos ahí porque ese archivo es el vocabulario de las diez pantallas y ya pasa de 1100
  líneas; tener `Seccion` y `SeccionEnMarco` codo con codo invita a mezclarlas. Y se descartó
  dejarlos locales dentro de `pantalla-partes.tsx`, que ya tiene 1390 líneas y donde la
  disposición quedaría atada a un dominio que no le importa.
- **`Seccion` no se toca ni una línea** → se descartó convertirla en tarjeta, que es lo
  primero que uno piensa: la usan **nueve pantallas más** y sería rediseñar el panel entero
  dentro de una spec que se acota al parte.
- **`Tabla` gana una variante en vez de un componente nuevo** → aditiva, con el valor de hoy
  por defecto, así que las nueve pantallas que ya la usan no cambian un píxel.
- **El índice refleja lo guardado, no lo tecleado** (RF-9) → se descartó vigilar lo que se
  escribe porque mentiría: diría que una sección está lista cuando todavía no ha salido del
  navegador, y al recargar se vaciaría sin aviso. «Llena» significa «esto ya no se pierde».
- **El salto se hace con `scrollTo` y `onLayout`** → se descartó `nativeID` +
  `scrollIntoView`, que el proyecto podría permitirse porque ya toca `document` en
  `subir-foto.tsx`: el punto de llegada queda **debajo** del índice pegado, y la única cura es
  `scroll-margin-top`, una propiedad CSS que ninguna hoja de React Native puede expresar sin
  escribir un valor suelto fuera del sistema de tokens.
- **El periodo se lleva a `shared/rules/jornada.ts`** → se descartó importarlo desde
  `resumen+api.ts`, porque una pantalla no debe importar de una ruta de servidor; y se
  descartó copiarlo, que es lo que ya pasó cuatro veces con la aritmética de fechas.
- **El vacío se explica con un motivo que manda el servidor** (`sin_obra` / `sin_datos`) → se
  descartó que la pantalla lo dedujera mirando si la persona tiene obra: la pantalla no es
  quien sabe por qué el servidor no devolvió nada, y duplicar esa deducción es cómo se acaba
  con dos versiones de la misma regla. **El alcance no se relaja**: sigue sin ver nada,
  sabiendo por qué (RF-24).
- **Las medidas se separan a un módulo puro** (`medidas.ts`) para que el guion de
  verificación pueda importarlas → se descubrió al implementar T1: `scripts/verificar-reglas.ts`
  corre en Node y `theme.ts` abre con `import '@/global.css'` y `import { Platform } from
  'react-native'`, así que **no es importable desde ahí**. Por eso el `1280` de la prueba está
  escrito a mano desde la spec 005, con un comentario que dice de dónde sale: no era descuido.
  Se descartó dejar los anchos duplicados a mano —es exactamente el fallo que este plan evita
  en el otro lado, derivando `AnchoContenidoConIndice`— y se descartó que la prueba leyera los
  valores con una expresión regular sobre `theme.ts`, que sería una tercera forma de decir lo
  mismo. El proyecto ya resolvió esto una vez: `paleta.ts` está separado precisamente para que
  la prueba de contraste pueda importarlo, y su cabecera lo explica. `medidas.ts` es el mismo
  movimiento para los números. `BottomTabInset` se queda en `theme.ts`: usa `Platform.select` y
  es justo lo que no puede cruzar.
- **El histórico se filtra por cerrada, no se borra** (RF-28) → se descartó quitar el bloque
  entero porque anularía 004/RF-36 sin dejar dónde ver una bitácora vieja cerrada si
  apareciera; y se descartó borrar las filas, que choca de frente con el principio 4.

## Impacto en la sincronización

**Sin impacto.** No hay entidades nuevas en `outbox`, no cambia el orden de `seq`, no hay
claves de idempotencia nuevas y el servidor no reevalúa nada distinto al ingerir. La app del
operador no se toca (RF-26).

## Contrato de API

Una sola ruta cambia: `GET /api/panel/preoperacionales`.

- **Guardia**: sigue abriendo con `requerirPermiso(peticion, 'preoperacionales', 'listar')`.
- **Alcance**: sigue saliendo de `filtroDeObra(sesion, preoperacionales.obraId)`. No se
  cambia la columna ni se afloja la condición.
- **Parámetros**: `?fecha=YYYY-MM-DD` (como hoy, un día) **o** `?periodo=hoy|semana|mes`. Si
  llegan los dos, manda `fecha`. Sin ninguno, `periodo=semana` (RF-19).
- **Respuesta**: cada fila gana `recibidoEn`. La respuesta gana `motivoVacio:
  'sin_obra' | 'sin_datos' | null`, que solo viaja cuando no hay filas.
- **Códigos**: sin cambios. Un periodo que no esté en la lista se trata como `semana` en vez
  de rechazarse, igual que hace hoy `resumen+api.ts`.
- **Neon**: la consulta sigue siendo una sola sentencia. No hace falta transacción.

`GET /api/panel/partes/:id/...` y el cierre **no cambian de contrato**: el cierre solo mueve
su lógica a una función pura.

## Anchos, que es donde este plan se puede romper en silencio

`scripts/verificar-reglas.ts:1024-1050` lee el código fuente de `src/features/panel/*.tsx`,
suma los `ancho:` de cada tabla más 16 por separación más 32 de margen, y exige ≤ 1280.
**Es un escaneo de texto, no una medida real**, así que seguirá en verde aunque una tabla se
salga de su marco. Hay que enseñarle los dos casos nuevos.

**El parte, con índice a la izquierda:**

```
1280  tope de página
−220  índice (AnchoIndiceDeSecciones)
− 24  separación entre columnas (Spacing.four)
=1036  marco de la derecha
− 48  relleno interior de la banda (Spacing.four a cada lado)
= 988  presupuesto real de las tablas del parte
```

La tabla histórica gasta hoy **1192** (columnas 1080 + 80 + 32). No cabe en 988; faltan 204.
Anchos nuevos: Equipo 130, Operador 170, Horómetros 150, Horas 80, Actividades 210, Estado
110 → suman **850**, gasto **962**, con 26 de holgura. La otra tabla del parte (laboratorio,
260 + 180) gasta 488 y cabe de sobra.

**Los preoperacionales, con dos fechas:** con un periodo de varios días la columna «Hora» ya
no basta —hay filas de días distintos—, así que pasa a ser el día de trabajo, y entra
«Llegó». De 7 columnas a 8:

| Columna | Hoy | Nuevo |
| --- | --- | --- |
| Hora → Día | 80 | 110 |
| Máquina | 140 | 130 |
| Tipo | 150 | 120 |
| Operador | 220 | 190 |
| Odóm. / Horóm. | 160 | 150 |
| Resultado | 210 | 200 |
| **Llegó** | — | **110** |
| (botón Ver) | 100 | 90 |
| **Suma** | **1060** | **1100** |

Gasto: `1100 + 16×7 + 32 = 1244` de 1280. Holgura 36.

Cambios en la prueba: importar `MaxContentWidthPanel`, `Spacing` y `AnchoContenidoConIndice`
**desde `medidas.ts`**, no desde `theme.ts` —que no es importable desde Node—, y límite por
archivo: 988 para `pantalla-partes.tsx`, 1280 para el resto. Es **más estricto**, no una
excepción a la baja. De paso desaparecen el `1280`, el `16` y el `32` que la prueba lleva
escritos a mano desde la spec 005.

## Estrategia de verificación

**`scripts/verificar-reglas.ts`:**
- `seccionesDelParte`: parte recién abierto con todo vacío; una máquina y dos personas
  encienden solo esas dos; `notas: '   '` cuenta como vacío; `fotos: null` da `desconocido` y
  nunca `vacio`; el histórico no aparece si no hay bitácoras cerradas (RF-8, 9, 28, 29).
- `bloqueosDelCierre`: parte vacío da un bloqueo; una máquina sin lectura final da el mismo
  mensaje que devuelve hoy la ruta; una persona sin salida, también; un parte completo da
  lista vacía (RF-13).
- Aritmética de fechas unificada: `restarDias` cruzando fin de mes y año bisiesto; la ventana
  del periodo incluye una fila por `recibido_en` aunque su `iniciado_en` quede fuera — con las
  fechas reales del caso VOL-01 (RF-20).
- Anchos con presupuesto por archivo, y los dos pares de contraste sobre `Panel.accionSuave`.

**Demo manual:**
1. **Barra**: gerencia (7 módulos) y residente (4), medir que el bloque está centrado
   respecto a la barra y no al hueco; estrechar por debajo de 1100 y ver los dos renglones;
   tabular por los enlaces (RF-1 a 4).
2. **Parte**: día vacío → índice con todo sin registrar y el pie nombrando qué falta para
   cerrar; escribir una persona **sin guardar** → el índice no se enciende; guardar → sí;
   pulsar una entrada del índice → la vista salta; desplazarse → el índice se queda;
   estrechar a 900 → el índice sube y sigue estando; abrir el 09-10, que tiene una bitácora
   vieja **abierta**, y comprobar que **ya no aparece** ese bloque (RF-5 a 17, 28, 29).
3. **El caso real**: abrir Preoperacionales sin tocar nada y ver el acta de VOL-01 de Pedro
   Cartagena —iniciada el 2026-09-03, recibida el 2026-09-07— con su columna «Llegó» y su
   marca de retraso, sin pulsar «día anterior» ni una vez. Recargar y comprobar que el
   periodo sobrevive (RF-18 a 22, 30).
4. Entrar con un supervisor sin obra y comprobar que el panel dice por qué no ve nada
   (RF-24); dejar una búsqueda puesta que no case y comprobar que ofrece quitarla (RF-25).

**Comprobaciones extra:** `npm run verificar`, `npm run typecheck`, `npm run lint` en cada
tarea. No se lee ningún secreto nuevo, así que no hace falta el `grep` sobre `dist/client`.
No se añade ninguna ruta al operador, así que no hace falta `expo export`.

## Riesgos

- **Romper las nueve pantallas que comparten `Seccion`.** Es el riesgo grande, y se mitiga
  por diseño y no por disciplina: `Seccion` no se toca, `Tabla` solo gana un prop opcional y
  `MarcoPantalla` también. Detección: mirar inicio, detalle de preoperacional y llantas
  después del cambio. Reversión: si algo se movió es que se tocó `Seccion`.
- **La prueba de anchos en verde con la tabla saliéndose.** El presupuesto por archivo va en
  la **misma tarea** que el índice, nunca después; si se separan, hay una ventana en la que
  la prueba miente.
- **`position: 'sticky'` no soportado por esta versión de React Native Web.** Se detecta en
  la demo. Reversión: quitar tres propiedades; el índice deja de pegarse y todo lo demás
  sigue igual. Se pierde comodidad, no función (RF-11 quedaría incumplido y habría que
  decirlo, no taparlo).
- **`AnchoLadoBarra` mal calibrado.** Si 224 se queda corto con 7 módulos, los enlaces
  envuelven a dos renglones: **el centrado no se rompe**, la barra crece de alto. Ajuste:
  bajar el token, o retirar el literal del nombre del proyecto —que de todas formas está
  pendiente de cambiar—.
- **Mover la lógica del cierre a una función pura cambiando un mensaje sin querer.** Los
  textos son los que el residente lee cuando no le deja cerrar. Se copian literalmente y el
  caso en `verificar-reglas.ts` compara la cadena completa.
- **Retirar `Bloque`**, que está exportado: si alguien lo importó en otra rama, `typecheck`
  lo canta. Reversión: once líneas.
- **La tabla histórica queda apretada** (962 de 988). Si mañana se le añade una columna, la
  prueba falla antes de llegar al navegador — que es exactamente lo que se quiere.
