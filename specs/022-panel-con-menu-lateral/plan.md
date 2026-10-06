# Plan técnico — Spec 022

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que se encontró al leer el código

Tres hechos mandan sobre este plan:

1. **`Colors.light` lo comparten el panel y el celular.** Los once componentes de campo
   (`src/components/ui/`) y las pantallas del operador lo usan. Cambiar ahí el texto o el
   fondo cambiaría la app del celular, y RF-34 lo prohíbe. El panel tiene que dejar de leer
   `Colors.light` y pasar a tokens propios en `Panel`. Son 103 usos en 18 archivos.
2. **Las tablas tienen anchos fijos** (`width: columna.ancho`) y están calibradas contra
   `MaxContentWidthPanel = 1280`. Con el menú al lado, el contenido pierde su ancho. Este es
   el ancho de las ocho tablas más anchas:

   | Tabla | Ancho |
   | --- | --- |
   | `pantalla-almacen` | 1268 |
   | `pantalla-personas` | 1258 |
   | `listado-viajes` | 1249 |
   | `historial-almacen` | 1249 |
   | Bandeja de WhatsApp | 1244 |
   | `pantalla-preoperacionales` | 1244 |
   | `pantalla-vehiculos` | 1224 |
   | `pantalla-asignaciones` | 1192 |

   Ninguna cabe en una ventana de 1280 con el menú abierto (quedan 984 de contenido), y
   RF-27 no admite que se salgan. Las columnas tienen que poder encogerse.
3. **`expo-font` ya está instalado, pero hoy no hace falta.** `useFonts` registra una
   familia por archivo y no reconoce pesos. El panel usa `fontWeight` en 62 sitios, y con
   `useFonts` habría que cambiar cada uno por un nombre de familia distinto. Con
   `@font-face` en CSS, un solo nombre de familia lleva sus cinco pesos y los `fontWeight`
   siguen sirviendo tal cual.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `public/fuentes/*.ttf` + `OFL.txt` | Archivos nuevos. Plus Jakarta Sans en pesos 400, 500, 600, 700 y 800, y Space Grotesk en 500 y 600, con su licencia OFL. Son pesos estáticos, no variables. | RF-22, RF-23, RF-33 |
| `src/features/panel/fuentes.css` | Archivo nuevo. Un `@font-face` por archivo, con su `font-weight` y `font-display: swap`. Solo lo importa el layout del panel. | RF-22, RF-23, RF-33 |
| `src/constants/paleta.ts` | En `Panel` (ver «Algoritmo / reglas»):<br>• tokens nuevos: `texto`, `textoApoyo`, `superficie`, `acento`, `acentoSuave`, `sobreAcento`, `barra`, `textoBarra` y `textoBarraApoyo`;<br>• tokens existentes con valor nuevo: `fondo`, `borde`, `bordeSuave`, `fondoCabecera`, `fondoAlterno`, `fondoHover`, `foco`, `telon`, `accion` y `accionPresionada`;<br>• se retira `accionSuave`, que pasa a `acentoSuave`.<br>`Colors`, `Estado` y `Marca` no se tocan. | RF-20, RF-21, RNF |
| `src/constants/medidas.ts` | Tokens nuevos:<br>• `AnchoMenuAbierto` (248) y `AnchoMenuPlegado` (72);<br>• `AnchoMinimoMenuFijo` (1280) y `AnchoMinimoPanel` (1024);<br>• `EncogimientoColumna` (0,65);<br>• `EspaciadoLetra` (`titulo` -0,6 y `rotulo` 0,84);<br>• `FuentePanel` (`texto` y `rotulo`, cada una con su pila de respaldo).<br>Se retiran `AnchoLadoBarra` y `AnchoMinimoBarraCentrada`. | RF-12, RF-22, RF-23, RF-27 |
| `src/shared/rules/menu.ts` | Archivo nuevo, con reglas puras:<br>• `GRUPOS_DEL_MENU`;<br>• `gruposDelMenu(visibles)`, que quita los grupos vacíos;<br>• `regimenDelMenu({ ventana, preferencia })`, que devuelve `fijoAbierto`, `fijoPlegado` o `riel`;<br>• `anchoDelContenido(ventana, anchoMenu)`. | RF-3, RF-4, RF-8, RF-12 |
| `src/shared/rules/barra.ts` | Se elimina con su prueba. La barra ya no lleva módulos, así que la cuenta de si cabe en un renglón no tiene a quién servir. | RF-19 |
| `src/features/panel/modulos.ts` | Cada enlace gana su `icono`. Función nueva `moduloDeLaRuta(ruta)`: el módulo cuya ruta es prefijo de la actual, para que `/panel/laboratorio/abc` resalte Laboratorio. Hoy se compara con igualdad y no lo resalta. | RF-5, RF-6 |
| `src/features/panel/iconos.tsx` | Archivo nuevo. Íconos de línea dibujados con `react-native-svg`, que ya está en el proyecto:<br>• los once módulos;<br>• plegar y abrir el menú;<br>• cambiar contraseña y cerrar sesión. | RF-5, RF-9 |
| `src/features/panel/menu-lateral.tsx` | Archivo nuevo. Reemplaza a `barra-navegacion.tsx`:<br>• los grupos con su título;<br>• el enlace activo en una píldora amarilla con texto grafito en negrita y una barra a su izquierda;<br>• el botón de plegar;<br>• la etiqueta flotante del nombre cuando el menú está plegado;<br>• en el modo `riel`, el menú abierto va encima del contenido, con un telón, y se cierra al elegir un módulo. | RF-1 a RF-14 |
| `src/features/panel/estado-menu.tsx` | Archivo nuevo. Proveedor y hook del menú:<br>• guarda la preferencia en `localStorage` (clave `preoperaocc.menu`), con `try/catch` al leer y al escribir;<br>• lleva aparte el «abierto encima», que es momentáneo y no se guarda. | RF-8, RF-11, RF-13 |
| `src/features/panel/barra-superior.tsx` | Archivo nuevo. La píldora grafito:<br>• a la izquierda, el logo sobre su propio fondo claro y «Control de Obra»;<br>• a la derecha, el nombre · cargo, «Cambiar contraseña» y «Cerrar sesión»;<br>• el nombre se recorta con puntos suspensivos. | RF-15 a RF-19 |
| `src/features/panel/barra-navegacion.tsx` | Se elimina. Su lógica de cuenta se reparte entre la barra superior y el menú. | RF-19 |
| `src/app/panel/_layout.tsx` | La barra superior arriba y debajo una fila con el menú y el `Stack` sin encabezado. Envuelve todo en el proveedor del menú e importa `fuentes.css`. Añade el `Stack.Screen` de `whatsapp`, que hoy falta (su pestaña no lleva título). | RF-1, RF-15 |
| `src/features/panel/marco.tsx` | Fondo crema, título con `EspaciadoLetra.titulo` y relleno lateral `Spacing.four`. El ancho máximo sigue en `MaxContentWidthPanel`. | RF-25, RF-28 |
| `src/features/panel/componentes.tsx` | Todos los componentes comunes pasan a los tokens nuevos:<br>• `Boton`: píldora; el principal en grafito; el secundario transparente con borde fino; el peligro conserva el rojo de `Estado`; el texto en Space Grotesk, mayúsculas y espaciado;<br>• `Campo`, `Selector` y `SelectorDeHora`: etiqueta encima, radio `md` y foco grafito;<br>• `FilaDeFormulario`: alinea por arriba;<br>• `Tabla`: columnas encogibles (ver «Algoritmo / reglas») y títulos de columna en Space Grotesk;<br>• `Tarjeta`, `Seccion`, `Modal`, `Aviso`, `Etiqueta` y `Cifra`: radio `lg` y superficie blanca sobre crema. | RF-23 a RF-27 |
| `src/features/panel/pantalla-ingreso.tsx` | Tarjeta blanca centrada con el logo real (hoy es un cuadro con «OCC»), el título «Ingresar», los campos y el botón «Ingresar». | RF-29, RF-30 |
| `src/features/panel/pantalla-cambiar-clave.tsx` y `marco-sesion.tsx` | La misma tarjeta centrada. El indicador de carga va sobre el fondo crema. | RF-31 |
| `src/features/panel/secciones-con-indice.tsx` | El índice del parte decide entre una o dos columnas por el **ancho del contenido** (`anchoDelContenido`), ya no por el de la ventana. Con el menú abierto, la ventana miente. El activo pasa de `accionSuave` a `acentoSuave`. | RF-27 |
| Los otros 15 archivos del panel, incluidos `whatsapp/` y `src/features/laboratorio/` en sus pantallas del panel | Barrido mecánico:<br>• `Colors.light.text` pasa a `Panel.texto`;<br>• `textSecondary` pasa a `Panel.textoApoyo`;<br>• `background` pasa a `Panel.superficie`;<br>• cada estilo de texto lleva `fontFamily: FuentePanel.texto`, o `FuentePanel.rotulo` en las etiquetas de tabla y las insignias. | RF-20, RF-22, RF-28, RF-34 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver «Estrategia de verificación»). Se retira la prueba de `barraCabeEnUnRenglon`. | — |

## Modelo de datos

Sin cambios de esquema, ni en el celular ni en el servidor. La preferencia del menú vive en el
`localStorage` del navegador (RF-11).

## Algoritmo / reglas

**Grupos del menú** (`menu.ts`, RF-3 y RF-4):

```
GRUPOS_DEL_MENU = [
  { titulo: null,                modulos: ['inicio'] },
  { titulo: 'El día a día',      modulos: ['bitacoras', 'whatsapp', 'preoperacionales'] },
  { titulo: 'Módulos de obra',   modulos: ['almacen', 'cantera', 'laboratorio'] },
  { titulo: 'Administración',    modulos: ['obras', 'personas', 'vehiculos', 'asignaciones'] },
]
gruposDelMenu(visibles) = GRUPOS_DEL_MENU
  .map(g => ({ ...g, modulos: g.modulos.filter(m => visibles.includes(m)) }))
  .filter(g => g.modulos.length > 0)
```

Quién ve qué sigue saliendo de `modulosVisibles(rol, modulosDeObra)`, sin cambios (RF-2).
Una prueba exige que la unión de los grupos sea exactamente `MODULOS`. Así, un módulo nuevo
que no se ponga en ningún grupo hace fallar `verificar` y no desaparece del menú sin que nadie
lo note.

**Régimen del menú** (`menu.ts`, RF-8 y RF-12):

```
regimenDelMenu({ ventana, preferencia }):
  si ventana < AnchoMinimoMenuFijo (1280) → 'riel'        (RF-12)
  si preferencia === 'plegado'            → 'fijoPlegado' (RF-11)
  si no                                   → 'fijoAbierto' (RF-8: sin preferencia, abierto)
```

En `riel` el menú se ve plegado (72 de ancho). Al abrirlo se dibuja encima del contenido, con
el telón (RF-13), y se cierra al elegir un módulo o al tocar el telón (RF-14). Abrirlo en
`riel` **no** se guarda como preferencia: es un gesto del momento.

**Ancho del contenido** (`menu.ts`):

```
anchoDelContenido(ventana, anchoMenu) = min(ventana − anchoMenu − 2·Spacing.four, MaxContentWidthPanel)
```

Los dos peores casos que fija el RNF:

| Caso | Cuenta | Ancho que queda |
| --- | --- | --- |
| Menú abierto a 1280 | 1280 − 248 − 48 | 984 |
| Menú plegado a 1024 | 1024 − 72 − 48 | **904**, el suelo |

**Columnas encogibles** (`Tabla`, RF-27):

- Cada columna pasa de tener un ancho fijo a crecer o encogerse a partir de su ancho
  (`flexBasis: ancho`, `flexShrink: 1`). Nunca baja de su ancho mínimo.
- El ancho mínimo es `columna.anchoMinimo` o, si la columna no lo trae,
  `round(ancho × EncogimientoColumna)`. Una columna de botones que no deba encogerse lo
  declara igual a su `ancho`.
- El cuerpo de la tabla tiene como ancho mínimo la suma de los mínimos. El contenedor del
  desplazamiento horizontal toma el 100 % de su marco. Así la tabla llena su tarjeta cuando
  sobra sitio, se encoge cuando falta y solo se desplaza por debajo del mínimo, que la prueba
  impide que ocurra a 904.
- Cuentas con 0,65:
  - La tabla más ancha (1268, siete columnas) queda en 741 de columnas + 96 de separaciones
    + 32 de márgenes = 869 ≤ 904.
  - El parte diario a dos columnas tiene un suelo de 1000 − 220 − 24 − 48 = 708. Su tabla
    más ancha (962) queda en 664 ≤ 708.

**Colores** (`paleta.ts`, RF-20 y RF-21). Son valores de partida. Los fija la prueba de
contraste, no el ojo:

| Token | Valor | Nota |
| --- | --- | --- |
| `fondo` | `#F7F5F2` | Crema |
| `superficie` | `#FFFFFF` | |
| `fondoCabecera` | `#F0ECE8` | |
| `fondoAlterno` | `#FBFAF8` | |
| `fondoHover` | `#EFEBE7` | |
| `texto` | `#1B1B1B` | |
| `textoApoyo` | `#625C52` | El `#8D877C` de egg da 3,3:1 sobre crema y no alcanza 4,5:1 |
| `borde` | `#D2D2D2` | |
| `bordeSuave` | `#E7E2DD` | |
| `accion` | `#1B1B1B` | |
| `accionPresionada` | `#353434` | |
| `acento` | `#FFCD00` | |
| `acentoSuave` | `#FFF4C2` | |
| `sobreAcento` | `#1B1B1B` | |
| `barra` | `#1B1B1B` | |
| `textoBarra` | `#F7F5F2` | |
| `textoBarraApoyo` | `#B5AFA5` | |
| `foco` | `#4C4B4B` | Un anillo de foco amarillo sobre crema no llega a 3:1 y no se vería |
| `telon` | `rgba(27, 27, 27, 0.45)` | |

El amarillo se usa siempre **de fondo**, con grafito encima, nunca como color de texto.

## Decisiones técnicas

- **Tokens propios del panel en `Panel`, con el barrido de 18 archivos.** Se descartó cambiar
  `Colors.light`, porque la app del celular lo usa y RF-34 prohíbe tocarla. El barrido es
  mecánico, y una prueba nueva impide que vuelva un `Colors.light` al panel.
- **Fuentes con `@font-face` en un CSS del panel, servidas desde `public/fuentes/`.** Se
  descartó `useFonts` de `expo-font`: registra una familia por archivo sin peso, y habría que
  cambiar los 62 `fontWeight` del panel por cinco nombres de familia. Con `@font-face`, un
  nombre lleva todos sus pesos. Se descartó también Google Fonts por enlace: rompe RF-33 sin
  internet y saca una petición a un tercero en cada carga.
- **Pesos estáticos y no la fuente variable.** Un `@font-face` variable sin rango de pesos
  hace que el navegador sintetice la negrita, y se ve borrosa. Cinco y dos archivos pequeños
  no pesan.
- **`fontFamily` explícito en cada estilo de texto del panel.** Se descartó una regla de CSS
  global (`.panel [dir] { font-family }`): pelea por especificidad con las clases atómicas de
  React Native Web, y el día que gane la equivocada se pierde Space Grotesk en los botones sin
  que nadie lo note. Una prueba recorre los archivos del panel y exige `fontFamily` en todo
  estilo con `fontSize`.
- **Columnas encogibles con un mínimo, y no un ancho de ventana más alto.** Se descartó subir
  el RNF a 1366: la spec ya fijó 1280 y 1024. Se descartó también plegar el menú cuando una
  tabla no cabe, porque el menú dependería de la pantalla en la que se está y saltaría al
  navegar. A ancho completo las tablas se ven igual que hoy. Solo se aprietan, partiendo el
  texto en dos renglones, cuando falta sitio.
- **El logo va sobre su propio fondo claro dentro de la píldora grafito.** Se descartó
  invertirlo con un filtro: el «OBRAS» negro del logo desaparece sobre grafito, y la spec
  dice que el logo no cambia.
- **Íconos propios con `react-native-svg`.** Se descartaron `@expo/vector-icons` y Lucide por
  ser dependencias nuevas (constitución 8). También `expo-symbols`, que sirve los símbolos de
  Apple y no garantiza el mismo dibujo en el navegador. Son quince íconos de línea sencillos
  en un solo archivo.
- **La preferencia del menú en `localStorage`, leída después de montar.** Se descartó leerla
  en el primer render: el servidor pinta la página sin `window`, y una diferencia entre lo que
  pinta el servidor y lo que pinta el navegador produce un error de hidratación. El costo es
  que, con la preferencia «plegado», el menú se ve abierto un instante antes de plegarse.
  Se descartó guardarla en la base: la spec la deja en el navegador, y no justifica una
  columna nueva.
- **El cambio de contraseña sigue interponiéndose por encima del `Stack`**, como hoy
  (`MarcoSesion`). Solo cambia su apariencia (RF-31). Moverlo a una ventana dentro del panel
  cambiaría su comportamiento, y eso no está en la spec.

## Impacto en la sincronización

Sin impacto en la sincronización. Ni el celular ni la API cambian.

## Contrato de API

Sin endpoints nuevos ni cambiados.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - **Grupos por rol (RF-2 a RF-4):**
    - la gerencia ve los cuatro grupos y los once módulos;
    - el residente ve «Administración» solo con Asignaciones;
    - el almacenista ve un único grupo con Almacén;
    - el laboratorista y el encargado de planta, igual con su módulo;
    - en una obra con Control Cantera apagado, el grupo «Módulos de obra» del residente no
      lo trae;
    - la unión de `GRUPOS_DEL_MENU` es exactamente `MODULOS`, sin repetidos.
  - **Régimen (RF-8, RF-11, RF-12):**
    - a 1280 sin preferencia, `fijoAbierto`;
    - a 1280 con «plegado», `fijoPlegado`;
    - a 1279, `riel` con cualquier preferencia.
  - **`anchoDelContenido`:** 984 a 1280 con el menú abierto, 904 a 1024 en `riel` y el tope
    1280 en un monitor de 1920.
  - **`moduloDeLaRuta`:**
    - `/panel` da Inicio y `/panel/obras` da Obras;
    - `/panel/laboratorio/x/informe` da Laboratorio;
    - una ruta desconocida da nulo.
  - **Tablas (RF-27):** la prueba existente cuenta con **la suma de mínimos** frente a 904,
    frente a 708 en el parte diario, y sigue exigiendo al menos 10 tablas.
  - **Contraste (RNF):**
    - con 4,5:1:
      - `texto` y `textoApoyo` sobre `fondo`, `superficie`, `fondoCabecera` y
        `fondoAlterno`;
      - `sobreAccion` sobre `accion`;
      - `sobreAcento` sobre `acento` y sobre `acentoSuave`;
      - `textoBarra` y `textoBarraApoyo` sobre `barra`;
      - los estados de siempre;
    - con 3:1: `foco` sobre `fondo` y sobre `superficie`.
  - **Fuentes (RF-22, RF-23, RF-33):**
    - existen los siete `.ttf` y `OFL.txt` en `public/fuentes/`;
    - `fuentes.css` declara un `@font-face` por archivo con `url('/fuentes/…')`, no una URL
      externa;
    - todo estilo con `fontSize` en los archivos del panel lleva `fontFamily`.
  - **Frontera con el celular (RF-34):**
    - ningún archivo del panel usa `Colors.light`;
    - ningún archivo fuera del panel importa `fuentes.css` ni `menu-lateral`.
- **Demo manual en Chrome**: el recorrido de los siete pasos de la spec. En cada pantalla del
  panel, además:
  - la tipografía cargada (en DevTools, «Rendered Fonts» dice Plus Jakarta Sans);
  - en la pestaña Red, los `.ttf` responden 200 desde el propio servidor;
  - con la red desconectada después de cargar, las fuentes siguen;
  - se ve con la ventana a 1280 (menú abierto) y a 1024 (en `riel`), sin barra horizontal de
    página.
- **Comprobaciones extra**:
  - `npx expo export --platform web`, para confirmar que `public/fuentes/` llega a
    `dist/client/fuentes/` y que el CSS entra al paquete;
  - `git diff --stat` sobre `src/components/ui`, `src/features/(operador|checklists|auth)`
    y `src/app/(operador)`, que debe salir vacío (RF-34).

## Riesgos

- **Que Metro no resuelva o no copie el `url('/fuentes/…')` del CSS.** Se detecta en la demo:
  las fuentes no cargan y la pestaña Red muestra 404. Se revierte cargando con `useFonts` una
  familia por peso, y los `fontWeight` pasan a nombre de familia en las fuentes del tema. Es
  la tarea de fuentes la que lo comprueba primero, antes del barrido.
- **Que el `Stack` de Expo Router no se adapte dentro de una fila** (react-native-screens en
  la web). Se detecta en la primera tarea del marco, porque la pantalla queda sin altura o sin
  desplazamiento. Se revierte con `Slot` en lugar de `Stack`, porque el panel no usa
  transiciones. Los títulos de pestaña pasan entonces a `useTituloDeLaPestana` en cada ruta.
- **Tablas apretadas a 904 que se leen mal**, con demasiados renglones partidos. Se detecta en
  la demo, paso 6. Se arregla subiendo el `anchoMinimo` de esa columna, y la prueba dice si
  aún cabe.
- **Botones en mayúsculas más anchos** que rompan una columna de acciones. Se detecta en la
  demo. Se arregla declarando el `anchoMinimo` de esa columna igual a su `ancho`.
- **Un barrido de 18 archivos que cambie algo más que el color.** Se mitiga con un archivo por
  vez y con el `typecheck`. El barrido no toca la lógica: si un diff de una pantalla tiene
  algo más que estilos e imports, está mal hecho.
- **Destello del menú abierto** al cargar con la preferencia «plegado». Se acepta, ver la
  decisión de `localStorage`.
- **Descarga de las fuentes.** Hay que bajar los `.ttf` del repositorio oficial
  (`github.com/google/fonts`, carpeta `ofl/`). Se pide permiso antes de descargarlos, con el
  nombre y el tamaño de cada archivo.
