/**
 * Las listas cerradas del parte diario de obra.
 *
 * Cerradas y no texto libre por lo mismo de siempre: un dato que se escribe a
 * mano se escribe de cinco maneras y deja de poder sumarse. «Cemento», «cemento
 * gris» y «Cto.» son el mismo material y tres filas distintas en cualquier
 * cuenta.
 *
 * ── Por qué ya no hay materiales de laboratorio ──
 *
 * Hasta el 2026-09-16 aquí vivía una lista de materiales de prueba (cemento,
 * arena…), con su unidad. Desde entonces Control Calidad de Obra registra
 * **ensayos**, los de OCC (spec 004, RF-61), y la lista salió en la tarea
 * 004/T29. Los partes que ya guardaron materiales no la necesitan: cada fila
 * guarda su nombre, su cantidad y su unidad, y se muestra tal cual (RF-63).
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
 * Los ensayos y controles de Control Calidad de Obra (spec 004, RF-61, anexo A).
 *
 * Son los de la guía de OCC para el laboratorista —«Tabla práctica de ensayos y
 * controles, material tratado con cemento»—, en su orden: antes, durante, a los 7
 * días y con la capa terminada. Escritos a mano y no importados como el
 * presupuesto: son diecisiete nombres cortos, y leer el Word exigiría una
 * dependencia que el proyecto no tiene.
 *
 * Los id son estables: una vez que un parte guarde un ensayo, su id no se renombra
 * ni se reutiliza.
 */
export const ENSAYOS_DE_CALIDAD = [
  { id: 'granulometria', nombre: 'Granulometría' },
  { id: 'limite_liquido', nombre: 'Límite líquido' },
  { id: 'indice_de_plasticidad', nombre: 'Índice de plasticidad' },
  { id: 'equivalente_de_arena', nombre: 'Equivalente de arena' },
  { id: 'azul_de_metileno', nombre: 'Azul de metileno' },
  { id: 'materia_organica', nombre: 'Materia orgánica' },
  { id: 'proctor_compactacion', nombre: 'Proctor / compactación' },
  { id: 'cbr_sin_cemento', nombre: 'CBR sin cemento' },
  { id: 'sulfatos_solubles', nombre: 'Sulfatos solubles' },
  { id: 'contenido_de_cemento', nombre: 'Contenido de cemento' },
  { id: 'muestreo_para_resistencia', nombre: 'Muestreo para resistencia' },
  { id: 'moldeo_de_probetas', nombre: 'Moldeo de probetas' },
  { id: 'compresion_simple', nombre: 'Compresión simple' },
  { id: 'densidad_en_campo', nombre: 'Densidad en campo' },
  { id: 'compactacion', nombre: 'Compactación' },
  { id: 'espesor', nombre: 'Espesor' },
  { id: 'planicidad', nombre: 'Planicidad' },
] as const;

export type Ensayo = (typeof ENSAYOS_DE_CALIDAD)[number]['id'];

export function nombreDeEnsayo(id: string): string {
  return ENSAYOS_DE_CALIDAD.find((e) => e.id === id)?.nombre ?? id;
}
