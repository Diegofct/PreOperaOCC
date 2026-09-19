# Tareas — Spec 013

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

El orden es el del plan: primero las dos reglas puras, que no dependen de nada; después
la consulta que las alimenta; después el cambio de dónde nace la fila; y al final las
tres pantallas que lo muestran. **Entre T4 y T5 la app sigue comportándose como hoy**:
eso es a propósito, y está dicho en cada `Hecho cuando`.

## Reglas puras

- [x] T1. `estadoDelDia` en `src/shared/rules/inspeccion.ts`, con sus casos.
      (RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-10, RF-21)
      Recibe `{ usuarioId, vehiculoId, hoy }` y los preoperacionales firmados del
      operador; devuelve `{ toca: true }` o `{ toca: false, hechoEn, resultado }`.
      Filtra por operador y máquina **dentro** de la función, y parte el día con
      `fechaDeJornada` de `@/shared/rules/jornada`.
      Hecho cuando: en `scripts/verificar-reglas.ts` están en verde los nueve casos del
      plan —APTO de hoy no toca; «con novedades» tampoco; NO APTO sí; NO APTO a las 7 y
      APTO a las 9 no toca; APTO a las 7 y NO APTO a las 9 sí; tres NO APTO seguidos
      siguen tocando; lo de otro operador no cuenta; lo de otra máquina no cuenta; lo
      firmado ayer a las 23:00 no cuenta hoy—, más uno que comprueba que
      `periodicidadesAplicables` devuelve lo mismo antes y después de esta regla
      (RF-21), y los tres comandos en verde. Ninguna pantalla la llama todavía.

- [x] T2. `borradorTieneContenido` en `src/shared/rules/inspeccion.ts`, con sus casos.
      (RF-13, RF-14, RF-15)
      Hecho cuando: en `scripts/verificar-reglas.ts` están en verde los cinco casos —todo
      vacío da `false`; una respuesta da `true`; solo el horómetro da `true`; solo una
      foto da `true`; observaciones con solo espacios dan `false`— y los tres comandos en
      verde.

## La consulta que las alimenta

- [x] T3. `estadoDelDiaDe(usuarioId, vehiculoIds)` en
      `src/features/checklists/repositorio.ts`. (RF-4, RF-5)
      Lee los preoperacionales **firmados** (`enviadoEn` no nulo) de ese operador de las
      últimas 48 h y devuelve un `Map<vehiculoId, EstadoDelDia>` aplicando T1. Sin
      índices nuevos.
      Hecho cuando: la función existe, está exportada, los tres comandos en verde y
      ninguna pantalla la llama todavía.

## Dónde nace la fila

- [x] T4. El `INSERT` diferido en `repositorio.ts`, sin cambiar ninguna firma.
      (RF-14, RF-16)
      `abrirBorrador` deja de insertar y devuelve la semilla; `registrarSiHaceFalta`
      hace `insert(...).onConflictDoNothing()`; `guardarBorrador` lo llama por dentro
      antes del `update`.
      Hecho cuando: los tres comandos en verde y **la app se comporta igual que antes**:
      el autoguardado que ya dispara al montar la pantalla crea la fila unos 400 ms
      después de abrirla. Todavía no se arregla RF-13; eso es T5.

- [ ] T5. La pantalla no escribe mientras no haya nada que escribir.
      (RF-13, RF-15, RF-16)
      En `pantalla-preoperacional.tsx`: `programarGuardado` no llama a `guardarBorrador`
      si `borradorTieneContenido` dice que no hay contenido, y `recibirFoto` llama a
      `registrarSiHaceFalta` antes de `guardarFoto`.
      Hecho cuando: los tres comandos en verde; en el teléfono, entrar al formulario y
      salir sin tocar nada **no añade ninguna fila** a `preoperacionales` (se comprueba
      mirando el historial de la app: no aparece un «Sin terminar» nuevo); y responder un
      ítem, salir y volver a entrar conserva lo respondido.

- [ ] T6. `historialDe` deja fuera los borradores sin contenido. (RF-17)
      Filtra por `estado_sync = 'borrador'` **y** `respuestas = '[]'`, nunca por el
      contenido de un registro ya enviado. No borra nada.
      Hecho cuando: los tres comandos en verde y, en un teléfono que ya traía filas
      vacías de antes, el historial deja de mostrarlas mientras las filas siguen en la
      base.

## Lo que ve el operador

- [x] T7. `abrirBorrador` responde «ya hecho hoy», y la pantalla del preoperacional lo
      dice en vez de pintar el formulario. (RF-8)
      La función pasa a devolver tres formas —borrador, ya hecho hoy, sin formato— y se
      actualiza su único llamador. Es la red de seguridad para llegar por enlace directo
      o desde la lista de vehículos.
      Hecho cuando: los tres comandos en verde y entrar a `/preoperacional` con el
      `vehiculoId` de una máquina ya revisada hoy muestra el aviso, sin formulario y sin
      crear ninguna fila.

- [ ] T8. El inicio del operador dice «ya lo hizo hoy» y esconde el botón.
      (RF-8, RF-9, RF-10, RF-12)
      En `inicio-operador.tsx`: la tarjeta de la máquina principal muestra la hora y el
      resultado del preoperacional del día, y «Hacer preoperacional» no se pinta. El
      aviso no depende solo del color: lleva texto.
      Hecho cuando: los tres comandos en verde; tras firmar, volver al inicio muestra el
      aviso con hora y resultado y sin botón; y el aviso se recalcula al enfocar la
      pantalla y al deslizar hacia abajo, sin que el operador haga nada más.

- [ ] T9. La lista de «Cambiar de vehículo» marca las que ya están hechas.
      (RF-8, RF-11)
      En `pantalla-vehiculo.tsx`: cada tarjeta muestra su estado del día; la que ya está
      hecha no navega. Las demás siguen ofreciendo su preoperacional.
      Hecho cuando: los tres comandos en verde y, con dos máquinas asignadas y una ya
      revisada, la revisada aparece marcada y no responde al toque, y la otra abre su
      formulario.

## Validación

- [ ] T10. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada uno de los 21 RF tiene su comprobación con resultado escrito;
      los tres comandos están en verde; la demo del plan está hecha **en un teléfono y
      con el avión activado** —las dos máquinas, el NO APTO que sí permite repetir, el
      entrar-y-salir que no deja rastro y el cambio de día—; se ha comprobado en el panel
      que ningún preoperacional firmado cambió y que no apareció ninguna acción nueva
      (RF-19, RF-20); y la spec queda marcada como Cumplida.
      *No probar RF-12 dejando el teléfono encendido cruzando la medianoche: el aviso se
      recalcula al enfocar, no con un temporizador. Ver Riesgos del plan.*

## Notas de ejecución

- **T1**: siete pruebas nuevas, de 204 a **211 verificaciones**. Los tres comandos en verde.
  `inspeccion.ts` pasa a importar `fechaDeJornada` de `./jornada`; las dos son puras y las dos
  corren ya en el teléfono y en el servidor, así que no abre ninguna frontera nueva.
- **T1, el caso de RF-21 falló al primer intento, y por la prueba, no por la regla**: estaba
  escrito sobre la volqueta, y **la volqueta ya no tiene revisión quincenal**. La spec 011 dejó
  cinco de los seis formatos con solo la diaria; el único vigente que conserva la quincenal es
  el de la camioneta (`camioneta.v3`). Reescrito sobre ese. Vale la pena recordarlo: cualquier
  prueba futura sobre periodicidades tiene que mirar primero qué formato las tiene.
- **T1, el orden de las filas no importa**: `estadoDelDia` escoge por `enviadoEn`, no por la
  posición en la lista, y hay un caso que lo fija. Así la consulta de T3 puede devolverlas en
  el orden que le salga más barato sin que nada dependa de eso.
- **T1, lo que queda dicho en el tipo**: `FirmaDelDia.enviadoEn` no es opcional. Un borrador no
  ha revisado nada, así que no tiene forma de entrar en esta lista ni por descuido.
- **T2**: cuatro pruebas nuevas, de 211 a **215 verificaciones**. Los tres comandos en verde.
- **T2, un caso que el plan no había previsto y que sí importa: el cero.** Un horómetro en 0 es
  una máquina nueva, no un campo vacío. Si la comprobación se escribiera por falsedad
  (`if (horometroH)`), esa lectura contaría como formulario en blanco y el registro no nacería
  al escribirla. Se compara contra `null`, y hay un caso que lo fija para que nadie lo
  "simplifique" después.
- **T3**: los tres comandos en verde, 215 verificaciones (no sube: esta tarea no añade reglas).
  Comprobado con `grep` que **ningún archivo fuera del repositorio la llama todavía**.
- **T3, no es verificable en `verificar-reglas.ts`** y se dijo antes de escribirla: la consulta
  corre contra `expo-sqlite` dentro del teléfono y el guion corre en Node. Lo que sí es regla
  —qué cuenta como hecho— ya quedó fijado en T1. Se ejercita de verdad en T8 y T9.
- **T3, por qué la ventana es de 48 horas y no "desde la medianoche"**: quien decide qué cae
  dentro del día es `estadoDelDia`. La ventana solo existe para no leer la tabla entera, así
  que se tomó ancha a propósito —la jornada dura 24 h, el corte de Colombia mueve otras cinco
  y el reloj de un teléfono puede ir corrido—. Calcular aquí el inicio exacto del día sería
  escribir la regla en un segundo sitio, y si los dos cálculos discreparan mandaría el
  equivocado.
- **T4**: los tres comandos en verde, 215 verificaciones. La app se comporta igual que antes,
  como decía la tarea: el autoguardado dispara al montar la pantalla y crea la fila unos 400 ms
  después de abrirla. Lo que arregla RF-13 es T5.
- **T4, sí hubo un cambio de firma, y no es el que decía la tarea.** `abrirBorrador` mantiene la
  suya —eso era lo importante, y su cambio es T7—, pero `guardarBorrador` pasó de recibir un
  `id` a recibir el `Borrador` entero: sin él no puede insertar la fila que todavía no existe.
  Un solo llamador, una sola línea (`pantalla-preoperacional.tsx:206`), sin cambio de
  comportamiento.
- **T4, `Borrador` gana `usuarioId` e `iniciadoEn`.** Son los dos datos del `INSERT` que antes
  se leían de los argumentos de `abrirBorrador` y ahora hacen falta más tarde. El resto de la
  semilla ya viajaba dentro (`vehiculo`, `plantilla`, `plantillaHash`, `periodicidades`).
- **T4, comprobado con `grep` que no queda ningún otro camino de escritura**: el único
  `insert(preoperacionales)` del móvil es el de `registrarSiHaceFalta`; el otro que aparece
  está en `src/app/api/movil/preoperacionales+api.ts` y es la ingesta del servidor, contra
  Postgres, que no tiene nada que ver.
- **T5, código escrito y los tres comandos en verde, pero la tarea NO está marcada.** Su
  `Hecho cuando` pide dos comprobaciones en el teléfono —entrar y salir sin tocar nada no añade
  fila; responder, salir y volver conserva lo respondido— y **esas dos no se han ejecutado**.
  Es la primera tarea de esta spec cuyo criterio no se puede cerrar desde aquí. Se marca cuando
  alguien las haga en un teléfono; si no, van con la demo de T10.
- **T5, el conteo de fotos vive en la pantalla, no en la regla.** La regla recibe un número;
  quien sabe cuántas evidencias hay es quien tiene `fotosPorItem` y `fotoHorometro` en el
  estado. Así `borradorTieneContenido` sigue siendo pura y no aprende de dónde salen las fotos.
- **T5, efecto lateral bueno y no buscado**: antes, si el temporizador de 400 ms llegaba a
  disparar con el estado todavía vacío, escribía `respuestas: []` **encima** de un borrador que
  sí tenía trabajo guardado. Ahora ese guardado no ocurre, porque no hay contenido que guardar.
  Era un riesgo que ya existía y que esta tarea cierra de paso.
- **T6, código escrito y los tres comandos en verde; tampoco marcada**, por lo mismo que T5: su
  `Hecho cuando` pide verlo en un teléfono que ya traiga filas vacías. Las dos van juntas a la
  misma sesión de demo.
- **T6, lo que sí se verificó desde aquí, y era el riesgo real**: cómo traduce drizzle
  `ne(respuestas, [])`. Se construyó la consulta con `QueryBuilder` (sin driver, en Node) y se
  imprimió: `... ("estado_sync" <> ? or "respuestas" <> ?)` con `params: ["borrador","[]"]`.
  El parámetro sale como `"[]"` exacto, que es lo que guardan las filas insertadas con
  `respuestas: []`. Si drizzle no hubiera aplicado el mapeo JSON de la columna, el filtro no
  habría escondido nada y no se habría notado hasta la demo.
- **T6, escrito con De Morgan y no con `not(and(...))`**: `and()` devuelve `SQL | undefined` en
  drizzle, así que `not(and(...))` obligaba a un `!` para callar al compilador. `or(ne, ne)`
  dice lo mismo —o no es borrador, o alguien escribió algo— sin aserción.
- **T6, el filtro no toca nada enviado.** Solo cae la intersección de «es borrador» y «no tiene
  respuestas». Un registro firmado no lo roza pase lo que pase con su contenido.
- **T7**: los tres comandos en verde. `abrirBorrador` devuelve `AperturaDelFormulario`, una
  unión de tres —`borrador`, `ya_hecho`, `sin_formato`— en vez de `Borrador | null`. El `null`
  significaba «sin formato» y había que saberlo; ahora lo dice el tipo. Un solo llamador.
- **T7, una decisión de orden que la spec no nombra pero sus RF deciden**: el «ya hecho hoy» se
  comprueba **antes** de buscar un borrador a medio llenar. El caso es raro —un borrador de
  ayer y un preoperacional firmado hoy sobre la misma máquina— y si ganara el borrador, el
  operador lo terminaría y firmaría un **segundo acta del mismo día**, que es justo lo que
  prohíbe RF-1. El borrador no se descarta ni se toca: sigue en la base y reaparece mañana.
- **T7, no hace falta variante `.web.tsx` nueva**: no se añadió ninguna pantalla ni ninguna
  ruta. `pantalla-preoperacional.web.tsx` ya existe y redirige al panel; no se tocó.
- **T7, el aviso no depende del color**: dice la hora y «APTA», «APTA, con novedades» o «NO
  APTA» en palabras, y el botón de volver cumple `Toque.minimo`.
- **T8, código escrito y los tres comandos en verde; sin marcar**, como T5 y T6: su
  `Hecho cuando` pide firmar en un teléfono y volver al inicio. **Las tres se cierran en la
  misma sesión de demo.**
- **T8, lo que sí queda garantizado por construcción**: el aviso se recalcula en cada `cargar()`,
  que es lo que llaman `useFocusEffect` y el deslizar-para-refrescar, y `estadoDelDiaDe` evalúa
  `fechaDeJornada()` en cada llamada. Por eso el aviso se cae solo al cambiar el día (RF-12) sin
  temporizador ninguno. Lo que falta por ver es la pantalla, no la lógica.
- **T8, no se compartió el mapa de palabras con la pantalla del preoperacional, a propósito.**
  Se consideró: `types.ts` es solo tipos (cero constantes) y el plan dice no crear archivos
  nuevos. Pero además el inicio **ya tenía** su vocabulario —«Apto», «Con novedades», «NO APTO»,
  las insignias del historial— y el aviso reusa esas mismas palabras. Un solo vocabulario por
  pantalla es mejor que un vocabulario compartido que en una de las dos suena raro.
- **T8, el estado se pide después de las asignaciones**, no dentro del `Promise.all`: necesita
  saber por qué máquinas preguntar. Es un viaje más a SQLite en el arranque de la pantalla, que
  en local no se nota.
- **T9, código escrito y los tres comandos en verde; sin marcar**, por lo mismo que T5, T6 y T8.
  Con esta, **todo el código de la spec 013 está escrito**: lo único que queda es T10.
- **T9, la tarjeta hecha no es un botón deshabilitado: no es un botón.** Se pinta como `View` en
  vez de `Pressable`, sin flecha. Un `Pressable` con `disabled` habría dejado un objetivo táctil
  que no hace nada, y RF-8 dice que no se ofrezca **ninguna acción**, no que se ofrezca una
  muerta.
- **T9, la lista no repite el resultado, solo la hora.** Para saber si quedó apta o con
  novedades está el historial del inicio con sus insignias; aquí la pregunta es «¿a cuál le
  falta?». De paso evita una tercera copia del vocabulario de resultados. Los RF de esta
  pantalla —RF-8 y RF-11— no piden el resultado; RF-10 es del aviso del inicio, que es T8.
- **T9, una máquina NO APTO nunca llega a pintarse como hecha**: `estadoDelDia` le responde
  `toca: true`, así que sigue siendo pulsable. Cae solo, sin un caso especial en la pantalla.

### Hallazgo del 2026-09-19 — no es de esta spec, salió durante su demo

**Compartir un teléfono entre dos operadores deja al que vuelve sin máquinas hasta que
sincronice.** Se anota aquí porque aquí apareció; **no se arregla en la 013**, que no toca
asignaciones ni sincronización.

Lo que se vio: el teléfono de pruebas mostraba «No tiene ningún vehículo asignado» a un
operador que en el servidor **sí** tenía su asignación vigente (`hasta` nulo, vehículo
operativo). El historial, en cambio, sí mostraba su preoperacional del día anterior.

Qué había pasado, leído en `dispositivos`: los seis registros comparten el mismo
`identificador_equipo` (`771e7c8e…`). Es **un solo aparato**, reactivado seis veces
alternando `operador1` y `operador2` —la última, para `operador2`, revocando la de
`operador1`—.

El mecanismo es `apagarLoQueYaNoViene`, en `src/features/sync/pull.ts`: el pull le pone
`hasta` a toda asignación local que no venga en la instantánea. Mientras el equipo estuvo
activado como `operador1`, las bajadas traían el ámbito de `operador1`, así que la asignación
de `operador2` **se apagó localmente**. Es el comportamiento correcto y deliberado —una fila
que deja de venir es indistinguible de una que le quitaron—, solo que aquí la causa fue
cambiar de operador, no un cambio en el panel.

**No se pierde nada y la salida es deslizar hacia abajo** con señal: la siguiente bajada
reinserta la asignación con `hasta` nulo (`onConflictDoUpdate`). Lo que no hay es nada que lo
haga solo: reactivar un equipo no fuerza una bajada antes de pintar el inicio.

Por qué puede importar de verdad: **reactivar exige señal, pero la bajada posterior no está
garantizada**, y un operador que reactiva su equipo y se va a la obra puede quedarse sin poder
levantar el preoperacional —que es justo lo que la regla de `AGENTS.md` sobre asignaciones
quiere evitar—. En producción cada operador tendrá su teléfono, pero un equipo prestado o
repuesto cae en el mismo caso.

Candidato a spec propia si se decide arreglarlo. La forma más corta sería que la activación
no dé por terminada hasta haber hecho su primera bajada.
