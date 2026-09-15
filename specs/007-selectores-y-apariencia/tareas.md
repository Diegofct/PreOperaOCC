# Tareas — Spec 007

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas puras

- [x] T1. `filtrarOpciones` en `shared/rules/texto.ts` y `colocarLista` en
      `shared/rules/flotante.ts`, con sus casos. (RF-3, RF-12, RF-13, RF-14)
      Hecho cuando: en verde que «camion» encuentra «Camión», que el detalle también cuenta,
      que sin coincidencias devuelve vacío, que la lista va abajo si cabe, arriba si no cabe
      abajo y sí arriba, y que su alto se recorta al espacio.

## La capa flotante

- [x] T2. `CapaFlotante` sobre el `Modal` transparente de React Native. (RF-1, RF-2, RF-8)
      Hecho cuando: los tres comandos en verde y, en Chrome, un contenido de prueba pintado en
      la capa queda por encima de la barra de navegación y se cierra con Esc.

- [x] T3. `Modal` del panel sobre `CapaFlotante`: telón a pantalla completa, ventana centrada
      y con desplazamiento interno. (RF-25, RF-26)
      Hecho cuando: en Vehículos, con la página desplazada al fondo, «Corregir» sale centrada,
      entera y con toda la pantalla oscurecida.

## El selector

- [x] T4. La lista del `Selector` en `CapaFlotante`, colocada con `colocarLista`, cerrando con
      clic fuera, rueda y Esc, y con «✓» en la elegida. (RF-1 a RF-8, RF-15)
      Hecho cuando: en Actividades la lista de actividad queda por encima de «Añadir
      actividad», en Asignaciones se ven las tres opciones de vehículo, y el filtro Estado de
      Vehículos al fondo de la pantalla se abre hacia arriba.

- [x] T5. Teclado y filtro del `Selector`: flechas, Enter, foco de vuelta y campo de filtro con
      más de ocho opciones. (RF-9 a RF-14)
      Hecho cuando: en Personas, con el tabulador hasta «Cargo», se abre, se baja con flechas,
      se elige con Enter y el foco vuelve al botón; escribir «topo» deja solo «Topógrafo».

## Formularios

- [x] T6. `Campo`: `obligatorio` en la etiqueta, filas alineadas arriba, alturas del tema y área
      de texto de seis renglones. (RF-16, RF-17, RF-23, RF-30)
      Hecho cuando: en la segunda línea de una actividad, Área, Volumen y Observaciones tienen
      las etiquetas a la misma altura, y seis renglones de observaciones no muestran barra.

- [x] T7. Parte diario: errores dentro de su sección, «Equipo» de solo lectura, observaciones
      de actividad, notas y motivos en área de texto, índice sin cortar y fuera los `zIndex`
      descendentes. (RF-6, RF-27, RF-28, RF-29, RF-30)
      Hecho cuando: el rechazo de «Cerrar el parte» se lee dentro de la sección de cierre,
      «Control Calidad de Obra» se lee entero en el índice y «Equipo» no se deja escribir.

- [x] T8. Resto de pantallas: fuera los parches de `zIndex`, obligatorios marcados y una sola
      acción principal por formulario (Obras, Personas, Vehículos, Asignaciones,
      Preoperacionales y las dos ventanas). (RF-6, RF-17, RF-18, RF-19, RF-20)
      Hecho cuando: `grep zIndex src/features/panel` solo encuentra la capa flotante, y en cada
      formulario hay un único botón oscuro.

- [x] T9. Validación final: recorrido RF por RF de la spec y demo en Chrome. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en
      verde y la spec queda marcada como Cumplida.
      *Recorrido el 2026-09-15; cerrada tras T10 y la corrección de RF-16.*

- [x] T10. *(Añadida tras T9.)* Errores del servidor debajo de su campo: el rechazo por
      duplicado dice qué campo falló, y las altas y correcciones de Obras, Vehículos, Personas
      y Asignaciones pintan bajo cada campo los errores por campo que ya trae `ErrorApi`.
      (RF-18)
      Hecho cuando: en verde el caso que traduce cada índice único a su campo, y en Chrome
      registrar una obra con un código que ya existe muestra «Ya existe una obra con ese
      código.» debajo de «Código».

## Validación (T9) — 2026-09-15

En Chrome, con la sesión de gerencia y la pestaña al frente, sin guardar nada. El servidor de
desarrollo se había caído y se volvió a levantar para la demo, con su salida descartada (Expo
imprime el `.env`). Los tres comandos quedaron en verde en T8 y no se tocó código después.

| RF | Veredicto | Cómo |
| --- | --- | --- |
| 1 | ✅ | «Añadir máquina» abierta queda sobre Personal; lista de actividad sobre «Añadir actividad» (T4) |
| 2 | ✅ | Estado dentro de «Corregir VOL-01» sobresale de la ventana y se ve «No apto» (T4) |
| 3 | ✅ | Filtro Estado de Vehículos y «Resultado» de Preoperacionales se abren hacia arriba |
| 4 | ✅ | Con la lista de personas abierta, pulsar «Añadir tramo» solo la cierra: no añade el tramo |
| 5 | ✅ | La rueda fuera de la lista la cierra (T4) |
| 6 | ✅ | Un solo componente de desplegable en el panel; probado en bitácora, Asignaciones, Vehículos, ventana, Personas y Preoperacionales |
| 7 | ✅ | Clic fuera cierra sin cambiar el valor (RF-4) |
| 8 | ✅ | Esc cierra; dentro de una ventana cierra solo la lista (T4) |
| 9 | ✅ | Foco de vuelta al botón tras elegir, registrando los eventos de foco (T5) |
| 10, 11 | ✅ | Flechas y Enter en Cargo de Personas (T5) |
| 12, 13 | ✅ | Buscador en Cargo (16 opciones); «topo» → «Topógrafo» (T5 y guion) |
| 14 | ✅ | «grua» → «Ninguna opción coincide con «grua».» (T5) |
| 15 | ✅ | «✓» en la opción elegida |
| 16 | ✅ con reparo | Campos y selectores de Vehículos: 38 de alto y radio 8. **La spec incluye el área de texto en «misma altura», y RF-30 le da seis renglones**: las dos frases chocan. Se tomó RF-30 como la que manda; hay que corregir RF-16 con `/sdd:cambio` |
| 17 | ✅ | Asterisco rojo en «Código interno» y «Tipo de equipo»; veinte campos marcados (T8) |
| 18 | ⚠️ **Parcial** | Debajo del campo salen los errores que valida la pantalla (nombre vacío, contraseña corta o que no coincide). Los que rechaza el servidor —un código repetido, por ejemplo— siguen saliendo en el aviso de arriba: el servidor ya devuelve el campo, pero ninguna pantalla lo usa |
| 19 | ✅ | Una acción principal por formulario; ya se cumplía (T8) |
| 20 | ✅ | Botones y opciones se resaltan bajo el puntero; las filas de tabla no se pulsan, así que no aplica a ellas |
| 21 | ✅ | Solo cambia el panel; los tokens nuevos del tema son aditivos y el celular no los usa |
| 22 | ✅ | Ni API ni esquema tocados en esta spec |
| 23 | ✅ | Etiquetas de una fila a la misma altura, también con ayuda debajo (T6); Maquinaria y Vehículos en pantalla |
| 24 | ✅ | Ampliado por RF-30 |
| 25, 26 | ✅ | «Corregir» centrada, entera y con la pantalla oscurecida con la página al fondo (T3) |
| 27 | ✅ | «Control Calidad de Obra» entero en el índice, en dos renglones |
| 28 | ✅ | El rechazo del cierre sale dentro de su sección y una sola vez (T7) |
| 29 | ✅ | «Equipo» y «Persona»: `readOnly` y fondo gris frente al blanco de los editables |
| 30 | ✅ | Observaciones de máquina y de actividad, notas y motivo: `rows` 6, 144 de alto |

**Veredicto inicial: la spec no quedaba Cumplida.** Veintinueve RF en verde; RF-18 parcial y
RF-16 con una contradicción de redacción. Lo que falta:

1. **RF-18**: llevar debajo de cada campo los errores por campo que ya devuelve el servidor
   (`errorDeValidacion` responde `campos`). Es una tarea nueva, T10.
2. **RF-16**: quitar «área de texto» de la lista de misma altura, con `/sdd:cambio`.

**Encontrado de paso y fuera de esta spec**: en el parte, la lista de «Añadir persona» muestra
el cargo como slug («residente_1», «operador») en vez de su nombre; Asignaciones sí usa
`nombreDeCargo`. Es un incumplimiento de 004/RF-20 (`pantalla-partes.tsx`, `detalle: p.cargo`).

## Notas de ejecución

- El orden de arriba no es estético: la capa flotante (T2) es de lo que dependen la ventana
  (T3) y el selector (T4), y retirar los `zIndex` (T7, T8) antes de T4 volvería a romper las
  listas que hoy sí se ven.
- **T1**: además de `filtrarOpciones`, quedó `ofreceBusqueda(n)` en `texto.ts` para que el
  umbral de ocho viva en un solo sitio. `colocarLista` recibe todas las medidas —separación,
  margen, alto mínimo— desde quien la llama: la regla no importa el tema. Una prueba mía
  esperaba que «camion» encontrara solo la volqueta; también encuentra «Camioneta», y eso es
  lo correcto, así que se corrigió la prueba y no la regla.
- **T2**: `src/features/panel/capa-flotante.tsx`, sobre el `Modal` transparente de React
  Native, con telón `oscuro` (ventanas) o `transparente` (listas). El color del telón pasó a
  `Panel.telon` en `constants/paleta.ts`; el `Modal` del panel todavía usa el suyo escrito a
  mano hasta T3. Comprobado en Chrome con una prueba **temporal** en Inicio (visible solo con
  `?capa=1`): la caja quedó por encima de la barra de navegación, el telón oscureció la
  pantalla entera y Esc la cerró. La prueba se retiró restaurando el archivo desde una copia;
  `git diff` de `pantalla-inicio.tsx` sale vacío.
- **T3**: el `Modal` se pinta en `CapaFlotante` con telón oscuro; ya no queda ningún color
  del telón escrito a mano. El cuerpo va en un `ScrollView` con `flexShrink: 1`, así que un
  formulario largo se desplaza por dentro y la cabecera con «Cerrar» no se va. Comprobado en
  Chrome: con Vehículos desplazada al fondo, «Corregir VOL-01» salió centrada, entera y con
  la barra también oscurecida; Esc la cerró y el foco volvió al botón «Corregir».
- **Efecto temporal de T3, lo resuelve T4**: dentro de la ventana, la lista de un selector
  queda recortada por el borde de la zona desplazable. Visto en Chrome con «Estado»: «No apto»
  no se ve. Pasa porque la lista todavía se pinta dentro del formulario; T4 la lleva a la
  capa flotante. **No desplegar entre T3 y T4.** *(Resuelto en T4, comprobado en Chrome.)*
- **T4**: el `Selector` mide su botón al abrir (`measureInWindow`) y pinta la lista en
  `CapaFlotante` con `colocarLista`; hacia arriba se ancla por abajo para no dejar hueco si la
  lista es corta. Cierra con clic fuera, Esc, rueda fuera de la lista (escucha en `window`,
  solo en web) y al redimensionar. Las opciones van en `OpcionDeLista` con «✓» en la elegida.
  Medidas nuevas en `CampoPanel`: `altoListaSelector` (240) y `altoMinimoListaSelector` (120).
  Se retiraron del `Selector` el `campoAbierto` con `zIndex: 10` y el telón de 4000 px.
  Comprobado en Chrome, sin guardar nada:
  · Actividades: la lista queda encima de «Añadir actividad», con «✓» en Excavación; elegir
    Nivelación la cambia y cierra; la rueda fuera la cierra.
  · Asignaciones: se ven CAM-405, EXC-01 y VOL-01 por encima de la tabla; Esc cierra.
  · Vehículos, filtro Estado al fondo de la pantalla: abre hacia arriba con sus cinco opciones.
  · Ventana «Corregir VOL-01»: la lista de Estado sobresale de la ventana y se ve «No apto»;
    Esc cierra solo la lista y la ventana sigue abierta.
- Los `zIndex` descendentes de bandas y filas (`apilado`) siguen en el código: ya no hacen
  falta para las listas, pero se retiran en T7 y T8, como estaba planeado.
- **T5**: el botón del `Selector` lleva `accessibilityRole="button"` (Enter y espacio lo
  abren) y su etiqueta como nombre accesible. Flechas y Enter se escuchan en `window` mientras
  la lista está abierta; la marcada se lleva a la vista con `scrollIntoView`, y el puntero
  marca la misma opción que el teclado. Con más de ocho opciones sale un buscador con
  `filtrarOpciones`; sin coincidencias dice «Ninguna opción coincide con «…»».
- **Sorpresa de T5: el foco no volvía al botón.** El `Modal` de React Native Web guarda el
  elemento enfocado para devolverlo al cerrar, pero lo guarda **después** de haber movido el
  foco adentro, así que al cerrarse lo devuelve a un elemento que ya no existe y el foco acaba
  en `<body>`. Un `focus()` en el mismo gesto de cerrar tampoco sirve, porque la trampa de foco
  sigue activa. Se resolvió con `alTerminarDeCerrar` en `CapaFlotante` (el `onDismiss` del
  `Modal`), que corre cuando la capa ya se quitó. Comprobado en Chrome registrando los eventos
  de foco: tras elegir con Enter, `focus()` sobre el botón «Cargo», elemento activo «Cargo», y
  el tabulador sigue a «Acceso».
- Comprobado en Chrome, en Personas y sin registrar a nadie: tabulador hasta Cargo, Enter
  abre con buscador, flecha abajo marca «Director» y Enter lo elige (Acceso propone «Residente
  / Director»); «topo» deja solo «Topógrafo»; «grua» muestra el aviso de sin coincidencias; Esc
  cierra.
- **T6**: `filaFormulario` alinea por arriba. `Campo` y `Selector` aceptan `obligatorio`, que
  pinta « *» en rojo y hace que el lector de pantalla diga «obligatorio», con una etiqueta común
  (`EtiquetaDeCampo`). El área de texto pasa a seis renglones (`numberOfLines` 6 y
  `CampoPanel.altoAreaDeTexto` 146). La propiedad existe pero **todavía nadie la usa**: marcar
  los obligatorios de cada pantalla es de T8.
- Comprobado en Chrome **midiendo con JavaScript**, porque la pestaña quedó en segundo plano
  (`document.visibilityState` «hidden») y las capturas no respondían. En una actividad recién
  añadida y sin guardar, las etiquetas de la primera línea miden 696 y las de la segunda
  (Área, Volumen, Observaciones) 772, **también con la ayuda «Largo × ancho» visible** tras
  escribir 3, 4 y 0,5 (área 12, volumen 6). El motivo de «Ese día no se trabajó», con seis
  renglones escritos: `rows` 6, alto 144, contenido 144, sin barra. No se pudo abrir un selector
  por JavaScript con la pestaña oculta (medir en pantalla espera a que se pinte), así que las
  observaciones de máquina se miden en T7, cuando pasen también a seis renglones. Nada se
  guardó: la página se recargó para descartarlo.
- **T7**: cada sección del parte guarda su error en estado propio y `SeccionEnMarco` lo pinta
  arriba de su cuerpo (prop `error`); el aviso de arriba de la página queda para cargar el día.
  En Clima la variable se llama `errorAlGuardar`, porque `error` ya era el de las franjas.
  «Equipo» y también «Persona» —el mismo caso en Personal, que RF-29 cubre— van con
  `soloLectura`. Observaciones de actividad, notas del día y motivo de anulación pasan a
  `multilinea`. El rótulo del índice ya no lleva `numberOfLines={1}`. Se retiraron el `zIndex`
  de las bandas, el del pie y los cinco `apilado` de las filas del parte; el comentario que
  explicaba el parche se conserva dentro de `SeccionEnMarco` y se corrigió el de
  `IDS_DE_SECCION`.
- Comprobado en Chrome **midiendo con JavaScript** (pestaña otra vez en segundo plano), sin
  guardar nada: «Control Calidad de Obra» entero en el índice (sin recorte, dos renglones);
  notas del día y observaciones de una actividad nueva con `rows` 6 y 144 de alto; pulsar
  «Cerrar el parte» con el parte vacío deja el rechazo **dentro** de la sección de cierre y
  una sola vez. **Sin comprobar en pantalla**: «Equipo» y «Persona» de solo lectura y las
  observaciones de máquina, porque añadir una fila exige abrir un selector y con la pestaña
  oculta no se abre. Queda para la validación final (T9).
- `FilaDeFormulario` todavía acepta `apilado`, porque lo usan otras pantallas: se retira en T8.
  *(Retirado en T8.)*
- **T8**: fuera `apilado` de `Seccion` y de `FilaDeFormulario`, el `zIndex` de la barra de
  listado, el del formulario y los tres de Preoperacionales (`apilado={1}`, `dias`, `filtro`).
  `grep zIndex` sobre `src/features/panel` y `src/app/panel` ya no encuentra ningún uso, solo
  menciones en comentarios que explican por qué se retiró. Obligatorios marcados según lo que
  exige cada contrato: Obras (código, nombre), ventana de obra (nombre), Vehículos (código
  interno, tipo), ventana de vehículo (código interno), Personas (usuario, nombre completo) y su
  ventana (nombre completo), Asignaciones (vehículo, operador), Llantas (posición), Ingreso
  (usuario, contraseña), Cambiar contraseña (los tres campos), anular preoperacional (motivo) y
  el parte (motivo de anulación, por qué no se trabajó): veinte en total. Cargo y Acceso de
  Personas no se marcan: el cargo es opcional en el contrato y el acceso siempre tiene valor.
- **Una sola acción principal por formulario (RF-19) ya se cumplía**: se revisaron los botones
  sin `tono` de cada pantalla. Donde hay más de uno —las secciones del parte, Asignaciones,
  Personas, Llantas— cada uno cierra un formulario distinto. No se cambió ningún botón.
- **Sin comprobación en Chrome**: la extensión dejó la pestaña en una página interna del
  navegador tres veces seguidas y no se insistió. Lo visual de T8 —asteriscos, listados sin
  parches— se revisa en la validación final (T9), con la pestaña visible.

### Cierre de la validación — 2026-09-15

- **RF-16**: corregido en la spec (`/sdd:cambio`): la altura común es la de los campos de una
  línea, y el área de texto se rige por RF-30.
- **RF-18 → ✅ con T10.** `duplicadoDe` (en `features/servidor/respuestas.ts`, con su caso en el
  guion) traduce cada índice único al campo del contrato, y `responder` devuelve `campos` también
  en el 409. `useListado.ejecutar` guarda los errores por campo y arriba deja «Revise los campos
  marcados.»; `errorDe(campo)` los pinta bajo Código de obra, Nombre de obra, Código interno y
  Usuario. La ventana «Corregir» de vehículo pinta el código repetido debajo de su campo, porque
  el aviso de la página quedaría detrás del telón. Comprobado en Chrome: registrar una obra con
  «OBR-001», que ya existe, dejó «Ya existe una obra con ese código.» debajo de «Código», el
  campo en rojo, «Revise los campos marcados.» arriba, y la lista con una sola obra: la base
  rechazó el duplicado y no se creó nada.
- **004/RF-20, arreglado de paso**: la lista «Añadir persona» del parte usa `nombreDeCargo`.
  Comprobado en Chrome: «Pedro Cartagena · Operador», «Tatiana Carreño · Residente 1».
- **Precisiones de T10**: RF-22 sigue en pie (no se modifica ningún dato), pero la respuesta del
  servidor sí cambió —de forma aditiva—, así que la superficie API queda marcada en la spec.
  **Asignaciones no se tocó**: su único rechazo de ese tipo («Esa persona ya tiene ese vehículo
  asignado») es de la combinación de los dos campos, no de uno, y se queda arriba.
- `npm run verificar` (134), `npm run typecheck` y `npm run lint` en verde.

**Veredicto final: los 30 RF en verde. Spec 007 Cumplida.**
