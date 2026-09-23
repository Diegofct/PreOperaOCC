# Plan técnico — Spec 015

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/componentes.tsx` — `Confirmacion` | Deja de pintarse en línea y se pinta dentro de `Modal` (misma capa flotante con telón oscuro). Firma nueva: acepta `titulo` opcional (por defecto «Confirmar»). La caja amarilla con «!» se conserva **dentro** de la ventana. | RF-1, RF-3 a RF-6 |
| `src/features/panel/componentes.tsx` — `Columna` / `Tabla` | `Columna` gana `ordenar?: (fila) => string \| null`. `Tabla` gana props opcionales `orden` y `alOrdenar`; si la columna es ordenable, su título es un `Pressable` con ▲/▼. Sin `alOrdenar`, la tabla se pinta igual que hoy. | RF-8, RF-9 a RF-11 |
| `src/features/panel/ordenar.ts` (nuevo) | Función pura `ordenarFilas(filas, clave, sentido, desempate)`: compara con `normalizar` (`src/shared/rules/texto.ts`) y `localeCompare('es')`, vacíos al final, desempate por nombre. Tipo `Orden = { clave, sentido }`. | RF-12, RF-13, casos límite |
| `src/features/panel/usar-orden-recordado.ts` (nuevo) | Hook: estado `Orden` inicializado desde `localStorage` (clave `panel.orden.personas`), escribe al cambiar; todo acceso en `try/catch`; valor ilegible → orden por defecto. Alterna A→Z / Z→A al repetir columna. | RF-9, RF-10, RF-16, RF-17 |
| `src/features/panel/usar-listado-filtrado.ts` | Acepta un cuarto parámetro opcional `ordenar?: (filas) => filas`, aplicado **después de filtrar y antes de recortar la página**. Las demás pantallas no lo pasan y no cambian. | RF-14, RF-15 |
| `src/features/panel/pantalla-personas.tsx` | Columnas con `ordenar`; la etiqueta de Acceso sale a una función `etiquetaDeAcceso(p)` que usan la celda y el orden; pasa `orden/alOrdenar` a `Tabla`. Texto de la baja con el aviso del celular si `p.celularActivo`. | RF-8, RF-18 |
| `src/features/panel/pantalla-obras.tsx`, `pantalla-vehiculos.tsx`, `pantalla-almacen.tsx`, `catalogos-cantera.tsx` | Ninguno en su lógica: heredan la ventana al cambiar `Confirmacion`. Se revisa que ninguno dependa de que el aviso esté en línea (p. ej. un `Aviso` de error justo debajo). | RF-2, RF-7 |
| `src/app/api/panel/personas+api.ts` (`GET`) | Añade `celularActivo: boolean` por fila (`exists` sobre `dispositivos` sin `revocado_en`). | RF-18 |
| `src/features/panel/contratos.ts` — `PersonaFila` | Campo `celularActivo: boolean`. | RF-18 |
| `src/app/api/panel/personas/[id]+api.ts` (`DELETE`) | Se quita el 409 por celular activo. La baja y la revocación van en **un solo `batch`** (transacción no interactiva). Se reescribe el comentario del porqué. | RF-19 a RF-22, RF-24 |

## Modelo de datos

**Sin cambios de esquema.** Se usan las columnas que ya existen: `usuarios.activo`,
`usuarios.eliminado_en` y `dispositivos.revocado_en`. Ninguna migración, ni local ni de
servidor.

## Algoritmo / reglas

**Baja de una persona** (`DELETE /api/panel/personas/:id`):

1. Guardia `requerirPermiso(…, 'personas', 'escribir')` y `personaAlcanzable` (sin cambios).
2. Si `id === sesion.id` → 400, como hoy (RF-24).
3. `baseServidorSerializable().batch([...])` con dos sentencias, en este orden:
   - `UPDATE usuarios SET activo=false, eliminado_en=now() WHERE id=:id AND eliminado_en IS NULL RETURNING …`
   - `UPDATE dispositivos SET revocado_en=now() WHERE usuario_id=:id AND revocado_en IS NULL`
   El batch de Neon corre como una transacción: o se aplican las dos o ninguna (RF-21).
   Revoca **todos** los celulares activos (caso límite de dos teléfonos).
4. Si el primer `UPDATE` no devolvió fila → 404 «esa persona» (dos gerencias a la vez: la
   segunda ya no la encuentra). La segunda sentencia en ese caso no revoca nada nuevo que no
   debiera estar revocado: la persona ya estaba de baja.

**Orden de la tabla** (`ordenarFilas`):

1. Para cada fila, `valor = columna.ordenar(fila)`; vacío = `null` o `''`.
2. Vacíos siempre al final, sin importar el sentido (RF-13).
3. Resto: `normalizar(a).localeCompare(normalizar(b), 'es', { numeric: true })`, invertido
   si el sentido es Z→A (RF-12). `numeric` para que el documento `9…` no quede detrás de `10…`.
4. Empate → por nombre completo A→Z (caso límite), en cualquier sentido.

## Decisiones técnicas

- **Cambiar `Confirmacion` por dentro, no las seis pantallas.** Se descartó crear un
  `VentanaDeConfirmacion` nuevo y migrar pantalla por pantalla: dejaría el componente viejo
  vivo para que alguien lo vuelva a usar, y RF-2 pide todas a la vez.
- **Revocar el celular en la misma petición de baja, con `batch`.** Se descartó hacer dos
  peticiones desde el panel (revocar y luego dar de baja): si la segunda falla, la persona
  queda sin celular pero activa, que es justo lo que RF-21 prohíbe. Se descartó también una
  sola sentencia con CTE: el `batch` ya está probado en el almacén
  (`almacen/movimientos/[id]/anular+api.ts`) y se lee mejor.
- **El 409 que pedía «desactivar» se elimina.** Su razón era que la lápida libera el nombre de
  usuario y un teléfono con esa identidad podría quedar apuntando a otra persona. Revocar el
  dispositivo en la misma transacción cierra esa puerta igual: la guardia del móvil
  (`guardia-movil.ts:62`) y el refresco (`movil/refrescar+api.ts:47`) rechazan un dispositivo
  revocado. El razonamiento se conserva en el comentario de la ruta.
- **El orden se recuerda en `localStorage`, no en la dirección.** Se descartó
  `useParametroDeDireccion`: el menú lleva a `/panel/personas` sin parámetros, así que al
  volver desde otro módulo el orden se perdería, y RF-16 pide lo contrario. Es una comodidad
  por navegador, que es lo que `localStorage` puede ser (si falla, se ordena por nombre).
- **Ordenar en el navegador.** Se descartó un `?orden=` en el `GET`: el listado ya llega entero
  y se filtra en el cliente (`usar-listado-filtrado.ts`); ordenar en el servidor obligaría a
  pedir otra vez los datos con cada clic.
- **Ordenar por lo que se ve.** Cargo por su nombre legible (`nombreDeCargo`) y Acceso por la
  etiqueta («Celular», «Gerencia», «Panel», «Sin acceso»), no por el valor interno: ordenar por
  `supervisor` pondría las filas en un orden que la pantalla no explica.

## Impacto en la sincronización

- **Pull**: sin cambios. Un dispositivo revocado ya recibe 401 en la guardia y no refresca token.
- **Push / outbox**: sin cambios de código. Lo que el celular de una persona dada de baja tenga
  en cola queda sin subir (la guardia lo rechaza), y se queda en el teléfono: la cola no borra.
  Es lo que avisa RF-18.
- **Idempotencia** y **reevaluación en servidor**: no aplican.

## Contrato de API

- `GET /api/panel/personas` — igual que hoy, cada fila con `celularActivo: boolean`. Guardia
  `requerirPermiso('personas','listar')`, alcance `filtroDeObra` (sin cambios).
- `DELETE /api/panel/personas/:id` — guardia `requerirPermiso('personas','escribir')` y
  `personaAlcanzable` (sin cambios).
  - 200 con la fila dada de baja (también cuando tenía celular).
  - 400 si es uno mismo.
  - 403 si un no-gerencia intenta dar de baja a gerencia (sin cambios).
  - 404 si no existe, está fuera de alcance o ya estaba de baja.
  - **Ya no devuelve 409.**

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: la spec no añade reglas de negocio. Aun así, `ordenarFilas`
  es pura y barata de probar, así que entra con casos: tildes y mayúsculas, vacíos al final en
  los dos sentidos, empate por nombre, documentos numéricos (RF-12, RF-13).
- **Demo manual** (Chrome, como gerencia, sin escribir contraseñas):
  1. Personas: ordenar por Cargo ▲ y ▼, buscar, filtrar por obra, pasar a la página 2, ir a
     Vehículos y volver (RF-8 a RF-17).
  2. Dar de baja a una persona de prueba: la ventana sale centrada con el fondo oscuro, Esc y
     clic fuera cancelan, confirmar la da de baja (RF-1 a RF-6).
  3. Operador de prueba con celular activado: la ventana avisa del celular; confirmar; su
     celular deja de sincronizar (o, sin teléfono a mano, comprobar en la base que
     `revocado_en` quedó escrito) (RF-18 a RF-21).
  4. Abrir un preoperacional o un parte de esa persona y ver su nombre (RF-23).
  5. Abrir y cancelar la confirmación en Obras, Vehículos, Almacén y los catálogos de Cantera (RF-2).
- **Comprobaciones extra**: se toca una ruta `+api.ts` → reiniciar `npm run web` antes de
  probar. No se leen secretos nuevos ni se añaden rutas al operador.

## Riesgos

- **Una pantalla pinta el error de la acción justo debajo de la confirmación** y, al pasar a
  ventana, el mensaje queda detrás del telón. Se detecta en la demo 5; se corrige cerrando la
  ventana antes de ejecutar (como ya hace Personas) para que el error salga en la pantalla.
- **Producción**: dar de baja a alguien con celular ahora sí funciona y es irreversible desde el
  panel (no hay reactivar). La demo usa solo personas de prueba. Si se diera de baja a alguien
  por error, se revierte en la base (`eliminado_en = null`, `activo = true`,
  `revocado_en = null`) y se le emite un código nuevo.
- **`localStorage` bloqueado** (ventana privada): todo va en `try/catch` y la tabla arranca
  ordenada por nombre, que es lo de hoy.
- **Revertir el cambio entero**: no hay migración; basta volver los archivos.

---

# Cambio del 2026-09-22 — el resultado se ve donde se pidió (RF-25 a RF-32)

> Todo lo de arriba es el plan de la spec original, cumplida el 2026-09-21, y **no cambia**.
>
> **Aviso: este cambio invierte una de las mitigaciones de arriba.** El primer punto de
> «Riesgos» proponía, si el error de una acción quedaba detrás del telón, «corregirlo cerrando
> la ventana antes de ejecutar (como ya hace Personas) para que el error salga en la pantalla».
> Eso funcionó y era lo acordado entonces, pero es exactamente lo que RF-25 prohíbe ahora: el
> motivo va **dentro** de la ventana. Si alguien lee ese párrafo suelto, va a "arreglar" el
> código de vuelta.

## Qué se descubrió al leer el código

Tres cosas que cambian la forma del trabajo y conviene tener delante:

1. **La conducta que RF-25 invierte era deliberada y está escrita.** `Confirmacion`
   (`componentes.tsx:99`) lleva este comentario: «Quien la usa sigue cerrándola **antes** de
   ejecutar la acción: así un error sale en la pantalla, a la vista, y no detrás del telón
   (RF-7).» Al cambiarla hay que **cambiar ese comentario**, no dejarlo contradiciendo al
   código (AGENTS.md: «cuando cambies una decisión, cambia el comentario»).
2. **Ya existe la mitad de la cañería.** `ErrorApi` (`cliente-api.ts:70`) trae `mensaje`,
   `estado` y `campos`. No hay que tocar el servidor ni el cliente HTTP: lo único que falta
   es **dónde se pinta** lo que ya llega.
3. **Ya existe el patrón correcto, aplicado una vez.** `ventana-viaje.tsx:149-155` guarda el
   error en estado local y lo pinta dentro del `Modal`, con este comentario: «lo demás, arriba
   de la ventana (el aviso de la página queda detrás del telón)». Este cambio **generaliza ese
   patrón**; no inventa uno nuevo.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/usar-accion-de-ventana.ts` | **Nuevo.** Hook con el estado de una acción dentro de una ventana: `ejecutando`, `error`, `campoConError(campo)`, `ejecutar(accion)`. Traduce `ErrorApi.campos` igual que hoy lo hace `useListado.ejecutar`, pero deja el resultado **en la ventana**. | RF-25, RF-26, RF-27 |
| `src/features/panel/componentes.tsx` → `Confirmacion` | `onConfirmar` pasa a ser `() => Promise<unknown>`. La ventana **ya no se cierra antes de actuar**: usa el hook, deshabilita sus botones mientras corre, pinta el fallo dentro y solo se cierra al salir bien. Se reescribe su comentario de cabecera. | RF-25, RF-26 |
| `src/features/panel/componentes.tsx` → `Modal` | Prop nueva `soloBotonCierra?: boolean`. Con ella, `onCerrar` no se pasa a `CapaFlotante`, así que Esc y el clic en el telón dejan de cerrar; el botón «Cerrar» sigue igual. | RF-31 |
| `src/features/panel/ventana-de-secreto.tsx` | **Nuevo.** La ventana de dos fases para lo que solo se ve una vez: fase «confirmar» (opcional) y fase «resultado», en el **mismo** `Modal`. Con `soloBotonCierra` en la fase de resultado. | RF-28 a RF-32 |
| `src/features/panel/pantalla-personas.tsx` | «Dar acceso» y «Códigos» pasan a `VentanaDeSecreto`; se borran los dos `Aviso tono="exito"` de página (líneas 372-390) y los estados `temporal` y `codigos` se mueven dentro de la ventana. `VentanaCorregirPersona` pierde `onFallo` y usa el hook. | RF-28 a RF-32, RF-25 |
| `src/features/panel/ventana-obra.tsx` | Pierde `onFallo`; usa el hook. | RF-25, RF-26 |
| `src/features/panel/ventana-vehiculo.tsx` | Igual. Su `errorDelCodigo` local se conserva: es validación de formulario, no del servidor. | RF-25, RF-26, RF-27 |
| `src/features/panel/ventana-material.tsx` | Igual. | RF-25, RF-26, RF-27 |
| `src/features/panel/ventana-movimiento.tsx` | Ya pinta `campos` bajo sus campos; pierde el `onFallo` del caso restante. | RF-25, RF-27 |
| `src/features/panel/catalogos-cantera.tsx` | La ventana de sitio/material pierde `onFallo`; usa el hook. Sus dos `<Confirmacion>` se adaptan a `onConfirmar` asíncrono. | RF-25, RF-26 |
| `src/features/panel/ventana-viaje.tsx` | Se migra al hook. No cambia su comportamiento: es el caso más rico y sirve de prueba de que el hook cubre lo que ya funcionaba. | RF-25, RF-27 |
| `src/features/panel/pantalla-obras.tsx`, `pantalla-vehiculos.tsx`, `pantalla-almacen.tsx` | Dejan de pasar `onFallo` a sus ventanas y adaptan sus `<Confirmacion>` al `onConfirmar` asíncrono. | RF-25, RF-26 |

**Lo que NO se toca, y por qué.** Dos grupos, por razones distintas:

- **Ventanas que ya cumplen RF-25**: `historial-almacen.tsx:277` (anular un movimiento) y
  `listado-viajes.tsx:317` (anular un viaje). Guardan el error en estado local y lo pintan
  dentro de su `Modal`. Migrarlas al hook sería churn sin cambio de conducta; se anota aquí para
  que la validación las recorra y confirme que cumplen, en vez de que parezca un olvido.
- **Las siete secciones de `pantalla-partes.tsx` no son ventanas**, así que RF-25 no les aplica:
  son secciones de la propia página (`SeccionEnMarco` con su prop `error`), y su error ya se
  pinta dentro de la sección donde se pulsó Guardar. Lo dice su comentario, de la spec 007
  RF-28: «El error de guardar se pinta dentro de esta sección y no arriba de la página, que es
  donde no lo ve quien acaba de pulsar Guardar.» Es la misma idea que RF-25, resuelta antes y en
  otra superficie.

**El formulario de alta de cada pantalla tampoco se toca.** Está *en la página*, no en una
ventana, y su error ya se lee donde se pulsó. `useListado.ejecutar` se queda exactamente como
está para ese caso.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.**
- **Servidor** (`src/db/servidor/esquema.ts`): **sin cambios.**
- **Migraciones**: ninguna.
- **Compatibilidad**: no aplica. Ningún teléfono se entera de este cambio.

**Sin cambios de esquema.** Este cambio mueve de sitio lo que se pinta; no toca ni un dato.

## Algoritmo / reglas

**No hay regla de negocio nueva, así que nada entra en `src/shared/rules/`.** Lo que hay es el
ciclo de vida de una acción dentro de una ventana, que vive en el hook:

1. `ejecutar(accion)` pone `ejecutando = true` y borra el error y los campos anteriores.
2. Corre `accion()`.
3. Si sale bien: devuelve `true`. **El hook no cierra nada** — cerrar es decisión de quien lo
   usa, porque unas ventanas cierran al salir bien (corregir) y otras se quedan con un
   resultado a la vista (RF-32).
4. Si falla con `ErrorApi` **y trae `campos`**: los guarda para `campoConError(campo)` y pone
   arriba «Revise los campos marcados.» (RF-27). El aviso de arriba no se omite: si la ventana
   no pinta ese campo, al menos se sabe que algo falló. Es la misma decisión que ya tomó
   `useListado.ejecutar` y se copia a propósito.
5. Si falla de cualquier otra forma: `mensajeDe(fallo)` arriba de la ventana (RF-25). Cubre
   también el fallo de red, que `cliente-api.ts` ya convierte en un `ErrorApi` con estado 0.
6. En los dos casos de fallo: `ejecutando = false`, la ventana sigue abierta, los botones
   vuelven a estar activos y lo escrito sigue ahí (RF-25).

`VentanaDeSecreto` encima de eso:

1. Fase **confirmar** (solo si se le pasa un aviso): el texto y los botones de hoy.
2. Al confirmar, `ejecutar(generar)`. Mientras corre, el botón dice «Generando…».
3. Si falla: el motivo dentro de la ventana, en la fase de confirmar, y se puede reintentar.
4. Si sale bien: **el mismo `Modal` cambia de cuerpo** y muestra el secreto (RF-32), con
   `soloBotonCierra` puesto (RF-31).
5. Sin aviso de confirmación —el caso de «Códigos»— arranca directamente en el paso 2.

## Decisiones técnicas

- **Un hook (`usar-accion-de-ventana.ts`) en vez de copiar cuatro líneas de estado en cada
  ventana** → se descartó copiar el patrón de `ventana-viaje.tsx` a mano en las siete ventanas
  restantes porque es la misma decisión repetida siete veces, y la prueba de que eso se degrada
  ya la dio este proyecto: el módulo `cliente-api.ts` abre diciendo que repartir el manejo del
  error por las pantallas acaba en «unas muestran el mensaje del servidor y otras un "algo
  falló" genérico, según quién escribió la pantalla». Esto es exactamente ese problema una capa
  más arriba.
- **El hook no cierra la ventana al salir bien** → se descartó que la cerrara él, que era más
  corto, porque RF-32 necesita justo lo contrario: quedarse abierta con el resultado dentro. Un
  hook que cierra obligaría a esquivarlo en el único caso nuevo de la spec.
- **`Confirmacion` recibe una promesa en vez de que cada pantalla gestione su error** → se
  descartó dejar `onConfirmar` síncrono y que cada una de las siete llamadas hiciera su
  `try/catch`: son siete sitios donde olvidarse, y el olvido no se nota hasta que algo falla de
  verdad en producción. Con la promesa, la ventana no puede *no* enterarse del fallo.
- **`soloBotonCierra` como prop de `Modal`, y no un `Modal` aparte** → se descartó un componente
  nuevo porque la diferencia es una línea de comportamiento, no una ventana distinta; y se
  descartó hacerlo el comportamiento de todas las ventanas porque Esc y el clic fuera son lo
  correcto en las otras once: ahí cerrar no cuesta nada.
- **`VentanaDeSecreto` en archivo propio y no dentro de `pantalla-personas.tsx`** → se descartó
  dejarlo local (hoy es su único usuario) porque `pantalla-personas.tsx` ya tiene 656 líneas y
  el resto del panel sigue la convención de una ventana por archivo (`ventana-obra.tsx`,
  `ventana-viaje.tsx`, `ventana-material.tsx`…). Un archivo suelto es más fácil de encontrar que
  un componente enterrado en la mitad de una pantalla.
- **`ventana-viaje.tsx` se migra aunque ya funcione** → se descartó dejarla como estaba porque
  quedarían dos patrones para lo mismo, y el suyo es el caso más completo (validación local +
  campos del servidor + error general). Si el hook no le sirve, es que el hook está mal, y vale
  más saberlo en este cambio que en el siguiente.
- **`useListado.ejecutar` se queda intacto** → se descartó unificarlo con el hook nuevo. Hacen
  cosas distintas a propósito: `ejecutar` recarga el listado y pinta en la página, que es lo
  correcto para el formulario de alta; el hook pinta en la ventana. Fundirlos obligaría a que
  uno de los dos casos pasara un parámetro para desactivar la mitad del otro.

## Impacto en la sincronización

**Sin impacto en la sincronización.** No hay `pull`, ni `outbox`, ni `seq`, ni idempotencia, ni
reevaluación en el servidor: el cambio entero vive en el navegador y solo mueve de sitio
mensajes que el servidor ya mandaba.

## Contrato de API

**Sin cambios de contrato.** Ninguna ruta se añade, se quita ni cambia de forma, y la spec lo
pone en «Fuera de alcance»: «no cambia lo que el servidor responde, ni sus textos de rechazo».

Lo que ya existe y este cambio consume sin tocarlo:

- El servidor responde JSON incluso al fallar (`@/features/servidor/respuestas`), con `error` y
  opcionalmente `campos`. `cliente-api.ts` lo convierte en `ErrorApi`.
- El rechazo que destapó todo esto —017/RF-11, «Esa obra no lleva el módulo Almacén.»— sale de
  `PATCH /api/panel/personas/[id]` con 400. **Ya está bien**: lo que fallaba era que nadie lo
  pintaba donde se veía.
- `POST /api/panel/personas/[id]/clave` y `POST /api/panel/personas/[id]/activacion` siguen
  devolviendo el secreto una sola vez, sin guardarlo. Esa propiedad es lo que obliga a RF-31.

Las dos guardias y el alcance por obra siguen como están; no se toca ninguna ruta.

## Estrategia de verificación

**`scripts/verificar-reglas.ts`: no se añade ningún caso, y es correcto.** Este cambio no
introduce ni modifica una función pura —la spec ya lo dice en sus criterios de finalización— y
`verificar-reglas.ts` prueba reglas, no componentes. Inventar un caso aquí sería ruido. Los tres
comandos de la puerta de calidad se corren igual en cada tarea.

**Demo manual**, con el panel en `npm run web`. Cada recorrido nombra qué se debe ver:

1. **El fallo dentro de la ventana** (RF-25, RF-26). Personas → «Corregir» sobre un almacenista
   → cambiarle la obra a una que tenga Almacén apagado → Guardar. Se debe leer «Esa obra no
   lleva el módulo Almacén.» **dentro de la ventana**, con la ventana abierta y los datos
   intactos. Cambiar a una obra válida y guardar: cierra y la tabla se actualiza.
2. **El fallo de red** (RF-25). Con la ventana «Corregir» abierta, parar `npm run web` y
   guardar: «No se pudo contactar al servidor» dentro de la ventana.
3. **El campo señalado** (RF-27). Registrar un movimiento de almacén con un dato que el servidor
   rechace por campo: el motivo bajo ese campo y «Revise los campos marcados.» arriba.
4. **La confirmación que falla** (RF-25 sobre `Confirmacion`). Dar de baja algo que el servidor
   rechace: el motivo en la ventana de confirmación, que sigue abierta y deja reintentar.
5. **La contraseña temporal** (RF-28, RF-29, RF-31, RF-32). Personas → «Dar acceso» →
   confirmar. La ventana **no se cierra**: su contenido pasa a ser la contraseña, con el usuario
   y la advertencia. Pulsar Esc: no se cierra. Clic fuera: no se cierra. «Cerrar»: se cierra, y
   la contraseña no vuelve a verse.
6. **Los códigos** (RF-30, RF-31). Personas → «Códigos» sobre un operador: los dos códigos en
   una ventana, con el mismo comportamiento de cierre.
7. **Que no se rompió lo cumplido** (RF-1 a RF-6). Repetir una confirmación en Obras,
   Vehículos, Almacén y Cantera, cancelando en cada una.

**Comprobaciones extra:** ninguna. No se lee ningún secreto nuevo desde el cliente, así que no
hace falta el `grep` sobre `dist/client`; y no se añade ninguna ruta al operador, así que no hace
falta el `expo export`.

## Riesgos

- **Que una `<Confirmacion>` quede a medio migrar.** Son siete llamadas y el cambio de firma de
  `onConfirmar` las toca todas. *Se detecta:* `npm run typecheck` falla si una pasa una función
  síncrona donde ahora se espera una promesa — o sea, el compilador es la red. *Se revierte:*
  archivo por archivo; son independientes.
- **Que la ventana quede abierta al salir bien** donde antes se cerraba, porque el hook ya no
  cierra. Es el fallo más probable y el compilador **no** lo ve. *Se detecta:* paso 1 y paso 7
  de la demo, que es justo por lo que el paso 7 está ahí. *Se revierte:* una línea por ventana.
- **Que `soloBotonCierra` deje una ventana sin salida** si se pone donde no hay botón «Cerrar»
  visible. *Se detecta:* paso 5 de la demo. *Se mitiga:* la prop solo se usa en
  `VentanaDeSecreto`, y `Modal` siempre pinta su botón «Cerrar» en la cabecera.
- **Que se pierda el foco al cambiar de fase** en `VentanaDeSecreto`, porque el `Modal` de React
  Native Web atrapa el foco mientras está montado. El riesgo es bajo justamente porque el
  `Modal` **no se desmonta** entre fases —solo cambia su cuerpo—, que es otra razón para RF-32.
  *Se detecta:* paso 5, comprobando que Esc y el clic fuera no cierran y que «Cerrar» sí.
- **Que alguien lea el comentario viejo de `Confirmacion` y "arregle" el código de vuelta.**
  *Se mitiga:* reescribir ese comentario es una tarea explícita, no un detalle; y RF-7 queda en
  la spec marcado como reemplazado, con el motivo.
