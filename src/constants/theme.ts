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

/** Ancho útil de una tabla del panel. Más que `MaxContentWidth`, que es de lectura. */
export const MaxContentWidthPanel = 1180;

export const Panel = {
  /** Línea que separa filas y delimita campos. */
  borde: '#D5D8DE',
  /** Separación interna, más tenue: entre filas de una misma tabla. */
  bordeSuave: '#E9EBEF',
  /** Fondo de la fila de encabezados. */
  fondoCabecera: '#F5F6F8',
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
  pie: 15,
  base: 18,
  etiqueta: 20,
  titulo: 24,
  /** Lecturas de horómetro y odómetro: son el dato que más se equivoca. */
  medidor: 32,
} as const;

export const Radio = {
  sm: 8,
  md: 12,
  lg: 16,
  pastilla: 999,
} as const;

/** Separación mínima entre dos objetivos táctiles adyacentes. */
export const SeparacionTactil = 12;
