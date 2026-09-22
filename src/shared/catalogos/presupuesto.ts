/**
 * Las actividades del parte diario: los ítems del presupuesto de obra de OCC.
 *
 * Hasta el 2026-09-16 la lista era una propuesta de prueba («Excavación», «Cargue
 * de material»…). OCC mandó su presupuesto y la lista pasa a ser la de sus ítems de
 * pago, **la misma para todas las obras** (spec 004, RF-64).
 *
 * ── Por qué el ítem es la clave ──
 *
 * «4.1.8» ya es el identificador que usa OCC para esa actividad en sus cuentas, es
 * estable y no choca con las claves de la lista de prueba, que siguen dentro de los
 * partes viejos. Una clave inventada habría que traducirla cada vez que alguien
 * cruce el parte con el presupuesto.
 *
 * ── De dónde salen los datos ──
 *
 * Del JSON que genera `npm run presupuesto` a partir del Excel de OCC; ese archivo
 * no se edita a mano. Aquí solo se le pone tipo y se dan las formas de leerlo.
 *
 * ── Por qué las unidades son propias ──
 *
 * El almacén tiene su lista de unidades, pero no sirve aquí: no tiene m³-km, y tiene
 * bultos, rollos y cajas, que no son unidades de un ítem de pago. Atar las dos
 * listas haría que un cambio pensado para el almacén moviera las actividades del
 * parte.
 */
import datos from './presupuesto.json';

/** Las unidades en que se pagan los ítems del presupuesto. */
export const UNIDADES_DE_ACTIVIDAD = [
  { id: 'm3', etiqueta: 'm³' },
  { id: 'm2', etiqueta: 'm²' },
  { id: 'm', etiqueta: 'm' },
  { id: 'kg', etiqueta: 'kg' },
  { id: 'und', etiqueta: 'Und' },
  { id: 'm3_km', etiqueta: 'm³-km' },
] as const;

export type UnidadDeActividad = (typeof UNIDADES_DE_ACTIVIDAD)[number]['id'];

export const IDS_UNIDAD_DE_ACTIVIDAD = UNIDADES_DE_ACTIVIDAD.map(
  (u) => u.id,
) as readonly string[];

export interface ActividadDelPresupuesto {
  /** El ítem de pago: «4.1.8». Es la clave. */
  item: string;
  /** La descripción completa del presupuesto. */
  descripcion: string;
  unidad: UnidadDeActividad;
}

/**
 * La lista, en el orden del presupuesto.
 *
 * El JSON llega con `unidad: string`; que solo traiga las seis claves de arriba lo
 * garantiza el script al generarlo y lo comprueba el guion de verificación.
 */
export const ACTIVIDADES_DEL_PRESUPUESTO = datos as readonly ActividadDelPresupuesto[];

/** La salida para lo que no está en el presupuesto (RF-24, RF-70). */
export const CLAVE_OTRA_ACTIVIDAD = 'otra';

const POR_ITEM = new Map(ACTIVIDADES_DEL_PRESUPUESTO.map((a) => [a.item, a]));

export function actividadPorItem(item: string): ActividadDelPresupuesto | undefined {
  return POR_ITEM.get(item);
}

/**
 * «4.1.8 · Excavación para estructuras varias…»: el número de ítem y la descripción
 * entera (RF-78).
 *
 * ── Por qué el número va delante (cambio del 2026-09-22) ──
 *
 * Así nació, porque el número es por donde busca quien conoce el presupuesto. El
 * 2026-09-17 se quitó (RF-75: se leía como ruido), y el 2026-09-22 OCC pidió que
 * volviera: es como la obra habla del presupuesto. El buscador del selector filtra
 * sobre esta etiqueta, así que con el número vuelve también la búsqueda por número
 * (RF-79), sin tocar el buscador.
 *
 * El ítem siempre fue la clave de la opción y se guarda con la actividad
 * (`construirActividadDelParte`): lo que cambió dos veces es lo que se ve, nunca lo
 * que se guarda.
 *
 * La descripción va completa porque dos excavaciones se distinguen al final de la
 * frase («con entibado» / «sin entibado»). Las 31 son distintas entre sí, y el guion
 * lo comprueba.
 */
export function etiquetaDeActividad(actividad: ActividadDelPresupuesto): string {
  return `${actividad.item} · ${actividad.descripcion}`;
}

/**
 * «m³» para `m3`. Una clave desconocida se enseña tal cual: si una unidad se
 * retirara, lo que ya la usa tiene que seguir diciendo algo.
 */
export function etiquetaDeUnidad(id: string): string {
  return UNIDADES_DE_ACTIVIDAD.find((u) => u.id === id)?.etiqueta ?? id;
}
