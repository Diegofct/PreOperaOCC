/**
 * Cuántos registros hay en cada estado de una lista (spec 050, RF-48, RF-52).
 *
 * Las cifras de encima de una lista cuentan **toda** la lista que cumple la búsqueda y los demás filtros,
 * no la página que se ve: con páginas de 15, contar la página diría «4 pendientes» cuando hay 40. Y no
 * aplican el filtro de estado mismo: si ya se filtró por «Pendiente», las otras cifras siguen diciendo
 * cuántas hay en su estado, que es lo que deja pasar de una a otra.
 *
 * La búsqueda es la misma de `useListadoFiltrado` —sin tildes ni mayúsculas, en los mismos campos— y por
 * eso vive aquí, en un solo sitio: si la lista y sus cifras buscaran distinto, las cifras dirían un número
 * que la lista no enseña. Sin React ni Expo, para que la verificación, que corre en Node, la pruebe.
 */
import { normalizar } from '@/shared/rules/texto';

/** Si alguno de los textos contiene lo buscado, sin tildes ni mayúsculas. Sin búsqueda, sí. */
export function coincideConBusqueda(textos: readonly (string | null | undefined)[], busqueda: string): boolean {
  const buscado = normalizar(busqueda);
  if (buscado.length === 0) return true;
  return textos.some((campo) => Boolean(campo) && normalizar(campo as string).includes(buscado));
}

export function contarPorEstado<T>(
  filas: readonly T[],
  {
    textoDe,
    estadoDe,
    busqueda,
    pasaOtrosFiltros = () => true,
  }: {
    textoDe: (fila: T) => (string | null | undefined)[];
    estadoDe: (fila: T) => string;
    busqueda: string;
    /** Los filtros de la pantalla menos el de estado. */
    pasaOtrosFiltros?: (fila: T) => boolean;
  },
): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const fila of filas) {
    if (!pasaOtrosFiltros(fila) || !coincideConBusqueda(textoDe(fila), busqueda)) continue;
    const estado = estadoDe(fila);
    conteo[estado] = (conteo[estado] ?? 0) + 1;
  }
  return conteo;
}
