/**
 * El cumplimiento de una obra contra su planificación (spec 043). Reglas puras: sin I/O, como todo
 * `shared/rules`. No es `cumplimiento.ts`, que es el del preoperacional del día.
 *
 * ── Qué versión rige ──
 *
 * Cada día se mide con la versión que regía ese día (RF-52), para que aprobar una nueva no cambie
 * lo ya informado. Las versiones llevan su rango en fechas de Colombia, resueltas una sola vez al
 * escribirlas: una versión rige desde el día en que se aprueba (RF-120), y quien deja de regir,
 * porque la reemplazan o la anulan, llega hasta el día anterior (RF-138).
 *
 * Antes de la primera aprobación rige la primera versión, aunque se haya anulado después (RF-57):
 * esos días no tuvieron otra. Una versión reemplazada el mismo día en que se aprobó no rigió
 * ninguno, y su rango queda invertido, pero sigue siendo la primera.
 *
 * ── La meta es una sola cuenta ──
 *
 * Cada día de reparto (lunes a sábado sin festivos, RF-65) vale la cantidad del mes entre los días
 * de reparto de ese mes, con la versión que rige ese día. La meta de cualquier periodo es la suma
 * de sus días: así el mes da exacto lo programado, y la semana entre dos meses y el periodo partido
 * por un cambio de versión no necesitan fórmula propia, que es donde una regla empezaría a diferir.
 *
 * La meta no recibe lo ejecutado: lo que no se cumplió no se arrastra (RF-130).
 *
 * ── Qué cuenta como ejecutado ──
 *
 * Una actividad suma a un ítem solo si coinciden su grupo, su capítulo y su ítem de pago (RF-126).
 * Lo que no, sale aparte como «fuera de la planificación» y no se pierde: sin esa lista, una obra
 * parecería atrasada cuando en realidad se está registrando contra otro frente.
 *
 * ── La plata ──
 *
 * Se valora día por día con los precios de la versión que regía, igual que la meta: aprobar una
 * versión nueva no reescribe la plata de los días anteriores. Un ítem sin precio de costo sale de
 * todos los totales (RF-81), también del valor a cobrar: dejarlo en lo que se cobra y fuera de lo
 * que cuesta inflaría el margen justo en los ítems de los que no se sabe nada.
 *
 * El «Faltó» o «Sobró» compara a precio de costo lo ejecutado contra lo programado. No mide lo que
 * realmente se gastó: eso no entra a este sistema.
 *
 * ── Sin plata no es plata oculta ──
 *
 * `sinPlata` construye otro objeto con una lista de lo que sí puede salir, en vez de borrar lo que
 * no. Si mañana el informe gana un campo con un costo, al Residente no le llega por omisión.
 */
import { diaDeLaSemana, esFestivo } from './festivos';
import { sumarDias } from './jornada';
import { diasDe, periodoDe } from './periodos';
import {
  llaveDeItemPlanificado,
  llaveDelItem,
  rubrosDelMes,
  sinPrecioDeCosto,
  type EstructuraDePlanificacion,
  type ItemDeLaPlanificacion,
  type ProgramacionDeRubros,
} from './planificacion';
import type { Rol } from './permisos';
import { planQueRige, type PlanAprobado } from './plan-semanal';
import { redondearCantidad } from './presupuesto';
import type { ActividadLeida } from './reportes';

export interface VersionAprobada {
  id: string;
  numeroVersion: number;
  /** `YYYY-MM-DD`, fecha de Colombia. */
  rigeDesde: string;
  /** Incluido; `null` mientras siga vigente. */
  rigeHasta: string | null;
}

export interface TramoDelPeriodo {
  /** `null`: esos días no tienen versión que los mida (RF-56). */
  versionId: string | null;
  desde: string;
  hasta: string;
}

/** RF-138: quien deja de regir hoy, rigió hasta ayer. */
export function ultimoDiaQueRige(hoy: string): string {
  return sumarDias(hoy, -1);
}

function primeraAprobada<V extends VersionAprobada>(versiones: readonly V[]): V | null {
  return (
    [...versiones].sort((a, b) => a.rigeDesde.localeCompare(b.rigeDesde) || a.numeroVersion - b.numeroVersion)[0] ?? null
  );
}

/** La versión que mide esa fecha, o `null` si no la mide ninguna (RF-52, RF-55 a RF-57). */
export function versionQueRige<V extends VersionAprobada>(fecha: string, versiones: readonly V[]): V | null {
  const queRegia = versiones.find((v) => v.rigeDesde <= fecha && (v.rigeHasta === null || fecha <= v.rigeHasta));
  if (queRegia) return queRegia;
  const primera = primeraAprobada(versiones);
  return primera && fecha < primera.rigeDesde ? primera : null;
}

/** RF-53: el periodo partido en tramos seguidos de una misma versión. */
export function tramosDelPeriodo(desde: string, hasta: string, versiones: readonly VersionAprobada[]): TramoDelPeriodo[] {
  const tramos: TramoDelPeriodo[] = [];
  for (const dia of diasDe({ desde, hasta })) {
    const versionId = versionQueRige(dia, versiones)?.id ?? null;
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.versionId === versionId) ultimo.hasta = dia;
    else tramos.push({ versionId, desde: dia, hasta: dia });
  }
  return tramos;
}

/** RF-121: los meses anteriores al actual que tienen algo programado, en orden. */
export function mesesAnterioresPorMarcar(items: readonly Pick<ItemDeLaPlanificacion, 'programacion'>[], hoy: string): string[] {
  const mesActual = hoy.slice(0, 7);
  const meses = items.flatMap((item) => item.programacion.filter((p) => p.valor > 0 && p.mes < mesActual).map((p) => p.mes));
  return [...new Set(meses)].sort();
}

const DOMINGO = 0;

function esDiaDeReparto(dia: string): boolean {
  return diaDeLaSemana(dia) !== DOMINGO && !esFestivo(dia);
}

/** RF-65: los días de lunes a sábado del mes `YYYY-MM` que no son festivos. */
export function diasDeReparto(mes: string): string[] {
  return diasDe(periodoDe('mes', `${mes}-01`)).filter(esDiaDeReparto);
}

// Vive en `planificacion.ts` desde la spec 044, que también la usa; aquí se sigue ofreciendo igual.
export { llaveDeItemPlanificado };

export interface VersionMedible extends VersionAprobada {
  /** La cantidad programada: `llave → mes → cantidad`. */
  cantidades: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Los precios de cada ítem en esta versión. */
  precios: ReadonlyMap<string, { costo: number | null; contractual: number | null }>;
  /** `mes → pesos`. */
  indirectos: ReadonlyMap<string, number>;
  programacionDeRubros: ProgramacionDeRubros;
}

/** Una versión lista para medir. Solo cuenta lo programado con cantidad mayor que cero. */
export function versionMedible(
  version: VersionAprobada,
  items: readonly Pick<
    ItemDeLaPlanificacion,
    'delPresupuesto' | 'grupo' | 'capitulo' | 'item' | 'programacion' | 'precioCosto' | 'precioContractual'
  >[],
  extras: Partial<Pick<EstructuraDePlanificacion, 'indirectos' | 'rubros' | 'lineaDeRubros'>> = {},
): VersionMedible {
  const cantidades = new Map<string, Map<string, number>>();
  const precios = new Map<string, { costo: number | null; contractual: number | null }>();
  for (const item of items) {
    precios.set(llaveDeItemPlanificado(item), { costo: item.precioCosto, contractual: item.precioContractual });
    const delItem = new Map<string, number>();
    for (const { mes, cantidad } of item.programacion) {
      if (cantidad !== null && cantidad > 0) delItem.set(mes, cantidad);
    }
    cantidades.set(llaveDeItemPlanificado(item), delItem);
  }
  return {
    ...version,
    cantidades,
    precios,
    indirectos: new Map((extras.indirectos ?? []).map(({ mes, valor }) => [mes, valor])),
    programacionDeRubros: { rubros: extras.rubros ?? [], lineaDeRubros: extras.lineaDeRubros ?? null },
  };
}

export interface PeriodoDeMeta {
  tipo: 'semana' | 'mes';
  desde: string;
  hasta: string;
}

export interface MetaDelPeriodo {
  /** `null`: ningún día del periodo tiene meta para este ítem (RF-56, RF-73). */
  meta: number | null;
  /** RF-66: algún día salió de repartir el mes. */
  estimada: boolean;
  /**
   * Spec 044, RF-95: cuántos días salieron de un plan semanal aprobado. Solo aparece si hay alguno:
   * con días de los dos tipos, la fila es «Parcialmente estimada».
   */
  diasDelPlan?: number;
}

/**
 * Spec 044, RF-95: cómo se dice que una meta no salió entera del plan. «Estimada» si todos sus días
 * salieron de repartir el mes; «Parcialmente estimada» con cuántos días salieron del plan si se
 * mezclan; nada si salió entera del plan o no hay meta. Se escribe una vez para que la pantalla, el
 * Excel y el PDF digan lo mismo.
 */
export function etiquetaDeEstimada(fila: { meta: number | null; estimada: boolean; diasDelPlan?: number }): string | null {
  if (fila.meta === null || !fila.estimada) return null;
  if (fila.diasDelPlan) return `Parcialmente estimada (${fila.diasDelPlan} ${fila.diasDelPlan === 1 ? 'día' : 'días'} del plan)`;
  return 'Estimada';
}

/** Spec 044: un plan semanal aprobado, con lo que pide cada día a cada ítem (`metasPorDiaDelPlan`). */
export interface PlanSemanalParaMedir extends PlanAprobado {
  metasPorDia: ReadonlyMap<string, ReadonlyMap<string, number>>;
}

/**
 * RF-63 a RF-67, RF-119; spec 044, RF-70 a RF-77, RF-95. Día por día: si rige un plan semanal
 * aprobado, la meta de ese día es la del plan (y un ítem que no está en el plan no tiene meta ese
 * día); si no, el reparto del mes. Sin planificación que rija, ningún día tiene meta, haya o no plan
 * (044/RF-77). La meta del mes no usa planes (044/RF-74).
 */
export function metaDelPeriodo(
  llave: string,
  periodo: PeriodoDeMeta,
  versiones: readonly VersionMedible[],
  planes: readonly PlanSemanalParaMedir[] = [],
): MetaDelPeriodo {
  const conPlanes = periodo.tipo === 'semana' && planes.length > 0;
  const repartos = new Map<string, number>();
  let suma = 0;
  let tieneMeta = false;
  let estimados = 0;
  let delPlan = 0;
  for (const dia of diasDe(periodo)) {
    const version = versionQueRige(dia, versiones);
    const plan = conPlanes ? planQueRige(dia, planes) : null;
    if (plan) {
      const cantidad = version ? plan.metasPorDia.get(dia)?.get(llave) : undefined;
      if (cantidad === undefined) continue;
      suma += cantidad;
      tieneMeta = true;
      delPlan += 1;
      continue;
    }
    if (!esDiaDeReparto(dia)) continue;
    const mes = dia.slice(0, 7);
    const cantidad = version?.cantidades.get(llave)?.get(mes);
    if (cantidad === undefined) continue;
    if (!repartos.has(mes)) repartos.set(mes, diasDeReparto(mes).length);
    suma += cantidad / (repartos.get(mes) as number);
    tieneMeta = true;
    estimados += 1;
  }
  return {
    meta: tieneMeta ? redondearCantidad(suma) : null,
    estimada: periodo.tipo === 'semana' && estimados > 0,
    ...(delPlan > 0 ? { diasDelPlan: delPlan } : {}),
  };
}

/** Un parte de obra como lo necesita el informe. */
export interface ParteMedido {
  fecha: string;
  cerrado: boolean;
  anulado: boolean;
  actividades: readonly ActividadLeida[];
}

export type EstadoDeFila = 'normal' | 'sin_programacion' | 'meta_cumplida';

export interface FilaDeCumplimiento {
  llave: string;
  item: ItemDeLaPlanificacion;
  meta: number | null;
  estimada: boolean;
  /** Spec 044, RF-95: los días que salieron del plan semanal, si hubo alguno. */
  diasDelPlan?: number;
  ejecutado: number;
  /** `null` si no tiene meta o el mes está marcado como cumplido (RF-73, RF-123). */
  porcentaje: number | null;
  pendientePeriodo: number;
  planeada: number | null;
  acumulado: number;
  pendienteTotal: number | null;
  estado: EstadoDeFila;
}

export interface ActividadFueraDeLaPlanificacion {
  fecha: string;
  item: string | null;
  nombre: string;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
  /** RF-127. */
  marca: 'sin_capitulo' | null;
}

export interface AvisosDelPeriodo {
  /** RF-61. */
  diasAbiertos: number;
  /** RF-62. */
  cifrasPuedenCambiar: boolean;
  /** RF-128: de lunes a sábado sin festivos, hasta hoy. */
  diasSinParte: number;
}

export interface EjecucionDelPeriodo {
  filas: FilaDeCumplimiento[];
  fuera: ActividadFueraDeLaPlanificacion[];
  avisos: AvisosDelPeriodo;
}

export interface PedidoDeEjecucion {
  periodo: PeriodoDeMeta;
  /** `YYYY-MM-DD`, fecha de Colombia. */
  hoy: string;
  /** Los ítems de las versiones que miden el periodo, sin repetir. */
  items: readonly ItemDeLaPlanificacion[];
  versiones: readonly VersionMedible[];
  partesDelPeriodo: readonly ParteMedido[];
  /** Todos hasta el fin del periodo, para el acumulado de la obra. */
  partesAcumuladas: readonly ParteMedido[];
  /** `YYYY-MM`. */
  mesesCumplidos: readonly string[];
  /** Spec 044: los planes semanales aprobados que tocan el periodo. */
  planesSemanales?: readonly PlanSemanalParaMedir[];
}

function llaveDeActividad(actividad: ActividadLeida): string {
  return llaveDelItem(actividad.grupo ?? '', actividad.capitulo ?? '', actividad.item ?? '');
}

/** RF-124: el mes marcado, o la semana que cae por completo dentro de uno marcado. */
function estaMarcado(periodo: PeriodoDeMeta, mesesCumplidos: readonly string[]): boolean {
  const mes = periodo.desde.slice(0, 7);
  return periodo.hasta.slice(0, 7) === mes && mesesCumplidos.includes(mes);
}

function sumarPorLlave(partes: readonly ParteMedido[]): Map<string, number> {
  const suma = new Map<string, number>();
  for (const parte of partes) {
    if (parte.anulado) continue;
    for (const actividad of parte.actividades) {
      if (!actividad.item || !actividad.capituloId || !actividad.cantidad) continue;
      const llave = llaveDeActividad(actividad);
      suma.set(llave, (suma.get(llave) ?? 0) + actividad.cantidad);
    }
  }
  return suma;
}

/**
 * Spec 044, RF-33, RF-93: lo que le falta a cada ítem en la obra, por su llave. Es el mismo
 * «pendiente total» del informe (planeada menos acumulado, sin partes anulados), para que el aviso
 * del plan y el informe nunca den dos cifras distintas. Un ítem sin medida planeada no aparece.
 */
export function pendientesPorLlave(
  items: readonly Pick<ItemDeLaPlanificacion, 'delPresupuesto' | 'grupo' | 'capitulo' | 'item' | 'medidaReal'>[],
  partes: readonly ParteMedido[],
): Map<string, number> {
  const acumulado = sumarPorLlave(partes);
  const pendientes = new Map<string, number>();
  for (const item of items) {
    if (item.medidaReal === null) continue;
    const llave = llaveDeItemPlanificado(item);
    pendientes.set(llave, redondearCantidad(Math.max(item.medidaReal - redondearCantidad(acumulado.get(llave) ?? 0), 0)));
  }
  return pendientes;
}

/** Lo ejecutado frente a la meta, ítem por ítem (RF-60 a RF-62, RF-68 a RF-74, RF-123 a RF-129). */
export function ejecucionDelPeriodo(pedido: PedidoDeEjecucion): EjecucionDelPeriodo {
  const { periodo, hoy, items, versiones, mesesCumplidos } = pedido;
  const vigentes = pedido.partesDelPeriodo.filter((parte) => !parte.anulado);
  const delPeriodo = sumarPorLlave(vigentes);
  const acumulado = sumarPorLlave(pedido.partesAcumuladas);
  const marcado = estaMarcado(periodo, mesesCumplidos);

  const filas = items.flatMap((item): FilaDeCumplimiento[] => {
    const llave = llaveDeItemPlanificado(item);
    const { meta, estimada, diasDelPlan } = metaDelPeriodo(llave, periodo, versiones, pedido.planesSemanales ?? []);
    const ejecutado = redondearCantidad(delPeriodo.get(llave) ?? 0);
    if (meta === null && ejecutado === 0) return [];

    const cumplida = meta !== null && marcado;
    const acumuladoDelItem = redondearCantidad(acumulado.get(llave) ?? 0);
    return [
      {
        llave,
        item,
        meta,
        estimada,
        ...(diasDelPlan ? { diasDelPlan } : {}),
        ejecutado,
        porcentaje: meta === null || meta === 0 || cumplida ? null : Math.round((ejecutado / meta) * 1000) / 10,
        pendientePeriodo: meta === null || cumplida ? 0 : redondearCantidad(Math.max(meta - ejecutado, 0)),
        planeada: item.medidaReal,
        acumulado: acumuladoDelItem,
        pendienteTotal: item.medidaReal === null ? null : redondearCantidad(Math.max(item.medidaReal - acumuladoDelItem, 0)),
        estado: meta === null ? 'sin_programacion' : cumplida ? 'meta_cumplida' : 'normal',
      },
    ];
  });

  const planificadas = new Set(items.map(llaveDeItemPlanificado));
  const fuera = [...vigentes]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .flatMap((parte) =>
      parte.actividades.flatMap((actividad): ActividadFueraDeLaPlanificacion[] => {
        const sinCapitulo = Boolean(actividad.item) && !actividad.capituloId;
        if (actividad.item && !sinCapitulo && planificadas.has(llaveDeActividad(actividad))) return [];
        return [
          {
            fecha: parte.fecha,
            item: actividad.item ?? null,
            nombre: actividad.nombre,
            descripcion: actividad.descripcion,
            unidad: actividad.unidad ?? null,
            cantidad: actividad.cantidad ?? null,
            marca: sinCapitulo ? 'sin_capitulo' : null,
          },
        ];
      }),
    );

  const diasAbiertos = vigentes.filter((parte) => !parte.cerrado).length;
  const conParte = new Set(vigentes.map((parte) => parte.fecha));
  return {
    filas,
    fuera,
    avisos: {
      diasAbiertos,
      cifrasPuedenCambiar: diasAbiertos > 0,
      diasSinParte: diasDe(periodo).filter((dia) => dia <= hoy && esDiaDeReparto(dia) && !conParte.has(dia)).length,
    },
  };
}

export interface FilaDeValores {
  llave: string;
  /** `null` en los tres si el ítem no tiene precio de costo (RF-81). */
  programado: number | null;
  ejecutado: number | null;
  aCobrar: number | null;
}

export interface TotalesDeValores {
  programado: number;
  ejecutado: number;
  aCobrar: number;
  /** RF-78. `tipo` nulo cuando lo ejecutado iguala lo programado. */
  faltoSobro: { tipo: 'falto' | 'sobro' | null; valor: number };
  /** RF-79: antes de indirectos. */
  margen: number;
  /** RF-131, RF-132: solo en el mensual. */
  resultado: number | null;
}

export interface ValoresDelPeriodo {
  filas: FilaDeValores[];
  totales: TotalesDeValores;
  /** RF-80: lo ejecutado de ítems sin precio de costo, con su cantidad. */
  sinPrecioDeCosto: { llave: string; item: string; cantidad: number }[];
  /** RF-82. */
  avisoSinCosto: boolean;
  /** RF-83: solo en el mensual. */
  indirectos: number | null;
  /** RF-133: solo en el mensual. */
  rubros: { nombre: string; valor: number }[];
}

export interface PedidoDeValores {
  periodo: PeriodoDeMeta;
  items: readonly ItemDeLaPlanificacion[];
  versiones: readonly VersionMedible[];
  partesDelPeriodo: readonly ParteMedido[];
  /** Spec 044: los planes semanales aprobados que tocan el periodo. */
  planesSemanales?: readonly PlanSemanalParaMedir[];
}

function tieneCosto(precios: { costo: number | null; contractual: number | null } | undefined): precios is { costo: number; contractual: number } {
  return precios !== undefined && !sinPrecioDeCosto(precios.costo) && precios.contractual !== null;
}

/** Cada día de reparto del periodo con su versión, y lo que ese día vale de un monto del mes. */
function diasConVersion(periodo: PeriodoDeMeta, versiones: readonly VersionMedible[]) {
  const repartos = new Map<string, number>();
  return diasDe(periodo).flatMap((dia) => {
    const version = esDiaDeReparto(dia) ? versionQueRige(dia, versiones) : null;
    if (!version) return [];
    const mes = dia.slice(0, 7);
    if (!repartos.has(mes)) repartos.set(mes, diasDeReparto(mes).length);
    return [{ dia, version, mes, fraccion: 1 / (repartos.get(mes) as number) }];
  });
}

/** RF-75 a RF-85, RF-131 a RF-135. Indirectos y rubros se parten por días, como la meta. */
export function valoresDelPeriodo(pedido: PedidoDeValores): ValoresDelPeriodo {
  const { periodo, items, versiones, partesDelPeriodo } = pedido;
  const esMes = periodo.tipo === 'mes';
  const dias = diasConVersion(periodo, versiones);
  // Spec 044: los días que mide un plan semanal, con la versión que rige cada uno (RF-75).
  const planes = periodo.tipo === 'semana' ? (pedido.planesSemanales ?? []) : [];
  const diasDelPlan = diasDe(periodo).flatMap((dia) => {
    const plan = planes.length > 0 ? planQueRige(dia, planes) : null;
    return plan ? [{ dia, plan, version: versionQueRige(dia, versiones) }] : [];
  });
  const conPlan = new Set(diasDelPlan.map((d) => d.dia));

  const programado = new Map<string, number>();
  const ejecutado = new Map<string, number>();
  const aCobrar = new Map<string, number>();
  const sinCosto = new Map<string, { llave: string; item: string; cantidad: number }>();
  let avisoSinCosto = false;

  const llaves = new Map(items.map((item) => [llaveDeItemPlanificado(item), item]));
  for (const llave of llaves.keys()) {
    for (const { dia, plan, version } of diasDelPlan) {
      const cantidad = version ? plan.metasPorDia.get(dia)?.get(llave) : undefined;
      if (cantidad === undefined || !version) continue;
      const precios = version.precios.get(llave);
      if (tieneCosto(precios)) programado.set(llave, (programado.get(llave) ?? 0) + cantidad * precios.costo);
      else avisoSinCosto = true;
    }
    for (const { dia, version, mes, fraccion } of dias) {
      if (conPlan.has(dia)) continue;
      const cantidad = version.cantidades.get(llave)?.get(mes);
      if (cantidad === undefined) continue;
      const precios = version.precios.get(llave);
      if (tieneCosto(precios)) programado.set(llave, (programado.get(llave) ?? 0) + cantidad * fraccion * precios.costo);
      else avisoSinCosto = true;
    }
  }

  for (const parte of partesDelPeriodo) {
    if (parte.anulado) continue;
    const version = versionQueRige(parte.fecha, versiones);
    if (!version) continue;
    for (const actividad of parte.actividades) {
      if (!actividad.item || !actividad.capituloId || !actividad.cantidad) continue;
      const llave = llaveDeActividad(actividad);
      const item = llaves.get(llave);
      if (!item) continue;
      const precios = version.precios.get(llave);
      if (tieneCosto(precios)) {
        ejecutado.set(llave, (ejecutado.get(llave) ?? 0) + actividad.cantidad * precios.costo);
        aCobrar.set(llave, (aCobrar.get(llave) ?? 0) + actividad.cantidad * precios.contractual);
      } else {
        avisoSinCosto = true;
        const aparte = sinCosto.get(llave) ?? { llave, item: item.item, cantidad: 0 };
        sinCosto.set(llave, { ...aparte, cantidad: redondearCantidad(aparte.cantidad + actividad.cantidad) });
      }
    }
  }

  const filas = [...llaves.keys()].map((llave): FilaDeValores => {
    const excluido = !programado.has(llave) && !ejecutado.has(llave) && (sinCosto.has(llave) || !tienePrecioEnAlguna(llave, versiones));
    return {
      llave,
      programado: excluido ? null : Math.round(programado.get(llave) ?? 0),
      ejecutado: excluido ? null : Math.round(ejecutado.get(llave) ?? 0),
      aCobrar: excluido ? null : Math.round(aCobrar.get(llave) ?? 0),
    };
  });

  const sumar = (valores: Map<string, number>) => Math.round([...valores.values()].reduce((suma, valor) => suma + valor, 0));
  const totalProgramado = sumar(programado);
  const totalEjecutado = sumar(ejecutado);
  const totalACobrar = sumar(aCobrar);
  const margen = totalACobrar - totalEjecutado;
  const diferencia = totalEjecutado - totalProgramado;

  const indirectos = esMes ? Math.round(dias.reduce((suma, d) => suma + (d.version.indirectos.get(d.mes) ?? 0) * d.fraccion, 0)) : null;
  const rubros = new Map<string, number>();
  if (esMes) {
    for (const { version, mes, fraccion } of dias) {
      for (const { nombre, valor } of rubrosDelMes(version.programacionDeRubros, mes)) {
        rubros.set(nombre, (rubros.get(nombre) ?? 0) + valor * fraccion);
      }
    }
  }

  return {
    filas,
    totales: {
      programado: totalProgramado,
      ejecutado: totalEjecutado,
      aCobrar: totalACobrar,
      faltoSobro: { tipo: diferencia < 0 ? 'falto' : diferencia > 0 ? 'sobro' : null, valor: Math.abs(diferencia) },
      margen,
      resultado: indirectos === null ? null : margen - indirectos,
    },
    sinPrecioDeCosto: [...sinCosto.values()],
    avisoSinCosto,
    indirectos,
    rubros: [...rubros].map(([nombre, valor]) => ({ nombre, valor: Math.round(valor) })),
  };
}

function tienePrecioEnAlguna(llave: string, versiones: readonly VersionMedible[]): boolean {
  return versiones.some((version) => tieneCosto(version.precios.get(llave)));
}

/** RF-58, RF-59: la semana de lunes a domingo o el mes del calendario que contienen la fecha. */
export function periodoDelInforme(tipo: PeriodoDeMeta['tipo'], fecha: string): PeriodoDeMeta {
  const { desde, hasta } = periodoDe(tipo, fecha);
  return { tipo, desde, hasta };
}

/** Una versión aprobada con lo que hace falta para medir e informar. */
export interface VersionDelInforme extends VersionMedible {
  items: readonly ItemDeLaPlanificacion[];
}

export interface PedidoDeInforme {
  periodo: PeriodoDeMeta;
  hoy: string;
  versiones: readonly VersionDelInforme[];
  partesDelPeriodo: readonly ParteMedido[];
  partesAcumuladas: readonly ParteMedido[];
  mesesCumplidos: readonly string[];
  /** Spec 044: los planes semanales aprobados que tocan el periodo. */
  planesSemanales?: readonly PlanSemanalParaMedir[];
}

/** Lo que el informe dice de un ítem, solo en cantidades. */
export interface FilaEnCantidades {
  llave: string;
  item: string;
  descripcion: string;
  unidad: string;
  grupo: string;
  capitulo: string;
  meta: number | null;
  estimada: boolean;
  /** Spec 044, RF-95: los días que salieron del plan semanal, si hubo alguno. */
  diasDelPlan?: number;
  ejecutado: number;
  porcentaje: number | null;
  pendientePeriodo: number;
  planeada: number | null;
  acumulado: number;
  pendienteTotal: number | null;
  estado: EstadoDeFila;
}

export interface FilaDelInforme extends FilaEnCantidades {
  valores: { programado: number | null; ejecutado: number | null; aCobrar: number | null };
}

export interface InformeEnCantidades {
  periodo: PeriodoDeMeta;
  /** RF-54: los tramos del periodo y la versión de cada uno. */
  versiones: { numeroVersion: number; desde: string; hasta: string }[];
  /** RF-56: algún día del periodo no tiene planificación aprobada. */
  sinPlanificacion: boolean;
  fuera: ActividadFueraDeLaPlanificacion[];
  avisos: AvisosDelPeriodo;
  filas: FilaEnCantidades[];
}

export interface InformeDeCumplimiento extends Omit<InformeEnCantidades, 'filas'> {
  filas: FilaDelInforme[];
  totales: TotalesDeValores;
  sinPrecioDeCosto: ValoresDelPeriodo['sinPrecioDeCosto'];
  avisoSinCosto: boolean;
  indirectos: number | null;
  rubros: { nombre: string; valor: number }[];
}

/**
 * Los ítems del informe, sin repetir: primero los de las versiones que miden el periodo, de la más
 * reciente hacia atrás. Luego los demás, para que lo ejecutado tras una anulación se siga viendo.
 */
function itemsDelInforme(versiones: readonly VersionDelInforme[], usadas: ReadonlySet<string>): ItemDeLaPlanificacion[] {
  const orden = [...versiones].sort(
    (a, b) => Number(usadas.has(b.id)) - Number(usadas.has(a.id)) || b.numeroVersion - a.numeroVersion,
  );
  const items = new Map<string, ItemDeLaPlanificacion>();
  for (const version of orden) {
    for (const item of version.items) {
      const llave = llaveDeItemPlanificado(item);
      if (!items.has(llave)) items.set(llave, item);
    }
  }
  return [...items.values()];
}

/** El informe del periodo: la única cuenta de pantalla, descargas y asistente (RF-96). */
export function informeDeCumplimiento(pedido: PedidoDeInforme): InformeDeCumplimiento {
  const { periodo, versiones, partesDelPeriodo } = pedido;
  const tramos = tramosDelPeriodo(periodo.desde, periodo.hasta, versiones);
  const usadas = new Set(tramos.flatMap((tramo) => (tramo.versionId ? [tramo.versionId] : [])));
  const items = itemsDelInforme(versiones, usadas);

  const ejecucion = ejecucionDelPeriodo({ ...pedido, items });
  const valores = valoresDelPeriodo({ periodo, items, versiones, partesDelPeriodo, planesSemanales: pedido.planesSemanales });
  const valoresPorLlave = new Map(valores.filas.map((fila) => [fila.llave, fila]));

  return {
    periodo,
    versiones: tramos.flatMap((tramo) => {
      const version = versiones.find((v) => v.id === tramo.versionId);
      return version ? [{ numeroVersion: version.numeroVersion, desde: tramo.desde, hasta: tramo.hasta }] : [];
    }),
    sinPlanificacion: tramos.some((tramo) => tramo.versionId === null),
    filas: ejecucion.filas.map((fila) => {
      const delItem = valoresPorLlave.get(fila.llave);
      return {
        llave: fila.llave,
        item: fila.item.item,
        descripcion: fila.item.descripcion,
        unidad: fila.item.unidad,
        grupo: fila.item.delPresupuesto?.grupo ?? fila.item.grupo,
        capitulo: fila.item.delPresupuesto?.capitulo ?? fila.item.capitulo,
        meta: fila.meta,
        estimada: fila.estimada,
        ...(fila.diasDelPlan ? { diasDelPlan: fila.diasDelPlan } : {}),
        ejecutado: fila.ejecutado,
        porcentaje: fila.porcentaje,
        pendientePeriodo: fila.pendientePeriodo,
        planeada: fila.planeada,
        acumulado: fila.acumulado,
        pendienteTotal: fila.pendienteTotal,
        estado: fila.estado,
        valores: { programado: delItem?.programado ?? null, ejecutado: delItem?.ejecutado ?? null, aCobrar: delItem?.aCobrar ?? null },
      };
    }),
    fuera: ejecucion.fuera,
    avisos: ejecucion.avisos,
    totales: valores.totales,
    sinPrecioDeCosto: valores.sinPrecioDeCosto,
    avisoSinCosto: valores.avisoSinCosto,
    indirectos: valores.indirectos,
    rubros: valores.rubros,
  };
}

/** RF-88, RF-89: solo cantidades y porcentajes, armado campo por campo. */
export function sinPlata(informe: InformeDeCumplimiento): InformeEnCantidades {
  return {
    periodo: informe.periodo,
    versiones: informe.versiones,
    sinPlanificacion: informe.sinPlanificacion,
    fuera: informe.fuera,
    avisos: informe.avisos,
    filas: informe.filas.map((fila) => ({
      llave: fila.llave,
      item: fila.item,
      descripcion: fila.descripcion,
      unidad: fila.unidad,
      grupo: fila.grupo,
      capitulo: fila.capitulo,
      meta: fila.meta,
      estimada: fila.estimada,
      ...(fila.diasDelPlan ? { diasDelPlan: fila.diasDelPlan } : {}),
      ejecutado: fila.ejecutado,
      porcentaje: fila.porcentaje,
      pendientePeriodo: fila.pendientePeriodo,
      planeada: fila.planeada,
      acumulado: fila.acumulado,
      pendienteTotal: fila.pendienteTotal,
      estado: fila.estado,
    })),
  };
}

/** RF-87, RF-88: lo que le toca a cada acceso. El Residente, sin plata. */
export function informeSegunRol(informe: InformeDeCumplimiento, rol: Rol): InformeDeCumplimiento | InformeEnCantidades {
  return rol === 'residente' ? sinPlata(informe) : informe;
}
