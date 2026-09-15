/**
 * Las unidades en que se lleva un material del almacén (spec 009, RF-31).
 *
 * **Lista cerrada, sin «Otra».** Lo decidió OCC: con la unidad escrita a mano, el
 * mismo cemento acaba en «bulto», «bultos» y «Bto», y el almacén deja de poder
 * compararse consigo mismo. Si falta una unidad, se añade aquí y se despliega.
 *
 * No son las del control de calidad del parte (`catalogos/bitacora.ts`): allí la
 * unidad va pegada a cada material de una lista fija, y aquí el almacenista
 * registra sus propios materiales y elige con qué se miden. Juntarlas obligaría a
 * que cualquier unidad nueva del almacén apareciera en el parte.
 *
 * Está en `catalogos/` y no en un enum de la base por lo mismo que los cargos
 * (spec 002): el slug es lo que se guarda, y añadir una unidad no debe costar una
 * migración de tipo.
 */

export interface DefinicionUnidad {
  /** Slug estable. Es lo que se guarda; no se renombra ni se reutiliza. */
  id: string;
  /** Como se elige en el formulario: «Metro cúbico». */
  nombre: string;
  /** Lo que va detrás de una cantidad: «2,5 m³», «70 bultos». */
  abreviatura: string;
}

export const UNIDADES_ALMACEN = [
  { id: 'bulto', nombre: 'Bulto', abreviatura: 'bultos' },
  { id: 'kilogramo', nombre: 'Kilogramo', abreviatura: 'kg' },
  { id: 'tonelada', nombre: 'Tonelada', abreviatura: 't' },
  { id: 'metro', nombre: 'Metro', abreviatura: 'm' },
  { id: 'metro_cuadrado', nombre: 'Metro cuadrado', abreviatura: 'm²' },
  { id: 'metro_cubico', nombre: 'Metro cúbico', abreviatura: 'm³' },
  { id: 'litro', nombre: 'Litro', abreviatura: 'L' },
  { id: 'galon', nombre: 'Galón', abreviatura: 'gal' },
  { id: 'unidad', nombre: 'Unidad', abreviatura: 'und' },
  { id: 'rollo', nombre: 'Rollo', abreviatura: 'rollos' },
  { id: 'caja', nombre: 'Caja', abreviatura: 'cajas' },
] as const satisfies readonly DefinicionUnidad[];

export type UnidadAlmacen = (typeof UNIDADES_ALMACEN)[number]['id'];

export const IDS_UNIDAD = UNIDADES_ALMACEN.map((u) => u.id) as readonly UnidadAlmacen[];

const POR_ID = new Map<string, DefinicionUnidad>(UNIDADES_ALMACEN.map((u) => [u.id, u]));

/** La definición, o `undefined` si el slug no existe. */
export function unidadPorId(id: string | null | undefined): DefinicionUnidad | undefined {
  return id ? POR_ID.get(id) : undefined;
}

/**
 * El nombre que se muestra. Un slug desconocido se enseña tal cual en vez de
 * esconderse: si una unidad se retirara de la lista, sus materiales tienen que
 * seguir diciendo algo.
 */
export function nombreDeUnidad(id: string): string {
  return unidadPorId(id)?.nombre ?? id;
}

/** Lo que va detrás de una cantidad. Mismo criterio que `nombreDeUnidad`. */
export function abreviaturaDeUnidad(id: string): string {
  return unidadPorId(id)?.abreviatura ?? id;
}
