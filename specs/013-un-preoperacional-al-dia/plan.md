# Plan técnico — Spec 013

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

La spec son dos cambios que no se tocan entre sí, y conviene leer el plan así:

1. **Ya lo hizo hoy** (RF-1 a RF-12): una regla pura nueva, una consulta que la alimenta
   y tres sitios de la interfaz que dejan de ofrecer el botón.
2. **Abrir no registra** (RF-13 a RF-17): la fila del preoperacional deja de nacer al
   abrir la pantalla y nace en el primer dato que el operador escribe.

Todo ocurre en el teléfono. **Ni el servidor ni el panel cambian una línea.**

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/inspeccion.ts` | `estadoDelDia(...)`: decide si esa máquina ya tuvo su preoperacional hoy, y con qué resultado y a qué hora. Pura, sin I/O | RF-1 a RF-7, RF-10 |
| `src/shared/rules/inspeccion.ts` | `borradorTieneContenido(...)`: si lo que hay en pantalla es algo o es nada. Es la frontera de RF-14 | RF-13, RF-14, RF-15 |
| `src/features/checklists/repositorio.ts` | `firmadosRecientesDe(usuarioId)`: los preoperacionales firmados de las últimas 48 h de ese operador, que es lo que come la regla | RF-1, RF-4, RF-5 |
| `src/features/checklists/repositorio.ts` | `abrirBorrador` deja de insertar la fila y pasa a devolver un resultado con tres formas: borrador, ya hecho hoy, sin formato | RF-8, RF-13 |
| `src/features/checklists/repositorio.ts` | `registrarSiHaceFalta(borrador)`: el `INSERT` diferido, idempotente. `guardarBorrador` lo llama por dentro | RF-14, RF-16 |
| `src/features/checklists/repositorio.ts` | `historialDe` deja fuera los borradores sin contenido | RF-17 |
| `src/features/checklists/pantalla-preoperacional.tsx` | El autoguardado no escribe nada mientras no haya nada que guardar; la foto registra antes de guardarse; si se entra a una máquina ya hecha, lo dice y no pinta formulario | RF-13 a RF-16, RF-8 |
| `src/features/checklists/inicio-operador.tsx` | La tarjeta dice «ya lo hizo hoy» con hora y resultado, y el botón «Hacer preoperacional» no se pinta | RF-8, RF-9, RF-10, RF-12 |
| `src/features/checklists/pantalla-vehiculo.tsx` | Cada máquina de la lista muestra su estado del día; la que ya está hecha no navega | RF-8, RF-11 |
| `scripts/verificar-reglas.ts` | Los casos de las dos funciones nuevas | RF-1 a RF-7, RF-13 a RF-15, RF-21 |

**No se crea ningún archivo nuevo.** Lo que hace falta ya tiene dónde vivir: las reglas del
preoperacional están en `inspeccion.ts` y el acceso a datos en `repositorio.ts`.

**No se usa ninguna API de Expo SDK 57 que no esté ya en estos archivos**: Drizzle sobre
`expo-sqlite`, `useFocusEffect` de `expo-router` y componentes de React Native que las tres
pantallas ya importan. No hay decisión de API que consultar en los docs de la versión.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios de esquema.** Ni columnas, ni tablas,
  ni índices.
- **Servidor** (`src/db/servidor/esquema.ts`): **sin cambios.**
- **Migraciones**: ninguna. `npm run db:generate` no se corre porque no hay nada que generar.
- **Índices**: no se añade ninguno. La consulta nueva filtra por `usuario_id` y no hay índice
  por esa columna, igual que `historialDe`, que hace lo mismo desde el primer día. En el
  teléfono de un operador esta tabla tiene cientos de filas, no millones; un índice aquí sería
  pagar escritura en cada preoperacional para ahorrar microsegundos en una lectura.
- **Compatibilidad**: un teléfono que no se actualice sigue comportándose como hoy —repite
  preoperacionales y crea filas vacías—, y el servidor los acepta igual, porque **lo que se
  sube no cambia de forma ni de contenido**. La flota puede quedar mezclada sin que nada falle.
- **Lo que ya está en los teléfonos**: las filas vacías que existen hoy **no se borran** (lo
  prohíbe el principio 4 de la constitución y la spec lo deja fuera de alcance). Dejan de
  mostrarse en el historial, que es distinto de borrarlas: siguen en SQLite.

## Algoritmo / reglas

### `estadoDelDia` — ¿le toca preoperacional a esta máquina hoy?

Entra la lista de preoperacionales **firmados** del operador (los que tienen `enviadoEn`; un
borrador no ha firmado nada) y sale una de dos respuestas.

```
estadoDelDia({ usuarioId, vehiculoId, hoy }, firmados):

  1. Quedarse con los firmados de ESE operador y ESA máquina        (RF-4, RF-5)
  2. Quedarse con los que caen en `hoy`, comparando
     fechaDeJornada(enviadoEn) === hoy                              (RF-7)
  3. Si no queda ninguno            -> { toca: true }
  4. Tomar el más reciente por enviadoEn
  5. Si su resultado es 'no_apto'   -> { toca: true }                (RF-2, RF-6)
  6. Si no                          -> { toca: false,
                                         hechoEn: enviadoEn,
                                         resultado }                (RF-1, RF-3, RF-10)
```

El paso 5 mira **el último**, no «si hubo alguno NO APTO»: una máquina que salió NO APTO a las
7, se reparó y salió APTO a las 9 ya está revisada y no toca otro. Al revés —APTO a las 7 y
NO APTO a las 9— sí toca, porque la máquina volvió a quedar parada.

`apto_con_observaciones` cae en el paso 6 sin ningún caso especial: **todo lo que no es
`no_apto` cuenta como hecho** (RF-3). Escrito así, un resultado nuevo que se añadiera mañana
bloquearía por omisión, que es el lado seguro.

La fecha sale de `fechaDeJornada`, que ya vive en `src/shared/rules/jornada.ts` y es la misma
con la que se identifica el parte diario. RF-7 no pide nada más que usarla.

### `borradorTieneContenido` — ¿hay algo que guardar?

```
borradorTieneContenido({ respuestas, odometroKm, horometroH, observaciones, fotos }):
  respuestas.length > 0
  || odometroKm != null || horometroH != null
  || observaciones.trim() !== ''
  || fotos > 0
```

`trim()` para que unos espacios no cuenten como trabajo, igual que ya hace el parte de obra
con sus notas (006/RF-9). Las fotos entran en la cuenta porque una foto **es** un dato que el
operador capturó: si se registrara solo con la primera respuesta, una foto tomada antes
quedaría colgando de una fila que no existe.

### Dónde nace la fila

Hoy `abrirBorrador` hace el `INSERT` al entrar a la pantalla (`repositorio.ts:220`). Pasa a:

1. `abrirBorrador` calcula la plantilla, las periodicidades y el UUID, y **devuelve todo eso
   sin escribir nada**. El id se genera igual de pronto: sigue siendo el definitivo, y las
   fotos pueden colgar de él antes de que la fila exista.
2. `guardarBorrador(borrador, cambios)` llama por dentro a `registrarSiHaceFalta(borrador)`,
   que hace `insert(...).onConflictDoNothing()` con los datos de la semilla, y después el
   `update` de siempre.
3. La pantalla no llama a `guardarBorrador` mientras `borradorTieneContenido` diga que no hay
   nada. Ese es el «no deja rastro» de RF-15.
4. `recibirFoto` llama a `registrarSiHaceFalta` antes de `guardarFoto`.

## Decisiones técnicas

- **La regla vive en `inspeccion.ts`, no en un archivo nuevo** → se descartó
  `src/shared/rules/preoperacional-del-dia.ts` porque partiría las reglas del preoperacional
  en dos archivos para meter dos funciones en el segundo. `inspeccion.ts` son 255 líneas y su
  cabecera dice exactamente esto: las reglas del preoperacional, puras, que corren en los dos
  lados.

- **La regla filtra por operador y máquina por dentro, aunque la consulta ya podría hacerlo**
  → se descartó pasarle solo las filas de ese par, porque entonces RF-4 y RF-5 —la regla
  cuenta por operador **y** máquina, y otro operador sí puede revisar la misma máquina hoy—
  solo se podrían comprobar con el teléfono delante. Pasándole las filas del operador entero y
  filtrando dentro, los dos requisitos se verifican en `verificar-reglas.ts`. La consulta
  devuelve decenas de filas: el coste es cero.

- **`insert ... onConflictDoNothing` en cada guardado, sin bandera de «ya existe»** → se
  descartó llevar un `registrado: boolean` en el objeto `Borrador`, porque obliga a mutarlo o
  a subirlo al estado de React, y sobre todo porque **se puede olvidar**: cualquier ruta de
  escritura futura que no lo consulte haría un `UPDATE` sobre una fila inexistente, que en
  SQLite no falla —afecta a cero filas y se pierde el trabajo en silencio—. Una sentencia
  idempotente de más cada 400 ms en una base local es gratis; un guardado que no guarda es el
  peor fallo posible de esta pantalla.

- **`guardarBorrador` es el único sitio que registra** → se descartó exponer
  `registrarSiHaceFalta` para que cada quien lo llamara antes de escribir, por lo mismo del
  punto anterior. La única excepción es la foto, que no pasa por `guardarBorrador`.

- **El servidor no aplica esta regla al ingerir** → se descartó reevaluarla en
  `/api/movil/preoperacionales`, aunque el principio 3 de la constitución diga que el servidor
  reevalúa y gana. Aquí no aplica: lo que el servidor reevalúa es **el veredicto de un acta**
  (si salió APTO o NO APTO), y esta regla no es un veredicto, es una condición para **empezar**
  uno. Si el servidor la aplicara, el segundo acta de un teléfono que todavía no se ha
  actualizado se rechazaría con 422 y **se perdería evidencia firmada** de una máquina que sí
  se revisó. El sitio donde esta regla tiene que estar es el único donde puede ejecutarse sin
  señal, que es donde la spec la pone (RF-18).

- **La interfaz recalcula al enfocar la pantalla, no con un temporizador** → se descartó un
  `setInterval` que vigile el cambio de día para RF-12. `useFocusEffect` ya recarga el inicio
  al volver de cualquier pantalla, y deslizar hacia abajo también. El único caso que un
  temporizador ganaría es un teléfono despierto, con la app abierta en el inicio, cruzando la
  medianoche sin que nadie lo toque; a cambio costaría batería toda la jornada. Queda escrito
  en Riesgos.

- **El historial oculta los borradores sin contenido en vez de borrarlos** → se descartó una
  migración que limpiara las filas vacías que ya existen en los teléfonos: lo prohíbe el
  principio 4 y la spec lo deja fuera de alcance. Filtrar al mostrar cumple RF-17 para las
  filas nuevas **y** para las viejas, sin destruir nada.

- **La tarjeta del inicio sigue siendo una, la de la máquina principal** → se descartó pintar
  una tarjeta por máquina asignada. La spec declara afectada «la tarjeta de la máquina», en
  singular, y rehacer ese inicio en cuadrícula es un cambio de diseño que nadie pidió. Con
  varias máquinas, las demás se alcanzan por «Cambiar de vehículo», que desde la 012 solo
  aparece cuando hay más de una — y esa lista es la que muestra el estado de cada una (RF-11).

## Impacto en la sincronización

- **Pull**: sin cambios. No entra ni sale ninguna fila del snapshot.
- **Push / outbox**: sin cambios de forma. Se encolan **menos** registros, porque los intentos
  vacíos dejan de existir — y los que se encolan son exactamente los mismos que hoy, porque un
  borrador nunca se encoló: solo se encola al firmar, en `cerrarPreoperacional`.
- **Orden de `seq`**: intacto. Nada de esto encola, desencola ni reordena.
- **Idempotencia**: sin cambios. El UUID v7 se sigue generando al abrir y sigue siendo la
  clave con la que el servidor descarta un reenvío. Que la fila se inserte más tarde no cambia
  el id: se calcula en el mismo sitio de siempre.
- **Reevaluación en servidor**: sin cambios. El servidor sigue reevaluando el veredicto con
  `evaluarPreoperacional` y ganando si difiere. No se le añade ninguna comprobación.

## Contrato de API

**Sin endpoints nuevos ni cambios en los existentes.** Ni en `panel/` ni en `movil/`. No hay
guardia que añadir, ni alcance por obra que aplicar, ni código de estado nuevo.

## Estrategia de verificación

### `scripts/verificar-reglas.ts`

| Caso | RF |
| --- | --- |
| Firmado hoy y APTO → no toca; con novedades → tampoco | RF-1, RF-3 |
| Firmado hoy y NO APTO → toca otro | RF-2 |
| NO APTO a las 7 y APTO a las 9 → no toca (manda el último) | RF-2 |
| APTO a las 7 y NO APTO a las 9 → toca | RF-2 |
| Tres NO APTO seguidos el mismo día → sigue tocando | RF-6 |
| Lo que firmó otro operador de esa máquina hoy no cuenta | RF-4, RF-5 |
| Lo que ese operador firmó hoy de otra máquina no cuenta | RF-4 |
| Firmado ayer a las 23:00 → hoy toca | RF-7 |
| El día se parte con `fechaDeJornada`, no con el reloj de quien corre la prueba | RF-7 |
| La respuesta trae hora y resultado del que se hizo | RF-10 |
| Todo vacío → no hay contenido | RF-13, RF-15 |
| Una respuesta, o solo el horómetro, o solo una foto → sí hay contenido | RF-14 |
| Observaciones con solo espacios → no hay contenido | RF-14 |
| `periodicidadesAplicables` da lo mismo con y sin la regla nueva delante | RF-21 |

### Demo manual

En un teléfono, **con el avión activado** (RF-18 no se comprueba de otra forma), con un
operador que tenga **dos** máquinas asignadas:

1. Levantar y firmar el preoperacional de la primera máquina. Volver al inicio: la tarjeta
   dice que ya lo hizo hoy, **con la hora y el resultado**, y el botón «Hacer preoperacional»
   no está. → RF-8, RF-9, RF-10
2. Pulsar «Cambiar de vehículo»: la primera aparece marcada como hecha y no navega; la segunda
   sí. → RF-8, RF-11
3. Entrar al formulario de la segunda y salir **sin tocar nada**. En el historial no aparece
   nada nuevo. → RF-13, RF-15
4. Volver a entrar, responder un ítem, salir. Ahora sí aparece «Sin terminar», y al volver a
   entrar lo respondido sigue ahí. → RF-14, RF-16, RF-17
5. Firmar la segunda dejándola **NO APTO**. La tarjeta de esa máquina vuelve a ofrecer el
   preoperacional. → RF-2
6. Cambiar la fecha del teléfono al día siguiente y comprobar que las dos vuelven a ofrecerlo.
   → RF-12
7. En el panel, con el operador todavía sin señal: ningún preoperacional cambió, ninguna
   acción nueva apareció. → RF-19, RF-20

### Comprobaciones extra

- `npm run verificar`, `npm run typecheck`, `npm run lint` en verde. (Constitución, principio 5)
- **No hace falta** `npx expo export --platform web`: no se añade ninguna ruta al operador y
  las tres pantallas tocadas ya tienen su variante `.web.tsx`. Tampoco se lee ningún secreto,
  así que no hay `grep` sobre `dist/client` que correr.
- **No hace falta** `npm run db:generate`: no se toca ningún esquema.

## Riesgos

- **Un guardado que no guarda.** Si alguna ruta de escritura futura se salta
  `registrarSiHaceFalta`, el `UPDATE` afecta a cero filas y SQLite no se queja: el operador ve
  su formulario lleno y al volver está vacío. *Se detecta* con el paso 4 de la demo. *Se
  previene* metiendo el registro dentro de `guardarBorrador`, que es por donde pasa todo salvo
  la foto. *Se revierte* volviendo al `INSERT` al abrir, que es un cambio de tres líneas.
- **Una foto colgada de una fila inexistente.** `media.dueno_id` es texto suelto, sin llave
  foránea, así que una foto tomada antes del registro no falla: queda huérfana y sube sin
  dueño. *Se detecta* tomando una foto como primera acción del formulario. *Se previene* con
  la llamada en `recibirFoto`, y es la razón de que las fotos cuenten como contenido.
- **Quedarse sin poder revisar una máquina que sí hay que revisar.** Es el riesgo real de esta
  spec: si la regla dice «ya está hecho» cuando no lo está, el operador arranca sin
  preoperacional. Los dos caminos son un acta anulada desde el panel —decidido y escrito en la
  spec: el teléfono no se entera y espera al día siguiente— y un reloj desfasado. *Se detecta*
  en obra, tarde. *Se contiene* haciendo que la regla mire **solo lo firmado en ese teléfono
  por ese operador**, que es lo más conservador que se puede mirar sin señal.
- **Medianoche con la app abierta.** Un teléfono despierto en el inicio cruzando las doce sigue
  mostrando el aviso del día anterior hasta que alguien enfoque la pantalla o deslice. Se
  acepta: cualquier interacción lo corrige. No probar RF-12 dejando el teléfono encendido.
- **Los borradores vacíos que ya existen.** Dejan de verse pero siguen ahí. *Se previene* que
  el filtro esconda algo que importe restringiéndolo a los que tienen `estado_sync = 'borrador'`
  **y** `respuestas = '[]'`, nunca por el contenido de un registro ya enviado.
