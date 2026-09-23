# Tareas — Spec 015

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

- [x] T1. Función pura `ordenarFilas` en `src/features/panel/ordenar.ts`, con sus casos en
      `scripts/verificar-reglas.ts`. (RF-12, RF-13)
      Hecho cuando: `npm run verificar` pasa con casos nuevos para tildes y mayúsculas
      («Álvarez» junto a «alvarez»), vacíos al final en A→Z y en Z→A, empate resuelto por
      nombre completo y documentos numéricos en orden de número («9» antes de «10»); y los
      otros dos comandos en verde.

- [x] T2. Hook `usar-orden-recordado.ts`: estado del orden, alternar A→Z / Z→A y recordarlo
      en `localStorage` con `try/catch`. (RF-9, RF-10, RF-16, RF-17)
      Hecho cuando: el hook existe con su bloque de comentario del porqué, arranca en
      «nombre A→Z» sin nada guardado o con un valor ilegible, y los tres comandos en verde.
      (Aún no lo usa ninguna pantalla.)

- [x] T3. `useListadoFiltrado` acepta un `ordenar` opcional, aplicado después de filtrar y
      antes de paginar. (RF-14, RF-15)
      Hecho cuando: el parámetro existe, las pantallas que no lo pasan compilan sin cambios,
      y los tres comandos en verde.

- [x] T4. `Columna.ordenar` y cabecera pulsable con ▲/▼ en `Tabla` (props `orden` y
      `alOrdenar` opcionales). (RF-8, RF-9, RF-10, RF-11)
      Hecho cuando: una `Tabla` sin `alOrdenar` se pinta igual que antes (se mira Vehículos
      en el navegador), y los tres comandos en verde.

- [x] T5. Personas ordenable: `ordenar` en las seis columnas, `etiquetaDeAcceso` compartida
      por la celda y el orden, y el hook de T2 conectado a la tabla y al listado.
      (RF-8 a RF-17)
      Hecho cuando: en el navegador, como gerencia, pulsar «Cargo» ordena A→Z con ▲, pulsar
      otra vez ordena Z→A con ▼, el orden se mantiene al buscar, al filtrar y en la página 2,
      y sigue elegido al ir a Vehículos y volver; y los tres comandos en verde.

- [x] T6. `Confirmacion` se pinta dentro de `Modal`, y se revisan las cinco pantallas que la
      usan para que el error de la acción salga en la pantalla. (RF-1 a RF-7)
      Hecho cuando: en el navegador, «Dar de baja» en Personas abre una ventana centrada con
      el fondo oscuro; Esc, clic fuera y «Cancelar» la cierran sin hacer nada; la misma
      ventana sale (y se cancela) en Obras, Vehículos, Almacén (material) y los dos catálogos
      de Cantera; y los tres comandos en verde.

- [x] T7. `GET /api/panel/personas` devuelve `celularActivo`, y `PersonaFila` lo lleva.
      (RF-18)
      Hecho cuando: tras reiniciar `npm run web`, la respuesta del listado trae
      `celularActivo: true` para un operador con celular activado y `false` para uno sin
      celular; y los tres comandos en verde.

- [x] T8. `DELETE /api/panel/personas/:id` da de baja y revoca todos sus celulares en un solo
      `batch`, sin el 409; comentario de la ruta reescrito. (RF-19, RF-20, RF-21, RF-22, RF-24)
      Hecho cuando: tras reiniciar `npm run web`, dar de baja a un operador **de prueba** con
      celular activado responde 200, la persona tiene `eliminado_en` y todos sus dispositivos
      `revocado_en`; darse de baja a uno mismo sigue respondiendo 400; repetir la baja
      responde 404; y los tres comandos en verde.

- [x] T9. Aviso del celular en la ventana de baja de Personas. (RF-18, RF-3)
      Hecho cuando: en el navegador, la ventana de baja de una persona con celular dice que
      ese celular deja de servirle y que lo que no haya subido ya no llegará, y la de una
      persona sin celular muestra el texto de siempre; y los tres comandos en verde.

- [x] T10. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF-1 a RF-24 tiene su comprobación con resultado (incluido RF-23:
      un preoperacional o parte de la persona dada de baja sigue mostrando su nombre), los
      tres comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T5 (2026-09-21).** Revisado en Chrome como gerencia: Cargo ▲ (Encargado, Operador ×2
  por nombre, Residente, «Sin definir» al final), Cargo ▼ (vacío sigue al final), búsqueda
  «prueba» con el orden intacto, ida a Vehículos y vuelta por el menú con el orden recordado,
  y Obra ▲ con la persona sin obra al final. **No se pudo ver la página 2**: hay 5 personas y
  la página es de 25. RF-15 queda cubierto por construcción (`usar-listado-filtrado.ts` ordena
  antes de recortar) y se vuelve a mirar en T10 si para entonces hay más de 25. El filtro por
  obra/acceso pasa por el mismo camino que la búsqueda; no se pulsó por separado.
- Cargo sin definir se ve como «Sin definir» pero se ordena como vacío (al final), según RF-13.
- Tras navegar entre módulos, el router deja una copia oculta de la pantalla anterior en el
  DOM (títulos duplicados con `offsetParent === null`). No es de esta spec; solo importa al
  buscar elementos con JavaScript durante una demo.
- **T6 (2026-09-21).** Revisado en Chrome como gerencia, **sin confirmar nada** (base de
  producción). Personas «Dar de baja»: ventana centrada con telón oscuro; Esc, clic en el
  telón y «Cancelar» la cierran; un clic sobre el «Corregir» de otra fila, con la ventana
  abierta, solo cierra la ventana y no abre Corregir (RF-6). Personas «Dar acceso»: la misma
  ventana, cerrada con «Cerrar» y sin generar contraseña. Obras (Esc), Vehículos, Almacén
  (material) y Cantera (un sitio y un material): abren y se cancelan; los registros siguen.
  RF-7 queda por construcción: las cinco pantallas cierran la ventana antes de ejecutar y el
  error va al listado de la pantalla; no se provocó un fallo para no escribir en la base.
- Trampa de la demo, no del código: la primera vez Esc no cerró la ventana de Obras porque la
  ventana del navegador no tenía el teclado (la ventana se abrió con un clic simulado por
  JavaScript, sin ningún clic de ratón antes). Con un clic real, Esc cierra.
- **T7 (2026-09-21).** `fetch('/api/panel/personas')` desde el panel, como gerencia:
  `operador1` y `operador2` con `celularActivo: true`; `admin`, `residente1` y `prueba.planta`
  con `false`. Solo lectura. El servidor de desarrollo sirvió la ruta nueva **sin reiniciar**
  `npm run web` (contra lo que advierte `AGENTS.md`); no se sabe si fue suerte de ese cambio,
  así que en T8 se reinicia igual antes de probar.
- Fuera de la tarea: `crear`, `corregir` y `darDeBaja` del cliente dicen devolver `PersonaFila`,
  pero el servidor no les pone `celularActivo`. No rompe nada hoy (la pantalla recarga el
  listado después de cada acción y no lee esas respuestas), pero el tipo miente.
- **T8 (2026-09-21).** Con autorización de Diego se creó el operador de prueba
  **`prueba.baja`** («Prueba Baja 015», Operador, Consorcio Antioquia) y se le activaron **dos
  celulares simulados** (`prueba-015-equipo-a` y `-b`) con la misma petición que hace la app
  (`POST /api/movil/activar`, códigos emitidos por el panel). Antes de la baja: los dos
  `pull` respondían 200 y el listado decía `celularActivo: true`. Resultados:
  darse de baja a uno mismo → **400** «No puede darse de baja a usted mismo.»; baja de
  `prueba.baja` → **200** con `activo: false`; después, `pull` con los dos tokens → **401 y 401**
  y `refrescar` con los dos refresh → **401 y 401** (los dos dispositivos quedaron revocados);
  repetir la baja → **404** «No existe esa persona.»; y ya no sale en el listado. La lápida y
  `revocado_en` se comprobaron por su efecto (404 y 401), no leyendo la base directamente.
  RF-21 (todo o nada) queda por construcción —un solo `batch`— y no se provocó un fallo a mitad.
  El servidor de desarrollo sirvió el `DELETE` nuevo sin reiniciar (respondió 200 y no el 409
  viejo).
- En producción queda **`prueba.baja` dada de baja**, con dos dispositivos revocados y cuatro
  códigos de activación/respaldo gastados o sustituidos. Es una fila de prueba; no se borra
  (principio 4).
- **T9 (2026-09-21).** En Chrome, sin confirmar: la ventana de baja de Pedro Cartagena
  (`operador1`, con celular) añade «Tiene un celular activado: ese celular deja de servirle en
  este momento, y lo que no haya subido desde él ya no llegará.»; la de Prueba Encargado Planta
  (sin celular) muestra el texto de siempre. Las dos se cancelaron; siguen 5 registros.

## Validación (T10, 2026-09-21)

Comandos: `npm run verificar` → 224 verificaciones correctas (las 7 de «Ordenar tablas del
panel», `scripts/verificar-reglas.ts:3531` a `:3609`); `npm run typecheck` y `npm run lint` sin
errores. Todo lo de Chrome se hizo como gerencia y sin confirmar ninguna baja real, salvo la de
`prueba.baja` (T8), autorizada por Diego.

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | Chrome (T6): ventana centrada con telón oscuro | verde |
| RF-2 | Chrome (T6): Obras, Personas (baja y contraseña), Vehículos, Almacén, Cantera sitios y materiales | verde |
| RF-3 | Chrome (T6, T9): mismo texto, con el nombre | verde |
| RF-4 | Chrome (T6): botón de la acción + «Cancelar» | verde |
| RF-5 | Chrome (T6): «Cancelar», «Cerrar», Esc y clic en el telón no hacen la acción | verde |
| RF-6 | Chrome (T6): clic sobre «Corregir» de otra fila con la ventana abierta solo la cierra | verde |
| RF-7 | Chrome (T10): baja de una fila ficticia con el envío bloqueado en la página → la ventana se cierra y sale «No se pudo contactar al servidor…» arriba, en rojo | verde |
| RF-8 | Chrome (T5): las seis columnas pulsables | verde |
| RF-9 | `verificar-reglas.ts:3576` + Chrome (T5, Cargo ▲) | verde |
| RF-10 | `verificar-reglas.ts:3576` + Chrome (T5, Cargo ▼) | verde |
| RF-11 | Chrome (T5): ▲ / ▼ en el título | verde |
| RF-12 | `verificar-reglas.ts:3531` | verde |
| RF-13 | `verificar-reglas.ts:3542` + Chrome (T5: «Sin definir» y persona sin obra al final) | verde |
| RF-14 | Chrome (T5 búsqueda; T10 cambio de página con el orden intacto) | verde |
| RF-15 | Chrome (T10): 30 personas ficticias inyectadas en la respuesta, sin tocar la base: Z→A, página 1 de «Zz 29» a «Zz 05», página 2 empieza en «Zz 04» | verde |
| RF-16 | `verificar-reglas.ts:3592` + Chrome (T5: ida a Vehículos y vuelta) | verde |
| RF-17 | `verificar-reglas.ts:3592` + Chrome (T5: «Nombre completo ▲» al entrar) | verde |
| RF-18 | Chrome (T9): aviso del celular solo para quien lo tiene | verde |
| RF-19 | API (T8): tras la baja, `pull` y `refrescar` de los dos celulares → 401; la base (lectura, T10) dice 2 celulares, 0 vivos | verde |
| RF-20 | API (T8): una sola petición da de baja y revoca | verde |
| RF-21 | Por construcción: un solo `batch` de Neon (transacción). No se provocó un fallo a mitad | verde (sin prueba de fallo) |
| RF-22 | Lectura de la base (T10): `prueba.baja` sigue en la tabla con su lápida | verde |
| RF-23 | Lectura del código (T10): preoperacionales, partes, movimientos y viajes buscan al responsable sin filtrar `eliminado_en`. **No hay en la base ninguna persona dada de baja con registros**, así que no se pudo ver en pantalla | verde por inspección |
| RF-24 | API (T8): 400 «No puede darse de baja a usted mismo.» | verde |

Alcance: solo cambiaron los archivos del plan; sin esquema, sin migraciones, sin móvil. Fuera de
alcance sigue fuera: no se borra nada, no hay reactivar, solo Personas se ordena, no se agrupa,
no hay botón de desactivar celular aparte. Constitución: §4 (nada se borra) respetado; §6 (las
dos guardias no se mezclan) intacto; §8 sin dependencias nuevas.

**Veredicto: spec 015 Cumplida.** Dos matices que no la bloquean: RF-21 se sostiene por
construcción y RF-23 por lectura del código, porque no existe todavía un registro de una persona
dada de baja con que verlo.

---

# Tareas del cambio del 2026-09-22 — el resultado se ve donde se pidió

T1 a T10 son de la spec original, cumplida el 2026-09-21, y no se tocan. La numeración sigue.

**Ninguna tarea añade casos a `scripts/verificar-reglas.ts`, y es correcto**: este cambio no
introduce ni modifica una función pura, y `verificar-reglas.ts` prueba reglas, no componentes
(lo dicen los criterios de finalización de la spec). `npm run verificar` se corre igual en cada
tarea, como las otras dos puertas — lo que no se hace es inventarle un caso.

El orden es de dependencia: T11 crea la base, T12 la aplica al componente compartido, T13 a T16
la aplican ventana por ventana, T17 y T18 son la contraseña, T19 valida.

- [x] T11. Hook `usar-accion-de-ventana.ts`, y `ventana-viaje.tsx` migrado a él.
      (RF-25, RF-26, RF-27)
      El hook expone `ejecutando`, `error`, `campoConError(campo)` y `ejecutar(accion)`.
      No cierra nada al salir bien: cerrar lo decide quien lo usa (RF-32 lo necesita abierto).
      `ventana-viaje.tsx` es el caso más completo —validación local + campos del servidor +
      error general— y por eso es la prueba de que el hook sirve.
      Hecho cuando: los tres comandos en verde, `ventana-viaje.tsx` ya no declara su propio
      `useState` de `error` ni de `delServidor`, y registrar un viaje con un dato que el
      servidor rechace sigue mostrando el motivo bajo ese campo, igual que antes del cambio.

- [x] T12. `Confirmacion` recibe una promesa, se queda abierta al fallar y se reescribe su
      comentario de cabecera. (RF-25, RF-26)
      `onConfirmar` pasa a `() => Promise<unknown>`; el componente usa el hook de T11,
      deshabilita sus dos botones mientras corre y pinta el fallo dentro. Los **siete** sitios
      que la usan se adaptan: `catalogos-cantera.tsx` (×2), `pantalla-almacen.tsx`,
      `pantalla-obras.tsx`, `pantalla-personas.tsx` (×2) y `pantalla-vehiculos.tsx`. Los que
      hoy llaman a `useListado.ejecutar` dentro de la confirmación pasan a llamar a la API
      directamente y a `recargar()` al salir bien: `ejecutar` se traga el error y la ventana
      nunca se enteraría.
      **El comentario de cabecera dice hoy lo contrario de lo que hará el código** («Quien la
      usa sigue cerrándola antes de ejecutar la acción… y no detrás del telón (RF-7)»).
      Reescribirlo es parte de la tarea, no un detalle.
      Hecho cuando: los tres comandos en verde; `grep -rn "RF-7" src/features/panel/` no
      devuelve el comentario viejo; y dar de baja una obra de prueba que el servidor rechace
      deja la ventana abierta con el motivo dentro y el botón otra vez activo.

- [x] T13. `ventana-obra.tsx` y `ventana-vehiculo.tsx` pierden `onFallo`. (RF-25, RF-26, RF-27)
      Usan el hook de T11. `pantalla-obras.tsx` y `pantalla-vehiculos.tsx` dejan de pasarles
      `onFallo`. El `errorDelCodigo` local de `ventana-vehiculo.tsx` **se conserva**: es
      validación del formulario, no del servidor.
      Hecho cuando: los tres comandos en verde, `grep -rn "onFallo" src/features/panel/` ya no
      nombra a esas dos ventanas ni a sus dos pantallas, y corregir una obra con un código
      repetido muestra el motivo dentro de la ventana.

- [x] T14. `ventana-material.tsx` y `ventana-movimiento.tsx` pierden `onFallo`.
      (RF-25, RF-26, RF-27)
      `ventana-movimiento.tsx` ya pinta `campos` bajo sus campos; solo le queda el caso del
      error general. `pantalla-almacen.tsx` deja de pasar `onFallo` en sus dos llamadas.
      Hecho cuando: los tres comandos en verde, `grep -rn "onFallo" src/features/panel/` ya no
      nombra a esas dos ventanas ni a `pantalla-almacen.tsx`, y registrar un movimiento que el
      servidor rechace muestra el motivo dentro de la ventana.

- [x] T15. La ventana de sitio y material de `catalogos-cantera.tsx` pierde `onFallo`.
      (RF-25, RF-26)
      Es la única ventana que sirve a la vez para crear y para corregir; su `errorDelNombre`
      local se conserva por la misma razón que el de T13.
      Hecho cuando: los tres comandos en verde, `grep -rn "onFallo" src/features/panel/` sale
      **vacío**, y crear un sitio de cantera con un nombre repetido muestra el motivo dentro de
      la ventana.
      > **Tres errores en este enunciado**, corregidos al implementar: (1) la ventana **solo
      > corrige** —crear pasa en la página—; (2) `errorDelNombre` **no** era validación local
      > sino el campo del servidor, así que lo reemplazó el hook; (3) el `grep` **no** queda
      > vacío aquí sino en T16, que es la que toca `pantalla-personas.tsx`. Ver las notas.

- [x] T16. `VentanaCorregirPersona` pierde `onFallo`. (RF-25, RF-26, RF-27)
      **Es el caso que destapó todo esto**, así que su demo es la de la spec: mover a un
      almacenista a una obra con el módulo Almacén apagado.
      Hecho cuando: los tres comandos en verde y, al mover a un almacenista a una obra sin
      Almacén, se lee «Esa obra no lleva el módulo Almacén.» **dentro de la ventana**, con la
      ventana abierta, los campos intactos y el botón otra vez activo; cambiar a una obra
      válida y guardar cierra la ventana y actualiza la tabla.

- [x] T17. `Modal` gana `soloBotonCierra`, y nace `ventana-de-secreto.tsx`. (RF-28 a RF-32)
      Con `soloBotonCierra`, `Modal` no pasa `onCerrar` a `CapaFlotante`: Esc y el clic en el
      telón dejan de cerrar, y el botón «Cerrar» de la cabecera sigue igual. Por defecto no
      cambia nada, así que las otras once ventanas no se enteran.
      `VentanaDeSecreto` tiene dos fases en el **mismo** `Modal`: «confirmar» (opcional, para
      «Dar acceso») y «resultado» (con `soloBotonCierra`). Sin fase de confirmar, arranca
      generando — es el caso de «Códigos».
      Hecho cuando: los tres comandos en verde y el componente existe con sus dos fases, aún
      sin usar desde ninguna pantalla.

- [x] T18. Personas muestra la contraseña y los códigos en su ventana. (RF-28 a RF-32)
      «Dar acceso» y «Códigos» pasan a `VentanaDeSecreto`. Se borran los dos
      `Aviso tono="exito"` de página y los estados `temporal` y `codigos` de la pantalla.
      Hecho cuando: los tres comandos en verde; «Dar acceso» → confirmar deja la **misma**
      ventana abierta con la contraseña y el usuario dentro; Esc no la cierra; un clic fuera no
      la cierra; «Cerrar» sí, y la contraseña no vuelve a verse; «Códigos» se comporta igual
      con los dos códigos; y `pantalla-personas.tsx` ya no declara `temporal` ni `codigos`.

- [x] T19. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Los siete recorridos de «Estrategia de verificación» del plan, incluido el paso 7, que
      existe para cazar el fallo que el compilador no ve: una ventana que se queda abierta al
      salir bien donde antes se cerraba.
      Hecho cuando: RF-25 a RF-32 tienen su comprobación con resultado; RF-1 a RF-6 se
      recorren otra vez y siguen en verde; los tres comandos en verde; y la spec queda marcada
      como Cumplida.

## Notas de ejecución — cambio del 2026-09-22

**T11 (2026-09-22).** Hook creado y `ventana-viaje.tsx` migrada. Los tres comandos en verde:
251 verificaciones, `typecheck` y `lint` sin salida. Sin cambios de esquema, sin secretos
nuevos, sin pantallas del operador: el resto del ritual no aplica.

- El hook expone `ejecutando`, `error`, `campoConError`, `ejecutar` y `limpiar`. `ejecutar`
  devuelve **un booleano** y no el valor de la acción. Para `ventana-viaje.tsx` hizo falta el
  registro que devuelve el servidor, y se resolvió con un `let` que la acción asigna. Funciona y
  `typecheck` lo acepta, pero **T17 va a necesitar lo mismo** para el secreto: si aparece un
  tercer caso, conviene que `ejecutar` devuelva el valor en vez de repetir el `let`. Con dos
  casos no compensa la complejidad de hacerlo genérico.
- `intentado` se quedó fuera del hook, en la ventana. Es de ella: separa «todavía no ha pulsado
  Guardar» de «pulsó y falta algo», y eso lo decide `validarViaje`, no el servidor.
- La migración quitó cuatro estados de la ventana (`guardando`, `delServidor`, `error` y su
  `setError`) y dejó de importar `ErrorApi` y `mensajeDe`, que ahora solo conoce el hook. El
  archivo perdió 27 líneas.
- **Pendiente de comprobación manual**, que no puedo hacer yo sin el panel abierto: registrar un
  viaje con un dato que el servidor rechace y ver el motivo bajo ese campo, igual que antes.
  Queda como primer paso de la demo de T19.

**T12 (2026-09-22).** `Confirmacion` usa el hook y se queda abierta al fallar; los siete sitios
adaptados. Los tres comandos en verde: 251 verificaciones, `typecheck` y `lint` sin salida.
Sin esquema, sin secretos, sin móvil.

- Los siete sitios tenían **la misma forma equivocada**: cerraban la ventana (`setPorDarDeBaja(null)`)
  y llamaban a `useListado.ejecutar`, que atrapa el error y devuelve un booleano. Con la ventana
  ya cerrada y el error atrapado, el motivo acababa en el aviso de la página. Ahora llaman a la
  API directamente —lo que lanza lo recoge la `Confirmacion`— y cierran, recargan y ponen el
  «hecho» **solo al salir bien**.
- `grep -rn "RF-7\b" src/features/panel/` ya no devuelve el comentario viejo. Los cinco aciertos
  que quedan son de otras specs (008/RF-7, 009/RF-7, 010/RF-7, 017/RF-7): nombres iguales,
  specs distintas.
- **Decisión tomada sobre la marcha, pequeña pero conviene que esté escrita:** mientras la acción
  corre, la ventana no se cierra ni con Esc ni con el telón, y los dos botones se deshabilitan.
  No lo pide ningún RF; es la consecuencia coherente de deshabilitar los botones. Una ventana que
  desaparece a mitad de vuelo deja la tabla sin recargar y al servidor haciendo el trabajo igual.
  Si a Diego no le gusta, se quita en una línea.
- `generarClave` en Personas **dejó de atrapar el fallo**, con un comentario que dice por qué. La
  contraseña sigue mostrándose en el aviso de la página: eso es RF-28 y lo cambia T18.
- `generarCodigos` **no se tocó**: no cuelga de una `Confirmacion`, se pide con un botón directo.
  Conserva su `try/catch` hacia la página hasta T18.
- Fuera de la tarea, visto al pasar: `pantalla-almacen.tsx:200` cita «RF-7» sin decir de qué spec,
  y ahí es la 009. Los comentarios que nombran un RF deberían llevar el número de spec delante,
  como hace `marco.tsx` con «008/RF-7». No se tocó.

**T13 (2026-09-22).** Las dos ventanas migradas y las dos pantallas dejan de pasar `onFallo`.
Los tres comandos en verde: 251 verificaciones, `typecheck` y `lint` sin salida.

- **Error en el enunciado de la tarea, encontrado al implementar.** T13 decía que el
  `errorDelCodigo` de `ventana-vehiculo.tsx` «se conserva: es validación del formulario, no del
  servidor». **Es al revés**, y el propio código lo decía en su comentario: «El código repetido
  lo dice el servidor, y se lee debajo del campo (spec 007, RF-18)». Leía
  `ErrorApi.campos.codigoInterno` a mano. Es exactamente lo que el hook hace para todos los
  campos, así que se reemplazó por `accion.campoConError('codigoInterno')` en vez de conservarlo.
  La conducta no cambia; lo que desaparece es una copia a mano de la lógica del hook.
- Lo que sí es validación local y **sí se conservó**: `faltaCodigo` y `faltaNombre`, que se
  evalúan sin preguntarle a nadie y tienen prioridad sobre lo que diga el servidor.
- `ventana-obra.tsx` no tenía campos por separado: su fallo entero iba a la página. Ahora sale
  arriba de la ventana.
- `grep -rn "onFallo" src/features/panel/` ya no nombra a estas dos ventanas ni a
  `pantalla-obras.tsx` / `pantalla-vehiculos.tsx`. Siguen pendientes, como estaba previsto:
  `ventana-material.tsx` y `ventana-movimiento.tsx` (T14), `catalogos-cantera.tsx` (T15) y
  `pantalla-personas.tsx` (T16).

**T14 (2026-09-22).** Las dos ventanas del almacén migradas; `pantalla-almacen.tsx` deja de
pasar `onFallo` en sus dos llamadas. Los tres comandos en verde: 251 verificaciones,
`typecheck` y `lint` sin salida.

- **Las dos tenían el mismo vicio, y migrarlas lo arregla de paso.** Cada una elegía a mano qué
  campos se quedaban en la ventana —`campos.nombre || campos.unidad` en materiales;
  `campos.cantidad || campos.fecha || campos.paraQue || campos.responsable` en movimientos— y
  **cualquier otro campo caía al `onFallo` de la página**, detrás del telón. O sea: el día que el
  servidor rechazara por un campo no listado, el mensaje volvía a perderse. El hook no tiene
  lista: cualquier `campos` se reparte bajo sus campos (RF-27). Es una mejora real de conducta,
  no solo menos código, y entra dentro de RF-25.
- `ventana-movimiento.tsx` conserva sus dos validaciones locales, que mandan sobre el servidor
  mientras se escribe: `faltas` (de `validarMovimiento`, la regla pura) y `noAlcanza` (compara la
  cantidad con el stock en vivo). `intentado` también se queda: es de la ventana.
- `pantalla-almacen.tsx` conserva su `materiales.setError` en `descargarExcel`: esa descarga **no
  se pide desde una ventana**, sino desde la barra de la página, así que su fallo va bien donde
  está. No es un olvido.

**T15 (2026-09-22).** `VentanaCorregir` de `catalogos-cantera.tsx` migrada; las dos secciones
—sitios y materiales— dejan de pasarle `onFallo`. Los tres comandos en verde: 251
verificaciones, `typecheck` y `lint` sin salida.

**El enunciado que escribí en la fase de tareas tenía tres errores.** Los tres se vieron al
abrir el archivo, y los tres se corrigieron implementando lo que el código pedía, no lo que la
tarea decía:

1. «Es la única ventana que sirve a la vez para crear y para corregir» — **falso**.
   `VentanaCorregir` solo corrige (se usa en las líneas 186 y 303, las dos desde `corrigiendo`).
   Registrar un sitio o un material pasa **en la página**, con `sitios.ejecutar` y
   `materiales.ejecutar`, y ahí `useListado.ejecutar` es lo correcto: el formulario de alta no
   está en una ventana y su aviso se lee donde se pulsó. No se tocó.
2. «Su `errorDelNombre` local se conserva» — **falso, y es el mismo error que en T13**: leía
   `ErrorApi.campos.nombre`, o sea el campo del servidor, no validación local. Lo reemplazó
   `accion.campoConError('nombre')`. De paso se arregla lo mismo que en T14: cualquier otro
   campo que mandara el servidor se perdía en la página, y ahora se reparte.
3. «`grep -rn "onFallo" src/features/panel/` sale **vacío**» — **falso**: quedan las cuatro de
   `pantalla-personas.tsx`, que son T16. El grep queda vacío al terminar T16, no aquí.

**Qué aprender de esto:** los tres errores son del mismo tipo —afirmé cosas del código al
trocear las tareas sin volver a abrir los archivos—. Las tareas que quedan (T16 a T18) describen
archivos que sí se leyeron en la fase de plan, pero conviene verificar cada afirmación al
empezar cada una, como se ha hecho aquí, en vez de darla por buena.

**T16 (2026-09-22).** `VentanaCorregirPersona` migrada. `grep -rn "onFallo" src/features/panel/`
**sale vacío**: ninguna ventana del panel manda ya su fallo a la página. Los tres comandos en
verde: 251 verificaciones, `typecheck` y `lint` sin salida.

**Defecto del hook de T11, encontrado aquí y corregido aquí.** Al mirar cómo rechaza el servidor
el caso de la spec (`src/app/api/panel/personas/[id]+api.ts:89`) resultó que responde
`{ error: "Esa obra no lleva el módulo Almacén.", campos: { rol: <el mismo texto> } }`. Con el
hook tal como lo dejó T11 —que copiaba a `useListado.ejecutar`— eso se pintaba así:

- arriba de la ventana: **«Revise los campos marcados.»**
- bajo el selector **«Acceso»**: el motivo de verdad

O sea: el motivo quedaba escondido bajo un campo que nadie había tocado —se cambió la **Obra**,
no el Acceso— y arriba salía una frase que no dice nada. **Seguía incumpliendo RF-25**, que pide
«mostrará el motivo», y RF-27, que dice «lo mostrará **además** bajo ese campo», no «en vez de».

El hook ahora pone siempre arriba el mensaje del servidor, y además lo reparte bajo sus campos.
Lo justifica el contrato del propio servidor (`@/features/servidor/respuestas`): «todo error
lleva `{ error: string }` con un mensaje que **se le puede mostrar tal cual a una persona**», y
en los de validación `error` es el mensaje del primer campo, nunca un relleno. Cambiarlo por
«Revise los campos marcados.» era tirar la única frase redactada para leerse.

- **Efecto secundario a mirar en la demo (T19):** cuando el servidor señala un solo campo, el
  mismo texto sale dos veces —arriba y bajo el campo—. Es lo que pide RF-27 al decir «además»,
  pero conviene ver si se lee bien o si canta. Si molesta, es un cambio de una línea en el hook,
  pero es **comportamiento** y entonces entra por la spec, no por el plan.
- `VentanaCorregirPersona` ahora señala tres campos si el servidor los nombra: `nombreCompleto`,
  `rol` (el selector «Acceso») y `obraId` (el selector «Obra»). Antes no señalaba ninguno.
- `generarCodigos` sigue sin tocar, con su `try/catch` hacia la página: no cuelga de una ventana.
  Lo cambia T18.

**T17 (2026-09-22).** `Modal` gana `soloBotonCierra` y nace `ventana-de-secreto.tsx`, con sus
dos fases. Todavía no lo usa ninguna pantalla: eso es T18. Los tres comandos en verde: 251
verificaciones, `typecheck` y `lint` sin salida.

- **La duda que dejó T11 se resolvió sola, y en el sentido contrario al previsto.** Aquella nota
  decía que T17 necesitaría otra vez el `let` fuera del `await` para sacar el valor de
  `ejecutar`, y que con un tercer caso convendría hacer `ejecutar` genérico. **No hizo falta**:
  el secreto se guarda con `setSecreto(await generar())` **dentro** de la acción, que es más
  limpio que el `let` y no necesita que `ejecutar` devuelva nada. Así que la propuesta de
  refactor **se descarta**: sigue habiendo un solo caso con `let` (`ventana-viaje.tsx`), y
  cambiar la firma tocaría ocho llamadas de cinco tareas ya cerradas para no ganar nada.
- **Guardia contra el doble montaje.** Sin fase de confirmar, la ventana genera al abrirse con un
  `useEffect`, y eso está protegido con un `useRef`. No es precaución de manual: un segundo
  `POST` generaría otro secreto y **dejaría inservible el que se está mostrando en pantalla**.
  Cualquier cosa que monte el componente dos veces —React en modo estricto, un padre que cambie
  su `key`— haría exactamente eso. Hoy el proyecto no usa `StrictMode`, así que el guardia es
  por si alguien lo activa.
- **Una tercera rama que la spec no nombra pero hacía falta:** generar sin confirmación previa y
  que **falle**. Sin ella la ventana se quedaría diciendo «Generando…» para siempre. Muestra el
  motivo arriba (RF-25) y ofrece «Volver a intentar» y «Cancelar». No es comportamiento nuevo:
  es RF-25 aplicado a la fase que no tiene botones propios.
- El valor se pinta con `TextoPanel.cifra` y `letterSpacing`, grande y separado, porque estos
  códigos **se dictan por teléfono** letra por letra. Y va `selectable` para poder copiarlo con
  el ratón, ya que no hay botón de copiar (decisión de Diego, «Fuera de alcance» de la spec).
- La explicación va **bajo cada código y no al final**: el de activación y el de respaldo los usan
  personas distintas en momentos distintos, y un párrafo común obliga a averiguar cuál es cuál.

**T18 (2026-09-22).** «Dar acceso» y «Códigos» pasan por `VentanaDeSecreto`. Los tres comandos
en verde: 251 verificaciones, `typecheck` y `lint` sin salida.

- Comprobado con `grep`: la pantalla ya no declara `temporal` ni `codigos`, y **no queda ningún
  `Aviso tono="exito"`** en ella. Los tres estados de antes (`temporal`, `codigos`,
  `porConfirmar`) son ahora dos (`accesoDe`, `codigosDe`), y **ninguno guarda el secreto**: lo
  tiene la ventana y desaparece con ella. Que el secreto no exista fuera de esa ventana es lo que
  evita que se quede a la vista de quien pase después por ese computador.
- **«Códigos» no lleva fase de confirmar, y es deliberado.** Emitir códigos no invalida nada que
  el operador esté usando —su PIN sigue sirviendo—, así que no hay nada que advertir; sigue
  pidiéndose con el botón, como hasta hoy. «Dar acceso» sí confirma, porque **rompe** la
  contraseña anterior y cierra la sesión de esa persona.
- `mensajeDe` dejó de usarse en la pantalla y se quitó del import: ya no queda ni un `catch` en
  todo el archivo. De los fallos se encargan la `Confirmacion`, la `VentanaDeSecreto` y el hook.
- Los dos códigos se pintan en **dos bloques separados**, cada uno con su explicación debajo. El
  aviso viejo era un párrafo corrido con los dos dentro y obligaba a leerlo entero para saber
  cuál se dicta y cuál se imprime.

**Aviso para T19, importante.** La demo de RF-28 a RF-32 **genera secretos de verdad contra la
base de producción**, donde están las 9 personas reales de OCC:

- «Dar acceso» sobre alguien del panel **le rompe la contraseña actual y le cierra la sesión**.
  No se puede deshacer: hay que entregarle la nueva.
- «Códigos» es inofensivo (no toca el PIN del operador), pero invalida el código de activación
  anterior si lo había.

Antes de T19 hay que decidir con Diego sobre quién se prueba. La opción limpia es crear una
persona de prueba nueva —como se hizo con `prueba.baja` en T8— y darla de baja al terminar,
junto con la limpieza de `PRUEBA-016` que ya está pendiente.

## Validación del cambio (T19, 2026-09-22)

Hecha en Chrome contra la base real, como gerencia, con **una persona de prueba creada para
esto**: `prueba.clave` («Prueba Clave 015», Consorcio Antioquia). Ninguna de las 9 personas de
OCC se tocó. Los tres comandos, en verde al terminar: 251 verificaciones, `typecheck` y `lint`
sin salida.

| RF | Cómo se comprobó | Resultado |
| --- | --- | --- |
| RF-25 | Corregir a `prueba.clave` a PRUEBA-016 (Almacén apagado): «Esa obra no lleva el módulo Almacén.» **dentro** de la ventana, abierta, datos intactos, botón activo | verde |
| RF-25 (red) | Con las escrituras bloqueadas en la página, «Dar de baja»: «No se pudo contactar al servidor…» dentro de la ventana de confirmación, que sigue abierta | verde |
| RF-26 (confirmación) | La misma prueba de red en **Obras** sobre PRUEBA-016: idéntico, y la obra sigue Activa | verde |
| RF-26 (formulario) | La ventana «Corregir» de Personas, arriba | verde |
| RF-27 | Rechazo con dos campos: cada motivo bajo su campo (Nombre completo y Acceso) | verde |
| RF-28 | «Dar acceso» → la contraseña con el nombre y el usuario, y la advertencia de que solo se ve una vez | verde |
| RF-29 | La ventana se quedó abierta hasta pulsar «Ya lo anoté, cerrar» | verde |
| RF-30 | «Códigos»: activación y respaldo, cada uno con su explicación; Esc tampoco cierra | verde |
| RF-31 | Sobre la contraseña: **Esc no cierra**, **clic en el telón no cierra**, el botón sí; después no se vuelve a ver | verde |
| RF-32 | Confirmar no cerró la ventana: el **mismo marco** pasó del aviso a la contraseña | verde |
| RF-33 (uno) | El caso de la obra sin módulo: el motivo **una sola vez**, arriba; el campo no lo repite | verde |
| RF-33 (varios) | Rechazo de dos campos: arriba «Revise los campos marcados.», y cada campo con el suyo. Sin repeticiones | verde |
| RF-1 a RF-6 | Confirmación en ventana en Personas y Obras, cancelando; el telón impide tocar lo de detrás | verde |
| **Cierre al salir bien** | Corregir el cargo de `prueba.clave` a Operador: la ventana **se cerró** y la tabla se actualizó sola | verde |

**Dos comprobaciones se hicieron con un rechazo simulado**, interceptando `fetch` en la página
—la técnica que ya usó este proyecto—, y se dice porque cambia lo que valen: el fallo de red y
el rechazo de dos campos **no llegaron al servidor**. Se hizo así a propósito: la validación del
propio formulario impide mandar varios campos malos, y provocar un fallo real habría exigido
tumbar el servidor de desarrollo o escribir basura en la base de OCC. El camino que sí recorrió
el servidor de verdad es el de RF-25 con el módulo apagado, que es el caso que motivó la spec.

**Veredicto: el cambio del 2026-09-22 a la spec 015 queda Cumplido** (RF-25 a RF-33).

### Pendiente de limpieza, con permiso de Diego

- **`prueba.clave`** quedó registrada, con **una contraseña temporal y unos códigos de activación
  emitidos** (ninguno entregado a nadie). Hay que darla de baja.
- Sigue pendiente de antes: la obra **PRUEBA-016** y `prueba.almacenista`.
