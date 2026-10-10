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

import { recortarPagina } from './paginas';
import { useParametroDeDireccion } from './usar-parametro-direccion';

export { POR_PAGINA, recortarPagina } from './paginas';

/**
 * Vuelve a la página 1 cuando cambia lo que se lista (spec 025, RF-57): un filtro o
 * una búsqueda nuevos traen otras filas, y quedarse en la página 3 de las de antes
 * no tiene sentido. Se mira en el render, como la corrección de la página, para no
 * pintar primero la página equivocada.
 */
function usePaginaQueVuelveAlCambiar(marca: string): [number, (p: number) => void] {
  const [pagina, setPagina] = useState(1);
  const [vista, setVista] = useState(marca);
  if (vista !== marca) {
    setVista(marca);
    setPagina(1);
  }
  return [pagina, setPagina];
}

export interface Paginado<T> {
  /** Las filas de la página. */
  pagina: T[];
  /** Cuántas filas hay en total. */
  total: number;
  paginaActual: number;
  irAPagina: (pagina: number) => void;
}

/**
 * Páginas de `POR_PAGINA` para una tabla sin buscador (spec 025, RF-56). Vuelve a la
 * página 1 cuando cambia lo listado (RF-57): cuando cambia cuántas filas hay, o
 * `filtros`, el texto de los filtros de la pantalla. Se mira un texto y no la lista
 * porque muchas pantallas la recalculan en cada render.
 */
export function usePaginacion<T>(filas: T[], filtros = ''): Paginado<T> {
  const [paginaActual, irAPagina] = usePaginaQueVuelveAlCambiar(`${filas.length}|${filtros}`);
  const recorte = recortarPagina(filas, paginaActual);
  return { pagina: recorte.filas, total: filas.length, paginaActual: recorte.pagina, irAPagina };
}

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
 * @param ordenar  el orden elegido en la tabla, si se puede ordenar (spec 015).
 *   Tiene que venir de `useCallback`: cambia de identidad solo cuando cambia el
 *   orden, y eso es lo que decide si se vuelve a ordenar.
 */
export function useListadoFiltrado<T>(
  filas: T[],
  textoDe: (fila: T) => (string | null | undefined)[],
  pasaFiltros: (fila: T) => boolean = () => true,
  ordenar?: (filas: T[]) => T[],
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
   * Se ordena la lista **entera** ya filtrada, y solo después se recorta la
   * página (spec 015, RF-15). Ordenar la página sola dejaría la 2 empezando otra
   * vez por la A, y el orden no serviría para encontrar a nadie.
   */
  const ordenadas = useMemo(
    () => (ordenar ? ordenar(coincidentes) : coincidentes),
    [coincidentes, ordenar],
  );

  /**
   * La página se corrige al vuelo en vez de con un efecto.
   *
   * Si alguien está en la página 4 y escribe una búsqueda que deja tres
   * resultados, la 4 ya no existe: sin esto vería una tabla vacía y creería que
   * no hay nada. Se calcula al pintar y no se guarda, que es lo que evita el
   * parpadeo de un efecto que corrige después de haber pintado mal.
   */
  // Un filtro de la pantalla que cambia lo que coincide vuelve a la página 1 (025/RF-57).
  // `pasaFiltros` cambia de identidad en cada render, así que se mira el resultado.
  const [coincidiaAntes, setCoincidiaAntes] = useState(coincidentes.length);
  if (coincidiaAntes !== coincidentes.length) {
    setCoincidiaAntes(coincidentes.length);
    setPaginaActual(1);
  }
  const { filas: recorte, pagina } = recortarPagina(ordenadas, paginaActual);

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
