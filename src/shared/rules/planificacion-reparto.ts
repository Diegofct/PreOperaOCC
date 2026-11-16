/**
 * El reparto mensual de la planificación (spec 045). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * ── Por qué se reparte en vez de digitarse mes a mes ──
 *
 * El Director de Proyectos piensa cada ítem como «empieza en tal mes y dura tantos»: el Excel
 * reparte el importe en partes iguales dentro de ese periodo (RF-96, RF-97). Solo cuando un mes no
 * es como los demás lo fija a mano (RF-98), y lo que falta se reparte entre **todos** los meses no
 * fijados, anteriores y siguientes (RF-99, P7). Así fijar un mes no obliga a rehacer los otros.
 *
 * ── Por qué un fijado en cero sigue siendo fijado ──
 *
 * Los meses que trae un Excel entran como fijados, incluidos los ceros dentro del periodo (D11).
 * Si un cero se tratara como «sin fijar», el reparto lo rellenaría y cambiaría el Excel sin que
 * nadie lo pidiera.
 *
 * ── Qué pasa cuando los fijados no cuadran ──
 *
 * Es un hallazgo, no un error (RF-100, RF-101): el borrador se sigue editando y quien aprueba lo
 * ve. Si los fijados pasan del total, a los meses sin fijar no se les reparte un negativo —un mes
 * con programación negativa no significa nada en obra—: quedan en cero y el hallazgo dice cuánto
 * sobra. Los valores van sin redondear; se redondean solo al mostrarlos (RF-161).
 *
 * ── Los porcentajes y el costo siguen a la obra ──
 *
 * Un indirecto de porcentaje (una retención, un impuesto) se causa cuando se ejecuta obra, así que
 * se reparte en proporción a lo programado de ítems y rubros en cada mes (RF-105). Sin nada
 * programado no hay a qué seguir: va en partes iguales en el plazo y se marca (RF-106, RF-107). El
 * costo de un ítem va en la misma proporción que su importe real (RF-109); un ítem sin precio
 * contractual no tiene importe real que seguir, y su costo va en partes iguales en su periodo, sin
 * cantidad programada (RF-110, RF-111, P8).
 */
import {
  cantidadDelMes,
  esMesValido,
  mesesDelPlazo,
  sumarMeses,
  type PlazoDeLaPlanificacion,
  type ProgramacionDelMes,
  type ValorDelMes,
} from './planificacion';

/** El periodo de un ítem, rubro o renglón: su mes de inicio y su cantidad de meses. */
export interface Periodo {
  mesInicio: string | null;
  tiempoEjecucion: number | null;
}

export type HallazgoDeReparto = {
  tipo: 'fijados_exceden_total' | 'fijados_no_suman_total';
  /** La suma de lo que queda en los meses menos el total. */
  diferencia: number;
};

export interface Reparto {
  /** Todos los meses del periodo, en orden de calendario. */
  meses: ValorDelMes[];
  hallazgo: HallazgoDeReparto | null;
}

/** Por debajo de un peso, una diferencia es redondeo del Excel y no un hallazgo. */
const TOLERANCIA = 1;

/** RF-96: los meses del periodo; vacío si no tiene mes de inicio o cantidad de meses válidos. */
export function mesesDelPeriodo(periodo: Periodo): string[] {
  const { mesInicio, tiempoEjecucion } = periodo;
  if (mesInicio === null || !esMesValido(mesInicio)) return [];
  if (tiempoEjecucion === null || !Number.isInteger(tiempoEjecucion) || tiempoEjecucion < 1) return [];
  return Array.from({ length: tiempoEjecucion }, (_, i) => sumarMeses(mesInicio, i));
}

/** RF-96 a RF-101: el total en los meses del periodo, respetando los fijados que caen dentro. */
export function repartir(total: number, periodo: Periodo, fijados: readonly ValorDelMes[]): Reparto {
  const meses = mesesDelPeriodo(periodo);
  if (meses.length === 0) return { meses: [], hallazgo: null };

  const dentro = new Set(meses);
  const fijadoDe = new Map(fijados.filter((f) => dentro.has(f.mes)).map((f) => [f.mes, f.valor]));
  const sumaFijados = [...fijadoDe.values()].reduce((suma, valor) => suma + valor, 0);
  const libres = meses.length - fijadoDe.size;
  const resto = total - sumaFijados;
  const porMesLibre = libres > 0 ? Math.max(resto, 0) / libres : 0;

  let hallazgo: HallazgoDeReparto | null = null;
  if (resto < -TOLERANCIA) hallazgo = { tipo: 'fijados_exceden_total', diferencia: -resto };
  else if (libres === 0 && Math.abs(resto) > TOLERANCIA) hallazgo = { tipo: 'fijados_no_suman_total', diferencia: -resto };

  return { meses: meses.map((mes) => ({ mes, valor: fijadoDe.get(mes) ?? porMesLibre })), hallazgo };
}

/** RF-103, RF-104: los fijados que siguen dentro del periodo y los que se descartaron, para avisar. */
export function descartarFijadosFuera(
  fijados: readonly ValorDelMes[],
  periodo: Periodo,
): { fijados: ValorDelMes[]; descartados: ValorDelMes[] } {
  const dentro = new Set(mesesDelPeriodo(periodo));
  return {
    fijados: fijados.filter((f) => dentro.has(f.mes)),
    descartados: fijados.filter((f) => !dentro.has(f.mes)),
  };
}

/** RF-102: «Repartir en partes iguales» quita todos los meses fijados. */
export function repartirEnPartesIguales<T extends { fijados?: readonly ValorDelMes[] }>(renglon: T): T & { fijados: ValorDelMes[] } {
  return { ...renglon, fijados: [] };
}

/** Lo programado de varios ítems y rubros, sumado por mes y en orden de calendario. */
export function sumaPorMes(listas: readonly (readonly ValorDelMes[])[]): ValorDelMes[] {
  const suma = new Map<string, number>();
  for (const lista of listas) for (const { mes, valor } of lista) suma.set(mes, (suma.get(mes) ?? 0) + valor);
  return [...suma]
    .map(([mes, valor]) => ({ mes, valor }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/** RF-105 a RF-107: el total de un renglón de porcentaje en los meses en que hay obra programada. */
export function repartirPorcentaje(
  total: number,
  programadoPorMes: readonly ValorDelMes[],
  plazo: PlazoDeLaPlanificacion,
): { meses: ValorDelMes[]; hallazgo: { tipo: 'sin_programacion' } | null } {
  const conObra = programadoPorMes.filter((m) => m.valor > 0);
  const programado = conObra.reduce((suma, m) => suma + m.valor, 0);
  if (programado > 0) {
    return { meses: conObra.map(({ mes, valor }) => ({ mes, valor: (total * valor) / programado })), hallazgo: null };
  }
  const meses = mesesDelPlazo(plazo);
  return { meses: meses.map((mes) => ({ mes, valor: total / meses.length })), hallazgo: { tipo: 'sin_programacion' } };
}

/**
 * RF-109, RF-110: el importe a costo en la proporción del importe real de cada mes. Sin importe real
 * que seguir (precio contractual 0), en partes iguales en su periodo.
 */
export function repartirCosto(importeCosto: number, repartoReal: readonly ValorDelMes[], periodo: Periodo): ValorDelMes[] {
  const real = repartoReal.reduce((suma, m) => suma + m.valor, 0);
  if (real > 0) return repartoReal.map(({ mes, valor }) => ({ mes, valor: (importeCosto * valor) / real }));
  return repartir(importeCosto, periodo, []).meses;
}

/** RF-108, RF-111: cada mes con su cantidad, que es `null` sin precio contractual. */
export function programacionConCantidades(reparto: readonly ValorDelMes[], precioContractual: number | null): ProgramacionDelMes[] {
  return reparto.map(({ mes, valor }) => ({ mes, valor, cantidad: cantidadDelMes(valor, precioContractual) }));
}

/** Cuántos meses hay de `desde` a `hasta`, contando los dos. */
function mesesEntre(desde: string, hasta: string): number {
  const indice = (mes: string) => {
    const [anio, numero] = mes.split('-').map(Number);
    return anio * 12 + numero;
  };
  return indice(hasta) - indice(desde) + 1;
}

/**
 * D11, RF-140: unos valores ya repartidos (los de un Excel o de la 043) como meses fijados. El
 * periodo cubre el que ya tenía y todos los meses con valor; los meses de en medio sin valor se
 * fijan en cero, para que el reparto no los rellene y las cifras queden idénticas.
 */
export function fijadosDeLosValores(
  valores: readonly ValorDelMes[],
  periodo: Periodo = { mesInicio: null, tiempoEjecucion: null },
): Periodo & { fijados: ValorDelMes[] } {
  if (valores.length === 0) return { ...periodo, fijados: [] };
  const propios = mesesDelPeriodo(periodo);
  const meses = [...propios, ...valores.map((v) => v.mes)].sort();
  const desde = meses[0];
  const hasta = meses[meses.length - 1];
  const valorDe = new Map(valores.map((v) => [v.mes, v.valor]));
  const cubierto: Periodo = { mesInicio: desde, tiempoEjecucion: mesesEntre(desde, hasta) };
  return { ...cubierto, fijados: mesesDelPeriodo(cubierto).map((mes) => ({ mes, valor: valorDe.get(mes) ?? 0 })) };
}
