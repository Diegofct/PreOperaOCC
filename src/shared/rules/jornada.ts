/**
 * Reglas de la bitácora diaria. Funciones puras, sin I/O.
 *
 * Corren igual en el dispositivo y en el servidor, y por eso se pueden
 * verificar en Node (`scripts/verificar-reglas.ts`) sin arrancar un teléfono.
 *
 * Todo se calcula en **hora local del equipo**, que es la del jefe de
 * operadores. El "día de trabajo" es el suyo, no el UTC.
 */

/** "HH:MM" en hora local, como se imprime en el formato de OCC. */
export function horaLocal(ms: number): string {
  const fecha = new Date(ms);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" en hora local. El día de trabajo, no el UTC. */
export function fechaLocalISO(ms: number): string {
  const fecha = new Date(ms);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * El día de trabajo en obra, `YYYY-MM-DD`, en hora de Colombia.
 *
 * Distinto de `fechaLocalISO`, y la diferencia importa: aquel usa la hora del
 * equipo, que en el celular del residente **es** la de la obra. Esta se usa
 * donde el reloj de quien mira no sirve —el navegador de alguien que puede estar
 * en otra ciudad, o un servidor que corre en UTC—, y siempre responde con el día
 * que se está trabajando en obra.
 *
 * Colombia no tiene horario de verano, así que el desfase es fijo. Si algún día
 * lo tuviera, este es el único sitio que habría que cambiar.
 */
export const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

export function fechaDeJornada(ahora: number = Date.now()): string {
  return new Date(ahora - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}

/**
 * Horas que trabajó la máquina, según el horómetro y no según el reloj.
 *
 * Es la cifra que alimenta el mantenimiento preventivo. `null` mientras falte
 * una de las dos lecturas o si el final es menor que el inicial: un horómetro
 * no retrocede, y devolver un negativo sería peor que no devolver nada.
 */
export function horasDeMaquina(inicial: number | null, final: number | null): number | null {
  if (inicial == null || final == null) return null;
  if (final < inicial) return null;
  return final - inicial;
}

export type ErrorHorometros = 'falta_inicial' | 'falta_final' | 'final_menor' | 'salto_enorme';

/** Más de esto en un día es casi seguro un dedo de más al teclear. */
export const MAXIMO_HORAS_POR_DIA = 24;

/**
 * Valida el par de lecturas antes de guardar.
 *
 * El salto enorme se rechaza porque un "9840 → 98450" mete 88.610 horas de
 * golpe al vehículo y dispara todos sus mantenimientos preventivos. Es el mismo
 * riesgo que ya se cuida en el preoperacional.
 */
export function validarHorometros(
  inicial: number | null,
  final: number | null,
): ErrorHorometros | null {
  if (inicial == null) return 'falta_inicial';
  if (final == null) return 'falta_final';
  if (final < inicial) return 'final_menor';
  if (final - inicial > MAXIMO_HORAS_POR_DIA) return 'salto_enorme';
  return null;
}

export function mensajeDeHorometros(error: ErrorHorometros, inicial: number | null): string {
  switch (error) {
    case 'falta_inicial':
      return 'Falta el horómetro inicial.';
    case 'falta_final':
      return 'Falta el horómetro final.';
    case 'final_menor':
      return `El horómetro final no puede ser menor que el inicial (${inicial?.toLocaleString('es-CO')} h).`;
    case 'salto_enorme':
      return `Son más de ${MAXIMO_HORAS_POR_DIA} horas de máquina en un día. Revise las dos lecturas.`;
  }
}

export interface BitacoraEvaluable {
  operadorId: string | null;
  horometroInicial: number | null;
  horometroFinal: number | null;
  actividades: { clave: string; nombre: string }[];
}

/** Lo mínimo para que la bitácora sirva como documento. */
export function esBitacoraCompleta(bitacora: BitacoraEvaluable): boolean {
  return (
    bitacora.operadorId !== null &&
    validarHorometros(bitacora.horometroInicial, bitacora.horometroFinal) === null &&
    bitacora.actividades.length > 0
  );
}

/**
 * Las máquinas que todavía no tienen bitácora del día.
 *
 * Es lo que el jefe de operadores ve en ámbar al abrir la app. Que la lista
 * esté a la vista es más confiable que el recordatorio: en los Xiaomi y Huawei
 * de obra, la notificación puede no sonar nunca.
 */
export function maquinasSinBitacora(
  vehiculoIds: string[],
  completasPorVehiculo: Map<string, boolean>,
): string[] {
  return vehiculoIds.filter((id) => completasPorVehiculo.get(id) !== true);
}
