# Tareas — Spec 022

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas y tokens

- [x] T1. `shared/rules/menu.ts`: `GRUPOS_DEL_MENU`, `gruposDelMenu`, `regimenDelMenu` y
      `anchoDelContenido`, con sus casos. Los tokens de medida que usan (`AnchoMenuAbierto`,
      `AnchoMenuPlegado` y `AnchoMinimoMenuFijo`) van en `medidas.ts`. (RF-2, RF-3, RF-4,
      RF-8, RF-11, RF-12)
      Hecho cuando: en verde estas comprobaciones:
      - **Grupos:**
        - la gerencia ve 4 grupos y 11 módulos;
        - el residente ve «Administración» solo con Asignaciones;
        - el almacenista, el encargado de planta y el laboratorista ven un solo grupo con su
          módulo;
        - en una obra con Control Cantera apagado, el residente no lo ve;
        - la unión de los grupos es exactamente `MODULOS`, sin repetidos.
      - **Régimen:**
        - a 1280 sin preferencia → `fijoAbierto`;
        - a 1280 con «plegado» → `fijoPlegado`;
        - a 1279 → `riel` con cualquier preferencia.
      - **Ancho del contenido:** 984, 904 y el tope de 1280 a 1920.

- [x] T2. Paleta del panel en `paleta.ts`:
      - los tokens nuevos de `Panel` (`texto`, `textoApoyo`, `superficie`, `acento`,
        `acentoSuave`, `sobreAcento`, `barra`, `textoBarra` y `textoBarraApoyo`);
      - los valores nuevos de los tokens existentes;
      - la prueba de contraste ampliada.

      Se conserva `accionSuave` hasta T9. `Colors`, `Estado` y `Marca` no se tocan.
      (RF-20, RF-21, RNF)
      Hecho cuando: la prueba de contraste está en verde con:
      - 4,5:1 para `texto` y `textoApoyo` sobre `fondo`, `superficie`, `fondoCabecera` y
        `fondoAlterno`;
      - 4,5:1 para `sobreAccion` sobre `accion`, `sobreAcento` sobre `acento` y sobre
        `acentoSuave`, y `textoBarra` y `textoBarraApoyo` sobre `barra`;
      - 3:1 para `foco` sobre `fondo` y sobre `superficie`.

      Además, `git diff` de `paleta.ts` no toca `Colors`, `Estado` ni `Marca`.

- [x] T3. Fuentes:
      - descargar los siete `.ttf` y `OFL.txt` a `public/fuentes/`, **con permiso previo**,
        diciendo el nombre y el tamaño de cada archivo;
      - `src/features/panel/fuentes.css` con un `@font-face` por archivo;
      - los tokens `FuentePanel` y `EspaciadoLetra` en `medidas.ts`;
      - el import del CSS en `src/app/panel/_layout.tsx`;
      - la prueba de archivos y de URL locales.

      Si el `url('/fuentes/…')` no carga, se aplica el respaldo del plan (`useFonts` con una
      familia por peso) **antes** de seguir. (RF-22, RF-23, RF-33)
      Hecho cuando:
      - `verificar` comprueba que existen los siete archivos y que el CSS solo apunta a
        `/fuentes/`;
      - en Chrome, la pestaña Red muestra los `.ttf` con 200 desde el propio servidor;
      - un texto con `fontFamily: FuentePanel.texto` aparece como Plus Jakarta Sans en
        «Rendered Fonts», en los pesos 400 y 800, sin negrita sintetizada.

- [x] T4. `iconos.tsx`: quince íconos de línea con `react-native-svg` (once módulos, plegar,
      abrir, contraseña y salir). Además, en `modulos.ts`, el ícono de cada módulo y la función
      `moduloDeLaRuta`, con sus casos. (RF-5, RF-6)
      Hecho cuando: en verde que `/panel` → inicio, `/panel/obras` → obras,
      `/panel/laboratorio/x/informe` → laboratorio y una ruta desconocida → nulo. El
      `typecheck` exige un ícono por módulo, gracias a `satisfies Record<Modulo, …>`.

## El marco

- [x] T5. `estado-menu.tsx`: el proveedor y el hook del menú, con:
      - la preferencia guardada en `localStorage` y leída después de montar, con `try/catch`;
      - el régimen calculado con `regimenDelMenu` y el ancho de la ventana;
      - el estado momentáneo «abierto encima».

      (RF-8, RF-11, RF-12, RF-13)
      Hecho cuando: los tres comandos están en verde, y una prueba de `verificar` con un
      `localStorage` falso que lanza excepción comprueba que la lectura devuelve «sin
      preferencia» sin romper.

- [x] T6. Layout nuevo y barra superior:
      - `barra-superior.tsx` (la píldora grafito con el logo sobre su fondo claro, «Control de
        Obra», nombre · cargo, «Cambiar contraseña» y «Cerrar sesión»);
      - `_layout.tsx` con la barra arriba y la fila menú + `Stack` sin encabezado, más el
        `Stack.Screen` de `whatsapp`;
      - se eliminan `barra-navegacion.tsx`, `shared/rules/barra.ts` y su prueba,
        `AnchoLadoBarra` y `AnchoMinimoBarraCentrada`;
      - en el hueco del menú va, de momento, `menu-lateral.tsx` con la lista plana de módulos
        visibles.

      (RF-1, RF-7, RF-15, RF-16, RF-17, RF-18, RF-19)
      Hecho cuando: en Chrome, como gerencia:
      - arriba se ve la píldora con el logo legible y «Diego · Gerencia» (o el nombre de la
        sesión);
      - a la izquierda están los 11 módulos y cada uno abre su pantalla;
      - ninguna pantalla pierde su desplazamiento vertical;
      - «Cambiar contraseña» abre su pantalla;
      - la barra superior no tiene módulos;
      - `grep` no encuentra `barra-navegacion` ni `barraCabeEnUnRenglon` en `src/` ni en
        `scripts/`.

- [x] T7. Menú lateral completo en modo fijo:
      - los grupos de `gruposDelMenu`, con su título en Space Grotesk y en mayúsculas;
      - el activo marcado con `moduloDeLaRuta`, en píldora `acento` con texto `sobreAcento`
        en negrita y una barra a su izquierda;
      - el botón de plegar y abrir;
      - en plegado, solo íconos y la etiqueta del nombre al pasar el puntero;
      - la preferencia se guarda.

      (RF-3 a RF-6, RF-9, RF-10, RF-11)
      Hecho cuando: en Chrome a 1440 de ancho:
      - se ven los cuatro grupos;
      - en `/panel/laboratorio/<id>`, Laboratorio está resaltado;
      - al plegar y recargar, el menú sigue plegado;
      - al pasar sobre un ícono plegado aparece su nombre;
      - al abrir y recargar, el menú sigue abierto.

- [x] T8. Modo `riel`:
      - por debajo de 1280 el menú va plegado;
      - al abrirlo se dibuja encima del contenido con el telón;
      - se cierra al elegir un módulo o al tocar el telón;
      - abrirlo en este modo no se guarda como preferencia.

      (RF-12, RF-13, RF-14)
      Hecho cuando: en Chrome a 1100 de ancho:
      - el menú aparece plegado aunque la preferencia sea «abierto»;
      - al abrirlo, el contenido no se mueve y queda tapado;
      - al elegir Obras se abre Obras y el menú se cierra;
      - al volver a 1440, el menú está como lo dejó la preferencia.

## Componentes

- [x] T9. `Tabla` con columnas encogibles (`flexBasis`, `flexShrink` y `anchoMinimo`, o
      `EncogimientoColumna`) y la prueba de anchos con la suma de mínimos frente a 904, y
      frente a 708 en el parte diario. Además:
      - `secciones-con-indice.tsx` decide entre una y dos columnas con `anchoDelContenido`;
      - su activo pasa a `acentoSuave`, y se retira `accionSuave`.

      (RF-27)
      Hecho cuando:
      - la prueba de anchos está en verde y sigue encontrando al menos 10 tablas;
      - en Chrome, a 1024 con el menú en `riel`, la tabla de Almacén y la bandeja de WhatsApp
        se ven enteras, con la columna de botones visible y sin barra horizontal;
      - a 1920 llenan su tarjeta.

- [x] T10. `componentes.tsx`, la parte de formularios:
      - `Boton` en píldora (principal grafito, secundario con borde fino, peligro con
        `Estado`), en Space Grotesk, mayúsculas y espaciado;
      - `Campo`, `Selector`, `SelectorDeHora`, `Casilla` y `EtiquetaDeCampo`, con la etiqueta
        encima y el foco grafito;
      - `FilaDeFormulario` alineada por arriba.

      Todos con los tokens `Panel.*` y `FuentePanel`. (RF-23, RF-24, RF-26)
      Hecho cuando: en Chrome, en el formulario de Personas y en el de un viaje de cantera:
      - los botones son píldoras;
      - las etiquetas van encima;
      - dos campos de una fila, uno con error y otro sin él, empiezan a la misma altura;
      - el foco con el tabulador se ve.

- [x] T11. `componentes.tsx`, el resto, y `marco.tsx`:
      - `Tabla` (cabecera en Space Grotesk, filas y bordes nuevos), `Tarjeta`, `Seccion`,
        `Modal`, `Aviso`, `Etiqueta`, `Cifra`, `Medidor`, `BarraDeListado`, `Paginacion` y
        `Confirmacion`;
      - `MarcoPantalla` con el fondo crema y el título espaciado.

      Al terminar, ningún `Colors.light` ni `fontSize` sin `fontFamily` queda en
      `componentes.tsx` ni en `marco.tsx`. (RF-20, RF-22, RF-23, RF-25, RF-28)
      Hecho cuando: en Chrome, Inicio, Obras y la bandeja de WhatsApp se ven en crema, con
      tarjetas blancas redondeadas, la cabecera de tabla en mayúsculas y los estados con sus
      colores de siempre.

- [x] T12. Inicio de sesión y cambio de contraseña:
      - `pantalla-ingreso.tsx` como tarjeta blanca centrada, con el logo real, el título
        «Ingresar», los campos y el botón «Ingresar»;
      - `pantalla-cambiar-clave.tsx` con la misma tarjeta;
      - `marco-sesion.tsx` con el indicador de carga sobre crema.

      (RF-29, RF-30, RF-31)
      Hecho cuando: en Chrome, sin sesión:
      - se ve la tarjeta centrada sobre crema;
      - con datos malos sale el aviso de error dentro de la tarjeta;
      - con los buenos se entra;
      - «Cambiar contraseña» desde la barra muestra la misma tarjeta, con «Cancelar».

## Barrido

- [x] T13. Prueba de frontera y barrido 1. La prueba nueva en `verificar` exige que:
      - ningún archivo del panel use `Colors.light`;
      - todo estilo con `fontSize` lleve `fontFamily`;
      - ningún archivo fuera del panel importe `fuentes.css`, `menu-lateral` ni
        `barra-superior`.

      Lleva una lista de archivos aún pendientes, que se vacía en T15. Se barren en esta
      tarea `detalle-preoperacional.tsx`, `pantalla-preoperacionales.tsx` y
      `ventana-de-secreto.tsx`. (RF-20, RF-22, RF-28, RF-34)
      Hecho cuando: la prueba está en verde con esos tres fuera de la lista de pendientes, y
      en Chrome un preoperacional NO APTO se sigue viendo en rojo con su ícono.

- [x] T14. Barrido 2: `pantalla-partes.tsx`, `secciones-con-indice.tsx`, `editor-horario.tsx`
      y `whatsapp/propuesta-reporte.tsx`. (RF-20, RF-22, RF-28)
      Hecho cuando: los cuatro están fuera de la lista de pendientes, y en Chrome un parte
      diario abierto y una propuesta de WhatsApp se ven con el diseño nuevo, con el índice y
      las faltas legibles.

- [x] T15. Barrido 3: `src/features/laboratorio/` (`pantalla-informe.tsx`,
      `tabla-tamices.tsx`, `curva-granulometrica.tsx` y `acciones-ensayo.tsx`) y lo que
      quede. La lista de pendientes queda **vacía** y se borra. (RF-20, RF-22, RF-28)
      Hecho cuando:
      - la prueba de frontera está en verde sin excepciones;
      - en Chrome, un ensayo y su informe se ven con las fuentes nuevas y el informe sigue
        imprimiéndose en blanco.

## Cierre

- [x] T16. Validación final: recorrido RF por RF de la spec y demo manual. Incluye:
      - los siete pasos de la demo, como gerencia, residente y almacenista;
      - la ventana a 1280 con el menú abierto y a 1024 en `riel`;
      - las fuentes sin red;
      - `npx expo export --platform web`, con `dist/client/fuentes/` presente;
      - la comprobación de que la app del celular no cambió: `git diff` vacío en
        `src/components/ui`, `src/features/operador`, `src/features/checklists`,
        `src/features/auth` y `src/app/(operador)` respecto al punto de partida de la spec.

      (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en
      verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- El trabajo de la spec 021 está sin commit en el árbol. Para que la comprobación de RF-34 de
  T16 tenga un punto de partida limpio, conviene hacer el commit de la 021 antes de empezar
  T1, o anotar aquí el commit o el estado desde el que se compara.

- **T1 (2026-10-06):** `src/shared/rules/menu.ts`, más los tokens `AnchoMenuAbierto`,
  `AnchoMenuPlegado`, `AnchoMinimoMenuFijo` y `AnchoMinimoPanel` en `medidas.ts`. Siete
  pruebas nuevas, 374 verificaciones. El almacenista, el encargado de planta y el
  laboratorista no tienen Inicio: su menú es un único grupo con su módulo.
- **T2 (2026-10-06):** `Panel` en `paleta.ts` con la paleta de crema, grafito y amarillo, y
  con sus tokens nuevos; `Colors`, `Estado` y `Marca` quedan intactos (comprobado con
  `git diff`).
  - Prueba de contraste nueva: el texto y el texto de apoyo sobre los cinco fondos, los
    botones, el amarillo, la barra y el foco a 3:1. Además comprueba que el amarillo no
    sirve como texto. Van 375 verificaciones.
  - Al cambiar los valores, el panel ya se ve con el lienzo crema y los botones grafito,
    aunque los textos sigan con `Colors.light` hasta el barrido.
- **T3 (2026-10-06):** las fuentes están en `public/fuentes/`.
  - **Archivos:** siete `.ttf` estáticos y dos licencias, `OFL-PlusJakartaSans.txt` y
    `OFL-SpaceGrotesk.txt`.
    - Plus Jakarta Sans sale de `tokotype/PlusJakartaSans`.
    - Space Grotesk sale de `floriankarsten/space-grotesk`.
    - Las licencias salen de `google/fonts`.
  - **Pesos:** Space Grotesk no publica un estático de peso 600. Se llevan el 500 y el 700,
    y los rótulos usan el 500. Esto cambia el «500 y 600» del plan.
  - **Carga:**
    - `fuentes.css` se importa en `src/app/panel/_layout.tsx`.
    - Expo lo mete en línea en el HTML que entrega el servidor (los siete `@font-face` van
      dentro de `/panel`).
    - `public/` se sirve en la raíz.
    - No hizo falta el respaldo con `useFonts`.
  - **Tokens:** `FuentePanel` (`texto` y `rotulo`) y `EspaciadoLetra`, en `medidas.ts`.
  - **Comprobado en Chrome:**
    - `document.fonts` tiene cargadas Plus Jakarta Sans en los pesos 400 y 800, y Space
      Grotesk en el 500;
    - Red muestra `PlusJakartaSans-Regular.ttf`, `PlusJakartaSans-ExtraBold.ttf` y
      `SpaceGrotesk-Medium.ttf` con respuesta 200;
    - el 800 lo dibuja el archivo ExtraBold, así que la negrita no es sintetizada.

    El navegador solo descarga los pesos que alguien usa.
  - 376 verificaciones.
- **T4 (2026-10-06):** `iconos.tsx` con quince íconos sobre una cuadrícula de 24 y trazo
  de 1,75: los once módulos, más plegar, abrir, clave y salir. También `moduloDeLaRuta` en
  `modulos.ts`.
  - **Desviación del plan:** el ícono **no** se guarda en `ENLACES_DE_MODULO`. El dibujo de
    cada módulo vive en `iconos.tsx`, con la clave del módulo y
    `satisfies Record<NombreDeIcono, ReactNode>`, así que un módulo sin ícono no compila.
    El motivo: `modulos.ts` lo importa `verificar-reglas.ts` desde Node, y si importara los
    íconos arrastraría `react-native-svg`.
  - `moduloDeLaRuta` busca por prefijo cortado en «/», así que `/panel/obrasx` → nulo.
  - 377 verificaciones.
- **T5 (2026-10-06):** el estado del menú, repartido en dos archivos.
  - **`preferencia-menu.ts`**, puro y probado desde Node: guarda la preferencia con la clave
    `preoperaocc.menu`, nunca lanza y no acepta valores ajenos.
  - **`estado-menu.tsx`:** `ProveedorMenu` y `useMenu`.
    - Lee la preferencia con `useSyncExternalStore`: el servidor ve «sin preferencia» y no
      hay error de hidratación ni `setState` dentro de un efecto. Esto cambia el «leída
      después de montar con un efecto» del plan.
    - Si el navegador no deja guardar, la elección queda en memoria durante la visita.
    - Mientras el ancho sea 0 (el primer pintado del servidor), supone una ventana ancha.
  - Todavía no está montado: entra al layout en T6.
  - 379 verificaciones.
- **T6 (2026-10-06):** primera parte visible: la barra superior, el menú lateral (de momento
  una lista plana) y el layout nuevo. Se eliminaron `barra-navegacion.tsx`,
  `shared/rules/barra.ts` con su prueba, `AnchoLadoBarra` y `AnchoMinimoBarraCentrada`. Van
  378 verificaciones.
  - **Tokens nuevos:** `Panel.bordeBarra` y `Panel.fondoBarraHover`, para los botones de la
    barra. Entran en la prueba de contraste.
  - **Ajustes sobre la marcha:**
    - **Íconos:** el `Svg` recibía las props nativas `accessibilityElementsHidden` e
      `importantForAccessibility`, y React avisaba en la consola. Ahora el `Svg` va dentro
      de un `View aria-hidden`.
    - **Rellenos del menú:** se recortaron (12, 14 y 12 de separación) para que «Reportes de
      WhatsApp» quepa en 248.
    - **Logo:** el dibujo es de 1,8:1, así que va a 80×44 sobre su pastilla blanca. Con
      120×38 y `contain` quedaba diminuto.
    - **Ícono de Obras:** pasó a ser un casco, porque el cono se confundía con el matraz de
      Laboratorio.
  - **Comprobado en Chrome:**
    - como residente (Natalia): 8 módulos;
    - como gerencia (Diego): 11 módulos, cada uno lleva a su ruta y la barra dice «Diego ·
      Gerencia»;
    - el desplazamiento vertical se conserva en Preoperacionales, con la barra y el menú
      fijos y sin desplazamiento horizontal de la página;
    - «Cambiar contraseña» abre su pantalla y «Cancelar» vuelve.
  - **La ventana de Chrome estaba en segundo plano** (`visibilityState: hidden`) y los clics
    simulados no navegaban. Se navegó con `a.click()` desde JS.
  - **Defecto aparte, fuera de esta spec:** los títulos de pestaña («Obras · Control de Obra
    OCC»…) **nunca se aplican**.
    - Expo Router 57 pasa `documentTitle: { enabled: false }` a su `NavigationContainer`
      (`node_modules/expo-router/build/ExpoRoot.js`), así que los `options.title` del
      `Stack` no llegan a `document.title`. Pasaba igual antes de T6.
    - Arreglarlo exige `<Head>` de `expo-router/head` en cada ruta, o un `useTituloDeLaPestana`
      por pantalla. Es un cambio de comportamiento: va como `/sdd:cambio` o spec aparte.
- **T7 (2026-10-06):** el menú lateral completo, en `menu-lateral.tsx`.
  - **Grupos:** `gruposDelMenu`, con títulos en Space Grotesk mayúscula. Plegado, una raya
    separa los grupos.
  - **Activo:** píldora `acento` con negrita y, además, una barra grafito al borde del menú.
    Es la señal que no depende del color.
  - **Botón «Plegar menú» / «Abrir menú»:** va al pie del menú, fuera de la lista, y lleva
    `accessibilityState.expanded`.
  - **Etiqueta del nombre en plegado:**
    - aparece al pasar el puntero y también al llegar con el tabulador;
    - se dibuja fuera del `ScrollView`, porque ahí dentro se recortaba;
    - se ubica con el `onLayout` del grupo más el del enlace, menos lo desplazado, y el
      menú sube a `zIndex` 10 mientras se ve.
  - La barra de desplazamiento del menú queda oculta: se comía 8 de ancho y volvía a cortar
    «Reportes de WhatsApp».
  - **Comprobado en Chrome a 1536:**
    - se ven los cuatro grupos;
    - `/panel/laboratorio/prueba-t7/informe` resalta Laboratorio;
    - al plegar se guarda `preoperaocc.menu = plegado`, y al recargar sigue plegado;
    - al pasar sobre el matraz aparece «Laboratorio» encima del contenido;
    - al abrir se guarda `abierto`, y al recargar sigue abierto.
  - **Pendiente para T15:** la impresión del informe de laboratorio. Su CSS de impresión
    oculta todo menos la hoja con `visibility`, lo que debería esconder también el menú y la
    barra nuevos. Se comprueba con un informe real.
- **T8 (2026-10-06):** el modo `riel`, para ventanas angostas.
  - **Cómo se arma:**
    - en `menu-lateral.tsx`, la columna reserva su ancho (72 en riel) y el menú de dentro,
      abierto encima, pasa a `position: absolute` con 248 de ancho y sombra flotante; la
      columna sube a `zIndex` 20;
    - `TelonDelMenu` va en el layout, sobre la pantalla, con `zIndex` 15;
    - al elegir un módulo cierra el menú a través del `onPress` del **`Link`**, porque
      `Link` llama primero al suyo y después navega (`BaseExpoRouterLink.js`).
  - **La ventana de Chrome estaba maximizada** y `resize_window` no la cambiaba (`innerWidth`
    seguía en 1536). Se probó con el panel dentro de un `iframe` de 1100 del mismo origen,
    que comparte la sesión, y ahí `useWindowDimensions` mide 1100.
  - **Comprobado:**
    - con la preferencia «abierto», a 1100 el menú aparece plegado;
    - al abrirlo queda encima: el título de la pantalla sigue en x = 96 antes y después, y se
      ve el telón;
    - al elegir Obras navega a `/panel/obras` y el menú se cierra;
    - al tocar el telón se cierra;
    - abrirlo y cerrarlo en riel no cambia la preferencia guardada («plegado»);
    - de vuelta a 1536, el menú respeta «plegado».

    Al terminar, la preferencia se dejó en «abierto», como estaba.
  - A 1100, la tabla de grupos de WhatsApp se sale por la derecha. Es el caso que arregla T9.
- **T9 (2026-10-06):** columnas encogibles.
  - **`columnas.ts`:** la función pura `anchoMinimoDeColumna`, que usan a la vez `Tabla` y
    la prueba. `Columna` gana `anchoMinimo?` y `EncogimientoColumna` vale 0,65.
  - **Cada columna:** `flexBasis: ancho`, `flexShrink: 1` y `flexGrow: 0`. No crece, para que
    con sitio de sobra la tabla se vea igual que antes.
  - **Contenedor:** el contenido mide el 100 % del marco, con `minWidth` igual a la suma de
    los mínimos.
  - **`Celda`:** pasa a 2 renglones por defecto, para que el texto se parta en vez de
    esconderse tras «…».
  - **Sorpresas:**
    - **`tablaCuerpo` tenía `flexGrow: 1` sin más.** React Native pone `flexShrink: 0` por
      defecto, así que el cuerpo medía lo que su contenido y nada se encogía. Pasa a
      `flex: 1`.
    - **La barra de desplazamiento vertical de Windows ocupa 15 px.** A 1024 con el menú
      plegado, el marco de una tabla medía 889 y no 904. Por eso `anchoDelContenido` resta
      ahora `AnchoBarraDesplazamiento` (16) y los peores casos pasan a 968 (1280 abierto) y
      888 (1024 en riel). Esto cambia los 984 y 904 del plan; la prueba de tablas cuenta
      contra 888.
    - **Columnas de botones:** los botones se apilan pero no se parten. Llevan `anchoMinimo`
      Personas (190, por «Cambiar mi contraseña», de 185) y Vehículos (112, por «Dar de
      baja», de 109). Para que Personas quepa en 888, cede Obra (`anchoMinimo` 96). La
      bandeja de WhatsApp lleva `anchoMinimo` 84 en Adjuntos, porque «ADJUNTOS» se partía a
      media palabra. **T10 y T11 cambian la letra de botones y cabeceras: hay que volver a
      medir estas columnas.**
  - **Índice del parte:** `secciones-con-indice.tsx` decide entre una y dos columnas con
    `anchoDelContenido(ventana, anchoReservado)`. Se retiró `AnchoContenidoConIndice`, que
    quedó sin uso, y `accionSuave` pasó a `acentoSuave` en el índice y en la opción elegida
    del selector.
  - **Comprobado en Chrome**, con un `iframe` de 1024 en riel:
    - Personas, Vehículos, Almacén, la bandeja de WhatsApp (2 tablas) y Asignaciones miden
      889/889 de marco y contenido, sin desplazamiento horizontal; la columna de botones se
      ve;
    - Almacén a 1280 mide 969/969;
    - a 1536 con el menú abierto, las tablas de WhatsApp miden 1225/1225 y llenan su
      tarjeta.
  - 379 verificaciones.
- **T10 (2026-10-06):** los controles de formulario.
  - **Botones:** en píldora (`Radio.pastilla`) y con el alto de un campo.
    - El principal va relleno de grafito y sin sombra.
    - El secundario y el de peligro son transparentes, con borde fino; el de peligro lleva
      el texto en `Estado.noConforme`.
    - La letra es Space Grotesk 500 de 12, en mayúsculas y con `EspaciadoLetra.rotulo`.
  - **Campos, selectores y casilla:**
    - `Radio.md`, superficie blanca y `Plus Jakarta Sans`;
    - la etiqueta, en 600 grafito;
    - la lista del selector, en `Radio.lg`.
  - **Foco:** `ANILLO_DE_FOCO` = franja blanca de 2 px más un aro grafito, de
    `Panel.foco`, hasta los 5 px.
  - **El botón empezó en 13 px con 20 de relleno** y las mayúsculas espaciadas lo
    ensanchaban un 20 %, lo que volvía a sacar las columnas de acciones a 1024. Se bajó a
    12 px con 16 de relleno, el tamaño de egg.live, y se volvieron a medir:
    - Personas → `anchoMinimo` 200, porque «Cambiar mi contraseña» mide 198; Obra cede
      hasta 88;
    - Vehículos → 120, porque «Dar de baja» mide 117;
    - bandeja → 90 en «abrir», porque «Revisar» mide 87; «Qué entendió la IA» cede hasta
      140;
    - grupos → 94 en «accion», porque «Cambiar» y «Asociar» miden 91.
  - **Comprobado en Chrome:**
    - a 1024, Personas, Vehículos, WhatsApp (las 2 tablas), Almacén, Asignaciones y Obras
      miden 889/889;
    - en el formulario de Personas y en el de un viaje de cantera, la ayuda bajo un campo
      no empuja a los de su fila, las etiquetas van encima y los botones son píldoras;
    - en el campo enfocado se aplican `border-color: #1B1B1B` y la sombra de dos anillos
      (leído en las reglas CSS).

    La animación del foco no avanza en Chrome con la pestaña oculta, pero eso es del
    entorno de prueba, no del panel.
  - El servidor de desarrollo volvió a quedar en **:8081**.
  - 379 verificaciones.
- **T11 (2026-10-06):** el resto de componentes y `MarcoPantalla`.
  - **Superficie común:** una constante `SUPERFICIE` (blanca, `Radio.lg`, borde fino
    `bordeSuave`, **sin sombra**) para tarjetas, formularios, tablas, cifras y medidores.
    La sombra queda solo para lo que flota: ventanas y listas. Es una decisión de estilo
    tomada al implementar, por el aire plano de egg.live.
  - **Letra:**
    - cabeceras de tabla y rótulos de cifra en Space Grotesk 500, mayúsculas y
      `EspaciadoLetra.rotulo`;
    - títulos con `EspaciadoLetra.titulo`;
    - avisos y confirmación con `Radio.lg` y franja de `Grosor.marca`.
  - **Sin restos:** ya no queda `Colors.light` ni `fontSize` sin `fontFamily` en
    `componentes.tsx` ni en `marco.tsx`, y los `placeholderTextColor` pasan a
    `Panel.textoApoyo`.
  - **Comprobado en Chrome:**
    - Inicio, con tarjetas planas sobre crema y los estados con su color (6 sin
      inspeccionar en rojo, 0 no aptos en verde);
    - Obras y la bandeja de WhatsApp, con cabeceras en mayúsculas e insignias;
    - la ventana «Registrar un viaje», cerrada sin guardar.
  - Los títulos propios de cada pantalla («Periodo», «Lo de hoy»…) siguen con su estilo
    hasta el barrido de T13–T15.
  - 379 verificaciones.
  - **Fuera de esta spec:** el 2026-10-06 apareció en la bandeja el grupo real
    «Berrio_Consorcio Magdalena Medio», sin obra y con 3 mensajes pendientes. Le toca al
    usuario asociarlo.
- **T12 (2026-10-06):** las pantallas de acceso.
  - **`tarjeta-de-acceso.tsx`:** un componente nuevo, `TarjetaDeAcceso`, con
    `SeparadorDeAcceso` y `PieDeAcceso`. Lo comparten el ingreso y el cambio de contraseña,
    para que no se separen (RF-31). Lleva:
    - la tarjeta blanca centrada sobre crema;
    - el logo real (116×64);
    - «CONTROL DE OBRA» en Space Grotesk;
    - el título centrado.
  - **Ingreso:** el título y el botón dicen «Ingresar» (antes «Entrar» y un cuadro con
    «OCC»), como pide RF-30; mientras espera dice «Ingresando…».
  - **Cambio de contraseña:** usa la misma tarjeta. Los botones «Guardar contraseña» y
    «Cancelar»/«Salir» van apilados a lo ancho.
  - **`marco-sesion.tsx`:** el indicador de carga va sobre crema.
  - **Sorpresa:** con la ventana a 639 de alto y el aviso de error puesto, la tarjeta era
    más alta que la pantalla y se cortaba sin poder desplazarse. El fondo pasó a ser un
    `ScrollView` con `flexGrow: 1`, que sigue centrado cuando cabe.
  - **Comprobado en Chrome:**
    - **Sin sesión:** se probó en un `iframe credentialless`, que abre la página sin
      cookies y sin cerrar la sesión del usuario. Se ve la tarjeta centrada.
    - **Datos inventados:** con «prueba-t12-inexistente» y una clave de prueba sale
      «Usuario o contraseña incorrectos» dentro de la tarjeta.
    - **Cambio de contraseña:** «Cambiar contraseña», desde la barra, muestra la misma
      tarjeta, y «Cancelar» devuelve al panel.
  - **Lo que no se probó a mano:** entrar con datos buenos, porque Claude no escribe
    contraseñas reales. La lógica de `ingresar` no se tocó. Queda para la demo de T16, con
    el usuario.
  - 379 verificaciones.
- **T13 (2026-10-06):** la frontera del panel y el primer barrido.
  - **Prueba «el panel usa sus propios colores y sus propias letras».** `archivosDelPanel()`
    recorre todos los `.tsx` de `src/features/panel/`, `src/app/panel/` y las pantallas de
    `src/features/laboratorio/`. Cuenta como falta:
    - usar `Colors.light`;
    - usar `Marca.`;
    - **cualquier objeto `{…}` con `fontSize` y sin `fontFamily`**, también los estilos
      en línea.

    `PENDIENTES_DEL_BARRIDO` lista los 8 archivos que faltan y solo puede achicarse: la
    prueba falla si uno de la lista ya cumple.
  - **Prueba «lo del panel no se cuela en el celular».** Ningún archivo fuera del panel
    importa `fuentes.css`, `menu-lateral`, `barra-superior`, `estado-menu` ni
    `tarjeta-de-acceso`.
  - **El barrido lo hace un script** (scratchpad `barrido.py`, reutilizable en T14 y T15):
    - cambia `Colors.light.*` por `Panel.*` y `Marca.critico` por `Estado.noConforme`;
    - añade `fontFamily`: `rotulo` si el texto va en mayúsculas, `texto` en el resto;
    - rehace el import del tema y reparte en varias líneas los estilos de más de 100
      caracteres.
  - **Barridos en esta tarea:** `detalle-preoperacional.tsx`,
    `pantalla-preoperacionales.tsx` y `ventana-de-secreto.tsx`.
  - **A mano:**
    - el fondo del detalle es `Panel.fondo`, porque es una página entera;
    - «◀ Volver a la lista» va en `Acciones`, porque a lo ancho la píldora se leía como una
      barra;
    - el «Cargando…» del detalle no tenía estilo y salía en la letra del sistema.
  - **Comprobado en Chrome**, con `?periodo=mes`:
    - el listado muestra «NO APTO · 1 ítem» en rojo, «APTO» en verde y «Con
      observaciones» en ámbar;
    - el detalle del NO APTO de la CAM-405 (2026-09-18) muestra la etiqueta roja,
      «1 ítem que inmoviliza el vehículo» y el hallazgo en su recuadro rojo.
  - **No se abrió la ventana de códigos de activación**, porque abrirla genera un código;
    su cambio fue mecánico y lo cubre la prueba.
  - 381 verificaciones.
- **T14 (2026-10-06):** el segundo barrido. Pasan `pantalla-partes.tsx`,
  `secciones-con-indice.tsx`, `editor-horario.tsx` y `whatsapp/propuesta-reporte.tsx`, que
  salen de `PENDIENTES_DEL_BARRIDO` (quedan 4, todos de laboratorio).
  - **`pantalla-partes.tsx` usa comillas dobles desde antes de esta spec** (ya venía así en
    `bf7c645`). El script no reconocía su import y lo dejó con `Colors`. Se arregló a mano
    respetando sus comillas, y `barrido.py` ahora acepta las dos.
  - **Comprobado en Chrome**, sin guardar nada:
    - el parte del 2026-10-03 de «Pruebas spec 018» va a dos columnas a 1536: índice con
      marcas y conteos, «Abierto» en ámbar, la marca «Desde WhatsApp» y «Guardar» en
      píldora;
    - la propuesta pendiente PRUEBA-T20, abierta con «Revisar», muestra «La IA pide
      revisar…» y la falta del ítem 9.9.9 en rojo con ✕, bajo su fila.
  - 381 verificaciones.
- **T15 (2026-10-06):** el tercer y último barrido.
  - **Archivos de laboratorio:** `acciones-ensayo.tsx`, `curva-granulometrica.tsx`,
    `pantalla-informe.tsx` y `tabla-tamices.tsx`.
  - **`PENDIENTES_DEL_BARRIDO` se borró:** la prueba de frontera exige ahora a **todos**
    los archivos del panel, sin excepciones.
  - **A mano en la curva:**
    - la línea del ensayo pasa de `Marca.primario` (el azul del celular) a `Panel.texto`
      (grafito); los límites siguen en ámbar discontinuo y azul punteado;
    - los textos del SVG pasan de `Fonts.sans` a `FuentePanel.texto`.
  - **Imports:** un ajuste a `barrido.py` rompió su expresión, y los imports del tema de
    tres archivos se arreglaron a mano.
  - **Comprobado en Chrome** con el ensayo aprobado No. 12 (`01a0d8d7…`):
    - el ensayo muestra «Aprobado», «✓ CUMPLE», sus campos de solo lectura y la curva, con
      los textos del SVG en Plus Jakarta Sans;
    - **impresión:** sin abrir el diálogo, que bloquearía la pestaña, se copió el `@media
      print` del informe como estilo normal. Solo se ve la hoja, en blanco y arriba a la
      izquierda; la barra superior, el menú lateral y los botones quedan en
      `visibility: hidden`.
  - 381 verificaciones.
- **T16 (2026-10-06):** la validación final, en `validacion.md`.
  - **Comprobado:**
    - los 34 RF en verde y los tres comandos en verde;
    - `expo export` correcto, con las fuentes en `dist/client/fuentes/` y sin secretos en
      `dist/client`;
    - `git diff bf7c645` vacío en todo lo del celular.
  - **Demo:**
    - D1, hecha: cerrar sesión y entrar como Diego;
    - D2 y D3, hechas por el usuario: residente y roles de un solo módulo;
    - D4, cubierta por la prueba de anchos y las mediciones a 1024, porque el servidor estaba
      demasiado lento para el recorrido visual completo.
  - **Spec 022 Cumplida.**

## Correcciones posteriores al cierre (2026-10-06)

Tres defectos anteriores a la 022, pedidos por el usuario antes de la fase 5. No cambian
el comportamiento acordado en ninguna spec: lo devuelven a lo que ya decían. Cada uno lleva
su prueba en `verificar` (384 verificaciones).

1. **Fotos del parte diario visibles desde otra obra**, en `src/app/api/panel/media/[id]+api.ts`.
   - **Causa:** las fotos del día cuelgan de `partes_de_obra` con el tipo `bitacora`, pero la
     ruta las buscaba en la tabla vieja `bitacoras`. No las encontraba, quedaban «sin obra»,
     y `alcanzaLaObra` deja pasar lo que no tiene obra.
   - **Arreglo:**
     - `duenoDeLaImagen` busca primero en `partes_de_obra` y luego en `bitacoras`, y dice si
       el dueño existe;
     - una regla nueva, `alcanzaLaImagen` en `alcance.ts`, no deja ver a nadie fuera de
       gerencia una imagen cuyo dueño no aparece;
     - el tipo `documento`, que hoy nada crea, queda solo para gerencia.
2. **Un cuerpo que no es JSON respondía 500**, en `src/features/servidor/respuestas.ts`.
   `cuerpoJson` lanza ahora `CuerpoNoJson`, y `responder` lo convierte en un 400 con su
   motivo. Corrige las 42 rutas que usan `cuerpoJson`.
3. **Los títulos de pestaña nunca se aplicaban**, porque Expo Router 57 lleva `documentTitle`
   apagado.
   - **Arreglo:** `tituloDeLaPestana(ruta)` en `modulos.ts`, que es pura y tiene su prueba, y
     un componente `TituloDeLaPestana` en el layout del panel.
   - Se quitaron los `Stack.Screen` con `title`, que no tenían efecto, para que el título viva
     en un solo sitio.
