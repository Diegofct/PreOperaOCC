/**
 * El tamaño de página de las tablas del panel y el recorte de una página (spec 025,
 * RF-55, RF-58). Puro, sin React: lo usan los dos ayudantes de listado y la
 * verificación.
 */

/**
 * Cuántas filas caben cómodas en pantalla sin obligar a hacer scroll largo. Eran
 * 25; con 15 la tabla entera se ve sin bajar tanto (spec 025, RF-55).
 */
export const POR_PAGINA = 15;

/**
 * La página `pedida` de unas filas, corregida si ya no existe: quien estaba en la 4
 * y filtra hasta dejar tres filas ve la 1 y no una tabla vacía.
 */
export function recortarPagina<T>(filas: readonly T[], pedida: number): { filas: T[]; pagina: number } {
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, pedida), paginas);
  const desde = (pagina - 1) * POR_PAGINA;
  return { filas: filas.slice(desde, desde + POR_PAGINA), pagina };
}
