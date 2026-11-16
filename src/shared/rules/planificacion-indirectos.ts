/**
 * Los costos indirectos de la planificación, renglón por renglón (spec 045). Reglas puras: sin
 * I/O, como todo `shared/rules`.
 *
 * ── Por qué cuatro formas y no una fórmula por renglón ──
 *
 * En el Excel cada renglón trae su fórmula a mano, y las 200 que tiene el V2 OPC 8 se reducen a
 * cuatro (RF-74 a RF-77): un valor fijo, un porcentaje del importe real total, algo mensual
 * (cantidad × (valor + adicional) × meses) y una persona ((salario × factor + acomodación +
 * viáticos) × dedicación × meses). Con cuatro formas el panel calcula lo mismo que el libro sin
 * guardar fórmulas, y lo que el libro hace distinto entra como valor fijo.
 *
 * ── Por qué el factor es de cada planificación ──
 *
 * El factor prestacional (1,2295) y el recargo de horas extras (0,16) están escritos dentro de las
 * fórmulas del Excel. Cambian con la ley y con la obra, así que cada planificación guarda los suyos
 * (RF-86, RF-87), y un cambio recalcula todos sus renglones de personal sin tocar las aprobadas.
 *
 * ── Un valor que falta cuenta como cero ──
 *
 * Mientras se digita, un renglón puede estar incompleto. Para el total vale cero, y lo que impide
 * aprobar con renglones incompletos es otra regla (RF-133). Así el resumen se mueve con cada
 * cifra que entra, en lugar de quedarse en blanco hasta que el renglón está completo. Los meses
 * se toman tal como vienen, aunque traigan decimales: el libro los usa (6,5 meses en la fila 139).
 *
 * ── Copiar indirectos de otra obra ──
 *
 * Los indirectos de una obra se parecen a los de la anterior: la misma camioneta, el mismo
 * residente. Se copian sus renglones y sus factores (RF-114, RF-115), pero no su calendario: cada
 * renglón arranca con la obra nueva, sin meses fijados, y si duraba más que el plazo nuevo se
 * recorta y se marca para que alguien lo mire (RF-116 a RF-119).
 *
 * ── «Indirectos sin desglose» ──
 *
 * Las planificaciones de la 043 solo guardaron un total por mes. Se muestran como un único renglón
 * de valor fijo con esos meses fijados (RF-140, RF-145), marcado para revisión (RF-141). Tiene que
 * ir en uno de los siete conceptos; va en «otros costos indirectos», y la marca `sinDesglose` es la
 * que dice que en realidad no es de ningún concepto.
 */
import type { RechazadoPorIa } from './formulario-presupuesto-ia';
import type { Rol } from './permisos';
import {
  CONCEPTOS_INDIRECTOS,
  ESQUEMA_DE_PLANIFICACION,
  FORMAS_DE_INDIRECTO,
  type ConceptoIndirecto,
  type EstadoDePlanificacion,
  type EstructuraDePlanificacion,
  type HallazgoDelBorrador,
  type PlazoDeLaPlanificacion,
  type RenglonIndirecto,
  type RenglonIndirectoFijo,
  type ValorDelMes,
} from './planificacion';
import { fijadosDeLosValores } from './planificacion-reparto';

/** RF-88. */
export const FACTOR_PRESTACIONAL_POR_DEFECTO = 1.2295;
/** RF-89. */
export const RECARGO_HORAS_EXTRAS_POR_DEFECTO = 0.16;

/** Lo que un renglón necesita de su planificación para calcularse. */
export interface ContextoDeIndirectos {
  /** RF-69: ítems más rubros, base de los renglones de porcentaje. */
  importeRealTotal: number;
  factorPrestacional: number;
  recargoHorasExtras: number;
}

const cifra = (valor: number | null): number => (valor !== null && Number.isFinite(valor) ? valor : 0);

/** RF-74 a RF-77, RF-93: el total del renglón, sin redondear. */
export function totalDelRenglon(renglon: RenglonIndirecto, contexto: ContextoDeIndirectos): number {
  switch (renglon.forma) {
    case 'fijo':
      return cifra(renglon.valor);
    case 'porcentaje':
      return cifra(renglon.porcentaje) * contexto.importeRealTotal;
    case 'mensual':
      return (
        cifra(renglon.cantidad) *
        (cifra(renglon.valorMensual) + cifra(renglon.valorMensualAdicional)) *
        cifra(renglon.tiempoEjecucion)
      );
    case 'personal': {
      const factor = contexto.factorPrestacional + (renglon.operativo ? contexto.recargoHorasExtras : 0);
      return (
        (cifra(renglon.salario) * factor + cifra(renglon.acomodacion) + cifra(renglon.viaticos)) *
        cifra(renglon.dedicacion) *
        cifra(renglon.tiempoEjecucion)
      );
    }
  }
}

/** RF-94: el total de cada uno de los siete conceptos; los que no tienen renglones, en cero. */
export function totalesPorConcepto(
  renglones: readonly RenglonIndirecto[],
  contexto: ContextoDeIndirectos,
): Record<ConceptoIndirecto, number> {
  const totales = Object.fromEntries(CONCEPTOS_INDIRECTOS.map((c) => [c, 0])) as Record<ConceptoIndirecto, number>;
  for (const renglon of renglones) totales[renglon.concepto] += totalDelRenglon(renglon, contexto);
  return totales;
}

/** RF-95: la suma de los siete conceptos. */
export function totalDeIndirectos(renglones: readonly RenglonIndirecto[], contexto: ContextoDeIndirectos): number {
  const porConcepto = totalesPorConcepto(renglones, contexto);
  return CONCEPTOS_INDIRECTOS.reduce((suma, concepto) => suma + porConcepto[concepto], 0);
}

/** RF-78, RF-79: el motivo del rechazo, o `null`. La forma llega como texto desde el pedido. */
export function validarRenglonIndirecto(renglon: { descripcion?: string; forma?: string }): string | null {
  if (!renglon.descripcion?.trim()) return 'Cada renglón indirecto necesita una descripción.';
  if (!(FORMAS_DE_INDIRECTO as readonly string[]).includes(renglon.forma ?? '')) {
    return 'Cada renglón indirecto necesita una forma de cálculo: valor fijo, porcentaje, mensual o personal.';
  }
  return null;
}

/** De dónde se copian los indirectos: lo que hace falta de la otra planificación. */
export interface FuenteDeIndirectos {
  renglonesIndirectos?: readonly RenglonIndirecto[];
  factorPrestacional?: number;
  recargoHorasExtras?: number;
}

/** RF-114 a RF-119: los renglones y factores de otra planificación, ajustados al plazo nuevo. */
export function copiarRenglones(
  fuente: FuenteDeIndirectos,
  plazo: PlazoDeLaPlanificacion,
): { renglonesIndirectos: RenglonIndirecto[]; factorPrestacional: number; recargoHorasExtras: number } {
  return {
    factorPrestacional: fuente.factorPrestacional ?? FACTOR_PRESTACIONAL_POR_DEFECTO,
    recargoHorasExtras: fuente.recargoHorasExtras ?? RECARGO_HORAS_EXTRAS_POR_DEFECTO,
    renglonesIndirectos: (fuente.renglonesIndirectos ?? []).map((original): RenglonIndirecto => {
      // RF-171: la copia lleva otro periodo, así que el aviso de periodo deducido no viaja.
      const renglon = { ...original };
      delete renglon.periodoDeducido;
      if (renglon.forma === 'porcentaje') return renglon;
      const recortar = renglon.tiempoEjecucion !== null && renglon.tiempoEjecucion > plazo.meses;
      return {
        ...renglon,
        mesInicio: plazo.arranque,
        tiempoEjecucion: recortar ? plazo.meses : renglon.tiempoEjecucion,
        fijados: [],
        revisar: renglon.revisar || recortar,
      };
    }),
  };
}

export const DESCRIPCION_SIN_DESGLOSE = 'Indirectos sin desglose';
export const ID_SIN_DESGLOSE = 'sin-desglose';

/** RF-140, RF-141, RF-145: el total por mes de la 043 como un solo renglón; `null` si no tenía. */
export function renglonSinDesglose(indirectos: readonly ValorDelMes[]): RenglonIndirectoFijo | null {
  if (indirectos.length === 0) return null;
  return {
    id: ID_SIN_DESGLOSE,
    concepto: 'otros',
    descripcion: DESCRIPCION_SIN_DESGLOSE,
    forma: 'fijo',
    valor: indirectos.reduce((suma, i) => suma + i.valor, 0),
    ...fijadosDeLosValores(indirectos),
    revisar: true,
    sinDesglose: true,
  };
}

/**
 * RF-112, RF-113, P10: los renglones que se pueden copiar de otra planificación, o `null` si de ella
 * no se copia. Solo de una vigente o reemplazada —ni anulada, ni descartada, ni borrador— y solo sus
 * renglones desglosados: «Indirectos sin desglose» es un total por mes de la 043, no un renglón que
 * sirva en otra obra.
 */
export function renglonesParaCopiar(
  estado: EstadoDePlanificacion,
  estructura: EstructuraDePlanificacion,
): RenglonIndirecto[] | null {
  if (estado !== 'vigente' && estado !== 'reemplazada') return null;
  if (estructura.esquema !== ESQUEMA_DE_PLANIFICACION) return null;
  const desglosados = (estructura.renglonesIndirectos ?? []).filter((r) => !r.sinDesglose);
  return desglosados.length > 0 ? desglosados : null;
}

/** Lo que se le entrega a una persona de una planificación, y que hay que recortar junto. */
export interface VistaDeLaPlanificacion {
  estructura: EstructuraDePlanificacion;
  hallazgos: HallazgoDelBorrador[];
  rechazados: RechazadoPorIa[];
}

/**
 * RF-150 a RF-153 (D10): el Director de Obra ve el total y el reparto mensual de la mano de obra
 * indirecta, no sus renglones. Se recorta en el servidor, antes de que el dato viaje: ocultarlo en
 * la pantalla lo dejaría en la respuesta.
 *
 * Los renglones no son lo único que los nombra: un hallazgo dice «El renglón «Residente…» está
 * marcado para revisar», y una cifra descartada del Excel trae su nombre y su campo. Esos se quitan
 * también, buscando por la descripción de los renglones recortados. El total por concepto
 * (`indirectosPorConcepto`) y el de cada mes (`indirectos`) quedan, porque son lo que sí ve.
 */
/** RF-151: a quién se le recorta. Escrito una vez: lo usan el detalle y el Excel original. */
export function veSoloElTotalDeManoDeObraIndirecta(rol: Rol): boolean {
  return rol === 'director_obra';
}

export function recortarManoDeObraIndirecta(
  vista: VistaDeLaPlanificacion,
  rol: Rol,
): VistaDeLaPlanificacion & { recortada: boolean } {
  if (!veSoloElTotalDeManoDeObraIndirecta(rol)) return { ...vista, recortada: false };
  const renglones = vista.estructura.renglonesIndirectos ?? [];
  const ocultos = renglones.filter((r) => r.concepto === 'mano_obra_indirecta').map((r) => r.descripcion.trim()).filter(Boolean);
  const nombra = (texto: string) => ocultos.some((descripcion) => texto.includes(descripcion));
  return {
    estructura: { ...vista.estructura, renglonesIndirectos: renglones.filter((r) => r.concepto !== 'mano_obra_indirecta') },
    hallazgos: vista.hallazgos.filter((h) => !nombra(h.detalle)),
    rechazados: vista.rechazados.filter((r) => !ocultos.some((descripcion) => r.que.startsWith(descripcion))),
    recortada: true,
  };
}
