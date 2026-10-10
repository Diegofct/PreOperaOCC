/**
 * Las medidas del sistema de diseño: lo que es un número y no depende de nada.
 *
 * Está separado de `theme.ts` por una razón muy concreta y ya conocida en este
 * proyecto: **`scripts/verificar-reglas.ts` corre en Node**, y `theme.ts` abre
 * con `import '@/global.css'` y `import { Platform } from 'react-native'`, que
 * fuera de Metro no se resuelven. Por eso el guion llevaba el `1280` y el `16`
 * escritos a mano, con un comentario diciendo de dónde salían: no era descuido,
 * era esta limitación. Y un número escrito dos veces es un número que un día
 * deja de coincidir sin que nadie se entere.
 *
 * `paleta.ts` existe por exactamente lo mismo, para que la prueba de contraste
 * pueda importar los colores. Esto es el mismo movimiento con los números.
 *
 * **`theme.ts` lo reexporta entero**, así que nadie más tiene que cambiar de
 * import: se sigue escribiendo `from '@/constants/theme'` en toda la aplicación.
 *
 * Lo que **no** puede vivir aquí es lo que pregunta por la plataforma —`Fonts` y
 * `BottomTabInset`, que usan `Platform.select`—. Se quedan en `theme.ts`, que es
 * justo la frontera que este archivo existe para marcar.
 */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Medida de lectura: una columna de texto no debe pasar de aquí. */
export const MaxContentWidth = 800;

/**
 * Ancho útil del panel. Más que `MaxContentWidth`, que es medida de lectura.
 *
 * Calibrado contra la tabla más ancha que hay —personas, con seis columnas y
 * dos botones— en un portátil de 1366 px, que es el suelo realista de la
 * oficina de una obra.
 */
export const MaxContentWidthPanel = 1280;

/**
 * Grosores de línea. Spec 006.
 *
 * Estaban escritos a mano en todo el panel —una docena de `borderWidth: 1` y
 * algún `3` suelto para el anillo de foco— porque el tema no tenía dónde
 * ponerlos. Un grosor a mano es el mismo problema que un color a mano: el día
 * que haya que subirlos a 2 para una pantalla de más resolución, hay que
 * encontrarlos uno por uno.
 *
 * Lo nuevo los usa. **Migrar los usos viejos es un barrido aparte** y no entra
 * en esta spec: tocar diez archivos para cambiar un 1 por un token es la clase
 * de cambio que esconde un error de verdad entre el ruido.
 */
export const Grosor = {
  /** Divisorias, bordes de tabla, separadores. */
  linea: 1,
  /** El realce que marca algo: anillo de foco, borde izquierdo de un aviso. */
  marca: 3,
} as const;

/**
 * El índice lateral del parte diario. Spec 006 / RF-7.
 *
 * Nueve entradas con su rótulo, su glifo de estado y su conteo. Más estrecho no
 * deja sitio a «Fotografía del día» sin partirlo; más ancho se lo quita a las
 * tablas, que es lo escaso en esta pantalla.
 */
export const AnchoIndiceDeSecciones = 220;

/**
 * Por debajo de esto el índice deja de ser columna y sube encima del parte como
 * una tira horizontal. Spec 006 / RF-16.
 *
 * Desde la spec 022 se compara con el **ancho del contenido** (`anchoDelContenido`),
 * no con el de la ventana: con el menú lateral abierto, la ventana miente por 248.
 * El presupuesto de tablas del parte sale de aquí: a dos columnas, en el peor
 * caso, quedan 1000 − 220 − 24 − 48 = 708, y eso comprueba `verificar-reglas.ts`.
 *
 * Sube, **no desaparece**: es la única señal de qué falta para poder cerrar la
 * jornada, y esconderla justo en la pantalla pequeña es esconderla en la obra.
 */
export const AnchoMinimoDosColumnas = 1000;

/**
 * Alturas de los campos del panel.
 *
 * `altoAreaDeTexto` es el de las observaciones: da para **seis renglones
 * visibles** sin desplazarse (spec 007, RF-30). Menos que eso invita a escribir
 * una línea telegráfica, que es justo lo que no sirve para explicar por qué una
 * máquina estuvo parada. Empezó en cuatro (RF-24) y en el navegador se quedó
 * corto.
 */
export const CampoPanel = {
  alto: 38,
  // Seis renglones de 21 de alto, más el relleno y el borde del campo.
  altoAreaDeTexto: 146,
  /**
   * La lista de un selector, abierta. Da para unas seis opciones sin
   * desplazarse (spec 007, requisitos no funcionales).
   */
  altoListaSelector: 240,
  /**
   * Por debajo de esto no se abre hacia ese lado: dos renglones con barra de
   * desplazamiento no sirven para elegir (spec 007, RF-3).
   */
  altoMinimoListaSelector: 120,
} as const;

export const Radio = {
  sm: 8,
  md: 12,
  lg: 16,
  pastilla: 999,
} as const;

/** Separación mínima entre dos objetivos táctiles adyacentes. */
export const SeparacionTactil = 12;

/**
 * El menú lateral del panel. Spec 022.
 *
 * Abierto lleva ícono y nombre; «Reportes de WhatsApp», el rótulo más largo, cabe
 * sin partirse en un renglón con su ícono. Plegado deja solo el ícono, con el
 * margen justo para que la píldora del activo no toque los bordes.
 */
export const AnchoMenuAbierto = 248;
export const AnchoMenuPlegado = 72;

/**
 * Por debajo de esto el menú no se queda fijo abierto: va plegado y, al abrirlo,
 * se dibuja **encima** del contenido (spec 022, RF-12 y RF-13).
 *
 * Es el ancho desde el que la spec promete el panel completo con el menú abierto:
 * a 1280 quedan 984 de contenido, y con las columnas encogibles todas las tablas
 * caben. Más abajo, el menú abierto se comería lo que necesitan.
 */
export const AnchoMinimoMenuFijo = 1280;

/**
 * Por debajo de esto es un celular (spec 026, RF-33 a RF-41): el menú se esconde
 * detrás de un botón ☰, los formularios van en una columna y las tablas se desplazan
 * a lo ancho dentro de su marco.
 */
export const AnchoCelular = 768;

/** El ancho más angosto en el que la spec promete el panel completo (022, RNF). */
export const AnchoMinimoPanel = 1024;

/**
 * Lo que se come la barra de desplazamiento vertical de la pantalla. Spec 022.
 *
 * En Windows, que es lo que hay en la oficina de la obra, Chrome dibuja una barra
 * de 15 px que **sí ocupa** ancho. Medido en Chrome el 2026-10-06: a 1024 con el
 * menú plegado, el marco de una tabla medía 889 y no los 904 de la cuenta sin ella.
 */
export const AnchoBarraDesplazamiento = 16;

/**
 * Las pilas tipográficas del panel. Spec 022, RF-22 y RF-23.
 *
 * Los archivos los declara `src/features/panel/fuentes.css`; aquí solo va el
 * nombre con su respaldo, para que mientras carga —o si algo falla— se vea una
 * letra del sistema y no un hueco. Son cadenas y no dependen de la plataforma,
 * por eso viven aquí y no junto a `Fonts` en `theme.ts`.
 *
 * - `texto`: títulos, párrafos, celdas, campos. Todo lo que se lee.
 * - `rotulo`: botones, títulos de grupo del menú y cabeceras de tabla, siempre en
 *   mayúsculas y con `EspaciadoLetra.rotulo`.
 */
export const FuentePanel = {
  texto: "'Plus Jakarta Sans', system-ui, 'Segoe UI', sans-serif",
  rotulo: "'Space Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif",
} as const;

/**
 * Espaciado entre letras del panel. Spec 022.
 *
 * Los títulos grandes se aprietan un poco —a ese tamaño el espaciado normal se ve
 * flojo— y los rótulos en mayúsculas se abren, que es lo que los hace legibles a
 * 12 px. Son los valores de egg.live, escalados a nuestros tamaños.
 */
export const EspaciadoLetra = {
  titulo: -0.6,
  rotulo: 0.84,
} as const;

/**
 * Cuánto puede encogerse una columna de tabla del panel. Spec 022, RF-27.
 *
 * Con el menú lateral el contenido pierde hasta 248 de ancho, y las tablas
 * calibradas contra 1280 dejaban de caber. Cada columna parte de su `ancho` y,
 * si falta sitio, baja hasta este tanto por uno —partiendo el texto en dos
 * renglones— antes de que la tabla tenga que desplazarse. 0,65 deja la tabla
 * más ancha (1268) en 869 de 904, el contenido más angosto que la spec promete.
 */
export const EncogimientoColumna = 0.65;
