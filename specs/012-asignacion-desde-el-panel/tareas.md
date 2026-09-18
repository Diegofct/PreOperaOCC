# Tareas — Spec 012

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

> **El orden importa más que de costumbre.** Primero el servidor deja de aceptar
> autoasignaciones (T1) y solo después se le quitan al móvil (T3): al revés, durante unos
> días los teléfonos sin actualizar seguirían creando asignaciones que nadie confirma.

- [x] T1. El servidor deja de aceptar asignaciones del celular. (RF-4, RF-5)
      El `POST` de `/api/movil/asignaciones` responde siempre **422** con «Las asignaciones
      las registra la administración desde el panel.», sin consultar ni escribir nada. La
      cabecera del archivo pasa a explicar por qué la ruta sigue existiendo en vez de
      argumentar la autoasignación.
      Hecho cuando: un caso en el guion ata **422 con fallo definitivo** —el que impide que un
      teléfono viejo se atasque y deje de subir sus preoperacionales—; los tres comandos en
      verde.

- [x] T2. El panel deja de confirmar. (RF-15, RF-16, RF-17, RF-18)
      Fuera el botón «Confirmar» de Asignaciones, el banner de pendientes y el aviso del
      inicio; `asignacionEditada` pierde la acción `confirmar` y la ruta del panel también.
      La etiqueta «Sin confirmar» **se queda** en las filas históricas.
      Hecho cuando: un caso del guion comprueba que el contrato acepta `{accion:'cerrar'}` y
      **rechaza** `{accion:'confirmar'}`; en el panel no hay botón de confirmar ni aviso, y una
      fila autoasignada antigua sigue mostrando su etiqueta; los tres comandos en verde.

- [x] T3. El operador solo ve sus máquinas. (RF-1, RF-2, RF-3, RF-6, RF-7)
      `pantalla-vehiculo.tsx` pierde la sección «Otros vehículos de la obra»; se borran
      `autoasignar()` y `flotaDeObra()` del repositorio; el móvil deja de encolar
      `asignacion`. El tipo se queda en la cola para drenar lo que haya encolado.
      Hecho cuando: no queda ninguna referencia a `autoasignar` ni a `flotaDeObra` en `src/`;
      con `operador1` (dos vehículos) la pantalla lista **solo esos dos**; los tres comandos en
      verde y `npx expo export --platform web` sin error.

- [x] T4. El operador sin asignación sabe qué hacer. (RF-8, RF-9, RF-10)
      En el inicio, el caso «sin ninguna asignación» deja de ofrecer «Escoger vehículo» y pasa
      a decir que se lo pida a su residente, sin ninguna vía al formulario.
      Hecho cuando: en el teléfono, un operador sin asignación ve el aviso y **no tiene ningún
      botón que lleve al preoperacional**; al asignarle uno desde el panel y sincronizar,
      aparece; los tres comandos en verde.

- [x] T5. Cerrar las autoasignaciones que siguen vigentes. (RF-13, RF-14)
      `scripts/cerrar-autoasignadas.ts`: cierra con `hasta = ahora` las de `origen =
      'autoasignada'` y `hasta is null`, **sin tocar `origen`**, e imprime cuáles cerró.
      Hecho cuando: el script corre contra Neon, imprime la lista y el panel muestra esas
      filas como «Cerrada» conservando su etiqueta de origen; los tres comandos en verde.
      *Escribe en la base real: avisar antes, y no correrlo con la obra a mitad de jornada.*

- [x] T6. Actualizar la regla escrita del proyecto. (—)
      `AGENTS.md`: la regla «no bloquees al operador» pasa a describir el sistema nuevo, con
      el riesgo asumido dicho en una línea. Los comentarios de `pantalla-vehiculo.tsx`,
      `api/movil/asignaciones+api.ts`, `db/local/schema.ts` y `api/panel/asignaciones+api.ts`
      dejan de argumentar lo contrario.
      Hecho cuando: `grep -ri "autoasign" src/ AGENTS.md` no devuelve ningún texto que
      describa la autoasignación como algo que el sistema hace hoy; los tres comandos en
      verde.

- [ ] T7. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado escrito; la demo del plan está
      hecha —`operador1` con sus dos máquinas y ninguna más, un operador sin asignación que no
      llega al formulario, asignarle una desde el panel y verla aparecer, y el panel sin botón
      de confirmar—; los tres comandos en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1**: el endpoint pasó de 87 líneas a 31. Ya no consulta ni escribe: guardia de token y
  **422** con «Las asignaciones las registra la administración desde el panel.» La cabecera
  explica ahora por qué la ruta sigue existiendo, que es lo contrario de lo que decía.
- **T1, lo que hubo que mover para poder comprobarlo**: la distinción entre fallo definitivo y
  transitorio vivía escondida en `push.ts` como una función local (`esDefinitivo`). Subió a
  `shared/rules/reintentos.ts` como `fallaDefinitiva`, que es donde la constitución dice que
  viven las reglas y el único sitio desde el que el guion puede verla. `push.ts` la importa.
- **T1, el caso** (203 verificaciones, eran 202): 422 y 400 son definitivos; 409, 500 y **404
  no**. El 404 importa: casi siempre significa que la ruta todavía no está publicada en ese
  servidor, y eso sí se arregla esperando. Y se comprueba que, marcada como definitiva, la
  fila queda `fallida` con `proximoIntentoEn` en 0: no vuelve sola.
- **T1, por qué esto protege al operador**: si el rechazo fuera transitorio, la asignación
  imposible de un teléfono viejo cortaría la tanda en cada intento y **sus preoperacionales
  firmados no subirían**. El 422 la marca fallida de una vez y la cola sigue drenando.
- **T1**: sin tocar base de datos ni secretos; no hubo migración ni `expo export`.
- **T2**: la acción salió de los cuatro sitios que la sostenían —el contrato
  (`asignacionEditada`), la ruta `PATCH /api/panel/asignaciones/[id]`, el cliente de API y la
  pantalla— y además del inicio, con el aviso del residente. El `origen` y el `confirmadaEn`
  de la tabla **no se tocan**: las filas de antes los tienen llenos y son evidencia de cómo se
  tomó esa máquina.
- **T2, por qué el contrato conserva el campo `accion` con un solo valor**: se pensó en dejar
  el cuerpo vacío, ya que solo queda cerrar. Se descartó. Un panel viejo abierto en otra
  pestaña sigue mandando `{accion:'confirmar'}`, y con el cuerpo vacío esa petición **cerraría
  la asignación** en vez de rechazarse: el usuario pulsaría «Confirmar» y la máquina se le
  quedaría sin asignar. Con el enum de un valor responde 400, que es lo que dice el plan.
- **T2, el caso** (204 verificaciones, eran 203): `asignacionEditada` acepta `cerrar` y rechaza
  `confirmar`. Se comprobó que **fallaba antes** de tocar el contrato. Vive en el guion y no en
  la pantalla a propósito: lo que de verdad cierra la puerta es el contrato del servidor, no un
  botón que se puede quedar pintado en una pestaña vieja.
- **T2, lo que se quitó del inicio**: además del aviso, la consulta `api.asignaciones.listar()`
  que solo existía para alimentarlo, y con ella el `error` combinado. El residente deja de
  pedir la lista entera de asignaciones cada vez que abre la portada. El atajo «Revisar
  asignaciones» se queda: crear y cerrar siguen siendo suyos (RF-18).
- **T2, texto del estado vacío**: decía que un operador sin asignación podía escoger su máquina
  desde el celular «y aparecerá aquí para confirmar». Ahora dice que hasta que se registre una,
  el operador no puede levantar ningún preoperacional, que es lo que va a pasar de verdad.
- **T2, comprobado**: los tres comandos en verde y `npx expo export --platform web` sin error
  con `grep DATABASE_URL dist/client` vacío (se tocó un `+api.ts` que alcanza la base, y
  `contratos.ts` lo comparten las dos superficies).
- **T2, anotado y no hecho** (fuera de la tarea): la columna de acciones de la tabla de
  Asignaciones conserva `ancho: 210`, que se dimensionó para dos botones y ahora lleva uno.
  Cabe de sobra, así que no rompe nada; estrecharla es cosa de quien toque esa tabla.
- **T2, falta ver en el navegador** (va en T7): que no quede botón de confirmar, que el
  residente no vea el aviso en su portada, y que una fila autoasignada antigua siga mostrando
  su etiqueta «Sin confirmar».
- **T3**: `pantalla-vehiculo.tsx` pasa de 240 a 184 líneas y `repositorio.ts` pierde 80. La
  pantalla **ya no escribe nada**: era lo único del móvil que creaba filas fuera de un
  preoperacional. Su única fuente es ahora `asignacionesVigentesDe(usuario.id)`, que ya
  existía y era una de dos.
- **T3, no es testeable en el guion y conviene decirlo**: no hay regla pura que tocar. Lo que
  cambió es una consulta y una pantalla, las dos contra SQLite del dispositivo. Las
  comprobaciones son las tres de la tarea, y se hicieron: `grep -rn "autoasignar\|flotaDeObra"
  src/` **vacío**, `grep` de `encolar('asignacion'` **vacío**, y `npx expo export --platform
  web` sin error. Lo que falta es ver la lista en el teléfono con `operador1`, que va en T7.
- **T3, el tipo `asignacion` sigue en `EntidadSincronizable`**, como dice el plan: un teléfono
  puede tener una encolada sin subir, y quitar el tipo la dejaría varada. Subirá, recibirá el
  422 de T1 y se marcará fallida, que es un final limpio.
- **T3, la insignia AUTOASIGNADO se queda en la tarjeta**. Después de T5 no habrá ninguna
  asignación autoasignada vigente, así que dejará de pintarse sola; hasta entonces dice la
  verdad sobre esa máquina. Quitarla sería reescribir la historia, que es lo mismo que se
  decidió para la etiqueta del panel (RF-17).
- **T3, dos estilos muertos retirados** (`notaSeccion` y `vacio`): eran de la sección que se
  fue y del texto «Este equipo no tiene ningún vehículo cargado», que ya no puede darse — sin
  asignación se ve el aviso, no una lista vacía. `StyleSheet` no los habría delatado: el lint
  no mira dentro del objeto.
- **T3, el texto del aviso «No tiene vehículo asignado» ya no dice que escoja**, porque no
  puede. Dice que se lo pida a su residente. Es la mitad de RF-9; **T4 es la que quita la vía
  al formulario desde el inicio**, y hasta que se haga, un operador sin asignación todavía
  puede llegar al preoperacional por ahí.
- **T3, sin tocar base de datos ni secretos**: no hubo migración. El `expo export` se corrió
  por lo que pide la tarea —confirmar que la frontera web/nativo sigue en pie tras tocar
  pantallas del operador—, no por secretos.
- **T4**: en `inicio-operador.tsx`, sin vehículo vigente **no se pinta ningún botón**. Antes
  había uno que decía «Escoger vehículo» y llevaba a `/vehiculo`. Ahora la tarjeta vacía dice
  a quién pedírselo y ahí se acaba la pantalla.
- **T4, se rastrearon las dos vías al formulario** para RF-9: `inicio-operador.tsx` (botón que
  ya no se pinta, más una guarda en `empezar()` por si alguien lo vuelve a pintar) y
  `pantalla-vehiculo.tsx`, que solo navega desde una tarjeta, y las tarjetas salen de las
  asignaciones vigentes. Sin asignación no hay ninguna. `/vehiculo` tampoco es alcanzable: su
  único enlace es «Cambiar de vehículo», que también depende de tener máquina.
- **T4, decisión que va más allá de la línea de la tarea, y por qué**: «deslizar para
  refrescar» pasa a llamar `sincronizacionCompleta()` en vez de `drenarEnSegundoPlano()`. Se
  comprobó leyendo el motor que `drenarEnSegundoPlano` → `drenarCola` → `subirPendientes`:
  **solo sube, nunca baja**. Con eso y sin el botón, el caso de RF-10 que importa —el
  residente asigna la máquina con la app del operador abierta— dejaba al operador mirando un
  aviso sin ninguna forma de que la asignación llegara, salvo cerrar y reabrir la app. Los
  otros dos disparadores son abrir sesión y recuperar la red, y ninguno ocurre ahí.
  **El motor no se toca** —que es lo que prohíbe el plan—: solo cambia cuál de sus puertas
  llama esta pantalla, y la pantalla es de esta tarea.
- **T4, cómo se evitó el spinner**: `void sincronizacionCompleta().then(() => void cargar())`
  y un `cargar()` inmediato. Se relee lo local al instante y se vuelve a leer **si** la
  sincronización termina. Un `await` habría puesto a la pantalla del operador a esperar al
  servidor, que es lo que este proyecto no hace en ninguna pantalla.
- **T4, texto corregido que T2 dejó falso**: la tarjeta del vehículo decía «Autoasignado por
  usted. Su supervisor debe confirmarlo.» Desde que el panel perdió la acción de confirmar,
  eso es mentira. Ahora dice que la escogió él y que avise a su residente. Se ve solo hasta
  que T5 cierre las autoasignadas vigentes, pero mientras tanto dice la verdad.
- **T4, no es testeable en el guion**: no hay regla pura. Lo que cambió es qué se pinta y qué
  se llama al refrescar. Los tres comandos en verde y `npx expo export --platform web` sin
  error. **Falta el teléfono** (va en T7): ver el aviso sin ningún botón, que el residente le
  asigne una desde el panel, deslizar y verla aparecer.
- **T5, escrito y sin marcar**: `scripts/cerrar-autoasignadas.ts` y el comando
  `npm run cerrar:autoasignadas` (una línea nueva en `package.json`, sin reformatear el
  resto). Los tres comandos en verde.
- **T5, el script lleva `--simular`**, que el plan no pedía: lista lo que cerraría y **no
  escribe nada**. Escribir en la base de una obra en marcha sin poder mirar antes es
  justamente lo que la nota de la tarea pide evitar, y el modo de mirar tiene que estar en el
  guion, no en un `SELECT` improvisado que nadie vuelve a ver.
- **T5, lo que devolvió Neon el 2026-09-18** (`npm run cerrar:autoasignadas -- --simular`,
  **solo lectura**):

  > `No hay ninguna asignación autoasignada vigente. Nada que cerrar.`

  **Cero filas.** RF-13 no tiene sobre qué actuar en esta base.
- **T5, la corrida de verdad** (`npm run cerrar:autoasignadas`, autorizada por Diego el
  2026-09-18): misma salida. El guion **sale antes del `UPDATE`** cuando la lista viene vacía,
  así que no se escribió ni una fila. RF-13 queda cumplido por vacío: no hay ninguna
  autoasignación vigente en esta base, que es el estado que el requisito pide.
- **T5, lo que no se pudo comprobar y no se da por visto**: el «Hecho cuando» decía «el panel
  muestra esas filas como Cerrada». **No existen esas filas**, así que esa parte no se
  comprobó y no se puede. Queda una pregunta abierta para T7: si tampoco queda ninguna
  autoasignada **cerrada**, entonces RF-14 y RF-17 —la etiqueta «Sin confirmar» en una fila
  histórica— se quedan sin demo posible, y la validación tendrá que decirlo así en vez de
  inventarse una. Se mira en el panel, en Asignaciones. Desde aquí no se pudo consultar: el
  permiso de lectura contra producción se denegó para una consulta fuera del guion.
- **T5, por qué el `WHERE` no mira `eliminado_en`**: porque el celular tampoco.
  `asignacionesVigentesDe` filtra por `hasta is null` y por la baja del **vehículo**, no por la
  de la asignación, así que una fila con baja lógica y `hasta` abierto le seguiría apareciendo
  al operador. Queda escrito en la cabecera del guion.
- **T5, por qué no hace falta transacción**: Neon va por HTTP y no tiene transacciones
  interactivas, así que leer y luego escribir podría ver dos fotos. Da igual aquí: desde T1
  nadie puede crear una autoasignación nueva, o sea que el conjunto solo encoge. El `UPDATE`
  es una sola sentencia.
- **T6**: la regla de `AGENTS.md` ya no describe un respaldo que no existe. Dice lo que hace
  hoy el sistema y **deja escrito el riesgo asumido en una línea**: un operador sin máquina no
  inspecciona nada, eso sigue siendo peligroso, y OCC prefiere una llamada al residente a un
  preoperacional que nadie respalda. Sin esa frase, el siguiente que lea la regla creería que
  el riesgo no se vio.
- **T6, tres comentarios ya estaban hechos** en sus tareas, porque si no el archivo no
  compilaba coherente: `api/movil/asignaciones+api.ts` (T1),
  `api/panel/asignaciones/[id]+api.ts` (T2) y `pantalla-vehiculo.tsx` (T3). Aquí se hicieron
  los que faltaban: `db/local/schema.ts` y `api/panel/asignaciones+api.ts`.
- **T6, dos que el plan no nombraba y sí mentían**: `db/servidor/esquema.ts` («el panel la
  muestra destacada para que el supervisor la confirme») y `contratos.ts` («espera
  confirmación»). Los dos describían como presente algo que T2 eliminó. Se arreglaron porque
  el «Hecho cuando» de esta tarea es el `grep`, no la lista de archivos del plan.
- **T6, el `grep`**: `grep -rin "autoasign" src/ AGENTS.md` deja solo (a) el valor del enum y
  los identificadores que lo leen —`origen === 'autoasignada'`, la unión de tipos, la insignia
  de la tarjeta— y (b) prosa en pasado explícito («hasta la spec 012», «ya no se puede», «de
  antes del cambio»). **Ningún texto describe la autoasignación como algo que el sistema haga
  hoy.**
- **T6, el enum no se toca** en ninguna de las dos bases, y ahora los dos comentarios explican
  por qué: el valor describe filas que existen, y quitarlo sería reescribir cómo se operó esa
  máquina.
- **T6**: se tocó `db/servidor/esquema.ts`, así que se corrió `npm run db:generate:servidor` →
  **«No schema changes, nothing to migrate»** y `drizzle/` sin cambios, que es lo esperado al
  cambiar solo un comentario. Los tres comandos en verde.
