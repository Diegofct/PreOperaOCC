/**
 * La bitácora diaria de OCC, armada desde su grupo de WhatsApp (spec 038). Funciones
 * puras, sin I/O.
 *
 * ── Por qué no es la bitácora de una obra ──
 *
 * El grupo de OCC es el del **mantenimiento de los equipos** (297 mensajes leídos, D1):
 * cada noche la lista «Equipos operativos – para el día X», el informe diario del
 * auxiliar de mantenimiento, fotos de reparaciones y varadas, y conversaciones con las
 * obras. Casi nunca trae operador, obra, horómetro ni kilometraje. Por eso sus secciones
 * son otras —estado de los equipos, trabajos, actividades del personal, pendientes y
 * fotos— y no caben en `partes_de_obra` (plan, decisiones).
 *
 * ── Por qué la fecha no es la del envío ──
 *
 * La lista llega la noche **anterior** al día que describe, y el informe del auxiliar
 * llega hasta un día después. Si contaran por el día de envío, cada bitácora mostraría
 * los equipos de mañana y las actividades de ayer. Cuenta la fecha que dice el mensaje
 * (RF-9a, RF-9e); si no dice ninguna, la del envío, como en las obras (024).
 *
 * Viven aquí, y no junto al servidor que las usa, por la constitución (3 y 5): son
 * reglas de negocio y llevan sus casos en `scripts/verificar-reglas.ts`.
 */
import { DESFASE_COLOMBIA_MS, esFechaReal, fechaDeJornada } from './jornada';
import { normalizar } from './texto';
import {
  numeroDeTexto,
  reconocerEquipoDeEmpresa,
  unidadDeMedidor,
  type MantenimientoDelReporte,
  type PlacaParecida,
  type VehiculoConocido,
} from './whatsapp';

/* ── Las secciones (RF-8) ──────────────────────────────────────────────── */

/** Cómo quedó un equipo en la lista del día (RF-9). */
export const ESTADOS_DE_EQUIPO = ['operativo', 'inoperativo'] as const;
export type EstadoDeEquipo = (typeof ESTADOS_DE_EQUIPO)[number];

/** Lo que el grupo dice de un equipo durante el día (RF-9c). */
export const CAMBIOS_DE_ESTADO = ['varado', 'en_mantenimiento', 'operativo'] as const;
export type CambioDeEstado = (typeof CAMBIOS_DE_ESTADO)[number];

/** El tipo de un trabajo de mantenimiento (RF-9d). */
export const TIPOS_DE_TRABAJO = [
  'dano',
  'reparacion',
  'preventivo',
  'llantas',
  'repuesto_o_compra',
  'suministro',
] as const;
export type TipoDeTrabajo = (typeof TIPOS_DE_TRABAJO)[number];

export const NOMBRE_DE_TIPO_DE_TRABAJO: Record<TipoDeTrabajo, string> = {
  dano: 'Daño',
  reparacion: 'Reparación',
  preventivo: 'Mantenimiento preventivo',
  llantas: 'Llantas',
  repuesto_o_compra: 'Repuesto o compra',
  suministro: 'Suministro de aceites o combustible',
};

/**
 * El equipo de un renglón, como lo dejó `reconocerEquipoDeEmpresa`: ligado
 * (`vehiculoId`), o con la placa tal cual la escribieron y la probable (RF-12a).
 */
export interface EquipoDelRenglon {
  vehiculoId: string | null;
  /** Lo escrito en el mensaje, siempre: es lo que se muestra si no se ligó. */
  escrito: string;
  posiblePlaca: PlacaParecida | null;
}

/** Quién lo dijo y desde qué mensaje: lo que hace falta para el historial (RF-30). */
export interface Origen {
  mensajeId: string;
  /** Como se llama en WhatsApp, o la persona registrada. */
  reportadoPor: string;
  /** `HH:MM` en hora de Colombia. */
  hora: string;
}

export interface CambioDelDia extends Origen {
  estado: CambioDeEstado;
  texto: string;
}

/** Un renglón de «Estado de los equipos» (RF-9, RF-9c). */
export interface EstadoDelEquipo extends EquipoDelRenglon {
  id: string;
  /** Nulo si el equipo no estaba en la lista y solo hubo cambios en el día. */
  estado: EstadoDeEquipo | null;
  motivo: string;
  /** Quién mandó la lista; nulo si no estaba en ella. */
  origen: Origen | null;
  cambios: CambioDelDia[];
}

/** Un renglón de «Trabajos de mantenimiento» (RF-9d). */
export interface TrabajoDeMantenimiento extends EquipoDelRenglon, Origen {
  id: string;
  tipo: TipoDeTrabajo;
  descripcion: string;
}

/** Una viñeta del informe del personal de mantenimiento (RF-9e). */
export interface ActividadDeMantenimiento extends Origen {
  id: string;
  /** La persona que firma el informe («Actividades realizadas por …»). */
  persona: string;
  descripcion: string;
  /** El equipo, si la viñeta nombra uno. */
  equipo: EquipoDelRenglon | null;
}

/** Una nota de la lista del día (RF-9f). */
export interface PendienteDelDia extends Origen {
  id: string;
  texto: string;
  equipo: EquipoDelRenglon | null;
}

/** Una lista reemplazada por otra del mismo día, para el historial (RF-9b). */
export interface ListaReemplazada extends Origen {
  estadoEquipos: EstadoDelEquipo[];
  pendientes: PendienteDelDia[];
  reemplazadaEn: string;
}

/** Las secciones de la bitácora de OCC de un día, tal como se guardan. */
export interface SeccionesDeLaBitacoraOcc {
  estadoEquipos: EstadoDelEquipo[];
  trabajos: TrabajoDeMantenimiento[];
  actividades: ActividadDeMantenimiento[];
  pendientes: PendienteDelDia[];
  /** De qué mensaje salió la lista vigente; nula si todavía no llegó ninguna. */
  lista: Origen | null;
  listas: ListaReemplazada[];
  /** La lista vigente dice un día dudoso (D12). */
  fechaDudosa: boolean;
}

export const BITACORA_OCC_VACIA: SeccionesDeLaBitacoraOcc = {
  estadoEquipos: [],
  trabajos: [],
  actividades: [],
  pendientes: [],
  lista: null,
  listas: [],
  fechaDudosa: false,
};

/* ── El día de un mensaje (RF-9a, RF-9e, D12) ──────────────────────────── */

/** Qué clase de mensaje es, para saber de qué día es. */
export type ClaseDeMensajeDeEmpresa = 'lista_equipos' | 'informe_mantenimiento' | 'otro';

/**
 * Desde qué hora una lista enviada **para el mismo día** es dudosa (D12): la lista de
 * la mañana describe ese día, pero la de la noche se manda para el siguiente.
 */
export const HORA_DE_LA_LISTA_DE_LA_NOCHE = 18;

export interface DiaDelMensaje {
  fecha: string;
  /** Solo una lista puede ser dudosa (D12). */
  dudosa: boolean;
}

/** La hora del día en Colombia (0–23) de un instante. */
function horaEnColombia(ms: number): number {
  return new Date(ms - DESFASE_COLOMBIA_MS).getUTCHours();
}

/**
 * De qué día es un mensaje del grupo de una empresa:
 *
 *  · la fecha que dice el mensaje, si es una fecha real —la lista «para el día X»
 *    (RF-9a), el informe «Fecha dd/mm/aaaa» (RF-9e) o la que leyó la IA—;
 *  · si no dice ninguna, el día en que se envió (024).
 *
 * Una lista es **dudosa** (D12) si el día que queda ya había pasado al enviarla, o si es
 * el mismo día y se envió de noche: el 28-oct a las 22:59 llegó una segunda lista «para
 * el día 28» que era para el 29. Se guarda igual en el día que dice; la marca es para que
 * el Encargado de OCC la revise y la mueva si hace falta.
 */
export function diaDeEmpresa(datos: {
  clase: ClaseDeMensajeDeEmpresa;
  /** `YYYY-MM-DD`, como la leyó la IA; nula o vacía si el mensaje no dice. */
  fechaQueDice: string | null | undefined;
  /** El instante de envío, en milisegundos. */
  enviadoEn: number;
}): DiaDelMensaje {
  const diaDeEnvio = fechaDeJornada(datos.enviadoEn);
  const dicha = datos.fechaQueDice?.trim() ?? '';
  const fecha = esFechaReal(dicha) ? dicha : diaDeEnvio;
  if (datos.clase !== 'lista_equipos') return { fecha, dudosa: false };

  const yaPaso = fecha < diaDeEnvio;
  const mismoDiaDeNoche = fecha === diaDeEnvio && horaEnColombia(datos.enviadoEn) >= HORA_DE_LA_LISTA_DE_LA_NOCHE;
  return { fecha, dudosa: yaPaso || mismoDiaDeNoche };
}

/* ── Llevar un mensaje al día (RF-9b, RF-9c, RF-9f, RF-15) ─────────────── */

/**
 * La llave de un equipo dentro del día: el equipo ligado, o lo escrito si no se ligó
 * («LVY 499» y «lvy499» son el mismo renglón). Así un cambio del día y la lista hablan
 * del mismo renglón aunque uno diga «TFO 429» y la otra «TFO429».
 */
export function claveDelEquipo(equipo: EquipoDelRenglon): string {
  return equipo.vehiculoId ? `v:${equipo.vehiculoId}` : `e:${normalizar(equipo.escrito).replace(/[^a-z0-9]/g, '')}`;
}

/** Un renglón con sus cambios del día en orden de hora, sin repetir el mismo dos veces. */
function conCambios(renglon: EstadoDelEquipo, cambios: readonly CambioDelDia[]): EstadoDelEquipo {
  const vistos = new Set<string>();
  const unicos = cambios.filter((c) => {
    const clave = `${c.mensajeId}|${c.estado}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  return { ...renglon, cambios: [...unicos].sort((a, b) => a.hora.localeCompare(b.hora)) };
}

/**
 * La lista «Equipos operativos – para el día X» en el día (RF-9, RF-9b, RF-9f):
 *
 *  · reemplaza el estado de los equipos y los pendientes con los de la lista nueva, y
 *    deja la anterior en el historial, sin borrarla (RF-30);
 *  · **conserva los cambios del día** (RF-9c): la TFO 429 que se varó a las 08:48 sigue
 *    con su cambio aunque llegue otra lista, y un equipo que solo tuvo cambios y no está
 *    en la lista nueva sigue en el día, sin estado de lista;
 *  · la misma lista entregada otra vez, o una que ya fue reemplazada, no cambia nada
 *    (RF-15): n8n y el pulso reintentan.
 */
export function reemplazarLista(
  bitacora: SeccionesDeLaBitacoraOcc,
  lista: {
    origen: Origen;
    estadoEquipos: readonly EstadoDelEquipo[];
    pendientes: readonly PendienteDelDia[];
    dudosa: boolean;
  },
  /** Cuándo se reemplazó la anterior, ISO 8601, para el historial. */
  ahora: string,
): SeccionesDeLaBitacoraOcc {
  const id = lista.origen.mensajeId;
  if (bitacora.lista?.mensajeId === id || bitacora.listas.some((l) => l.mensajeId === id)) return bitacora;

  const cambiosDe = new Map<string, CambioDelDia[]>();
  for (const r of bitacora.estadoEquipos) cambiosDe.set(claveDelEquipo(r), r.cambios);

  const nuevos = lista.estadoEquipos.map((r) =>
    conCambios({ ...r, origen: lista.origen }, [...r.cambios, ...(cambiosDe.get(claveDelEquipo(r)) ?? [])]),
  );
  const enLaLista = new Set(nuevos.map(claveDelEquipo));
  const soloConCambios = bitacora.estadoEquipos
    .filter((r) => r.cambios.length > 0 && !enLaLista.has(claveDelEquipo(r)))
    .map((r) => ({ ...r, estado: null, motivo: '', origen: null }));

  const anterior: ListaReemplazada[] = bitacora.lista
    ? [
        {
          ...bitacora.lista,
          estadoEquipos: bitacora.estadoEquipos.filter((r) => r.origen),
          pendientes: bitacora.pendientes,
          reemplazadaEn: ahora,
        },
      ]
    : [];

  return {
    ...bitacora,
    estadoEquipos: [...nuevos, ...soloConCambios],
    pendientes: [...lista.pendientes],
    lista: lista.origen,
    listas: [...bitacora.listas, ...anterior],
    fechaDudosa: lista.dudosa,
  };
}

/**
 * Lo que alguien dice de un equipo durante el día —quedó varado, entró a mantenimiento,
 * volvió a estar operativo o disponible— (RF-9c). Se anota en su renglón con la hora,
 * sin tocar lo que dijo la lista; si el equipo no tiene renglón todavía (la lista no ha
 * llegado o no lo nombra), se crea con `id` y sin estado de lista (RF-15).
 */
export function anotarCambio(
  bitacora: SeccionesDeLaBitacoraOcc,
  equipo: EquipoDelRenglon,
  cambio: CambioDelDia,
  /** El id del renglón si hay que crearlo: lo da el servidor, fijo por mensaje. */
  id: string,
): SeccionesDeLaBitacoraOcc {
  const clave = claveDelEquipo(equipo);
  const existente = bitacora.estadoEquipos.find((r) => claveDelEquipo(r) === clave);
  if (existente) {
    return {
      ...bitacora,
      estadoEquipos: bitacora.estadoEquipos.map((r) => (r === existente ? conCambios(r, [...r.cambios, cambio]) : r)),
    };
  }
  const nuevo: EstadoDelEquipo = { ...equipo, id, estado: null, motivo: '', origen: null, cambios: [cambio] };
  return { ...bitacora, estadoEquipos: [...bitacora.estadoEquipos, nuevo] };
}

/**
 * Los trabajos o las actividades de un mensaje en los del día (RF-9d, RF-9e, RF-15):
 * cada renglón trae un id fijo (mensaje y número de renglón), así que el mismo mensaje
 * procesado dos veces reemplaza sus renglones en vez de sumarlos. Los de otros mensajes
 * se suman: dos trabajos el mismo día en la misma máquina son dos trabajos.
 */
export function mezclarRenglones<R extends { id: string }>(actuales: readonly R[], nuevos: readonly R[]): R[] {
  const porId = new Map(nuevos.map((r) => [r.id, r]));
  const reemplazados = actuales.map((r) => porId.get(r.id) ?? r);
  const yaEstaban = new Set(actuales.map((r) => r.id));
  return [...reemplazados, ...nuevos.filter((r) => !yaEstaban.has(r.id))];
}

/**
 * Cómo quedó un equipo al final de lo reportado (RF-24): el último cambio del día, si
 * hubo; si no, lo que dijo la lista. Nulo si no hay ni lista ni cambio.
 */
export function estadoActual(renglon: EstadoDelEquipo): EstadoDeEquipo | null {
  const ultimo = renglon.cambios.at(-1);
  if (ultimo) return ultimo.estado === 'operativo' ? 'operativo' : 'inoperativo';
  return renglon.estado;
}

/** Cuántos equipos quedaron operativos e inoperativos en el día (RF-24). */
export function conteoDelDia(bitacora: Pick<SeccionesDeLaBitacoraOcc, 'estadoEquipos'>): {
  operativos: number;
  inoperativos: number;
} {
  const estados = bitacora.estadoEquipos.map(estadoActual);
  return {
    operativos: estados.filter((e) => e === 'operativo').length,
    inoperativos: estados.filter((e) => e === 'inoperativo').length,
  };
}

/* ── Lo que va también a Mantenimientos (RF-9h, cambio del 2026-11-03) ──── */

/** Solo un equipo ligado de verdad: ni sin reconocer, ni con placa mal escrita (RF-12a). */
function estaLigado(equipo: EquipoDelRenglon): equipo is EquipoDelRenglon & { vehiculoId: string } {
  return equipo.vehiculoId !== null && equipo.posiblePlaca === null;
}

/**
 * El mantenimiento que un trabajo del grupo de OCC registra también en el módulo
 * Mantenimientos (RF-9h), con la misma forma que el de un grupo de obra (spec 030), para
 * guardarlo con la misma función:
 *
 *  · preventivo → `aceite` si habla de aceite («Cambio de aceite motor, filtro aire…»),
 *    si no `preventivo`;
 *  · daño o reparación → `correctivo`;
 *  · llantas, repuesto o compra y suministro → nada: no son mantenimientos con intervalo
 *    ni una falla de la máquina, y se quedan solo en la bitácora de OCC.
 *
 * Un renglón sin equipo ligado no va nunca: con la placa mal escrita no se sabe a qué
 * máquina reiniciarle el intervalo.
 */
export function mantenimientosDelTrabajo(trabajo: TrabajoDeMantenimiento): MantenimientoDelReporte[] {
  if (!estaLigado(trabajo)) return [];
  const clase =
    trabajo.tipo === 'preventivo'
      ? /aceite/.test(normalizar(trabajo.descripcion))
        ? 'aceite'
        : 'preventivo'
      : trabajo.tipo === 'dano' || trabajo.tipo === 'reparacion'
        ? 'correctivo'
        : null;
  if (!clase) return [];
  return [
    {
      vehiculoId: trabajo.vehiculoId,
      escrito: trabajo.escrito,
      clase,
      resuelto: false,
      lectura: null,
      descripcion: trabajo.descripcion,
    },
  ];
}

/**
 * «Vehículo TFO 420 OPERATIVO»: cierra los correctivos pendientes de ese equipo en
 * Mantenimientos (RF-9h, como 030/RF-41). Sin clase: no registra un mantenimiento nuevo,
 * solo resuelve. Varado o en mantenimiento no registran nada: lo que se le hizo llega
 * como trabajo.
 */
export function mantenimientoDelCambio(
  equipo: EquipoDelRenglon,
  cambio: Pick<CambioDelDia, 'estado' | 'texto'>,
): MantenimientoDelReporte[] {
  if (!estaLigado(equipo) || cambio.estado !== 'operativo') return [];
  return [
    {
      vehiculoId: equipo.vehiculoId,
      escrito: equipo.escrito,
      clase: null,
      resuelto: true,
      lectura: null,
      descripcion: cambio.texto,
    },
  ];
}

/* ── Leer un mensaje del grupo de una empresa (RF-9 a RF-12c) ───────────── */

/** Un equipo como lo nombra la IA: lo escrito, y el tipo y la marca si los separó. */
export interface EquipoDeIa {
  equipo?: string | null;
  tipo?: string | null;
  marca?: string | null;
}

/**
 * Lo que la IA lee de un mensaje del grupo de OCC (el bloque `occ` de la propuesta). Todo
 * opcional y como texto: la IA es de afuera y cambia, y lo que no se entiende tiene que
 * quedar vacío, no adivinado (como 021).
 */
export interface PropuestaDeEmpresa {
  lista?: {
    /** «para el día X», `YYYY-MM-DD`. */
    fecha?: string | null;
    equipos?: readonly (EquipoDeIa & { estado?: string | null; motivo?: string | null })[] | null;
    notas?: readonly { texto?: string | null; equipo?: string | null }[] | null;
  } | null;
  cambios?: readonly (EquipoDeIa & { estado?: string | null; texto?: string | null })[] | null;
  trabajos?: readonly (EquipoDeIa & { tipo_trabajo?: string | null; descripcion?: string | null })[] | null;
  informe?: {
    /** «Fecha dd/mm/aaaa», `YYYY-MM-DD`. */
    fecha?: string | null;
    persona?: string | null;
    actividades?: readonly { descripcion?: string | null; equipo?: string | null }[] | null;
  } | null;
  /** Un kilometraje o un horómetro dicho de un equipo: «Km final 74609 LVY002» (RF-14). */
  lecturas?: readonly (EquipoDeIa & { valor?: number | string | null; unidad?: string | null })[] | null;
}

/** Un renglón que no se pudo guardar solo, con la forma de «No se pudo guardar» (024). */
export interface RenglonDeEmpresaApartado {
  seccion: 'estado_equipos' | 'cambios' | 'trabajos' | 'lecturas';
  renglon: number;
  motivo: string;
  datos: Record<string, unknown>;
}

/** Lo que un mensaje lleva a la bitácora del día, ya reconocido. */
export interface LecturaDelMensaje {
  lista: { estadoEquipos: EstadoDelEquipo[]; pendientes: PendienteDelDia[] } | null;
  cambios: { id: string; equipo: EquipoDelRenglon; cambio: CambioDelDia }[];
  trabajos: TrabajoDeMantenimiento[];
  actividades: ActividadDeMantenimiento[];
  /** Las lecturas de equipos ligados, para sus medidores (RF-14, RF-12b). */
  lecturas: { vehiculoId: string; clase: 'odometro' | 'horometro'; valor: number }[];
  apartados: RenglonDeEmpresaApartado[];
}

/** «HH:MM» en Colombia de un instante: la hora de un reporte del grupo. */
export function horaDeColombia(instanteMs: number): string {
  return new Date(instanteMs - DESFASE_COLOMBIA_MS).toISOString().slice(11, 16);
}

/** «operativo», «Disponible» → operativo; «inoperativo», «varado», «dañado» → inoperativo. */
export function estadoDeEquipoDeTexto(texto: string | null | undefined): EstadoDeEquipo | null {
  const t = normalizar(texto ?? '');
  if (/inoperativ|no operativ|varad|dan[oa]|fuera de servicio/.test(t)) return 'inoperativo';
  if (/operativ|disponible/.test(t)) return 'operativo';
  return null;
}

/** «ingresa varado», «En Mantenimiento», «Vehículo disponible»… (RF-9c). */
export function cambioDeEstadoDeTexto(texto: string | null | undefined): CambioDeEstado | null {
  const t = normalizar(texto ?? '');
  if ((CAMBIOS_DE_ESTADO as readonly string[]).includes(t)) return t as CambioDeEstado;
  if (/varad/.test(t)) return 'varado';
  if (/mantenimiento|taller/.test(t)) return 'en_mantenimiento';
  if (/operativ|disponible/.test(t)) return 'operativo';
  return null;
}

/** El tipo de un trabajo, como lo dijo la IA o con las palabras del grupo (RF-9d). */
export function tipoDeTrabajoDeTexto(texto: string | null | undefined): TipoDeTrabajo | null {
  const t = normalizar(texto ?? '');
  if ((TIPOS_DE_TRABAJO as readonly string[]).includes(t)) return t as TipoDeTrabajo;
  if (/llanta/.test(t)) return 'llantas';
  if (/suministr|combustible|acpm/.test(t)) return 'suministro';
  if (/repuesto|compra/.test(t)) return 'repuesto_o_compra';
  if (/preventiv/.test(t)) return 'preventivo';
  if (/dano|falla|averia/.test(t)) return 'dano';
  if (/repar|correctiv/.test(t)) return 'reparacion';
  return null;
}

/** El motivo de un equipo que no quedó ligado ni con placa parecida (RF-12c). */
function motivoSinEquipo(escrito: string, candidatos: readonly string[]): string {
  return candidatos.length > 1
    ? `«${escrito}» puede ser más de un equipo: elija cuál es.`
    : `No se reconoció el equipo «${escrito}»: no está registrado.`;
}

/**
 * Lee un mensaje del grupo de una empresa contra los equipos registrados (RF-9 a
 * RF-12c). Pura: recibe la propuesta de la IA, los equipos y de quién y a qué hora es el
 * mensaje, y devuelve lo que va a cada sección y lo que va a «No se pudo guardar».
 *
 *  · El estado, los cambios y los trabajos **son** de un equipo: si no se reconoce ni se
 *    parece a una placa registrada, el renglón se aparta (RF-12c). Con placa parecida se
 *    guarda tal cual, con la nota (RF-12a).
 *  · En las actividades y los pendientes el equipo es un dato más: si no se reconoce, la
 *    viñeta se guarda igual, con lo escrito y sin ligar. Perder «se llevan 4 llantas a…»
 *    por no reconocer el equipo sería perder el trabajo del día.
 *
 * Los ids son fijos por mensaje y renglón (`<mensaje>#<sección>-<n>`): procesar otra vez
 * el mismo mensaje reemplaza sus renglones en vez de sumarlos (RF-15). Viven solo dentro
 * de la bitácora, así que no necesitan forma de UUID.
 */
export function leerMensajeDeEmpresa(
  propuesta: PropuestaDeEmpresa,
  vehiculos: readonly VehiculoConocido[],
  origen: Origen,
): LecturaDelMensaje {
  const id = (seccion: string, n: number) => `${origen.mensajeId}#${seccion}-${n}`;
  const apartados: RenglonDeEmpresaApartado[] = [];
  const reconocer = (e: EquipoDeIa) => {
    const escrito = e.equipo?.trim() ?? '';
    const r = reconocerEquipoDeEmpresa(escrito, vehiculos, { tipo: e.tipo, marca: e.marca });
    const equipo: EquipoDelRenglon = { vehiculoId: r.vehiculoId, escrito, posiblePlaca: r.posiblePlaca };
    return { escrito, equipo, ligado: r.vehiculoId !== null || r.posiblePlaca !== null, candidatos: r.candidatos };
  };
  /** Para actividades y pendientes: el equipo si lo nombran, sin apartar si no se reconoce. */
  const equipoOpcional = (escrito: string | null | undefined): EquipoDelRenglon | null => {
    if (!escrito?.trim()) return null;
    return reconocer({ equipo: escrito }).equipo;
  };

  // La lista del día (RF-9, RF-9f). Un equipo nombrado dos veces queda con lo último que dice.
  // La IA manda siempre el bloque, con listas vacías si el mensaje no es una lista: solo cuenta
  // si trae algo. Una lista vacía reemplazaría la del día y la dejaría sin equipos (RF-9b).
  let lista: LecturaDelMensaje['lista'] = null;
  if (propuesta.lista && (propuesta.lista.equipos?.length ?? 0) + (propuesta.lista.notas?.length ?? 0) > 0) {
    const porEquipo = new Map<string, EstadoDelEquipo>();
    (propuesta.lista.equipos ?? []).forEach((e, n) => {
      const r = reconocer(e);
      const estado = estadoDeEquipoDeTexto(e.estado);
      const datos = { escrito: r.escrito, estado: e.estado ?? null, motivo: e.motivo ?? '', candidatos: r.candidatos };
      if (!r.escrito) return;
      if (!r.ligado) {
        apartados.push({ seccion: 'estado_equipos', renglon: n, motivo: motivoSinEquipo(r.escrito, r.candidatos), datos });
        return;
      }
      if (!estado) {
        apartados.push({
          seccion: 'estado_equipos',
          renglon: n,
          motivo: `No se entendió si «${r.escrito}» está operativo o inoperativo.`,
          datos,
        });
        return;
      }
      porEquipo.set(claveDelEquipo(r.equipo), {
        ...r.equipo,
        id: id('estado', n),
        estado,
        motivo: e.motivo?.trim() ?? '',
        origen: null,
        cambios: [],
      });
    });
    const pendientes: PendienteDelDia[] = (propuesta.lista.notas ?? [])
      .map((nota, n) => ({ nota, n }))
      .filter(({ nota }) => !!nota.texto?.trim())
      .map(({ nota, n }) => ({ ...origen, id: id('pendiente', n), texto: nota.texto!.trim(), equipo: equipoOpcional(nota.equipo) }));
    lista = { estadoEquipos: [...porEquipo.values()], pendientes };
  }

  // Lo que cambió en el día (RF-9c).
  const cambios: LecturaDelMensaje['cambios'] = [];
  (propuesta.cambios ?? []).forEach((c, n) => {
    const r = reconocer(c);
    const estado = cambioDeEstadoDeTexto(c.estado);
    const datos = { escrito: r.escrito, estado: c.estado ?? null, texto: c.texto ?? '', candidatos: r.candidatos };
    if (!r.escrito) return;
    if (!r.ligado) {
      apartados.push({ seccion: 'cambios', renglon: n, motivo: motivoSinEquipo(r.escrito, r.candidatos), datos });
    } else if (!estado) {
      apartados.push({ seccion: 'cambios', renglon: n, motivo: `No se entendió qué pasó con «${r.escrito}».`, datos });
    } else {
      cambios.push({ id: id('cambio', n), equipo: r.equipo, cambio: { ...origen, estado, texto: c.texto?.trim() ?? '' } });
    }
  });

  // Los trabajos de mantenimiento (RF-9d).
  const trabajos: TrabajoDeMantenimiento[] = [];
  (propuesta.trabajos ?? []).forEach((t, n) => {
    const r = reconocer(t);
    const tipo = tipoDeTrabajoDeTexto(t.tipo_trabajo);
    const descripcion = t.descripcion?.trim() ?? '';
    const datos = { escrito: r.escrito, tipo: t.tipo_trabajo ?? null, descripcion, candidatos: r.candidatos };
    if (!r.ligado) {
      const motivo = r.escrito ? motivoSinEquipo(r.escrito, r.candidatos) : 'Falta a qué equipo se le hizo el trabajo.';
      apartados.push({ seccion: 'trabajos', renglon: n, motivo, datos });
    } else if (!tipo) {
      apartados.push({ seccion: 'trabajos', renglon: n, motivo: 'No se entendió qué tipo de trabajo fue.', datos });
    } else if (!descripcion) {
      apartados.push({ seccion: 'trabajos', renglon: n, motivo: 'Falta qué se hizo.', datos });
    } else {
      trabajos.push({ ...r.equipo, ...origen, id: id('trabajo', n), tipo, descripcion });
    }
  });

  // El informe del personal de mantenimiento: una actividad por viñeta (RF-9e).
  const persona = propuesta.informe?.persona?.trim() || origen.reportadoPor;
  const actividades: ActividadDeMantenimiento[] = (propuesta.informe?.actividades ?? [])
    .map((a, n) => ({ a, n }))
    .filter(({ a }) => !!a.descripcion?.trim())
    .map(({ a, n }) => ({
      ...origen,
      id: id('actividad', n),
      persona,
      descripcion: a.descripcion!.trim(),
      equipo: equipoOpcional(a.equipo),
    }));

  // Las lecturas, solo de un equipo ligado (RF-14). Con la placa mal escrita no se sabe de
  // qué máquina es: no se lleva a ningún medidor (RF-12b) y se avisa, para no perderla.
  const lecturas: LecturaDelMensaje['lecturas'] = [];
  (propuesta.lecturas ?? []).forEach((l, n) => {
    const r = reconocer(l);
    const valor = numeroDeTexto(l.valor ?? null);
    const clase = unidadDeMedidor(l.unidad, typeof l.valor === 'string' ? l.valor : null);
    const datos = { escrito: r.escrito, valor: l.valor ?? null, unidad: l.unidad ?? null, candidatos: r.candidatos };
    if (valor === null || valor <= 0) return;
    if (r.equipo.vehiculoId && !r.equipo.posiblePlaca && clase) {
      lecturas.push({ vehiculoId: r.equipo.vehiculoId, clase, valor });
      return;
    }
    const motivo = r.equipo.posiblePlaca
      ? `La lectura de «${r.escrito}» no se llevó a ningún medidor: esa placa no está registrada (posiblemente sea ${r.equipo.posiblePlaca.placa}).`
      : !r.ligado
        ? motivoSinEquipo(r.escrito || '(sin equipo)', r.candidatos)
        : `No se sabe si la lectura de «${r.escrito}» es de kilómetros o de horas.`;
    apartados.push({ seccion: 'lecturas', renglon: n, motivo, datos });
  });

  return { lista, cambios, trabajos, actividades, lecturas, apartados };
}

/**
 * Lo que el mensaje registra también en Mantenimientos (RF-9h): sus trabajos con clase y
 * los «operativo» que resuelven correctivos, con la forma de la spec 030.
 */
export function mantenimientosDelMensaje(lectura: Pick<LecturaDelMensaje, 'trabajos' | 'cambios'>): MantenimientoDelReporte[] {
  return [
    ...lectura.trabajos.flatMap(mantenimientosDelTrabajo),
    ...lectura.cambios.flatMap((c) => mantenimientoDelCambio(c.equipo, c.cambio)),
  ];
}

/**
 * Lleva lo leído de un mensaje a la bitácora del día (RF-9b a RF-9f, RF-15), con las
 * reglas de arriba: la lista reemplaza, los cambios se anotan, los trabajos y las
 * actividades se mezclan por id. La misma función la usa el servidor al procesar el
 * mensaje y al reintentar, así que repetir da lo mismo que una vez.
 */
export function llevarAlDia(
  bitacora: SeccionesDeLaBitacoraOcc,
  lectura: LecturaDelMensaje,
  datos: { origen: Origen; dudosa: boolean; ahora: string },
): SeccionesDeLaBitacoraOcc {
  let dia = bitacora;
  if (lectura.lista) {
    dia = reemplazarLista(dia, { ...lectura.lista, origen: datos.origen, dudosa: datos.dudosa }, datos.ahora);
  }
  for (const c of lectura.cambios) dia = anotarCambio(dia, c.equipo, c.cambio, c.id);
  return {
    ...dia,
    trabajos: mezclarRenglones(dia.trabajos, lectura.trabajos),
    actividades: mezclarRenglones(dia.actividades, lectura.actividades),
  };
}

/** ¿El mensaje no trae nada para la bitácora? Entonces no se abre un día por él. */
export function lecturaVacia(lectura: LecturaDelMensaje): boolean {
  return (
    !lectura.lista &&
    lectura.cambios.length === 0 &&
    lectura.trabajos.length === 0 &&
    lectura.actividades.length === 0
  );
}

/* ── La bitácora en el panel (RF-18 a RF-24) ───────────────────────────── */

/** Cómo se ve un día en la lista (RF-23): el armado de la 024, o cerrada, o anulada. */
export type EstadoDelDiaDeEmpresa = 'en_espera' | 'armada' | 'incompleta' | 'cerrada' | 'anulada';

/**
 * El estado de un día de la bitácora de una empresa (RF-23). Anulada gana a todo —lo
 * anulado no es lo que pasó—, después cerrada, y si no, lo que diga el armado del día
 * (`whatsapp_dias_empresa`). Sin armado todavía, en espera.
 */
export function estadoDelDiaDeEmpresa(dia: {
  anulada: boolean;
  cerrada: boolean;
  armado: 'en_espera' | 'armada' | 'incompleta' | null;
}): EstadoDelDiaDeEmpresa {
  if (dia.anulada) return 'anulada';
  if (dia.cerrada) return 'cerrada';
  return dia.armado ?? 'en_espera';
}

/**
 * El día filtrado por equipo y por estado (RF-24). El equipo es su llave dentro del día
 * (`claveDelEquipo`: el ligado, o lo escrito); el estado, cómo quedó al final
 * (`estadoActual`). Filtrar por estado deja los trabajos, actividades y pendientes de los
 * equipos que quedaron así; sin filtros, el día entero.
 */
export function filtrarDia<S extends Pick<SeccionesDeLaBitacoraOcc, 'estadoEquipos' | 'trabajos' | 'actividades' | 'pendientes'>>(
  dia: S,
  filtro: { equipo?: string | null; estado?: EstadoDeEquipo | null },
): S {
  const { equipo, estado } = filtro;
  if (!equipo && !estado) return dia;
  const estados = dia.estadoEquipos.filter(
    (r) => (!equipo || claveDelEquipo(r) === equipo) && (!estado || estadoActual(r) === estado),
  );
  const claves = estado ? new Set(estados.map(claveDelEquipo)) : null;
  const pasa = (e: EquipoDelRenglon | null) =>
    !!e && (!equipo || claveDelEquipo(e) === equipo) && (!claves || claves.has(claveDelEquipo(e)));
  return {
    ...dia,
    estadoEquipos: estados,
    trabajos: dia.trabajos.filter(pasa),
    actividades: dia.actividades.filter((a) => pasa(a.equipo)),
    pendientes: dia.pendientes.filter((p) => pasa(p.equipo)),
  };
}

/**
 * Lo que impide guardar una corrección del panel (RF-18), o `null`. Lo que el contrato ya
 * revisa —tipos, textos vacíos— no se repite aquí: esto es lo que mira entre renglones.
 * Dos renglones con el mismo id se pisarían al volver a procesar un mensaje (RF-15), y un
 * equipo dos veces en el estado del día no se sabe cómo quedó.
 */
export function faltaDeLaCorreccion(
  dia: Partial<Pick<SeccionesDeLaBitacoraOcc, 'estadoEquipos' | 'trabajos' | 'actividades' | 'pendientes'>>,
): string | null {
  const ids = [
    ...(dia.estadoEquipos ?? []),
    ...(dia.trabajos ?? []),
    ...(dia.actividades ?? []),
    ...(dia.pendientes ?? []),
  ].map((r) => r.id);
  if (new Set(ids).size !== ids.length) return 'Hay dos renglones con el mismo id: recargue la bitácora y vuelva a corregir.';
  const claves = (dia.estadoEquipos ?? []).map(claveDelEquipo);
  const repetida = claves.find((c, i) => claves.indexOf(c) !== i);
  if (repetida) {
    const renglon = (dia.estadoEquipos ?? []).find((r) => claveDelEquipo(r) === repetida)!;
    return `«${renglon.escrito}» está dos veces en el estado de los equipos.`;
  }
  return null;
}

/**
 * Un equipo de la lista que quedó en «No se pudo guardar» y alguien completó (RF-11): entra
 * al estado del día sin reemplazar la lista. Si el equipo ya tiene renglón (llegó por un
 * cambio del día), toma el estado y el motivo y conserva sus cambios.
 */
export function agregarEstadoAlDia(
  bitacora: SeccionesDeLaBitacoraOcc,
  renglon: EstadoDelEquipo,
): SeccionesDeLaBitacoraOcc {
  const clave = claveDelEquipo(renglon);
  const existente = bitacora.estadoEquipos.find((r) => claveDelEquipo(r) === clave);
  if (!existente) return { ...bitacora, estadoEquipos: [...bitacora.estadoEquipos, renglon] };
  return {
    ...bitacora,
    estadoEquipos: bitacora.estadoEquipos.map((r) =>
      r === existente ? { ...r, estado: renglon.estado, motivo: renglon.motivo, origen: renglon.origen ?? r.origen } : r,
    ),
  };
}
