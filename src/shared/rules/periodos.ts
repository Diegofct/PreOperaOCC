/**
 * Los periodos de los reportes (spec 030, RF-4, RF-5): un día, una semana de lunes a
 * domingo, o un mes. Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * No son los periodos de `jornada.ts` («los últimos 7 días hacia atrás»): un reporte
 * de la semana es la semana de la nómina de la obra, de lunes a domingo (030/D1), y
 * uno del mes es el mes del calendario. Con las flechas se pasa al anterior o al
 * siguiente entero, no se corre un día.
 */
import { diaDeLaSemana } from './festivos';
import { sumarDias } from './jornada';

export const TIPOS_DE_PERIODO = ['dia', 'semana', 'mes'] as const;

export type TipoDePeriodo = (typeof TIPOS_DE_PERIODO)[number];

export interface PeriodoDeReporte {
  tipo: TipoDePeriodo;
  /** `YYYY-MM-DD`, el primer día. */
  desde: string;
  /** `YYYY-MM-DD`, el último día, incluido. */
  hasta: string;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esTipoDePeriodo(valor: unknown): valor is TipoDePeriodo {
  return typeof valor === 'string' && (TIPOS_DE_PERIODO as readonly string[]).includes(valor);
}

/** El último día del mes de una fecha `YYYY-MM-DD`. */
function finDeMes(fecha: string): string {
  const [anio, mes] = fecha.split('-').map(Number);
  // El día 0 del mes siguiente es el último de este.
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${fecha.slice(0, 7)}-${String(ultimo).padStart(2, '0')}`;
}

/**
 * El periodo de ese tipo que contiene `fecha`:
 *  · día: ese día;
 *  · semana: del lunes al domingo que la contienen;
 *  · mes: del 1 al último día de su mes.
 */
export function periodoDe(tipo: TipoDePeriodo, fecha: string): PeriodoDeReporte {
  if (!FECHA.test(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  if (tipo === 'dia') return { tipo, desde: fecha, hasta: fecha };
  if (tipo === 'semana') {
    // 0 domingo … 6 sábado: el domingo es el último de su semana, no el primero.
    const desdeElLunes = (diaDeLaSemana(fecha) + 6) % 7;
    const lunes = sumarDias(fecha, -desdeElLunes);
    return { tipo, desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  return { tipo, desde: `${fecha.slice(0, 7)}-01`, hasta: finDeMes(fecha) };
}

/** El periodo anterior (`-1`) o el siguiente (`1`), del mismo tipo (RF-4). */
export function periodoVecino(periodo: PeriodoDeReporte, sentido: -1 | 1): PeriodoDeReporte {
  if (periodo.tipo === 'mes') {
    // Desde el día 15 para no caer en otro mes por un 31.
    const [anio, mes] = periodo.desde.split('-').map(Number);
    const otro = new Date(Date.UTC(anio, mes - 1 + sentido, 15)).toISOString().slice(0, 10);
    return periodoDe('mes', otro);
  }
  const paso = periodo.tipo === 'semana' ? 7 : 1;
  return periodoDe(periodo.tipo, sumarDias(periodo.desde, sentido * paso));
}

/** Los días del periodo, en orden: `YYYY-MM-DD`. */
export function diasDe(periodo: Pick<PeriodoDeReporte, 'desde' | 'hasta'>): string[] {
  const dias: string[] = [];
  for (let dia = periodo.desde; dia <= periodo.hasta; dia = sumarDias(dia, 1)) dias.push(dia);
  return dias;
}
