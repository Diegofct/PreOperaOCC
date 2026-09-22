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
