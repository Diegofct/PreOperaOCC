/**
 * El borrador de planificación de la spec 045: cómo nace, cómo se edita y cómo se recalcula.
 * Reglas puras: sin I/O, como todo `shared/rules`. Las corren igual la pantalla y el servidor.
 *
 * ── Las planificaciones de la 043 se normalizan al leerlas, no se migran ──
 *
 * Una planificación aprobada antes de la 045 no se reescribe: sus informes tienen que dar las
 * mismas cifras (RF-146). Para mostrarla y para copiarla se ve como si fuera de la 045: sus
 * indirectos como un renglón «Indirectos sin desglose» (RF-140, RF-145) y la programación de sus
 * ítems y rubros como meses fijados, que es lo que hace un Excel (D11). Lo que miden el
 * cumplimiento y el plan semanal —`programacion` e `indirectos`— no se toca.
 *
 * ── Una sola función deriva las cifras ──
 *
 * `recalcularPlanificacion` es la única que calcula importes, repartos, indirectos y factor
 * (RF-57, RF-160). La corre la pantalla en cada cambio, para que el resumen se mueva sin guardar, y
 * la corre el servidor al guardar, crear y aprobar, ignorando cualquier total que mande el
 * navegador. `items[].programacion` e `indirectos` se siguen guardando como derivados porque son lo
 * que leen el cumplimiento (043) y el plan semanal (044): así esos dos no cambian de lógica.
 *
 * Una estructura de la 043 sale de aquí sin tocar: sus cifras guardadas son las que valen (RF-146).
 * Su cálculo se hace sobre la versión normalizada, para que el resumen se pueda mostrar.
 *
 * Los importes van sin redondear (RF-161). Un costo de relleno del Excel (0,000000001) vale cero,
 * igual que en el resumen de la 043: decidir si es un costo de verdad es un impedimento para
 * aprobar, no algo que el cálculo deba adivinar.
 *
 * ── Qué se puede editar ──
 *
 * `aplicarEdicion` toma del pedido solo lo editable (RF-46 a RF-51): medidas real y para costo,
 * precio de costo, costo de rubros, calendario, meses fijados, renglones indirectos, factores y
 * plazo. Lo contractual —ítem de pago, descripción, unidad, cantidad y precio del contrato, valor
 * del rubro— sale siempre del borrador anterior (RF-52, RF-53): si el pedido lo trae cambiado, se
 * ignora, y así no hay forma de mover el contrato desde la planificación.
 *
 * La medida para costo sigue a la real mientras sean iguales (RF-61): se guarda `null`, que ya
 * significa eso desde la 043 (su RF-140). Solo queda una cifra propia cuando alguien la digita
 * distinta, y entonces se respeta aunque cambie la real (RF-62).
 *
 * Una cantidad de meses con decimales se rechaza solo si se digitó (RF-55): un Excel puede traer
 * 6,5 meses (fila 139 del V2), y guardar ese borrador sin tocar ese renglón no debe fallar.
 *
 * ── Cómo nace un borrador ──
 *
 * Desde el presupuesto (RF-13 a RF-18): los ítems del grupo escogido tal como están en el
 * contrato, ya cruzados con su renglón —no hay que adivinar el cruce, salen de ahí—, con la
 * medida real igual a la contractual y los costos vacíos, para que se digiten. Los rubros son los
 * de ese grupo y los de todo el contrato: un rubro de otro frente no es de esta planificación,
 * igual que en el cruce de la 043. El calendario lo pone después la IA.
 *
 * Copiando una versión (RF-138, RF-139): todo lo que se decidió, incluidos los meses fijados y
 * los indirectos. Lo que era de esa versión y no de la nueva —la explicación de su IA, la marca de
 * editada en pantalla, los totales de su Excel— no viaja. De una de la 043 sale la versión
 * normalizada, con su plazo deducido de lo que programó.
 */
import {
  CONCEPTOS_INDIRECTOS,
  ESQUEMA_DE_PLANIFICACION,
  esMesValido,
  llavesDeEdicion,
  sumarMeses,
  sinPrecioDeCosto,
  validarCantidadDeMeses,
  validarPlazo,
  type ConceptoIndirecto,
  type EstructuraDePlanificacion,
  type ItemDeLaPlanificacion,
  type PlazoDeLaPlanificacion,
  type RenglonIndirecto,
  type RubroDeLaPlanificacion,
  type ValorDelMes,
} from './planificacion';
import {
  copiarRenglones,
  FACTOR_PRESTACIONAL_POR_DEFECTO,
  RECARGO_HORAS_EXTRAS_POR_DEFECTO,
  renglonSinDesglose,
  totalDelRenglon,
  validarRenglonIndirecto,
  type ContextoDeIndirectos,
  type FuenteDeIndirectos,
} from './planificacion-indirectos';
import type { EstructuraDePresupuesto } from './presupuesto';
import {
  descartarFijadosFuera,
  fijadosDeLosValores,
  programacionConCantidades,
  repartir,
  repartirCosto,
  repartirPorcentaje,
  sumaPorMes,
  type HallazgoDeReparto,
} from './planificacion-reparto';

function itemNormalizado(item: ItemDeLaPlanificacion): ItemDeLaPlanificacion {
  const { mesInicio, tiempoEjecucion, fijados } = fijadosDeLosValores(
    item.programacion.map(({ mes, valor }) => ({ mes, valor })),
    item,
  );
  return { ...item, mesInicio, tiempoEjecucion, fijados };
}

function rubroNormalizado(rubro: RubroDeLaPlanificacion): RubroDeLaPlanificacion {
  const periodo = { mesInicio: rubro.mesInicio ?? null, tiempoEjecucion: rubro.tiempoEjecucion ?? null };
  return { ...rubro, ...fijadosDeLosValores(rubro.programacion, periodo), revisar: rubro.revisar ?? false };
}

/** RF-140, RF-145: una estructura de la 043 vista como de la 045. Una de la 045 vuelve tal cual. */
export function normalizarLegada(estructura: EstructuraDePlanificacion): EstructuraDePlanificacion {
  if (estructura.esquema === ESQUEMA_DE_PLANIFICACION) return estructura;
  const sinDesglose = renglonSinDesglose(estructura.indirectos);
  return {
    ...estructura,
    items: estructura.items.map(itemNormalizado),
    rubros: estructura.rubros.map(rubroNormalizado),
    lineaDeRubros: estructura.lineaDeRubros
      ? { ...estructura.lineaDeRubros, fijados: fijadosDeLosValores(estructura.lineaDeRubros.valores).fijados }
      : null,
    renglonesIndirectos: sinDesglose ? [sinDesglose] : [],
  };
}

/** Lo que el Excel trae por ítem en las columnas J a N, y su costo mes a mes. */
export interface CalculoDelItem {
  llave: string;
  /** RF-65: J. */
  importeContractual: number;
  /** RF-66: K. */
  importeReal: number;
  /** RF-67: L. */
  importeCosto: number;
  /** RF-71: M; `null` sin factor. */
  importeCostoConIndirectos: number | null;
  /** RF-72: N; `null` sin factor. */
  resultado: number | null;
  /** RF-109, RF-110. */
  costoPorMes: ValorDelMes[];
}

export interface CalculoDelRubro {
  nombre: string;
  /** RF-68: su valor. */
  importeReal: number;
  /** RF-68: su costo. */
  importeCosto: number;
  importeCostoConIndirectos: number | null;
  resultado: number | null;
  costoPorMes: ValorDelMes[];
}

export interface CalculoDelRenglon {
  id: string;
  total: number;
  meses: ValorDelMes[];
}

/** Un reparto que no cuadra (RF-100, RF-101) o porcentajes sin obra que seguir (RF-107). */
export type HallazgoDeRepartoEn =
  | (HallazgoDeReparto & { en: 'item' | 'rubro' | 'renglon'; referencia: string })
  | { tipo: 'sin_programacion'; en: 'porcentajes'; referencia: '' };

export interface CalculoDeLaPlanificacion {
  items: CalculoDelItem[];
  rubros: CalculoDelRubro[];
  renglones: CalculoDelRenglon[];
  importeContractualTotal: number;
  /** RF-69: ítems más rubros. */
  importeRealTotal: number;
  importeCostoTotal: number;
  /** RF-94. */
  indirectosPorConcepto: Record<ConceptoIndirecto, number>;
  /** RF-95. */
  indirectosTotal: number;
  /** RF-70; `null` si el costo total es cero (RF-73). */
  factorDeIndirectos: number | null;
  importeCostoConIndirectosTotal: number | null;
  resultadoTotal: number | null;
  hallazgosDeReparto: HallazgoDeRepartoEn[];
}

const costoReal = (costo: number | null): number => (sinPrecioDeCosto(costo) ? 0 : (costo as number));
const cifra = (valor: number | null | undefined): number =>
  valor !== null && valor !== undefined && Number.isFinite(valor) ? valor : 0;
const suma = (valores: readonly number[]): number => valores.reduce((total, v) => total + v, 0);

/** RF-57, RF-64 a RF-73, RF-96 a RF-111, RF-157, RF-160, RF-161, RF-163, RF-164. */
export function recalcularPlanificacion(estructura: EstructuraDePlanificacion): {
  estructura: EstructuraDePlanificacion;
  calculo: CalculoDeLaPlanificacion;
} {
  if (estructura.esquema !== ESQUEMA_DE_PLANIFICACION) {
    const normalizada: EstructuraDePlanificacion = { ...normalizarLegada(estructura), esquema: ESQUEMA_DE_PLANIFICACION };
    return { estructura, calculo: recalcularPlanificacion(normalizada).calculo };
  }
  const hallazgos: HallazgoDeRepartoEn[] = [];

  // Ítems: importes y reparto del importe real (RF-65 a RF-67, RF-96, RF-108 a RF-111).
  const llavesDeItems = llavesDeEdicion(estructura.items);
  const items = estructura.items.map((item, n) => {
    const periodo = { mesInicio: item.mesInicio, tiempoEjecucion: item.tiempoEjecucion };
    const importeReal = cifra(item.medidaReal) * cifra(item.precioContractual);
    const importeCosto = cifra(item.medidaCoste ?? item.medidaReal) * costoReal(item.precioCosto);
    const reparto = repartir(importeReal, periodo, item.fijados ?? []);
    const llave = llavesDeItems[n];
    if (reparto.hallazgo) hallazgos.push({ ...reparto.hallazgo, en: 'item', referencia: llave });
    return {
      item: { ...item, programacion: programacionConCantidades(reparto.meses, item.precioContractual) },
      llave,
      importeContractual: cifra(item.medidaContractual) * cifra(item.precioContractual),
      importeReal,
      importeCosto,
      costoPorMes: repartirCosto(importeCosto, reparto.meses, periodo),
    };
  });

  // Rubros: con una línea única, la línea es su programación y ellos no llevan propia (RF-163, RF-164).
  const linea = estructura.lineaDeRubros;
  const valoresDeLinea: readonly ValorDelMes[] = linea
    ? linea.fijados && linea.fijados.length > 0
      ? linea.fijados
      : linea.valores
    : [];
  const rubros = estructura.rubros.map((rubro) => {
    const periodo = { mesInicio: rubro.mesInicio ?? null, tiempoEjecucion: rubro.tiempoEjecucion ?? null };
    const importeCosto = costoReal(rubro.costo);
    let programacion: ValorDelMes[] = [];
    if (!linea) {
      const reparto = repartir(rubro.valor, periodo, rubro.fijados ?? []);
      if (reparto.hallazgo) hallazgos.push({ ...reparto.hallazgo, en: 'rubro', referencia: rubro.nombre });
      programacion = reparto.meses;
    }
    const conProgramacion: RubroDeLaPlanificacion = { ...rubro, programacion };
    return {
      rubro: conProgramacion,
      importeReal: rubro.valor,
      importeCosto,
      costoPorMes: repartirCosto(importeCosto, linea ? valoresDeLinea : programacion, periodo),
    };
  });

  // RF-69.
  const importeRealTotal = suma(items.map((i) => i.importeReal)) + suma(rubros.map((r) => r.importeReal));
  const importeCostoTotal = suma(items.map((i) => i.importeCosto)) + suma(rubros.map((r) => r.importeCosto));

  // Renglones indirectos (RF-74 a RF-77, RF-93, RF-97, RF-105, RF-106).
  const contexto: ContextoDeIndirectos = {
    importeRealTotal,
    factorPrestacional: estructura.factorPrestacional ?? FACTOR_PRESTACIONAL_POR_DEFECTO,
    recargoHorasExtras: estructura.recargoHorasExtras ?? RECARGO_HORAS_EXTRAS_POR_DEFECTO,
  };
  const programado = sumaPorMes([
    ...items.map((i) => i.item.programacion),
    ...rubros.map((r) => r.rubro.programacion),
    valoresDeLinea,
  ]);
  // Sin plazo, un porcentaje sin obra que seguir no tiene meses donde caer.
  const plazo = estructura.plazo ?? { meses: 0, arranque: '' };
  let porcentajesSinObra = false;
  const renglones = (estructura.renglonesIndirectos ?? []).map((renglon) => {
    const total = totalDelRenglon(renglon, contexto);
    if (renglon.forma === 'porcentaje') {
      const reparto = repartirPorcentaje(total, programado, plazo);
      porcentajesSinObra ||= reparto.hallazgo !== null;
      return { renglon, calculo: { id: renglon.id, total, meses: reparto.meses } };
    }
    const reparto = repartir(total, renglon, renglon.fijados);
    if (reparto.hallazgo) hallazgos.push({ ...reparto.hallazgo, en: 'renglon', referencia: renglon.id });
    return { renglon, calculo: { id: renglon.id, total, meses: reparto.meses } };
  });
  if (porcentajesSinObra) hallazgos.push({ tipo: 'sin_programacion', en: 'porcentajes', referencia: '' });

  // Por concepto y en total (RF-94, RF-95, RF-157).
  const delConcepto = (concepto: ConceptoIndirecto) => renglones.filter((r) => r.renglon.concepto === concepto);
  const porConcepto = <T>(valor: (concepto: ConceptoIndirecto) => T) =>
    Object.fromEntries(CONCEPTOS_INDIRECTOS.map((c) => [c, valor(c)])) as Record<ConceptoIndirecto, T>;
  const indirectosPorConceptoPorMes = porConcepto((c) => sumaPorMes(delConcepto(c).map((r) => r.calculo.meses)));
  const indirectosPorConcepto = porConcepto((c) => suma(delConcepto(c).map((r) => r.calculo.total)));
  const indirectosTotal = suma(CONCEPTOS_INDIRECTOS.map((c) => indirectosPorConcepto[c]));

  // Factor y resultados (RF-70 a RF-73).
  const factor = importeCostoTotal > 0 ? 1 + indirectosTotal / importeCostoTotal : null;
  const conIndirectos = (importeCosto: number) => (factor === null ? null : importeCosto * factor);
  const resultadoDe = (importeReal: number, importeCosto: number) =>
    factor === null ? null : importeReal - importeCosto * factor;

  return {
    estructura: {
      ...estructura,
      items: items.map((i) => i.item),
      rubros: rubros.map((r) => r.rubro),
      lineaDeRubros: linea ? { ...linea, valores: valoresDeLinea.map(({ mes, valor }) => ({ mes, valor })) } : null,
      indirectosPorConcepto: indirectosPorConceptoPorMes,
      indirectos: sumaPorMes(renglones.map((r) => r.calculo.meses)),
    },
    calculo: {
      items: items.map(({ llave, importeContractual, importeReal, importeCosto, costoPorMes }) => ({
        llave,
        importeContractual,
        importeReal,
        importeCosto,
        importeCostoConIndirectos: conIndirectos(importeCosto),
        resultado: resultadoDe(importeReal, importeCosto),
        costoPorMes,
      })),
      rubros: rubros.map(({ rubro, importeReal, importeCosto, costoPorMes }) => ({
        nombre: rubro.nombre,
        importeReal,
        importeCosto,
        importeCostoConIndirectos: conIndirectos(importeCosto),
        resultado: resultadoDe(importeReal, importeCosto),
        costoPorMes,
      })),
      renglones: renglones.map((r) => r.calculo),
      importeContractualTotal: suma(items.map((i) => i.importeContractual)) + suma(rubros.map((r) => r.importeReal)),
      importeRealTotal,
      importeCostoTotal,
      indirectosPorConcepto,
      indirectosTotal,
      factorDeIndirectos: factor,
      importeCostoConIndirectosTotal: conIndirectos(importeCostoTotal),
      resultadoTotal: resultadoDe(importeRealTotal, importeCostoTotal),
      hallazgosDeReparto: hallazgos,
    },
  };
}

/** Lo editable de un ítem; se busca por su llave (`llavesDeEdicion`). */
export interface EdicionDelItem {
  llave: string;
  medidaReal: number | null;
  /** La que muestra la pantalla: igual a la real si la sigue. */
  medidaCoste: number | null;
  precioCosto: number | null;
  mesInicio: string | null;
  tiempoEjecucion: number | null;
  fijados: ValorDelMes[];
}

/** Lo editable de un rubro; se busca por su nombre, que no se puede cambiar (RF-53). */
export interface EdicionDelRubro {
  nombre: string;
  costo: number | null;
  mesInicio: string | null;
  tiempoEjecucion: number | null;
  fijados: ValorDelMes[];
}

/** Lo que manda la pantalla al guardar (RF-46 a RF-55, RF-81 a RF-91, RF-165 a RF-167). */
export interface EdicionDelBorrador {
  plazo: PlazoDeLaPlanificacion;
  factorPrestacional: number;
  recargoHorasExtras: number;
  items: EdicionDelItem[];
  rubros: EdicionDelRubro[];
  /** `null` es «Programar por rubro» (RF-166, RF-167). */
  lineaDeRubros: { fijados: ValorDelMes[] } | null;
  /** El juego completo: lo que no viene, se quitó (RF-83, RF-84). */
  renglonesIndirectos: RenglonIndirecto[];
}

/** Meses fijados que se descartaron por cambiar el periodo, para avisar (RF-104). */
export interface FijadosDescartados {
  en: 'item' | 'rubro' | 'renglon';
  /** El ítem de pago, el nombre del rubro o la descripción del renglón. */
  referencia: string;
  meses: ValorDelMes[];
}

export type ResultadoDeLaEdicion =
  | { ok: true; estructura: EstructuraDePlanificacion; descartados: FijadosDescartados[] }
  | { ok: false; errores: string[] };

/** RF-63: la medida para costo es una cifra propia, distinta de la real. */
export function costoConOtraMedida(item: Pick<ItemDeLaPlanificacion, 'medidaReal' | 'medidaCoste'>): boolean {
  return item.medidaCoste !== null && item.medidaCoste !== item.medidaReal;
}

/** Lo que la pantalla edita, sacado del borrador: el punto de partida del editor. */
export function edicionDe(estructura: EstructuraDePlanificacion): EdicionDelBorrador {
  const linea = estructura.lineaDeRubros;
  const llaves = llavesDeEdicion(estructura.items);
  return {
    plazo: estructura.plazo ?? { meses: 1, arranque: '' },
    factorPrestacional: estructura.factorPrestacional ?? FACTOR_PRESTACIONAL_POR_DEFECTO,
    recargoHorasExtras: estructura.recargoHorasExtras ?? RECARGO_HORAS_EXTRAS_POR_DEFECTO,
    items: estructura.items.map((item, n) => ({
      llave: llaves[n],
      medidaReal: item.medidaReal,
      medidaCoste: item.medidaCoste ?? item.medidaReal,
      precioCosto: item.precioCosto,
      mesInicio: item.mesInicio,
      tiempoEjecucion: item.tiempoEjecucion,
      fijados: item.fijados ?? [],
    })),
    rubros: estructura.rubros.map((rubro) => ({
      nombre: rubro.nombre,
      costo: rubro.costo,
      mesInicio: rubro.mesInicio ?? null,
      tiempoEjecucion: rubro.tiempoEjecucion ?? null,
      fijados: rubro.fijados ?? [],
    })),
    lineaDeRubros: linea ? { fijados: linea.fijados && linea.fijados.length > 0 ? linea.fijados : linea.valores } : null,
    renglonesIndirectos: estructura.renglonesIndirectos ?? [],
  };
}

/** RF-61, RF-62: `null` si sigue a la real; la cifra digitada si es otra. */
function medidaCosteEditada(anterior: ItemDeLaPlanificacion, pedido: EdicionDelItem): number | null {
  if (pedido.medidaCoste === null || pedido.medidaCoste === pedido.medidaReal) return null;
  const seguia = anterior.medidaCoste === null || anterior.medidaCoste === anterior.medidaReal;
  // La pantalla devuelve la que mostraba: si la seguía y no se tocó, la sigue.
  if (seguia && pedido.medidaCoste === (anterior.medidaCoste ?? anterior.medidaReal)) return null;
  return pedido.medidaCoste;
}

const CIFRAS_DEL_RENGLON = [
  'valor',
  'porcentaje',
  'cantidad',
  'valorMensual',
  'valorMensualAdicional',
  'salario',
  'acomodacion',
  'viaticos',
  'dedicacion',
] as const;

/** RF-46 a RF-55, RF-61 a RF-63, RF-82, RF-83, RF-90, RF-91, RF-102 a RF-104, RF-165 a RF-167. */
export function aplicarEdicion(anteriorGuardado: EstructuraDePlanificacion, pedido: EdicionDelBorrador): ResultadoDeLaEdicion {
  const anterior: EstructuraDePlanificacion =
    anteriorGuardado.esquema === ESQUEMA_DE_PLANIFICACION
      ? anteriorGuardado
      : { ...normalizarLegada(anteriorGuardado), esquema: ESQUEMA_DE_PLANIFICACION };
  const errores: string[] = [];
  const noNegativa = (valor: number | null | undefined, que: string) => {
    if (valor !== null && valor !== undefined && (!Number.isFinite(valor) || valor < 0)) errores.push(`${que} no puede ser negativo.`);
  };
  const meses = (nuevo: number | null, viejo: number | null | undefined, que: string) => {
    if (nuevo === null || nuevo === viejo) return;
    const motivo = validarCantidadDeMeses(nuevo);
    if (motivo) errores.push(`${que}: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}`);
  };
  const mesDeInicio = (mes: string | null, que: string) => {
    if (mes !== null && !esMesValido(mes)) errores.push(`${que}: el mes de inicio tiene que ser un mes válido, como 2026-01.`);
  };
  const fijadosValidos = (fijados: readonly ValorDelMes[], que: string) => {
    for (const f of fijados) {
      if (!esMesValido(f.mes)) errores.push(`${que}: el mes fijado ${f.mes} no es un mes válido.`);
      noNegativa(f.valor, `${que}: el valor fijado de ${f.mes}`);
    }
  };

  const motivoDelPlazo = validarPlazo(pedido.plazo);
  if (motivoDelPlazo) errores.push(motivoDelPlazo);
  noNegativa(pedido.factorPrestacional, 'El factor prestacional');
  noNegativa(pedido.recargoHorasExtras, 'El recargo de horas extras');

  const descartados: FijadosDescartados[] = [];
  const conPeriodo = <T extends { mesInicio: string | null; tiempoEjecucion: number | null }>(
    en: FijadosDescartados['en'],
    referencia: string,
    periodo: T,
    fijados: readonly ValorDelMes[],
  ): ValorDelMes[] => {
    const { fijados: quedan, descartados: fuera } = descartarFijadosFuera(fijados, periodo);
    if (fuera.length > 0) descartados.push({ en, referencia, meses: fuera });
    return quedan;
  };

  // Ítems: lo contractual siempre del anterior (RF-52).
  const pedidoDe = new Map(pedido.items.map((i) => [i.llave, i]));
  const llavesAnteriores = llavesDeEdicion(anterior.items);
  const items = anterior.items.map((item, n): ItemDeLaPlanificacion => {
    const editado = pedidoDe.get(llavesAnteriores[n]);
    if (!editado) return item;
    const que = `Ítem ${item.item}`;
    noNegativa(editado.medidaReal, `${que}: la medida real`);
    noNegativa(editado.medidaCoste, `${que}: la medida para costo`);
    noNegativa(editado.precioCosto, `${que}: el precio de costo`);
    mesDeInicio(editado.mesInicio, que);
    meses(editado.tiempoEjecucion, item.tiempoEjecucion, que);
    fijadosValidos(editado.fijados, que);
    return {
      ...item,
      medidaReal: editado.medidaReal,
      medidaCoste: medidaCosteEditada(item, editado),
      precioCosto: editado.precioCosto,
      mesInicio: editado.mesInicio,
      tiempoEjecucion: editado.tiempoEjecucion,
      fijados: conPeriodo('item', item.item, editado, editado.fijados),
    };
  });

  // Rubros: el valor siempre del anterior (RF-53). «Programar por rubro» los deja sin calendario.
  const programarPorRubro = anterior.lineaDeRubros !== null && pedido.lineaDeRubros === null;
  const rubroPedido = new Map(pedido.rubros.map((r) => [r.nombre, r]));
  const rubros = anterior.rubros.map((rubro): RubroDeLaPlanificacion => {
    if (programarPorRubro) return { ...rubro, mesInicio: null, tiempoEjecucion: null, fijados: [], programacion: [] };
    const editado = rubroPedido.get(rubro.nombre);
    if (!editado) return rubro;
    const que = `Rubro «${rubro.nombre}»`;
    noNegativa(editado.costo, `${que}: el costo`);
    mesDeInicio(editado.mesInicio, que);
    meses(editado.tiempoEjecucion, rubro.tiempoEjecucion, que);
    fijadosValidos(editado.fijados, que);
    return {
      ...rubro,
      costo: editado.costo,
      mesInicio: editado.mesInicio,
      tiempoEjecucion: editado.tiempoEjecucion,
      fijados: conPeriodo('rubro', rubro.nombre, editado, editado.fijados),
    };
  });

  // La línea de rubros solo se edita o se quita; una nueva solo la trae un Excel (D16).
  let lineaDeRubros = anterior.lineaDeRubros;
  if (lineaDeRubros && pedido.lineaDeRubros) {
    fijadosValidos(pedido.lineaDeRubros.fijados, `La línea «${lineaDeRubros.nombre}»`);
    lineaDeRubros = { ...lineaDeRubros, fijados: pedido.lineaDeRubros.fijados };
  } else if (programarPorRubro) {
    lineaDeRubros = null;
  }

  // Renglones: el juego completo del pedido (RF-81 a RF-83).
  const renglonAnterior = new Map((anterior.renglonesIndirectos ?? []).map((r) => [r.id, r]));
  const renglonesIndirectos = pedido.renglonesIndirectos.map((renglon): RenglonIndirecto => {
    const que = `Renglón «${renglon.descripcion || renglon.id}»`;
    const motivo = validarRenglonIndirecto(renglon);
    if (motivo) errores.push(`${que}: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}`);
    if (!(CONCEPTOS_INDIRECTOS as readonly string[]).includes(renglon.concepto)) errores.push(`${que}: el concepto no existe.`);
    const cifras = renglon as unknown as Partial<Record<(typeof CIFRAS_DEL_RENGLON)[number], number | null>>;
    for (const campo of CIFRAS_DEL_RENGLON) noNegativa(cifras[campo], `${que}: ${campo}`);
    // RF-171: la marca de periodo deducido no se toma del pedido; sigue solo si el renglón ya la
    // tenía y su periodo no cambió.
    const viejo = renglonAnterior.get(renglon.id);
    const sinMarca = { ...renglon };
    delete sinMarca.periodoDeducido;
    if (sinMarca.forma === 'porcentaje') return sinMarca;
    const sigueDeducido =
      viejo?.periodoDeducido === true &&
      viejo.forma !== 'porcentaje' &&
      viejo.mesInicio === sinMarca.mesInicio &&
      viejo.tiempoEjecucion === sinMarca.tiempoEjecucion;
    mesDeInicio(sinMarca.mesInicio, que);
    meses(sinMarca.tiempoEjecucion, viejo && viejo.forma !== 'porcentaje' ? viejo.tiempoEjecucion : undefined, que);
    fijadosValidos(sinMarca.fijados, que);
    return {
      ...sinMarca,
      ...(sigueDeducido ? { periodoDeducido: true } : {}),
      fijados: conPeriodo('renglon', sinMarca.descripcion, sinMarca, sinMarca.fijados),
    };
  });

  if (errores.length > 0) return { ok: false, errores };

  const { estructura } = recalcularPlanificacion({
    ...anterior,
    plazo: pedido.plazo,
    factorPrestacional: pedido.factorPrestacional,
    recargoHorasExtras: pedido.recargoHorasExtras,
    items,
    rubros,
    lineaDeRubros,
    renglonesIndirectos,
    editadoEnPantalla: true,
  });
  return { ok: true, estructura, descartados };
}

/** Lo que pide quien crea el borrador desde el presupuesto (RF-11 a RF-13, RF-112). */
export interface PedidoDeBorradorDesdePresupuesto {
  plazo: PlazoDeLaPlanificacion;
  /** `null` si el presupuesto tiene un solo grupo. */
  grupoId: string | null;
  /** La planificación de la cual copiar los indirectos; sin ella, ninguno (RF-120). */
  copiarIndirectosDe?: { id: string; obra: string; version: number; estructura: FuenteDeIndirectos } | null;
}

/** RF-13 a RF-18, RF-88, RF-89, RF-112 a RF-121. El calendario lo propone la IA aparte. */
export function borradorDesdePresupuesto(
  presupuesto: EstructuraDePresupuesto,
  pedido: PedidoDeBorradorDesdePresupuesto,
): { ok: true; estructura: EstructuraDePlanificacion } | { ok: false; error: string } {
  const motivo = validarPlazo(pedido.plazo);
  if (motivo) return { ok: false, error: motivo };
  const grupo =
    presupuesto.grupos.length === 1 ? presupuesto.grupos[0] : presupuesto.grupos.find((g) => g.id === pedido.grupoId);
  if (!grupo) {
    return { ok: false, error: 'El presupuesto tiene varios grupos: escoja el grupo (frente) que se planifica.' };
  }

  const items = grupo.capitulos.flatMap((capitulo) =>
    capitulo.items.map(
      (item): ItemDeLaPlanificacion => ({
        renglon: item.renglon,
        item: item.item,
        descripcion: item.descripcion,
        unidad: item.unidadEscrita,
        grupo: grupo.nombre,
        capitulo: capitulo.nombre,
        precioContractual: item.valorUnitario,
        precioCosto: null,
        medidaReal: item.cantidad,
        medidaCoste: null,
        medidaContractual: item.cantidad,
        mesInicio: null,
        tiempoEjecucion: null,
        programacion: [],
        fijados: [],
        revisar: false,
        delPresupuesto: {
          grupoId: grupo.id,
          grupo: grupo.nombre,
          capituloId: capitulo.id,
          capitulo: capitulo.nombre,
          item: item.item,
          unidad: item.unidadEscrita,
          cantidad: item.cantidad,
          valorUnitario: item.valorUnitario,
        },
      }),
    ),
  );
  const rubros = presupuesto.rubros
    .filter((r) => r.grupoId === null || r.grupoId === grupo.id)
    .map(
      (r): RubroDeLaPlanificacion => ({
        nombre: r.nombre,
        valor: r.valor,
        costo: null,
        programacion: [],
        delPresupuesto: r.id,
        mesInicio: null,
        tiempoEjecucion: null,
        fijados: [],
        revisar: false,
      }),
    );

  const fuente = pedido.copiarIndirectosDe;
  const indirectos = copiarRenglones(fuente?.estructura ?? {}, pedido.plazo);
  const { estructura } = recalcularPlanificacion({
    esquema: ESQUEMA_DE_PLANIFICACION,
    plazo: pedido.plazo,
    items,
    rubros,
    lineaDeRubros: null,
    indirectos: [],
    renglonesIndirectos: indirectos.renglonesIndirectos,
    factorPrestacional: indirectos.factorPrestacional,
    recargoHorasExtras: indirectos.recargoHorasExtras,
    indirectosCopiadosDe: fuente ? { id: fuente.id, obra: fuente.obra, version: fuente.version } : null,
    editadoEnPantalla: false,
    supuestos: '',
    objetivos: '',
  });
  return { ok: true, estructura };
}

/**
 * Del primer al último mes con algo programado o con periodo; `null` si no hay ninguno. Los
 * periodos con meses decimales cuentan hasta el mes en que terminan.
 */
export function plazoDeducido(estructura: EstructuraDePlanificacion): PlazoDeLaPlanificacion | null {
  const meses: string[] = [];
  const periodo = (mesInicio: string | null | undefined, tiempo: number | null | undefined) => {
    if (!mesInicio || !esMesValido(mesInicio) || tiempo === null || tiempo === undefined || !(tiempo >= 1)) return;
    meses.push(mesInicio, sumarMeses(mesInicio, Math.ceil(tiempo) - 1));
  };
  const valores = (lista: readonly ValorDelMes[] | undefined) => {
    for (const m of lista ?? []) if (m.valor !== 0 && esMesValido(m.mes)) meses.push(m.mes);
  };
  for (const item of estructura.items) {
    periodo(item.mesInicio, item.tiempoEjecucion);
    valores(item.programacion);
  }
  for (const rubro of estructura.rubros) {
    periodo(rubro.mesInicio, rubro.tiempoEjecucion);
    valores(rubro.programacion);
  }
  valores(estructura.lineaDeRubros?.fijados ?? estructura.lineaDeRubros?.valores);
  for (const renglon of estructura.renglonesIndirectos ?? []) {
    if (renglon.forma !== 'porcentaje') periodo(renglon.mesInicio, renglon.tiempoEjecucion);
  }
  valores(estructura.indirectos);
  if (meses.length === 0) return null;
  meses.sort();
  const arranque = meses[0];
  const [a1, m1] = arranque.split('-').map(Number);
  const [a2, m2] = meses[meses.length - 1].split('-').map(Number);
  return { meses: (a2 - a1) * 12 + (m2 - m1) + 1, arranque };
}

/** RF-138 a RF-141: el borrador de la versión nueva, recalculado. */
export function copiarVersion(vigente: EstructuraDePlanificacion): EstructuraDePlanificacion {
  const normalizada = normalizarLegada(vigente);
  const { propuesta: _propuesta, totalesPorConceptoDelExcel: _delExcel, ...copia } = normalizada;
  return recalcularPlanificacion({
    ...copia,
    esquema: ESQUEMA_DE_PLANIFICACION,
    plazo: normalizada.plazo ?? plazoDeducido(normalizada) ?? undefined,
    factorPrestacional: normalizada.factorPrestacional ?? FACTOR_PRESTACIONAL_POR_DEFECTO,
    recargoHorasExtras: normalizada.recargoHorasExtras ?? RECARGO_HORAS_EXTRAS_POR_DEFECTO,
    editadoEnPantalla: false,
  }).estructura;
}
