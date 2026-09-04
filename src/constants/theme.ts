/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Los colores del oficio, no del sistema.
 *
 * La hoja de una firma es blanca y la tinta oscura porque eso es lo que el
 * operador espera al firmar, y el visor de la cámara es negro para que la foto
 * mande y no el marco. No salen de `Marca` ni de `Colors` a propósito: cambiar
 * la identidad de la app no debería mover el papel bajo una firma ya hecha. Pero
 * sí viven en un solo sitio, que es lo que faltaba.
 */
export const Captura = { papel: '#FFFFFF', tinta: '#0F172A', visor: '#000000' } as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/* -------------------------------------------------------------------------
 * Superficie de escritorio: el panel de administración
 *
 * El panel no está sujeto a las restricciones de campo —nadie lo usa con
 * guantes ni bajo sol— pero sí a los mismos colores, para que un vehículo NO
 * APTO se vea igual de rojo en el computador del residente que en el celular
 * del operador. Lo único que necesita aparte son bordes: una tabla sin líneas
 * es ilegible, y el móvil no tiene tablas.
 * ---------------------------------------------------------------------- */

/**
 * Ancho útil del panel. Más que `MaxContentWidth`, que es medida de lectura.
 *
 * Calibrado contra la tabla más ancha que hay —personas, con seis columnas y
 * dos botones— en un portátil de 1366 px, que es el suelo realista de la
 * oficina de una obra.
 */
export const MaxContentWidthPanel = 1280;

export const Panel = {
  /** Línea que separa filas y delimita campos. */
  borde: '#D5D8DE',
  /** Separación interna, más tenue: entre filas de una misma tabla. */
  bordeSuave: '#E9EBEF',
  /** Fondo de la fila de encabezados y de los bloques de formulario. */
  fondoCabecera: '#F5F6F8',
  /** El lienzo detrás de las tarjetas. Da profundidad sin sombras pesadas. */
  fondo: '#F7F8FA',
  /** Fila alterna de una tabla larga: el ojo no se salta de renglón. */
  fondoAlterno: '#FBFCFD',
  /** Fila bajo el cursor. Solo existe en escritorio: en el móvil no hay puntero. */
  fondoHover: '#EEF3FA',
  /** Anillo de foco del teclado. Navegar sin ratón tiene que verse. */
  foco: '#93C5FD',
} as const;

/**
 * Escala tipográfica del panel, **distinta a la de campo y a propósito**.
 *
 * `Texto` está calibrado para leerse con guantes y a pleno sol, y por eso su
 * mínimo es 15 sp. Aplicado a una pantalla de escritorio deja todo del mismo
 * tamaño: un título, una etiqueta de tabla y un dato pesan visualmente igual, y
 * el resultado se ve plano y sin jerarquía por más orden que tenga.
 *
 * Aquí hay un rango de verdad —de 12 a 30— porque el residente mira esto a
 * medio metro, en interior, con un monitor. Es el mismo sistema, no otro: los
 * colores, los radios y el espaciado se comparten.
 */
export const TextoPanel = {
  /** Marcas de tabla, insignias, pies de tarjeta. */
  micro: 12,
  /** Etiquetas de campo, textos de apoyo, celdas secundarias. */
  apoyo: 13,
  /** El cuerpo: celdas, párrafos, botones. */
  cuerpo: 14,
  /** Encabezado de sección y nombre de fila destacado. */
  seccion: 17,
  /** Título de pantalla. */
  titulo: 26,
  /** La cifra grande de una tarjeta de resumen. */
  cifra: 30,
} as const;

/**
 * Elevación. Tres niveles y ni uno más.
 *
 * `boxShadow` y no las propiedades heredadas de sombra: es lo que funciona igual
 * en web y en nativo moderno. Se usan **en vez** de un borde, no encima: una
 * tarjeta con borde y sombra a la vez se ve sucia.
 */
export const Sombra = {
  /** Tarjetas y tablas apoyadas en el lienzo. */
  tarjeta: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
  /** Lo que se levanta al pasar el cursor. */
  elevada: '0 4px 12px rgba(16, 24, 40, 0.10)',
  /** Lo que flota sobre el resto: menús, diálogos, el desplegable del selector. */
  flotante: '0 12px 28px rgba(16, 24, 40, 0.18)',
} as const;

/** Duraciones. Que todo lo que se mueve en la app se mueva igual. */
export const Movimiento = {
  /** Respuesta a un gesto: pulsar, pasar el cursor. */
  rapido: 120,
  /** Aparecer y desaparecer. */
  base: 200,
} as const;

/* -------------------------------------------------------------------------
 * Sistema de diseño de campo
 *
 * El operador usa la app con guantes, bajo sol directo y a veces con una sola
 * mano. Todo lo de abajo está calibrado para eso, no para verse bien en el
 * simulador. Los valores de `Estado` y `Marca.primarioTexto` tienen un
 * contraste verificado de al menos 7:1 sobre blanco (WCAG AAA).
 * ---------------------------------------------------------------------- */

/** Colores semánticos. El color nunca es la única señal: siempre va con ícono. */
export const Estado = {
  /** Conforme ✓ */
  conforme: '#166534',
  conformeFondo: '#DCFCE7',
  /** No conforme ✕ */
  noConforme: '#991B1B',
  noConformeFondo: '#FEE2E2',
  /** No aplica – */
  na: '#4B5563',
  naFondo: '#F1F5F9',
  /** Advertencia: documento por vencer, mantenimiento próximo */
  atencion: '#92400E',
  atencionFondo: '#FEF3C7',
  /** Informativo */
  info: '#1E40AF',
  infoFondo: '#DBEAFE',
} as const;

export type EstadoColor = keyof typeof Estado;

export const Marca = {
  /** Fondo de acciones primarias. Ya es el color del splash. */
  primario: '#208AEF',
  /** Variante para texto sobre blanco (el primario no alcanza 7:1). */
  primarioTexto: '#0A4E92',
  primarioPresionado: '#0B5FB0',
  /** Fondo tenue del primario: pastillas, filas seleccionadas, avisos suaves. */
  primarioSuave: '#E7F1FD',
  /**
   * Lo que va **encima** de una superficie de color: texto, íconos, indicadores.
   *
   * Estaba escrito como `'#FFFFFF'` en doce sitios distintos. No es "blanco": es
   * "lo que contrasta con el primario o con el crítico", y el día que la marca
   * cambie a un color claro esto tiene que cambiar con ella, en un solo sitio.
   */
  sobreColor: '#FFFFFF',
  /** Reservado para lo que inmoviliza el vehículo. Si todo alerta, nada alerta. */
  critico: '#991B1B',
} as const;

/**
 * Áreas táctiles en dp. Un guante de carnaza deja un área de contacto de
 * 15–20 mm, muy por encima de los 48 dp que recomienda Material.
 */
export const Toque = {
  /** Mínimo absoluto para cualquier elemento interactivo. */
  minimo: 56,
  /** Acción primaria y opciones del selector de conformidad. */
  primario: 72,
  /** Botón de ícono aislado. */
  icono: 48,
  /** Tecla del teclado numérico de medidores. */
  tecla: 72,
  /** Obturador de la cámara. */
  obturador: 88,
} as const;

/**
 * Escala tipográfica en sp. Nunca bajar de `pie`: a pleno sol y con el
 * teléfono a un brazo de distancia, por debajo de 15 sp no se lee.
 */
export const Texto = {
  /** El suelo de la app de campo. Nada baja de aquí, insignias incluidas. */
  pie: 15,
  base: 18,
  etiqueta: 20,
  titulo: 24,
  /** Lecturas de horómetro y odómetro: son el dato que más se equivoca. */
  medidor: 32,
  /** El código del vehículo en el encabezado: lo primero que busca el operador. */
  titular: 34,
  /** La cifra sola de un resumen, legible de un vistazo a un brazo de distancia. */
  cifra: 40,
} as const;

export const Radio = {
  sm: 8,
  md: 12,
  lg: 16,
  pastilla: 999,
} as const;

/** Separación mínima entre dos objetivos táctiles adyacentes. */
export const SeparacionTactil = 12;
