/**
 * ¿Cabe la barra de navegación en un solo renglón? Función pura, sin I/O.
 *
 * Hasta la spec 008 la barra pasaba a dos renglones por un ancho fijo de ventana
 * (`AnchoMinimoBarraCentrada`), calibrado para los siete módulos de la gerencia.
 * Con Almacén y Control Cantera son nueve, y en una ventana ancha la fila no
 * cabía: `flexWrap` bajaba la cuenta a otro renglón y los enlaces quedaban
 * corridos a la derecha —visto en Chrome el 2026-09-15—, que es justo lo que la
 * spec 006 prohíbe (RF-2, RF-3). Un número fijo se vuelve a romper con el
 * siguiente módulo; esto se decide con lo que miden de verdad las piezas.
 *
 * El centrado de la barra exige que **los dos lados midan lo mismo** —el más
 * ancho de los dos manda—, así que la cuenta usa dos veces el mayor, no la suma.
 */

export interface MedidasDeBarra {
  /** El ancho útil de la fila, ya sin su relleno. */
  anchoDisponible: number;
  /** Lo que mide lo de dentro de la marca (logotipo y nombre). */
  marca: number;
  /** Lo que mide lo de dentro de la cuenta (persona y «Salir»). */
  cuenta: number;
  /** Lo que mide cada enlace de módulo. */
  enlaces: readonly number[];
  /** Separación entre enlaces. */
  separacionEnlaces: number;
  /** Separación entre cada lado y el bloque de enlaces. */
  separacionLados: number;
}

export function barraCabeEnUnRenglon(m: MedidasDeBarra): boolean {
  const enlaces =
    m.enlaces.reduce((total, ancho) => total + ancho, 0) +
    Math.max(m.enlaces.length - 1, 0) * m.separacionEnlaces;
  const lados = 2 * Math.max(m.marca, m.cuenta);
  return lados + enlaces + 2 * m.separacionLados <= m.anchoDisponible;
}
