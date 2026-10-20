/**
 * El mantenimiento de las máquinas (spec 030, RF-22 a RF-35). Reglas puras: sin I/O,
 * como todo `shared/rules`.
 *
 * Cada clase con intervalo —aceite de motor y preventivo— lleva su propia cuenta: un
 * preventivo no reinicia el aceite, porque son servicios distintos con intervalos
 * distintos. El correctivo no tiene intervalo: está pendiente hasta que alguien dice
 * que quedó resuelto (RF-29).
 *
 * Los intervalos de arranque viven aquí y no en la base: un tipo de equipo nuevo
 * hereda el de su clase de medidor sin que nadie tenga que sembrar nada (plan, decisiones).
 */
import { UNIDAD_DE_MEDIDOR, type ClaseDeMedidor } from './jornada';

export const CLASES_DE_MANTENIMIENTO = ['aceite', 'preventivo', 'correctivo'] as const;

export type ClaseDeMantenimiento = (typeof CLASES_DE_MANTENIMIENTO)[number];

/** Las que tienen intervalo y estado (RF-23, RF-28). */
export const CLASES_CON_INTERVALO = ['aceite', 'preventivo'] as const;

export type ClaseConIntervalo = (typeof CLASES_CON_INTERVALO)[number];

export const NOMBRE_DE_CLASE: Record<ClaseDeMantenimiento, string> = {
  aceite: 'Cambio de aceite',
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
};

export function esClaseDeMantenimiento(valor: unknown): valor is ClaseDeMantenimiento {
  return typeof valor === 'string' && (CLASES_DE_MANTENIMIENTO as readonly string[]).includes(valor);
}

export interface Intervalo {
  /** Cada cuántas horas o kilómetros, según el medidor de la máquina. */
  cada: number;
  /** Desde qué porcentaje de `cada` se avisa (RF-23: 90). */
  avisoPorcentaje: number;
}

export const AVISO_DE_ARRANQUE = 90;

/** Los de arranque, por clase de medidor (RF-23). */
export const INTERVALOS_DE_ARRANQUE: Record<ClaseDeMedidor, Record<ClaseConIntervalo, number>> = {
  horometro: { aceite: 250, preventivo: 500 },
  odometro: { aceite: 5000, preventivo: 10000 },
};

/**
 * El intervalo que vale para una máquina (RF-23 a RF-25): el puesto a esa máquina, si
 * no el de su tipo de equipo, si no el de arranque de su clase de medidor.
 */
export function intervaloEfectivo(
  clase: ClaseConIntervalo,
  medidor: ClaseDeMedidor,
  porTipo?: Intervalo | null,
  porVehiculo?: Intervalo | null,
): Intervalo & { origen: 'vehiculo' | 'tipo' | 'arranque' } {
  if (porVehiculo) return { ...porVehiculo, origen: 'vehiculo' };
  if (porTipo) return { ...porTipo, origen: 'tipo' };
  return { cada: INTERVALOS_DE_ARRANQUE[medidor][clase], avisoPorcentaje: AVISO_DE_ARRANQUE, origen: 'arranque' };
}

export type EstadoDeMantenimiento = 'al_dia' | 'proximo' | 'vencido' | 'sin_registro' | 'revisar';

export const NOMBRE_DE_ESTADO: Record<EstadoDeMantenimiento, string> = {
  al_dia: 'Al día',
  proximo: 'Próximo',
  vencido: 'Vencido',
  sin_registro: 'Sin registro',
  revisar: 'Revise lecturas',
};

/** Una cifra de horas o kilómetros como se lee: sin decimales de más. */
function cifra(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('es-CO') : n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

/**
 * El estado de una clase de mantenimiento de una máquina (RF-26 a RF-28):
 *
 *  · sin servicio registrado → `sin_registro`, sin alerta (RF-27);
 *  · lo recorrido desde el servicio negativo (una lectura corregida hacia atrás) →
 *    `revisar`, en vez de una cifra imposible (caso límite);
 *  · desde el 100 % del intervalo → `vencido`;
 *  · desde el porcentaje de aviso → `proximo`;
 *  · si no → `al_dia`.
 *
 * Sin lectura actual no hay contra qué medir: `sin_registro` si tampoco hay servicio,
 * y `revisar` si lo hay.
 */
export function estadoDeMantenimiento(datos: {
  clase: ClaseConIntervalo;
  medidor: ClaseDeMedidor;
  lecturaActual: number | null;
  ultimo: { lectura: number | null; fecha: string } | null;
  intervalo: Intervalo;
}): { estado: EstadoDeMantenimiento; recorrido: number | null; texto: string } {
  const { clase, medidor, lecturaActual, ultimo, intervalo } = datos;
  const unidad = UNIDAD_DE_MEDIDOR[medidor];
  const nombre = NOMBRE_DE_CLASE[clase];
  if (!ultimo) return { estado: 'sin_registro', recorrido: null, texto: `${nombre}: sin registro` };
  if (lecturaActual === null || ultimo.lectura === null) {
    return { estado: 'revisar', recorrido: null, texto: `${nombre}: falta una lectura` };
  }
  const recorrido = Math.round((lecturaActual - ultimo.lectura) * 10) / 10;
  if (recorrido < 0) return { estado: 'revisar', recorrido, texto: `${nombre}: revise lecturas` };
  if (recorrido >= intervalo.cada) {
    const pasado = Math.round((recorrido - intervalo.cada) * 10) / 10;
    return {
      estado: 'vencido',
      recorrido,
      texto: pasado === 0 ? `${nombre} vencido` : `${nombre} vencido hace ${cifra(pasado)} ${unidad}`,
    };
  }
  const falta = Math.round((intervalo.cada - recorrido) * 10) / 10;
  if (recorrido >= (intervalo.cada * intervalo.avisoPorcentaje) / 100) {
    return { estado: 'proximo', recorrido, texto: `${nombre} en ${cifra(falta)} ${unidad}` };
  }
  return { estado: 'al_dia', recorrido, texto: `${nombre} en ${cifra(falta)} ${unidad}` };
}

/** Lo que pesa una máquina para el orden de la lista (RF-31). */
export interface PrioridadDeMantenimiento {
  correctivoPendiente: boolean;
  estados: readonly EstadoDeMantenimiento[];
}

/**
 * El orden de la lista de Mantenimiento (RF-31): correctivos pendientes, vencidas,
 * próximas, sin registro o por revisar, y al día. Devuelve un número para `sort`:
 * menor va primero.
 */
export function rangoDeMantenimiento(p: PrioridadDeMantenimiento): number {
  if (p.correctivoPendiente) return 0;
  if (p.estados.includes('vencido')) return 1;
  if (p.estados.includes('proximo')) return 2;
  if (p.estados.includes('sin_registro') || p.estados.includes('revisar')) return 3;
  return 4;
}

/**
 * El aviso de una lectura de servicio mayor que la última registrada de la máquina
 * (RF-33). Avisa y no impide: la registrada puede estar atrasada.
 */
export function avisoDeLecturaDeServicio(
  lectura: number | null,
  ultimaRegistrada: number | null,
  medidor: ClaseDeMedidor,
): string | null {
  if (lectura === null || ultimaRegistrada === null || lectura <= ultimaRegistrada) return null;
  const unidad = UNIDAD_DE_MEDIDOR[medidor];
  return `La lectura (${cifra(lectura)} ${unidad}) es mayor que la última registrada de la máquina (${cifra(ultimaRegistrada)} ${unidad}). Revise que esté bien escrita.`;
}
