/**
 * Un rango de fechas «Desde / Hasta» para consultar un listado (spec 025, RF-45 a
 * RF-51).
 *
 * Lo usan la pantalla, para avisar antes de consultar, y la ruta, para no fiarse de
 * la pantalla: las dos tienen que decir lo mismo. Las fechas son días de la obra,
 * `AAAA-MM-DD`, que se comparan como texto.
 */
import { restarDias } from './jornada';

/** Lo que muestra un listado sin fechas elegidas: la última semana, hoy incluido (RF-49). */
export const DIAS_POR_DEFECTO_DEL_RANGO = 7;

/** Con más de un año, la consulta deja de ser un listado y pasa a ser un informe (RF-51). */
export const DIAS_MAXIMOS_DEL_RANGO = 366;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const MENSAJES_DE_RANGO = {
  formato: 'Las fechas van como AAAA-MM-DD.',
  orden: 'Tiene que ser igual o posterior a «Desde».',
  largo: 'El rango máximo es de un año.',
} as const;

export type ErrorDeRango = keyof typeof MENSAJES_DE_RANGO;

export interface RangoDeFechas {
  desde: string;
  hasta: string;
}

/** El rango por defecto que termina en `hasta` (RF-49). */
export function rangoPorDefecto(hasta: string): RangoDeFechas {
  return { desde: restarDias(hasta, DIAS_POR_DEFECTO_DEL_RANGO - 1), hasta };
}

/**
 * El rango pedido, completado con el de por defecto si falta una punta, o el error.
 * Sin ninguna, la última semana hasta `hoy`; sin «Hasta», hasta `hoy`; sin «Desde»,
 * la semana que termina en «Hasta».
 */
export function rangoDeFechas(
  desde: string | null | undefined,
  hasta: string | null | undefined,
  hoy: string,
): RangoDeFechas | { error: ErrorDeRango } {
  const fin = hasta || hoy;
  const inicio = desde || rangoPorDefecto(fin).desde;
  if (!FECHA.test(inicio) || !FECHA.test(fin) || Number.isNaN(Date.parse(inicio)) || Number.isNaN(Date.parse(fin))) {
    return { error: 'formato' };
  }
  if (fin < inicio) return { error: 'orden' };
  if ((Date.parse(fin) - Date.parse(inicio)) / 86_400_000 > DIAS_MAXIMOS_DEL_RANGO) return { error: 'largo' };
  return { desde: inicio, hasta: fin };
}
