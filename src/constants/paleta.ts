/**
 * Los colores del sistema, sin nada de React Native.
 *
 * Están aquí y no en `theme.ts` por una razón concreta: el guion de verificación
 * corre en Node y no puede importar nada que arrastre `react-native` —el tema
 * usa `Platform` para las tipografías—. Sacar los colores a un módulo puro es lo
 * que permite **comprobar el contraste con una cuenta** en vez de mirarlo a ojo,
 * que es el ajuste que más fácil se rompe sin que nadie lo note.
 *
 * `theme.ts` los reexporta, así que ninguna pantalla cambia de import.
 */

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

export const Captura = { papel: '#FFFFFF', tinta: '#0F172A', visor: '#000000' } as const;

/**
 * Los colores del panel de administración. Spec 022.
 *
 * Crema, grafito y el amarillo de la maquinaria de obra, con egg.live como
 * referencia de estilo. Son **solo del panel**: la app del operador sigue con
 * `Colors` y `Marca`, calibrados para leerse con guantes y bajo el sol, y la spec
 * 022 la deja fuera (RF-34). Por eso el panel tiene aquí su propio texto y su
 * propia superficie, en vez de leer `Colors.light`, que es del celular.
 *
 * El amarillo es el **único** acento (RF-20) y va siempre de fondo, con grafito
 * encima: como color de letra sobre crema no llega ni a 2:1. El rojo, el verde y
 * el ámbar siguen siendo de `Estado` y solo dicen estados (RF-21).
 */
export const Panel = {
  /* ── Texto y superficies ── */

  /** El texto del panel. El grafito de egg, no el negro puro: cansa menos. */
  texto: '#1B1B1B',
  /**
   * Texto de apoyo: descripciones, etiquetas, celdas secundarias.
   *
   * Más oscuro que el `#8D877C` de egg a propósito: ese da 3,3:1 sobre el crema
   * y no alcanza el 4,5:1 que exige la spec. Este conserva el tono cálido.
   */
  textoApoyo: '#625C52',
  /** Tarjetas, tablas, ventanas y campos: lo que se apoya sobre el crema. */
  superficie: '#FFFFFF',
  /** El lienzo crema detrás de las tarjetas. */
  fondo: '#F7F5F2',
  /** Fondo de la fila de encabezados y de los bloques de formulario. */
  fondoCabecera: '#F0ECE8',
  /** Fila alterna de una tabla larga: el ojo no se salta de renglón. */
  fondoAlterno: '#FBFAF8',
  /** Fila bajo el cursor. Solo existe en escritorio: en el móvil no hay puntero. */
  fondoHover: '#EFEBE7',

  /* ── Líneas ── */

  /** Línea que separa filas y delimita campos. */
  borde: '#D2D2D2',
  /** Separación interna, más tenue: entre filas de una misma tabla. */
  bordeSuave: '#E7E2DD',
  /**
   * Anillo de foco del teclado. Navegar sin ratón tiene que verse.
   *
   * Grafito y no amarillo: un anillo amarillo sobre crema no llega a 3:1 y se
   * pierde justo cuando alguien lo está buscando.
   */
  foco: '#4C4B4B',
  /**
   * El fondo oscurecido detrás de una ventana emergente o del menú abierto
   * encima. Oscurece sin ocultar: se sigue viendo de dónde salió (spec 007, RF-25).
   */
  telon: 'rgba(27, 27, 27, 0.45)',

  /* ── Acciones y acento ── */

  /**
   * El color de las acciones: el botón principal es una píldora grafito.
   *
   * El rojo de la marca **no** se usa para acciones: en esta aplicación el rojo
   * dice NO APTO, da de baja, anula. Si los botones fueran rojos, el rojo dejaría
   * de alarmar justo donde tiene que hacerlo.
   */
  accion: '#1B1B1B',
  accionPresionada: '#353434',
  sobreAccion: '#FFFFFF',
  /**
   * El amarillo de maquinaria (RF-20). Marca lo activo —el módulo del menú— y
   * nada más: si todo es amarillo, nada lo es.
   */
  acento: '#FFCD00',
  /** El mismo amarillo, tenue: lo activo dentro de una columna, sin pastilla sólida. */
  acentoSuave: '#FFF4C2',
  /** Lo que va encima del amarillo. Siempre grafito: el blanco no se lee ahí. */
  sobreAcento: '#1B1B1B',

  /* ── La barra superior ── */

  /** La píldora flotante de arriba (RF-15). */
  barra: '#1B1B1B',
  /** El nombre del sistema y los botones de la barra. */
  textoBarra: '#F7F5F2',
  /** El cargo, debajo o al lado del nombre: se lee, pero no compite. */
  textoBarraApoyo: '#B5AFA5',
  /** El borde fino de los botones de la barra: el `#4C4B4B` de egg sobre grafito. */
  bordeBarra: '#4C4B4B',
  /** Un botón de la barra bajo el cursor: el grafito un punto más claro. */
  fondoBarraHover: '#353434',

  /* ── La marca de OCC ── */

  /**
   * Obras Civiles Colombianas: rojo, gris y negro. Los carga el logotipo, que no
   * cambia (spec 022, fuera de alcance); aquí quedan por si una pieza necesita
   * citarlo, nunca para acciones ni estados.
   */
  marcaRojo: '#D0322C',
  marcaGris: '#A6A6A6',
} as const;

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
