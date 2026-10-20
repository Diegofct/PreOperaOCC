/**
 * Los reportes del periodo, armados con las bitácoras (spec 030, RF-6 a RF-21, RF-44 a
 * RF-56). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * Se calculan cada vez sobre lo que dicen las bitácoras, sin tablas de resumen: una
 * bitácora abierta o una corregida se ven al volver a pedir el reporte (RF-7). Los
 * tipos de entrada son los mínimos, por su forma, para no depender de `features/`.
 */
import { horasDeLaPersona, MAXIMO_MINUTOS_EXTRA_POR_DIA, type HorarioDeObra, type PersonaConHoras } from './horas';
import { avanceDeMedidor, type ClaseDeMedidor } from './jornada';
import { periodoDe } from './periodos';
import type { EnsayoDeObra } from './ensayos-de-obra';

/* ── Máquinas (RF-11 a RF-21) ─────────────────────────────────────────── */

/** Una máquina como la guarda la sección Maquinaria de la bitácora. */
export interface MaquinaLeida {
  vehiculoId: string;
  codigo: string;
  claseMedidor: ClaseDeMedidor;
  medidorInicial: number | null;
  medidorFinal: number | null;
  operadorNombre?: string | null;
}

/** La bitácora de un día de la obra, con lo que necesita cada reporte. */
export interface ParteDelPeriodo {
  fecha: string;
  abierta: boolean;
  maquinaria: readonly MaquinaLeida[];
}

export interface VehiculoDeLaObra {
  id: string;
  codigo: string;
  tipo: string | null;
  claseMedidor: ClaseDeMedidor;
}

/** Quién hizo el preoperacional de una máquina un día (RF-16). */
export interface PreoperacionalDelPeriodo {
  vehiculoId: string;
  fecha: string;
  operadorNombre: string;
}

export type TrabajoDelDia = 'si' | 'no' | 'sin_bitacora';

export interface DiaDeMaquina {
  fecha: string;
  trabajo: TrabajoDelDia;
  operador: string | null;
  inicial: number | null;
  final: number | null;
  /** Horas o kilómetros del día, o `null` si no hay las dos lecturas. */
  avance: number | null;
  abierta: boolean;
}

export interface UsoDeMaquina {
  vehiculoId: string;
  codigo: string;
  tipo: string | null;
  claseMedidor: ClaseDeMedidor;
  dias: DiaDeMaquina[];
  /** Suma de los avances de los días que trabajó. */
  total: number;
  diasTrabajados: number;
  diasSinTrabajar: number;
  /** `total / diasTrabajados`, con un decimal; `null` si no trabajó. */
  promedio: number | null;
}

export interface CifrasDeMaquinas {
  trabajaron: number;
  noTrabajaron: number;
  horas: number;
  kilometros: number;
}

const redondear = (n: number) => Math.round(n * 10) / 10;

/**
 * Qué hizo cada máquina cada día del periodo (RF-11 a RF-19):
 *
 *  · sin bitácora ese día → `sin_bitacora`, que no cuenta (RF-15);
 *  · en la bitácora con avance mayor que cero → `si` (RF-13);
 *  · fuera de la bitácora, sin lecturas o con avance cero → `no` (RF-14).
 *
 * Las máquinas son las vigentes de la obra y las que aparecen en alguna bitácora del
 * periodo (RF-11). El operador es el de la bitácora, si no el del preoperacional de
 * ese día, si no `null` (RF-16). El medidor, el de la bitácora o el del tipo (RF-17).
 */
export function usoDeMaquinas(datos: {
  dias: readonly string[];
  partes: readonly ParteDelPeriodo[];
  vehiculos: readonly VehiculoDeLaObra[];
  preoperacionales: readonly PreoperacionalDelPeriodo[];
}): { maquinas: UsoDeMaquina[]; cifras: CifrasDeMaquinas } {
  const parteDe = new Map(datos.partes.map((p) => [p.fecha, p]));
  const preoperacional = new Map(datos.preoperacionales.map((p) => [`${p.vehiculoId}|${p.fecha}`, p.operadorNombre]));

  // Las vigentes de la obra, más las que solo aparecen en una bitácora (de otra obra o
  // dadas de baja): esas toman el código y el medidor de la bitácora.
  const maquinas = new Map<string, { codigo: string; tipo: string | null; claseMedidor: ClaseDeMedidor }>(
    datos.vehiculos.map((v) => [v.id, { codigo: v.codigo, tipo: v.tipo, claseMedidor: v.claseMedidor }]),
  );
  for (const parte of datos.partes) {
    for (const m of parte.maquinaria) {
      if (!maquinas.has(m.vehiculoId)) {
        maquinas.set(m.vehiculoId, { codigo: m.codigo, tipo: null, claseMedidor: m.claseMedidor });
      }
    }
  }

  const uso: UsoDeMaquina[] = [...maquinas].map(([vehiculoId, maquina]) => {
    const dias: DiaDeMaquina[] = datos.dias.map((fecha) => {
      const parte = parteDe.get(fecha);
      if (!parte) {
        return { fecha, trabajo: 'sin_bitacora', operador: null, inicial: null, final: null, avance: null, abierta: false };
      }
      const fila = parte.maquinaria.find((m) => m.vehiculoId === vehiculoId);
      // Con un decimal: 1185.1 − 1170.7 da 14.399999… en coma flotante.
      const crudo = fila ? avanceDeMedidor(fila.medidorInicial, fila.medidorFinal) : null;
      const avance = crudo === null ? null : redondear(crudo);
      return {
        fecha,
        trabajo: avance !== null && avance > 0 ? 'si' : 'no',
        operador: fila ? fila.operadorNombre || preoperacional.get(`${vehiculoId}|${fecha}`) || null : null,
        inicial: fila?.medidorInicial ?? null,
        final: fila?.medidorFinal ?? null,
        avance,
        abierta: parte.abierta,
      };
    });
    const trabajados = dias.filter((d) => d.trabajo === 'si');
    const total = redondear(trabajados.reduce((suma, d) => suma + (d.avance ?? 0), 0));
    return {
      vehiculoId,
      ...maquina,
      dias,
      total,
      diasTrabajados: trabajados.length,
      diasSinTrabajar: dias.filter((d) => d.trabajo === 'no').length,
      promedio: trabajados.length > 0 ? redondear(total / trabajados.length) : null,
    };
  });
  uso.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'));

  return {
    maquinas: uso,
    cifras: {
      trabajaron: uso.filter((m) => m.diasTrabajados > 0).length,
      noTrabajaron: uso.filter((m) => m.diasTrabajados === 0 && m.diasSinTrabajar > 0).length,
      horas: redondear(uso.filter((m) => m.claseMedidor === 'horometro').reduce((s, m) => s + m.total, 0)),
      kilometros: redondear(uso.filter((m) => m.claseMedidor === 'odometro').reduce((s, m) => s + m.total, 0)),
    },
  };
}

/* ── Personal (RF-44 a RF-50) ─────────────────────────────────────────── */

/** Una persona como la guarda la sección Personal de la bitácora. */
export interface PersonaLeida extends PersonaConHoras {
  usuarioId: string;
  nombre: string;
  cargo?: string | null;
}

export interface ParteConPersonal {
  fecha: string;
  abierta: boolean;
  /** El horario efectivo del parte, con el que se calculan las filas viejas (spec 016). */
  horario: HorarioDeObra;
  personal: readonly PersonaLeida[];
}

/** Lo de una persona un día. Todo en minutos, como en la bitácora. */
export interface DiaDePersona {
  fecha: string;
  /** `sin_bitacora`: ese día no hay bitácora; `ausente`: hay y no está en ella. */
  estado: 'registrada' | 'ausente' | 'sin_bitacora';
  laboradas: number;
  extraDiurna: number;
  extraNocturna: number;
  novedad: string | null;
  /** De dónde salieron las horas: reportadas o calculadas con la entrada y la salida. */
  fuente: 'reportadas' | 'calculadas' | null;
  abierta: boolean;
}

export interface HorasDePersona {
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  dias: DiaDePersona[];
  laboradas: number;
  extraDiurna: number;
  extraNocturna: number;
  /** Días con horas laboradas. */
  diasTrabajados: number;
  /** Cuántos días tuvo cada novedad (RF-47). */
  novedades: Record<string, number>;
  /** Días con más de 2 h extra (RF-48). */
  diasConExtraDeMas: string[];
  /** Semanas (su lunes) con más de 12 h extra dentro del periodo (RF-48). */
  semanasConExtraDeMas: { desde: string; extra: number }[];
}

export interface CifrasDePersonal {
  personas: number;
  laboradas: number;
  extraDiurna: number;
  extraNocturna: number;
  conNovedad: number;
}

/** Lo que la ley permite de horas extra en una semana (RF-48). */
export const MAXIMO_MINUTOS_EXTRA_POR_SEMANA = 12 * 60;

/**
 * Las horas de cada persona en el periodo (RF-44 a RF-50), con la misma regla que la
 * bitácora: las reportadas si las hay, si no las calculadas con la entrada y la salida
 * y el horario del parte (RF-45, RF-56). Una novedad sola cuenta cero horas.
 *
 * Las personas son las que aparecen en alguna bitácora del periodo (RF-44), con el
 * nombre y el cargo de la más reciente, por nombre.
 */
export function horasDelPersonal(datos: {
  dias: readonly string[];
  partes: readonly ParteConPersonal[];
}): { personas: HorasDePersona[]; cifras: CifrasDePersonal } {
  const parteDe = new Map(datos.partes.map((p) => [p.fecha, p]));
  const quienes = new Map<string, { nombre: string; cargo: string | null; fecha: string }>();
  for (const parte of datos.partes) {
    for (const p of parte.personal) {
      const antes = quienes.get(p.usuarioId);
      if (!antes || antes.fecha < parte.fecha) {
        quienes.set(p.usuarioId, { nombre: p.nombre, cargo: p.cargo ?? null, fecha: parte.fecha });
      }
    }
  }

  const personas: HorasDePersona[] = [...quienes].map(([usuarioId, quien]) => {
    const dias: DiaDePersona[] = datos.dias.map((fecha) => {
      const parte = parteDe.get(fecha);
      const vacio = { fecha, laboradas: 0, extraDiurna: 0, extraNocturna: 0, novedad: null, fuente: null, abierta: false };
      if (!parte) return { ...vacio, estado: 'sin_bitacora' };
      const fila = parte.personal.find((p) => p.usuarioId === usuarioId);
      if (!fila) return { ...vacio, estado: 'ausente', abierta: parte.abierta };
      const horas = horasDeLaPersona(fecha, fila, parte.horario);
      return {
        fecha,
        estado: 'registrada',
        laboradas: horas?.trabajados ?? 0,
        extraDiurna: horas?.extraDiurna ?? 0,
        extraNocturna: horas?.extraNocturna ?? 0,
        novedad: fila.novedad ?? null,
        fuente: horas?.fuente ?? null,
        abierta: parte.abierta,
      };
    });

    const novedades: Record<string, number> = {};
    for (const d of dias) if (d.novedad) novedades[d.novedad] = (novedades[d.novedad] ?? 0) + 1;

    const extraPorSemana = new Map<string, number>();
    for (const d of dias) {
      const lunes = periodoDe('semana', d.fecha).desde;
      extraPorSemana.set(lunes, (extraPorSemana.get(lunes) ?? 0) + d.extraDiurna + d.extraNocturna);
    }

    return {
      usuarioId,
      nombre: quien.nombre,
      cargo: quien.cargo,
      dias,
      laboradas: dias.reduce((s, d) => s + d.laboradas, 0),
      extraDiurna: dias.reduce((s, d) => s + d.extraDiurna, 0),
      extraNocturna: dias.reduce((s, d) => s + d.extraNocturna, 0),
      diasTrabajados: dias.filter((d) => d.laboradas > 0).length,
      novedades,
      diasConExtraDeMas: dias
        .filter((d) => d.extraDiurna + d.extraNocturna > MAXIMO_MINUTOS_EXTRA_POR_DIA)
        .map((d) => d.fecha),
      semanasConExtraDeMas: [...extraPorSemana]
        .filter(([, extra]) => extra > MAXIMO_MINUTOS_EXTRA_POR_SEMANA)
        .map(([desde, extra]) => ({ desde, extra })),
    };
  });
  personas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return {
    personas,
    cifras: {
      personas: personas.length,
      laboradas: personas.reduce((s, p) => s + p.laboradas, 0),
      extraDiurna: personas.reduce((s, p) => s + p.extraDiurna, 0),
      extraNocturna: personas.reduce((s, p) => s + p.extraNocturna, 0),
      conNovedad: personas.filter((p) => Object.keys(p.novedades).length > 0).length,
    },
  };
}

/* ── Actividades (RF-51, RF-52) ───────────────────────────────────────── */

/** Una actividad como la guarda la sección Actividades de la bitácora. */
export interface ActividadLeida {
  /** El ítem del presupuesto, o `null` en «Otra actividad»; ausente en las de antes del 2026-09-16. */
  item?: string | null;
  nombre: string;
  descripcion: string;
  unidad?: string;
  cantidad?: number | null;
}

export interface CantidadDeItem {
  item: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  /** Los días en que se trabajó, en orden. */
  dias: string[];
  /** Lo de cada día, para el detalle. */
  porDia: { fecha: string; cantidad: number }[];
}

export interface ActividadFueraDelPresupuesto {
  fecha: string;
  nombre: string;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
}

/**
 * Cuánto se ejecutó de cada ítem del presupuesto en el periodo (RF-51), y aparte las
 * actividades sin ítem —las «otras» y las de antes del 2026-09-16— (RF-52). Una
 * cantidad no anotada no suma, pero el día cuenta como trabajado.
 */
export function cantidadesPorItem(
  partes: readonly { fecha: string; actividades: readonly ActividadLeida[] }[],
): { items: CantidadDeItem[]; otras: ActividadFueraDelPresupuesto[] } {
  const items = new Map<string, CantidadDeItem>();
  const otras: ActividadFueraDelPresupuesto[] = [];
  for (const parte of [...partes].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    for (const a of parte.actividades) {
      if (!a.item) {
        otras.push({
          fecha: parte.fecha,
          nombre: a.nombre,
          descripcion: a.descripcion,
          unidad: a.unidad ?? null,
          cantidad: a.cantidad ?? null,
        });
        continue;
      }
      const suyo =
        items.get(a.item) ??
        { item: a.item, nombre: a.nombre, unidad: a.unidad ?? '', cantidad: 0, dias: [], porDia: [] };
      const cantidad = a.cantidad ?? 0;
      suyo.cantidad = redondear2(suyo.cantidad + cantidad);
      if (!suyo.dias.includes(parte.fecha)) suyo.dias.push(parte.fecha);
      const delDia = suyo.porDia.find((d) => d.fecha === parte.fecha);
      if (delDia) delDia.cantidad = redondear2(delDia.cantidad + cantidad);
      else suyo.porDia.push({ fecha: parte.fecha, cantidad });
      items.set(a.item, suyo);
    }
  }
  return {
    items: [...items.values()].sort((a, b) => a.item.localeCompare(b.item, 'es', { numeric: true })),
    otras,
  };
}

const redondear2 = (n: number) => Math.round(n * 100) / 100;

/* ── Cantera (RF-53) ──────────────────────────────────────────────────── */

/** Un viaje vigente del periodo, con los nombres ya resueltos. */
export interface ViajeDelPeriodo {
  fecha: string;
  volqueta: string;
  material: string;
  origen: string;
  /** El sitio, o «Obra · PR 1 + 460» cuando va a la obra. */
  destino: string;
}

export interface ConteoDeViajes {
  nombre: string;
  viajes: number;
}

/**
 * Los viajes del periodo contados por volqueta, por material, por origen y por destino
 * (RF-53), de más a menos viajes. Los anulados no llegan aquí: se filtran al leerlos.
 */
export function viajesAgrupados(viajes: readonly ViajeDelPeriodo[]): {
  total: number;
  porVolqueta: ConteoDeViajes[];
  porMaterial: ConteoDeViajes[];
  porOrigen: ConteoDeViajes[];
  porDestino: ConteoDeViajes[];
} {
  const contar = (clave: (v: ViajeDelPeriodo) => string): ConteoDeViajes[] => {
    const cuenta = new Map<string, number>();
    for (const v of viajes) cuenta.set(clave(v), (cuenta.get(clave(v)) ?? 0) + 1);
    return [...cuenta]
      .map(([nombre, n]) => ({ nombre, viajes: n }))
      .sort((a, b) => b.viajes - a.viajes || a.nombre.localeCompare(b.nombre, 'es'));
  };
  return {
    total: viajes.length,
    porVolqueta: contar((v) => v.volqueta),
    porMaterial: contar((v) => v.material),
    porOrigen: contar((v) => v.origen),
    porDestino: contar((v) => v.destino),
  };
}

/* ── Control de calidad (RF-54) ───────────────────────────────────────── */

export interface CalidadDeEnsayo {
  ensayo: string;
  nombre: string;
  total: number;
  cumplen: number;
  noCumplen: number;
  sinDato: number;
}

/**
 * Cuántos ensayos de cada tipo se hicieron y cuántos cumplen, no cumplen o no lo
 * dicen (RF-54), de más a menos hechos; y la lista de los que no cumplen, como sale
 * de `ensayosDeLosPartes` (la más reciente primero).
 */
export function calidadPorEnsayo<E extends EnsayoDeObra>(
  ensayos: readonly E[],
): { porEnsayo: CalidadDeEnsayo[]; noCumplen: E[] } {
  const porEnsayo = new Map<string, CalidadDeEnsayo>();
  for (const e of ensayos) {
    const suyo = porEnsayo.get(e.ensayo) ?? { ensayo: e.ensayo, nombre: e.nombre, total: 0, cumplen: 0, noCumplen: 0, sinDato: 0 };
    suyo.total += 1;
    if (e.cumple === 'si') suyo.cumplen += 1;
    else if (e.cumple === 'no') suyo.noCumplen += 1;
    else suyo.sinDato += 1;
    porEnsayo.set(e.ensayo, suyo);
  }
  return {
    porEnsayo: [...porEnsayo.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')),
    noCumplen: ensayos.filter((e) => e.cumple === 'no'),
  };
}

/* ── Clima y novedades (RF-55) ────────────────────────────────────────── */

export interface FranjaLeida {
  condicion: string;
  nombre: string;
  desde: string;
  hasta: string;
}

export interface ParteConClima {
  fecha: string;
  abierta: boolean;
  clima: readonly FranjaLeida[];
  sinTrabajo: boolean;
  motivoSinTrabajo: string | null;
  notas: string | null;
}

export interface ClimaDelDia {
  fecha: string;
  conBitacora: boolean;
  franjas: FranjaLeida[];
  /** Alguna franja con lluvia. */
  lluvia: boolean;
  sinTrabajo: boolean;
  motivoSinTrabajo: string | null;
  notas: string;
  abierta: boolean;
}

/** La condición de clima que cuenta como día con lluvia (catálogo `CONDICIONES_CLIMA`). */
export const CONDICION_LLUVIA = 'lloviendo';

/**
 * El clima, el día sin trabajo y las notas de cada día del periodo (RF-55), con los
 * días con lluvia y los días sin trabajo contados. Un día sin bitácora sale vacío y
 * no cuenta en ninguno de los dos.
 */
export function climaDelPeriodo(datos: {
  dias: readonly string[];
  partes: readonly ParteConClima[];
}): { dias: ClimaDelDia[]; diasConLluvia: number; diasSinTrabajo: number; diasConBitacora: number } {
  const parteDe = new Map(datos.partes.map((p) => [p.fecha, p]));
  const dias: ClimaDelDia[] = datos.dias.map((fecha) => {
    const parte = parteDe.get(fecha);
    if (!parte) {
      return { fecha, conBitacora: false, franjas: [], lluvia: false, sinTrabajo: false, motivoSinTrabajo: null, notas: '', abierta: false };
    }
    const franjas = [...parte.clima].sort((a, b) => a.desde.localeCompare(b.desde));
    return {
      fecha,
      conBitacora: true,
      franjas,
      lluvia: franjas.some((f) => f.condicion === CONDICION_LLUVIA),
      sinTrabajo: parte.sinTrabajo,
      motivoSinTrabajo: parte.motivoSinTrabajo,
      notas: parte.notas?.trim() ?? '',
      abierta: parte.abierta,
    };
  });
  return {
    dias,
    diasConLluvia: dias.filter((d) => d.lluvia).length,
    diasSinTrabajo: dias.filter((d) => d.sinTrabajo).length,
    diasConBitacora: dias.filter((d) => d.conBitacora).length,
  };
}

