/**
 * Buscar, filtrar y paginar un listado, en un solo sitio.
 *
 * Cuatro pantallas necesitan lo mismo, y escrito cuatro veces acabaría siendo
 * cuatro cosas distintas: una que busca sin tildes y otra que no, una que
 * reinicia la página al filtrar y otra que deja al usuario mirando una página
 * vacía sin saber por qué.
 *
 * ── Se filtra en el navegador, no en el servidor ──
 *
 * Decisión deliberada y con fecha de caducidad. Los listados del panel se piden
 * enteros y son de cientos de filas, no de cientos de miles: filtrar aquí es
 * instantáneo, no añade un viaje por cada letra tecleada y no obliga a tocar
 * seis endpoints. Cuando una obra tenga varios miles de preoperacionales, esto
 * se lleva al servidor —y el sitio donde hacerlo es este archivo, no las
 * pantallas—.
 *
 * Lo que se busca vive en la dirección de la página, pero eso ya no se resuelve
 * aquí: lo hace `usar-parametro-direccion`, que el periodo de los
 * preoperacionales usa igual.
 *
 * ── Sobre las tildes ──
 *
 * Buscar «topografo» tiene que encontrar a «Topógrafo». En una obra nadie
 * escribe con tildes en un buscador, y un buscador que exige escribirlas es un
 * buscador que no se usa.
 */
import { useMemo, useState } from 'react';

import { normalizar } from '@/shared/rules/texto';

import { useParametroDeDireccion } from './usar-parametro-direccion';

/** Cuántas filas caben cómodas en pantalla sin obligar a hacer scroll largo. */
export const POR_PAGINA = 25;

export interface ListadoFiltrado<T> {
  /** Lo que se pinta: ya buscado, filtrado y recortado a la página. */
  pagina: T[];
  /** Cuántas filas hay en total, antes de buscar y filtrar. */
  total: number;
  /** Cuántas pasan la búsqueda y los filtros. */
  coincidencias: number;
  busqueda: string;
  buscar: (texto: string) => void;
  paginaActual: number;
  irAPagina: (pagina: number) => void;
}

/**
 * @param filas  el listado completo, tal como llegó del servidor
 * @param textoDe  de qué campos de cada fila se puede buscar
 * @param pasaFiltros  los filtros propios de la pantalla, si tiene alguno
 */
export function useListadoFiltrado<T>(
  filas: T[],
  textoDe: (fila: T) => (string | null | undefined)[],
  pasaFiltros: (fila: T) => boolean = () => true,
): ListadoFiltrado<T> {
  // La búsqueda vive en la dirección: recargar no la pierde y el enlace se puede
  // pasar. El ayudante es el mismo que usa el periodo de los preoperacionales.
  const [busqueda, setBusqueda] = useParametroDeDireccion('buscar', '');
  const [paginaActual, setPaginaActual] = useState(1);

  const coincidentes = useMemo(() => {
    const buscado = normalizar(busqueda);
    return filas.filter((fila) => {
      if (!pasaFiltros(fila)) return false;
      if (buscado.length === 0) return true;
      return textoDe(fila).some((campo) => campo && normalizar(campo).includes(buscado));
    });
    // `textoDe` y `pasaFiltros` se definen en el cuerpo de la pantalla y cambian
    // de identidad en cada render; incluirlas recalcularía siempre. Lo que de
    // verdad decide el resultado son las filas, el texto y los filtros, y esos
    // sí están.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, busqueda, pasaFiltros]);

  /**
   * La página se corrige al vuelo en vez de con un efecto.
   *
   * Si alguien está en la página 4 y escribe una búsqueda que deja tres
   * resultados, la 4 ya no existe: sin esto vería una tabla vacía y creería que
   * no hay nada. Se calcula al pintar y no se guarda, que es lo que evita el
   * parpadeo de un efecto que corrige después de haber pintado mal.
   */
  const paginas = Math.max(1, Math.ceil(coincidentes.length / POR_PAGINA));
  const pagina = Math.min(paginaActual, paginas);

  const desde = (pagina - 1) * POR_PAGINA;
  const recorte = coincidentes.slice(desde, desde + POR_PAGINA);

  return {
    pagina: recorte,
    total: filas.length,
    coincidencias: coincidentes.length,
    busqueda,
    buscar: (texto: string) => {
      setBusqueda(texto);
      setPaginaActual(1);
    },
    paginaActual: pagina,
    irAPagina: setPaginaActual,
  };
}
