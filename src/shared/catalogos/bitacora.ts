/**
 * Las listas cerradas del parte diario de obra.
 *
 * Cerradas y no texto libre por lo mismo de siempre: un dato que se escribe a
 * mano se escribe de cinco maneras y deja de poder sumarse. «Cemento», «cemento
 * gris» y «Cto.» son el mismo material y tres filas distintas en cualquier
 * cuenta.
 *
 * ── PENDIENTE DE VALIDACIÓN POR OCC ──
 *
 * Los materiales de abajo son los habituales de una obra civil de vías, no los
 * del almacén concreto de OCC. Igual que el catálogo de actividades, es una
 * propuesta para contrastar en obra: sobra lo que no usan y falta lo que sí.
 */

/** Cómo estuvo el tiempo en una franja del día. */
export const CONDICIONES_CLIMA = [
  { id: 'soleado', nombre: 'Soleado' },
  { id: 'parcialmente_nublado', nombre: 'Parcialmente nublado' },
  { id: 'nublado', nombre: 'Nublado' },
  { id: 'lloviendo', nombre: 'Lloviendo' },
] as const;

export type CondicionClima = (typeof CONDICIONES_CLIMA)[number]['id'];

export const IDS_CLIMA = CONDICIONES_CLIMA.map((c) => c.id) as readonly CondicionClima[];

export function nombreDeClima(id: string): string {
  return CONDICIONES_CLIMA.find((c) => c.id === id)?.nombre ?? id;
}

/**
 * En qué se mide cada material.
 *
 * La unidad va pegada al material y no se elige aparte: dejar que alguien
 * apunte «3» de cemento sin decir si son bultos o metros cúbicos es exactamente
 * el dato que después nadie sabe interpretar.
 */
export type UnidadMaterial = 'bulto' | 'm3' | 'm2' | 'kg' | 'galon' | 'unidad' | 'viaje';

export const ETIQUETA_UNIDAD: Record<UnidadMaterial, string> = {
  bulto: 'bultos',
  m3: 'm³',
  m2: 'm²',
  kg: 'kg',
  galon: 'galones',
  unidad: 'unidades',
  viaje: 'viajes',
};

export interface MaterialLaboratorio {
  id: string;
  nombre: string;
  unidad: UnidadMaterial;
}

export const MATERIALES_LABORATORIO = [
  { id: 'cemento', nombre: 'Cemento', unidad: 'bulto' },
  { id: 'concreto', nombre: 'Concreto premezclado', unidad: 'm3' },
  { id: 'arena', nombre: 'Arena', unidad: 'm3' },
  { id: 'triturado', nombre: 'Triturado', unidad: 'm3' },
  { id: 'base_granular', nombre: 'Base granular', unidad: 'm3' },
  { id: 'subbase_granular', nombre: 'Subbase granular', unidad: 'm3' },
  { id: 'recebo', nombre: 'Recebo', unidad: 'm3' },
  { id: 'mezcla_asfaltica', nombre: 'Mezcla asfáltica', unidad: 'm3' },
  { id: 'emulsion_asfaltica', nombre: 'Emulsión asfáltica', unidad: 'galon' },
  { id: 'cal', nombre: 'Cal', unidad: 'bulto' },
  { id: 'acero_refuerzo', nombre: 'Acero de refuerzo', unidad: 'kg' },
  { id: 'geotextil', nombre: 'Geotextil', unidad: 'm2' },
  { id: 'tuberia', nombre: 'Tubería', unidad: 'unidad' },
  { id: 'ladrillo', nombre: 'Ladrillo', unidad: 'unidad' },
  { id: 'agua', nombre: 'Agua', unidad: 'viaje' },
] as const satisfies readonly MaterialLaboratorio[];

export type Material = (typeof MATERIALES_LABORATORIO)[number]['id'];

export const IDS_MATERIAL = MATERIALES_LABORATORIO.map((m) => m.id) as readonly Material[];

export function materialPorId(id: string): MaterialLaboratorio | undefined {
  return MATERIALES_LABORATORIO.find((m) => m.id === id);
}

export function nombreDeMaterial(id: string): string {
  return materialPorId(id)?.nombre ?? id;
}

/** «4 bultos», ya con la unidad del material. */
export function cantidadLegible(id: string, cantidad: number): string {
  const material = materialPorId(id);
  return material ? `${cantidad} ${ETIQUETA_UNIDAD[material.unidad]}` : `${cantidad}`;
}
