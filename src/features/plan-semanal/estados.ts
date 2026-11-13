/**
 * Cómo se nombra y se marca cada plan semanal en el panel (spec 044, RF-78, RF-79, RF-99). Va
 * aparte de las pantallas porque la lista y el plan abierto lo comparten, y el color nunca va solo:
 * siempre con su nombre.
 *
 * Un borrador cuya semana ya terminó no se puede aprobar y se muestra «Sin aprobar» (RF-99). Que
 * terminó se sabe por las semanas que el servidor dice que hoy se pueden planear, no por el reloj
 * de este equipo: la primera es la que está en curso, y cualquier semana anterior ya pasó.
 */
import { diaCorto, sumarDias } from '@/shared/rules/jornada';
import type { EstadoDePlanSemanal, OrigenDePlanSemanal } from '@/shared/rules/plan-semanal';

type Tono = 'bueno' | 'atencion' | 'neutro' | 'malo';

const NOMBRE: Record<EstadoDePlanSemanal, string> = {
  borrador: 'Borrador',
  vigente: 'Aprobado',
  anulado: 'Anulado',
  descartado: 'Descartado',
};

const TONO: Record<EstadoDePlanSemanal, Tono> = {
  vigente: 'bueno',
  borrador: 'atencion',
  anulado: 'malo',
  descartado: 'neutro',
};

export const NOMBRE_DE_ORIGEN: Record<OrigenDePlanSemanal, string> = {
  ia: 'Propuesta de la IA',
  excel: 'Excel',
  manual: 'A mano',
};

/** ¿La semana de ese plan ya pasó? `enCurso` es el lunes de la semana en curso, del servidor. */
export function semanaPasada(semana: string, enCurso: string | undefined): boolean {
  return enCurso !== undefined && semana < enCurso;
}

/** RF-78, RF-99: el estado como se lee en la lista. */
export function estadoEnPantalla(
  plan: { estado: EstadoDePlanSemanal; semana: string },
  enCurso: string | undefined,
): { nombre: string; tono: Tono } {
  if (plan.estado === 'borrador' && semanaPasada(plan.semana, enCurso)) return { nombre: 'Sin aprobar', tono: 'neutro' };
  return { nombre: NOMBRE[plan.estado], tono: TONO[plan.estado] };
}

/** «Del 9-nov al 15-nov»: la semana por sus dos extremos, que es como se la nombra en la obra. */
export function semanaEnTexto(semana: string): string {
  return `Del ${diaCorto(semana)} al ${diaCorto(sumarDias(semana, 6))}`;
}

/** RF-62, RF-67: desde y hasta cuándo rige. Un rango invertido es un plan que no midió ningún día. */
export function vigenciaDelPlan(p: { semana: string; rigeDesde: string | null; rigeHasta: string | null }): string {
  if (!p.rigeDesde) return '—';
  if (p.rigeHasta && p.rigeHasta < p.rigeDesde) return 'No rigió ningún día';
  return `Del ${diaCorto(p.rigeDesde)} al ${diaCorto(p.rigeHasta ?? sumarDias(p.semana, 6))}`;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** «Mar 17»: el día de la semana y el del mes, que es como se leen las columnas de una semana. */
export function nombreDelDia(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`);
  return `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()}`;
}

/** Una cantidad como se lee en la obra: con coma decimal y hasta tres decimales. */
export function enCantidad(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}
