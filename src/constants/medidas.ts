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
 * Lo que mide cada lado de la barra de navegación. Spec 006 / RF-1.
 *
 * El truco del centrado está aquí: **las dos columnas laterales —la marca y la
 * cuenta— comparten esta misma base**, así que el reparto del espacio sobrante
 * es simétrico y el bloque de enlaces queda centrado respecto a la barra, no
 * respecto al hueco que quede libre. Es lo que hace que se vea igual de centrado
 * con los cuatro módulos del residente que con los siete de la gerencia: el
 * centrado no depende de lo que mida el centro.
 *
 * El valor sale de la cuenta a 1280: 1232 de ancho útil, menos 32 de las dos
 * separaciones, menos los ~750 que ocupan siete enlaces, deja ~225 por lado. Si
 * algún día los enlaces envuelven a dos renglones, se baja este número — el
 * centrado no se rompe, solo crece el alto de la barra.
 */
export const AnchoLadoBarra = 224;

/** Por debajo de esto la barra pasa a dos renglones. Spec 006 / RF-3. */
export const AnchoMinimoBarraCentrada = 1100;

/**
 * El índice lateral del parte diario. Spec 006 / RF-7.
 *
 * Nueve entradas con su rótulo, su glifo de estado y su conteo. Más estrecho no
 * deja sitio a «Fotografía del día» sin partirlo; más ancho se lo quita a las
 * tablas, que es lo escaso en esta pantalla.
 */
export const AnchoIndiceDeSecciones = 220;

/**
 * Lo que le queda al parte cuando el índice se lleva su parte. **Derivado, no
 * escrito**: si mañana cambia el tope de página o el ancho del índice, esto se
 * mueve solo, y con ello el presupuesto de anchos de tabla que comprueba
 * `scripts/verificar-reglas.ts`. Escribir aquí un 1036 a mano sería garantizar
 * que un día los dos números dejen de cuadrar sin que nadie se entere.
 */
export const AnchoContenidoConIndice =
  MaxContentWidthPanel - AnchoIndiceDeSecciones - Spacing.four;

/**
 * Por debajo de esto el índice deja de ser columna y sube encima del parte como
 * una tira horizontal. Spec 006 / RF-16.
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
