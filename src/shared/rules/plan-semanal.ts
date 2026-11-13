/**
 * El plan de trabajo semanal (spec 044). Reglas puras: sin I/O ni dependencias. Las usan la
 * pantalla, el servidor al guardar y aprobar, y la regla de cumplimiento, que toma de aquí la meta
 * de cada día.
 *
 * ── La semana se nombra por su lunes ──
 *
 * Un plan es de una semana de lunes a domingo (RF-1), y la semana se guarda como la fecha de su
 * lunes. Es la misma semana de los informes de la 043 (`periodoDe('semana', …)`), así que un plan y
 * el cumplimiento de esa semana hablan siempre de los mismos siete días.
 *
 * ── Qué semanas se planean ──
 *
 * La en curso y hasta cuatro más (RF-2). Una semana que ya terminó no se arma ni se aprueba
 * (RF-3, RF-99): se midió con la meta estimada, y aprobar un plan después reescribiría una meta ya
 * medida para que el cumplimiento saliera mejor. «Hoy» llega como parámetro, la fecha de Colombia
 * (`fechaDeJornada`): la regla no lee el reloj.
 *
 * ── Los días ──
 *
 * Se trabaja de lunes a sábado (RF-17); el domingo no se marca nunca. Los festivos salen
 * desmarcados (RF-19) pero se pueden marcar (RF-20): hay obras que los trabajan. Marcar uno aquí no
 * cambia el reparto estimado de la 043, que sigue sin festivos (D28).
 *
 * ── El reparto suma exacto ──
 *
 * El Excel de la Directora repartía la meta entre cuatro días y la programaba en cinco, así que el
 * total pasaba la meta en un 25 %. Aquí la meta diaria y el total los da la regla (RF-24, RF-25,
 * RF-84), y el reparto en partes iguales deja la diferencia de redondeo en el último día marcado
 * (RF-21): 10 entre 3 es 3,333 + 3,333 + 3,334, y la suma da la meta. Un ajuste a mano se acepta si
 * suma la meta (RF-22, RF-23), con la holgura de lo que se pierde a tres decimales.
 *
 * ── Cada actividad, contra la planificación ──
 *
 * Una actividad mide contra un ítem si cruza con él (RF-88): por su llave —frente del presupuesto,
 * capítulo e ítem de pago, la misma con que mide el cumplimiento—, o por el renglón cuando el libro
 * solo trae el «Nº» (RF-89). Lo que no cruza queda «fuera» con todo lo que traía (RF-31, RF-32,
 * RF-41): la cuadrilla igual tiene que saber qué hacer. Un rubro, como «Componentes», lleva su valor
 * y no tiene meta en cantidades (RF-97). El frente de trabajo es un rótulo libre (RF-91): no
 * participa del cruce, porque «1. Transporte» no es un frente del presupuesto.
 *
 * ── Valores y avisos ──
 *
 * El valor de una actividad es su meta por el precio de costo de su ítem en la planificación (RF-26),
 * el mismo criterio de los informes de la 043; se calcula cada vez que se muestra o se descarga, no se
 * guarda (RF-94). Un ítem sin costo real —vacío, cero o relleno por debajo de un peso, como en la
 * 043— queda sin valor y con aviso (RF-28). Un rubro suma el valor que trae (RF-97). Lo que está
 * «Fuera de la planificación» no tiene precio con qué valer y no suma.
 *
 * Los avisos no impiden aprobar: se confirman una sola vez (RF-60). Lo pendiente, la planificación
 * vigente y lo que traía el Excel llegan como datos, porque los sabe el servidor.
 *
 * ── Quién aprueba y qué plan rige ──
 *
 * Quién aprueba depende de quién **creó** el plan (RF-56 a RF-58, D16), decidido por Diego: lo de los
 * directores de proyectos y de la Gerencia, ellos dos; lo del Director de Obra y del Residente, además
 * el Director de Obra. El Residente nunca (RF-59). Que el Director de Obra sea «de esa obra» no se mira
 * aquí: la ruta ya rechazó el plan si su obra no está a su alcance. Anular sigue la misma regla (RF-65).
 *
 * Un plan rige desde el día en que se aprueba, o desde el lunes si su semana no ha empezado (RF-62),
 * hasta el domingo, o hasta el día anterior a anularlo (RF-67). Como no puede haber dos vigentes en una
 * semana y un anulado termina antes de que rija el siguiente, cada día lo mide a lo sumo un plan
 * (RF-68). Aprobado y anulado el mismo día, el rango queda al revés y no rige ningún día, igual que una
 * planificación en la 043.
 *
 * ── La plata y el Residente ──
 *
 * El Residente arma el plan, pero no ve plata, como en la 043 (RF-29, RF-30). No basta con quitar los
 * valores: los textos libres que propone la IA o que vienen del Excel pueden traer cifras («cada
 * volqueta parada resta ≈ $3 millones»), así que **cualquier** texto del plan que contenga pesos se le
 * muestra como «Contiene valores en pesos» (RF-102, D22). Se recorre la estructura entera y no una
 * lista de campos: un campo de texto nuevo queda cubierto sin acordarse de añadirlo aquí. «Contiene
 * pesos» es el signo «$» o la palabra «pesos» (RF-103); «peso», en singular, es un peso en kilos.
 */
import { diaDeLaSemana, esFestivo } from './festivos';
import type { Rol } from './permisos';
import { sumarDias } from './jornada';
import { llaveDeItemPlanificado, llaveDelItem, sinPrecioDeCosto, type ItemDeLaPlanificacion } from './planificacion';
import { redondearCantidad } from './presupuesto';

export const ESTADOS_DE_PLAN_SEMANAL = ['borrador', 'vigente', 'anulado', 'descartado'] as const;
export type EstadoDePlanSemanal = (typeof ESTADOS_DE_PLAN_SEMANAL)[number];

/** Cómo nació el borrador: lo propuso la IA, se leyó de un Excel o se empezó en blanco. */
export const ORIGENES_DE_PLAN_SEMANAL = ['ia', 'excel', 'manual'] as const;
export type OrigenDePlanSemanal = (typeof ORIGENES_DE_PLAN_SEMANAL)[number];

export const ESTADOS_DE_LECTURA_DE_PLAN = ['en_curso', 'lista', 'fallida'] as const;
export type EstadoDeLecturaDePlan = (typeof ESTADOS_DE_LECTURA_DE_PLAN)[number];

export const TIPOS_DE_LECTURA_DE_PLAN = ['propuesta', 'excel'] as const;
export type TipoDeLecturaDePlan = (typeof TIPOS_DE_LECTURA_DE_PLAN)[number];

/** RF-2: la semana en curso y estas más. */
export const SEMANAS_ADELANTE = 4;

const DOMINGO = 0;

/** RF-1: el lunes de la semana que contiene la fecha, `YYYY-MM-DD`. */
export function lunesDe(fecha: string): string {
  const dia = diaDeLaSemana(fecha);
  return sumarDias(fecha, dia === DOMINGO ? -6 : 1 - dia);
}

/** RF-17: los días que se pueden trabajar en la semana, de lunes a sábado. */
export function diasDeLaSemana(semana: string): string[] {
  return [0, 1, 2, 3, 4, 5].map((n) => sumarDias(semana, n));
}

/** RF-2: los lunes de las semanas que se pueden planear hoy, de la en curso a la cuarta siguiente. */
export function semanasPermitidas(hoy: string): string[] {
  const enCurso = lunesDe(hoy);
  return Array.from({ length: SEMANAS_ADELANTE + 1 }, (_, n) => sumarDias(enCurso, 7 * n));
}

/** RF-3, RF-4: por qué no se puede armar el plan de esa semana, o `null` si se puede. */
export function faltaDeSemana(semana: string, hoy: string): string | null {
  if (lunesDe(semana) !== semana) return 'La semana se indica por su lunes.';
  const permitidas = semanasPermitidas(hoy);
  if (semana < permitidas[0]) return 'Esa semana ya terminó: solo se planean la semana en curso y las siguientes.';
  if (semana > permitidas[permitidas.length - 1]) {
    return `Solo se planean la semana en curso y hasta ${SEMANAS_ADELANTE} semanas adelante.`;
  }
  return null;
}

/** RF-99: la semana terminó el domingo, así que desde el lunes siguiente ya no se aprueba. */
export function semanaTerminada(semana: string, hoy: string): boolean {
  return hoy > sumarDias(semana, 6);
}

/** RF-19, RF-96: los días que salen marcados: lunes a sábado sin festivos. */
export function diasPorDefecto(semana: string): string[] {
  return diasDeLaSemana(semana).filter((dia) => !esFestivo(dia));
}

/** RF-17, RF-20: un día de lunes a sábado de esa semana, festivo o no. El domingo, nunca. */
export function sePuedeMarcar(dia: string, semana: string): boolean {
  return diasDeLaSemana(semana).includes(dia);
}

/** Cantidad por día, `YYYY-MM-DD → cantidad`. */
export type CantidadesPorDia = Readonly<Record<string, number>>;

/** Lo que se pierde a tres decimales no es un descuadre. */
const TOLERANCIA_DEL_REPARTO = 0.0005;

/** RF-21: la meta en partes iguales entre los días marcados; el redondeo va al último. */
export function repartir(meta: number, dias: readonly string[]): Record<string, number> {
  if (dias.length === 0) return {};
  const parte = redondearCantidad(meta / dias.length);
  const reparto: Record<string, number> = {};
  dias.forEach((dia, n) => {
    reparto[dia] = n < dias.length - 1 ? parte : redondearCantidad(meta - parte * (dias.length - 1));
  });
  return reparto;
}

/** RF-24: el total programado es la suma de los días. */
export function totalProgramado(cantidades: CantidadesPorDia): number {
  return redondearCantidad(Object.values(cantidades).reduce((suma, c) => suma + c, 0));
}

/** RF-25: la meta de la semana entre los días marcados; sin meta o sin días, nada. */
export function metaDiaria(meta: number | null, diasMarcados: number): number | null {
  if (meta === null || diasMarcados <= 0) return null;
  return redondearCantidad(meta / diasMarcados);
}

/**
 * RF-18, RF-22, RF-23: por qué no se puede guardar la actividad, o `null` si cuadra. Una cantidad en
 * un día que no se trabaja tampoco cuadra: los días marcados valen para todo el plan.
 */
export function descuadreDeLaActividad(
  actividad: { metaSemana: number | null; cantidades: CantidadesPorDia },
  diasMarcados: readonly string[],
): string | null {
  if (actividad.metaSemana === null) return null;
  const fuera = Object.entries(actividad.cantidades).filter(([dia, c]) => c !== 0 && !diasMarcados.includes(dia));
  if (fuera.length > 0) return `Tiene cantidad el ${fuera[0][0]}, un día que no se trabaja en este plan.`;
  const suma = totalProgramado(actividad.cantidades);
  if (Math.abs(suma - actividad.metaSemana) > TOLERANCIA_DEL_REPARTO) {
    const leer = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
    return `Las cantidades de los días suman ${leer(suma)} y la meta es ${leer(actividad.metaSemana)}.`;
  }
  return null;
}

/** RF-31, RF-32, RF-97: un ítem de la planificación, algo que no lo es, o un rubro. */
export const TIPOS_DE_ACTIVIDAD = ['item', 'fuera', 'rubro'] as const;
export type TipoDeActividad = (typeof TIPOS_DE_ACTIVIDAD)[number];

/** RF-6: una actividad del plan, como se guarda. */
export interface ActividadDelPlan {
  tipo: TipoDeActividad;
  /** RF-91: un rótulo libre, como «1. Transporte». */
  frenteDeTrabajo: string;
  /** RF-88: la llave del ítem en la planificación; `null` si es «fuera» o rubro. */
  llave: string | null;
  /** El ítem de pago, o lo que traía si no cruzó. */
  item: string;
  renglon: number | null;
  descripcion: string;
  unidad: string;
  /** `null` en un rubro, que no tiene meta en cantidades. */
  metaSemana: number | null;
  cantidades: CantidadesPorDia;
  /** RF-97: solo en un rubro. */
  valorRubro: number | null;
  cuadrilla: string;
  equipo: string;
  /** RF-45: una cifra leída del Excel no estaba en su fila; solo aparece cuando es `true`. */
  revisar?: boolean;
}

/** Lo que llega de la pantalla, de la IA o del Excel, antes de cruzarlo. */
export interface ActividadPorCruzar {
  frenteDeTrabajo: string;
  descripcion: string;
  unidad: string;
  metaSemana: number | null;
  cuadrilla: string;
  equipo: string;
  cantidades?: CantidadesPorDia;
  /** La llave, si ya se conoce (la IA la recibe con cada ítem). */
  llave?: string | null;
  /** Los nombres del presupuesto, como los escribe una persona. */
  grupo?: string;
  capitulo?: string;
  item?: string;
  renglon?: number | null;
  esRubro?: boolean;
  valorRubro?: number | null;
}

export type ItemParaCruzar = Pick<ItemDeLaPlanificacion, 'delPresupuesto' | 'grupo' | 'capitulo' | 'item' | 'renglon' | 'descripcion' | 'unidad'>;

/** RF-6, RF-31, RF-32, RF-41, RF-88, RF-89, RF-91, RF-97: la actividad cruzada con la planificación. */
export function cruzarActividad(entrada: ActividadPorCruzar, items: readonly ItemParaCruzar[]): ActividadDelPlan {
  const comun = {
    frenteDeTrabajo: entrada.frenteDeTrabajo.trim(),
    descripcion: entrada.descripcion.trim(),
    unidad: entrada.unidad.trim(),
    cuadrilla: entrada.cuadrilla.trim(),
    equipo: entrada.equipo.trim(),
  };
  if (entrada.esRubro) {
    return { ...comun, tipo: 'rubro', llave: null, item: (entrada.item ?? '').trim(), renglon: null, metaSemana: null, cantidades: {}, valorRubro: entrada.valorRubro ?? null };
  }

  const llaves = items.map((i) => ({ i, llave: llaveDeItemPlanificado(i) }));
  const pedida =
    entrada.llave ??
    (entrada.grupo !== undefined && entrada.capitulo !== undefined && entrada.item !== undefined
      ? llaveDelItem(entrada.grupo, entrada.capitulo, entrada.item)
      : null);
  const renglon = entrada.renglon ?? (entrada.item !== undefined && /^\d+$/.test(entrada.item.trim()) ? Number(entrada.item) : null);
  const cruce =
    (pedida !== null ? llaves.find((x) => x.llave === pedida) : undefined) ??
    (pedida === null && renglon !== null ? llaves.find((x) => x.i.renglon === renglon) : undefined);

  const cantidades = entrada.cantidades ?? {};
  if (!cruce) {
    return { ...comun, tipo: 'fuera', llave: null, item: (entrada.item ?? '').trim(), renglon, metaSemana: entrada.metaSemana, cantidades, valorRubro: null };
  }
  const delItem = cruce.i;
  return {
    ...comun,
    tipo: 'item',
    llave: cruce.llave,
    item: delItem.delPresupuesto?.item ?? delItem.item,
    renglon: delItem.renglon,
    descripcion: comun.descripcion || delItem.descripcion,
    unidad: comun.unidad || delItem.unidad,
    metaSemana: entrada.metaSemana,
    cantidades,
    valorRubro: null,
  };
}

/** RF-26: el precio de costo de cada ítem de la planificación, por su llave. */
export function preciosDeCosto(
  items: readonly Pick<ItemDeLaPlanificacion, 'delPresupuesto' | 'grupo' | 'capitulo' | 'item' | 'precioCosto'>[],
): Map<string, number | null> {
  return new Map(items.map((i) => [llaveDeItemPlanificado(i), i.precioCosto]));
}

export interface ValoresDelPlan {
  /** En el orden de las actividades; `null` si no tiene valor. */
  porActividad: (number | null)[];
  total: number;
  /** RF-28: las actividades de ítems sin precio de costo, por su posición. */
  sinCosto: number[];
}

/** RF-26 a RF-28, RF-94, RF-97: los valores del plan, en pesos enteros. */
export function valoresDelPlan(
  actividades: readonly Pick<ActividadDelPlan, 'tipo' | 'llave' | 'metaSemana' | 'valorRubro'>[],
  precios: ReadonlyMap<string, number | null>,
): ValoresDelPlan {
  const sinCosto: number[] = [];
  const porActividad = actividades.map((a, n): number | null => {
    if (a.tipo === 'rubro') return a.valorRubro === null ? null : Math.round(a.valorRubro);
    if (a.tipo === 'fuera' || a.llave === null || a.metaSemana === null) return null;
    const costo = precios.get(a.llave) ?? null;
    if (sinPrecioDeCosto(costo)) {
      sinCosto.push(n);
      return null;
    }
    return Math.round(a.metaSemana * (costo as number));
  });
  return { porActividad, total: porActividad.reduce<number>((suma, v) => suma + (v ?? 0), 0), sinCosto };
}

/** RF-48: lo que traía el Excel en una actividad y lo que da la regla. */
export interface DiferenciaConElExcelDelPlan {
  actividad: number;
  que: 'meta_diaria' | 'total';
  delExcel: number;
  calculado: number;
}

export type TipoDeAvisoDelPlan = 'meta_sobre_pendiente' | 'sin_costo' | 'diferencia_excel' | 'planificacion_mas_nueva';

export interface AvisoDelPlan {
  tipo: TipoDeAvisoDelPlan;
  /** La actividad a la que se refiere, por su posición; `null` si es del plan entero. */
  actividad: number | null;
  detalle: string;
}

export interface PedidoDeAvisos {
  actividades: readonly Pick<ActividadDelPlan, 'tipo' | 'llave' | 'metaSemana' | 'item' | 'descripcion'>[];
  /** RF-33, RF-93: lo pendiente de cada ítem, por su llave. */
  pendientes: ReadonlyMap<string, number>;
  /** RF-28: lo que dio `valoresDelPlan`. */
  sinCosto: readonly number[];
  diferenciasConElExcel: readonly DiferenciaConElExcelDelPlan[];
  /** RF-100: la planificación con que se armó el plan y la que rige hoy. */
  planificacion?: { usada: string; vigente: string; numeroVigente: number } | null;
}

const enCantidad = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 3 });

/** RF-28, RF-33, RF-48, RF-100: los avisos del plan, en un orden estable. */
export function avisosDelPlan(pedido: PedidoDeAvisos): AvisoDelPlan[] {
  const avisos: AvisoDelPlan[] = [];
  const nombre = (n: number) => {
    const a = pedido.actividades[n];
    return [a.item, a.descripcion].filter(Boolean).join(' ');
  };
  pedido.actividades.forEach((a, n) => {
    if (a.tipo !== 'item' || a.llave === null || a.metaSemana === null) return;
    const pendiente = pedido.pendientes.get(a.llave);
    if (pendiente !== undefined && a.metaSemana > pendiente) {
      avisos.push({
        tipo: 'meta_sobre_pendiente',
        actividad: n,
        detalle: `${nombre(n)}: la meta de la semana (${enCantidad(a.metaSemana)}) supera lo pendiente (${enCantidad(pendiente)}).`,
      });
    }
  });
  for (const n of pedido.sinCosto) {
    avisos.push({ tipo: 'sin_costo', actividad: n, detalle: `${nombre(n)}: no tiene precio de costo; el total no lo incluye.` });
  }
  for (const d of pedido.diferenciasConElExcel) {
    const que = d.que === 'meta_diaria' ? 'la meta diaria' : 'el total programado';
    avisos.push({
      tipo: 'diferencia_excel',
      actividad: d.actividad,
      detalle: `${nombre(d.actividad)}: el Excel traía ${que} en ${enCantidad(d.delExcel)}, y con los días del plan da ${enCantidad(d.calculado)}.`,
    });
  }
  const p = pedido.planificacion;
  if (p && p.usada !== p.vigente) {
    avisos.push({
      tipo: 'planificacion_mas_nueva',
      actividad: null,
      detalle: `El plan se armó con otra versión de la planificación; la vigente es la v${p.numeroVigente}.`,
    });
  }
  return avisos;
}

const APRUEBAN_LO_DE_DIRECCION: readonly Rol[] = ['admin', 'director_proyectos'];
const APRUEBAN_LO_DE_OBRA: readonly Rol[] = ['admin', 'director_proyectos', 'director_obra'];

/** RF-56 a RF-58: quiénes aprueban lo que creó ese cargo. */
function aprobadoresDe(autor: Rol): readonly Rol[] {
  return autor === 'director_obra' || autor === 'residente' ? APRUEBAN_LO_DE_OBRA : APRUEBAN_LO_DE_DIRECCION;
}

/** RF-56 a RF-59, RF-65: ¿este cargo puede aprobar o anular un plan que creó ese otro? */
export function puedeAprobarPlan(aprobador: Rol, autor: Rol): boolean {
  return aprobador !== 'residente' && aprobadoresDe(autor).includes(aprobador);
}

const NOMBRE_EN_LA_FRASE: Partial<Record<Rol, string>> = {
  director_obra: 'el Director de Obra',
  director_proyectos: 'el Director de Proyectos',
  admin: 'la Gerencia',
};

/** Para el rechazo: «Este plan lo aprueban el Director de Proyectos o la Gerencia». */
export function quienApruebaElPlan(autor: Rol): string {
  const orden: Rol[] = ['director_obra', 'director_proyectos', 'admin'];
  const nombres = orden.filter((r) => aprobadoresDe(autor).includes(r)).map((r) => NOMBRE_EN_LA_FRASE[r] as string);
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}` : nombres[0];
  return `Este plan lo aprueban ${lista}.`;
}

/** RF-62: desde cuándo rige un plan aprobado hoy. */
export function rigeDesdeAlAprobar(semana: string, hoy: string): string {
  return hoy > semana ? hoy : semana;
}

/** RF-67: hasta cuándo rige un plan anulado hoy. */
export function rigeHastaAlAnular(hoy: string): string {
  return sumarDias(hoy, -1);
}

/** Lo que hace falta de un plan aprobado para saber qué días mide. */
export interface PlanAprobado {
  id: string;
  /** El lunes de su semana. */
  semana: string;
  rigeDesde: string;
  /** `null` mientras siga vigente: rige hasta el domingo. */
  rigeHasta: string | null;
}

/** RF-62, RF-67, RF-68: el plan que mide ese día, o `null` si ninguno. */
export function planQueRige<P extends PlanAprobado>(dia: string, planes: readonly P[]): P | null {
  return (
    planes.find((p) => {
      const hasta = p.rigeHasta ?? sumarDias(p.semana, 6);
      return dia >= p.semana && dia <= sumarDias(p.semana, 6) && dia >= p.rigeDesde && dia <= hasta;
    }) ?? null
  );
}

/** RF-7: el personal de un cargo, por frente de trabajo. */
export interface PersonalDelPlan {
  cargo: string;
  porFrente: Readonly<Record<string, number>>;
}

/** RF-8 a RF-10: un equipo; si es propio, el vehículo de la obra. */
export interface MaquinaDelPlan {
  equipo: string;
  cantidad: number;
  propia: boolean;
  frenteDeTrabajo: string;
  vehiculoId: string | null;
  referencia: string;
}

/** RF-11: un renglón de materiales, propuesto y ajustable (RF-16). */
export interface MaterialDelPlan {
  material: string;
  cantidadSemana: number | null;
  unidad: string;
  baseDeCalculo: string;
}

/** RF-12: el control de volquetas, propuesto y ajustable (RF-16). */
export interface VolquetasDelPlan {
  conceptos: { concepto: string; unidad: string; cantidadSemana: number | null; viajesSemana: number | null }[];
  requeridas: number | null;
  propias: number | null;
  externas: number | null;
}

/** RF-14. */
export interface RiesgoDelPlan {
  riesgo: string;
  efecto: string;
  mitigacion: string;
}

/** RF-6 a RF-17: todo lo que se guarda de un plan. */
export interface EstructuraDelPlan {
  /** RF-17, RF-18: los días marcados, para todas las actividades. */
  dias: string[];
  actividades: ActividadDelPlan[];
  personal: PersonalDelPlan[];
  maquinaria: MaquinaDelPlan[];
  materiales: MaterialDelPlan[];
  volquetas: VolquetasDelPlan;
  supuestos: string;
  riesgos: RiesgoDelPlan[];
  requerimientos: string;
}

/** Lo que ve quien tiene la plata: la estructura, sus valores y sus avisos. */
export interface VistaDelPlan {
  estructura: EstructuraDelPlan;
  valores: ValoresDelPlan;
  avisos: AvisoDelPlan[];
}

/** RF-30, RF-102: lo que ve el Residente. Sin valores, sin avisos de costo, sin textos con pesos. */
export interface VistaDelPlanSinPlata {
  estructura: EstructuraDelPlanSinPlata;
  avisos: AvisoDelPlan[];
}

export type ActividadSinPlata = Omit<ActividadDelPlan, 'valorRubro'>;
export type EstructuraDelPlanSinPlata = Omit<EstructuraDelPlan, 'actividades'> & { actividades: ActividadSinPlata[] };

export const TEXTO_CON_PESOS = 'Contiene valores en pesos';

/** RF-103: el signo «$» o la palabra «pesos», sin mayúsculas ni tildes. */
export function contienePesos(texto: string): boolean {
  return texto.includes('$') || /\bpesos\b/i.test(texto.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

/** RF-102: la misma forma, con cada texto que contenga pesos reemplazado. */
function sinPesosEnLosTextos<T>(valor: T): T {
  if (typeof valor === 'string') return (contienePesos(valor) ? TEXTO_CON_PESOS : valor) as T;
  if (Array.isArray(valor)) return valor.map(sinPesosEnLosTextos) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([clave, v]) => [clave, sinPesosEnLosTextos(v)])) as T;
  }
  return valor;
}

/** RF-29, RF-30, RF-102: el plan para el Residente, armado campo por campo sin la plata. */
export function planSinPlata(vista: VistaDelPlan): VistaDelPlanSinPlata {
  const { actividades, ...resto } = vista.estructura;
  const estructura: EstructuraDelPlanSinPlata = {
    ...resto,
    actividades: actividades.map(({ valorRubro: _valor, ...actividad }) => actividad),
  };
  return {
    estructura: sinPesosEnLosTextos(estructura),
    avisos: sinPesosEnLosTextos(vista.avisos.filter((a) => a.tipo !== 'sin_costo')),
  };
}

const comoLoVeElResidente = (valor: unknown) => (typeof valor === 'string' && contienePesos(valor) ? TEXTO_CON_PESOS : valor);

/**
 * Los renglones que manda el Residente, con cada texto oculto devuelto al que estaba guardado. El
 * renglón guardado de donde sale se escoge por parecido: el que tiene pesos en ese campo y más
 * campos iguales a como él los ve; si empatan, el primero sin usar. Así, si borró un renglón con un
 * texto oculto, el siguiente no se queda con el texto del borrado.
 */
function conTextosOcultos<T extends object>(guardados: readonly T[], entrantes: readonly T[]): T[] {
  const usados = new Map<keyof T, Set<number>>();
  return entrantes.map((entrante) => {
    const campos = Object.keys(entrante) as (keyof T)[];
    const restaurado = { ...entrante };
    for (const campo of campos) {
      if (entrante[campo] !== TEXTO_CON_PESOS) continue;
      const yaUsados = usados.get(campo) ?? new Set<number>();
      usados.set(campo, yaUsados);
      let mejor = -1;
      let parecido = -1;
      guardados.forEach((guardado, n) => {
        const texto = guardado[campo];
        if (yaUsados.has(n) || typeof texto !== 'string' || !contienePesos(texto)) return;
        const iguales = campos.filter((c) => typeof entrante[c] !== 'object' && comoLoVeElResidente(guardado[c]) === entrante[c]).length;
        if (iguales > parecido) {
          mejor = n;
          parecido = iguales;
        }
      });
      if (mejor < 0) continue;
      yaUsados.add(mejor);
      restaurado[campo] = guardados[mejor][campo];
    }
    return restaurado;
  });
}

/**
 * RF-29, RF-30, RF-102: lo que se guarda cuando quien guarda es el Residente. Él recibió el plan
 * sin el valor de los rubros y con los textos con pesos reemplazados (`planSinPlata`); si lo que
 * manda se guardara tal cual, borraría esos valores y dejaría escrito «Contiene valores en pesos»
 * donde había un texto. Aquí se le devuelve al plan lo que él no vio.
 *
 * El valor de un rubro nunca sale de lo que manda: se toma del rubro guardado con la misma
 * descripción, y uno nuevo queda sin valor hasta que lo ponga quien ve la plata. Un texto oculto
 * se reconoce porque llega igual al reemplazo; si él escribió encima, vale lo que escribió.
 */
export function conservarLoQueNoVeElResidente(guardada: EstructuraDelPlan, entrante: EstructuraDelPlan): EstructuraDelPlan {
  const rubrosUsados = new Set<number>();
  const actividades = conTextosOcultos(guardada.actividades, entrante.actividades).map((actividad) => {
    if (actividad.tipo !== 'rubro') return { ...actividad, valorRubro: null };
    const suyo = guardada.actividades.findIndex(
      (g, n) => g.tipo === 'rubro' && !rubrosUsados.has(n) && comoLoVeElResidente(g.descripcion) === comoLoVeElResidente(actividad.descripcion),
    );
    if (suyo >= 0) rubrosUsados.add(suyo);
    return { ...actividad, valorRubro: suyo >= 0 ? guardada.actividades[suyo].valorRubro : null };
  });
  const texto = (antes: string, ahora: string) => (ahora === TEXTO_CON_PESOS && contienePesos(antes) ? antes : ahora);
  return {
    ...entrante,
    actividades,
    personal: conTextosOcultos(guardada.personal, entrante.personal),
    maquinaria: conTextosOcultos(guardada.maquinaria, entrante.maquinaria),
    materiales: conTextosOcultos(guardada.materiales, entrante.materiales),
    volquetas: { ...entrante.volquetas, conceptos: conTextosOcultos(guardada.volquetas.conceptos, entrante.volquetas.conceptos) },
    supuestos: texto(guardada.supuestos, entrante.supuestos),
    riesgos: conTextosOcultos(guardada.riesgos, entrante.riesgos),
    requerimientos: texto(guardada.requerimientos, entrante.requerimientos),
  };
}

/**
 * RF-70, RF-72, RF-90, RF-98: lo que el plan pide cada día a cada ítem, `día → llave → cantidad`.
 * Solo los días marcados y solo las actividades de ítems: lo «fuera» y los rubros no son meta de
 * nadie. Dos actividades del mismo ítem se suman.
 */
export function metasPorDiaDelPlan(estructura: Pick<EstructuraDelPlan, 'dias' | 'actividades'>): Map<string, Map<string, number>> {
  const metas = new Map<string, Map<string, number>>();
  for (const dia of estructura.dias) metas.set(dia, new Map());
  for (const actividad of estructura.actividades) {
    if (actividad.tipo !== 'item' || actividad.llave === null) continue;
    for (const [dia, cantidad] of Object.entries(actividad.cantidades)) {
      const delDia = metas.get(dia);
      if (!delDia) continue;
      delDia.set(actividad.llave, redondearCantidad((delDia.get(actividad.llave) ?? 0) + cantidad));
    }
  }
  return metas;
}

