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

  /* ── La marca de OCC ── */

  /**
   * Obras Civiles Colombianas: rojo, gris y negro.
   *
   * El rojo **no se usa para acciones**, y esa es la decisión importante de
   * todo este bloque. En esta aplicación el rojo ya significa otra cosa: un
   * equipo NO APTO, un botón que da de baja, un preoperacional anulado. Si la
   * barra y los botones principales fueran rojos, el rojo dejaría de alarmar
   * justo donde tiene que hacerlo, y este sistema existe para que una máquina
   * no salga a trabajar cuando no debe.
   *
   * Así que la identidad la carga el logotipo —que sí es rojo— y las acciones
   * van en el grafito del propio logotipo. El rojo se queda reservado.
   *
   * Estos tokens son **solo del panel**. La app del operador conserva los
   * suyos: su interfaz está calibrada para leerse con guantes y bajo el sol, y
   * la spec 005 declara el móvil fuera de alcance.
   */
  marcaRojo: '#D0322C',
  marcaGris: '#A6A6A6',
  /** El negro del logotipo. Es el color de las acciones del panel. */
  accion: '#231F20',
  accionPresionada: '#413C3D',
  /**
   * Fondo tenue del mismo grafito, para marcar lo activo **sin** una pastilla
   * sólida: el índice de secciones del parte diario (spec 006).
   *
   * Decía «para el enlace activo de la barra» y no era cierto: la barra usa
   * `accion` sólido, y con razón — entre siete enlaces, uno relleno se localiza
   * de un vistazo. En una columna de nueve entradas el relleno sólido sería una
   * hilera de manchas, así que ahí manda este.
   */
  accionSuave: '#F1F0F0',
  sobreAccion: '#FFFFFF',
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
