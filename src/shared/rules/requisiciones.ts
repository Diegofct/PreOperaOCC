/**
 * La requisición de las obras y de GeoLab y su cadena de aprobación (spec 046). Reglas puras: sin
 * I/O, como todo `shared/rules`; el servidor y la pantalla usan estas mismas.
 *
 * ── Qué es una requisición ──
 *
 * Una solicitud de compra (036) o de pago (037) con dos cosas más: un número RQ, uno solo para
 * las dos clases, y un **paso** en la cadena. Lo que pasa después de aprobarla —comprar, recibir,
 * pagar— sigue siendo lo de la 036 y la 037. Por eso no hay estados nuevos: mientras recorre la
 * cadena está `enviada`, y en qué paso va lo dice el paso, no el estado.
 *
 * ── La cadena ──
 *
 * En una obra: Residente → Director de Obra → Director de Proyectos → Administradora de Elemental
 * (RF-18). En GeoLab, solo la Administradora (RF-19). Arranca en el paso siguiente al de quien la
 * pide, para que nadie se apruebe a sí mismo (RF-20 a RF-22), y un paso sin nadie se salta, con el
 * salto anotado (RF-23, RF-24). El de la Administradora no se salta nunca: si no hay ninguna, la
 * requisición la espera y la Gerencia puede aprobarla (RF-74, RF-75). Quién ocupa cada paso lo
 * averigua el servidor; aquí llega como una lista de personas por paso.
 */
import { nombreDeEstadoDeSolicitud, solicitudAbierta, type EstadoDeSolicitud } from './compras';
import { fechaDeJornada } from './jornada';
import { nombreDeEstadoDePago, pagoAbierto, type EstadoDePago } from './pagos';
import type { Rol } from './permisos';
import { normalizar } from './texto';

/** Los pasos, en el orden en que se recorren (RF-18). */
export const PASOS_DE_LA_CADENA = ['residente', 'director_obra', 'director_proyectos', 'administradora'] as const;
export type PasoDeLaCadena = (typeof PASOS_DE_LA_CADENA)[number];

/** El último paso: el que no se salta (RF-74). */
export const ULTIMO_PASO: PasoDeLaCadena = 'administradora';

/** Cómo se dice cada paso en pantalla: «En aprobación: Director de Obra» (RF-82). */
export const NOMBRE_DEL_PASO: Record<PasoDeLaCadena, string> = {
  residente: 'Residente',
  director_obra: 'Director de Obra',
  director_proyectos: 'Director de Proyectos',
  administradora: 'Administradora de Elemental',
};

/** El acceso de quien ocupa cada paso. */
export const ROL_DEL_PASO: Record<PasoDeLaCadena, Rol> = {
  residente: 'residente',
  director_obra: 'director_obra',
  director_proyectos: 'director_proyectos',
  administradora: 'administradora_elemental',
};

/**
 * Dónde se pide: una obra, GeoLab u OCC. OCC tiene requisiciones desde el cambio del 2026-11-17
 * (RF-86 a RF-88): van directo a la Administradora, como las de GeoLab, hasta que la 047 les dé su
 * formato.
 */
export type LugarDeLaRequisicion = 'obra' | 'geolab' | 'occ';

/**
 * Quiénes ocupan hoy cada paso para ese lugar, por id: el Residente activo de la obra, sus
 * Directores de Obra vigentes, los Directores de Proyectos activos del grupo (RF-73) y las
 * Administradoras activas. Vacío es que nadie lo ocupa.
 */
export type OcupantesDeLaCadena = Record<PasoDeLaCadena, readonly string[]>;

/** Un paso que se saltó, para la historia (RF-24). */
export interface PasoSaltado {
  paso: PasoDeLaCadena;
  motivo: string;
}

/**
 * Por qué se salta cada paso: nadie lo ocupa (RF-23, RF-73). El de la Administradora no se salta
 * (RF-74); su texto es el del aviso de la bandeja de la Gerencia (RF-75).
 */
const MOTIVO_DEL_SALTO: Record<PasoDeLaCadena, string> = {
  residente: 'La obra no tiene un Residente activo.',
  director_obra: 'La obra no tiene un Director de Obra activo.',
  director_proyectos: 'No hay ningún Director de Proyectos activo.',
  administradora: 'No hay ninguna Administradora de Elemental activa.',
};

/** El paso que sigue a este, o `null` si es el último. */
function siguiente(paso: PasoDeLaCadena): PasoDeLaCadena | null {
  const i = PASOS_DE_LA_CADENA.indexOf(paso);
  return i < PASOS_DE_LA_CADENA.length - 1 ? PASOS_DE_LA_CADENA[i + 1] : null;
}

/**
 * Desde un paso, el primero que tiene a alguien, saltando los vacíos uno tras otro (RF-23). El de
 * la Administradora se queda aunque esté vacío (RF-74).
 */
export function primerPasoOcupado(
  desde: PasoDeLaCadena,
  ocupantes: OcupantesDeLaCadena,
): { paso: PasoDeLaCadena; saltos: PasoSaltado[] } {
  const saltos: PasoSaltado[] = [];
  let paso = desde;
  while (paso !== ULTIMO_PASO && ocupantes[paso].length === 0) {
    saltos.push({ paso, motivo: MOTIVO_DEL_SALTO[paso] });
    paso = siguiente(paso) ?? ULTIMO_PASO;
  }
  return { paso, saltos };
}

/**
 * El paso en que la requisición empieza según quién la pide (RF-19 a RF-22): el que sigue al suyo.
 * El Almacenista no es un paso: lo suyo empieza en el Residente. Cualquier otro acceso que pida en
 * una obra empieza por el principio.
 */
function pasoTrasQuienPide(rol: Rol, lugar: LugarDeLaRequisicion): PasoDeLaCadena {
  // RF-19, RF-88: sin pasos de obra, directo a la Administradora.
  if (lugar !== 'obra') return ULTIMO_PASO;
  switch (rol) {
    case 'admin':
    case 'director_proyectos':
      return 'administradora';
    case 'director_obra':
      return 'director_proyectos';
    case 'residente':
      return 'director_obra';
    default:
      return 'residente';
  }
}

/**
 * Dónde queda una requisición al enviarla, y los pasos que se saltaron por el camino (RF-18 a
 * RF-24, RF-73, RF-74). Es también donde vuelve a empezar una devuelta al reenviarse (RF-31).
 */
export function pasoInicial(
  quienPide: Rol,
  lugar: LugarDeLaRequisicion,
  ocupantes: OcupantesDeLaCadena,
): { paso: PasoDeLaCadena; saltos: PasoSaltado[] } {
  return primerPasoOcupado(pasoTrasQuienPide(quienPide, lugar), ocupantes);
}

/**
 * A dónde pasa una requisición aprobada en un paso que no es el último (RF-27): al siguiente con
 * alguien. `null` si era el último: queda Aprobada (RF-28).
 */
export function pasoSiguiente(
  paso: PasoDeLaCadena,
  ocupantes: OcupantesDeLaCadena,
): { paso: PasoDeLaCadena; saltos: PasoSaltado[] } | null {
  const proximo = siguiente(paso);
  return proximo ? primerPasoOcupado(proximo, ocupantes) : null;
}

/** «En aprobación: Director de Obra» (RF-82). */
export function estadoEnLaCadena(paso: PasoDeLaCadena): string {
  return `En aprobación: ${NOMBRE_DEL_PASO[paso]}`;
}

/* ── Decidir en un paso (RF-25 a RF-34, RF-67, RF-76 a RF-81) ── */

/** Lo que se puede decidir en un paso. Las tres que había, ahora en cada paso (D1). */
export const DECISIONES = ['aprobar', 'devolver', 'rechazar'] as const;
export type Decision = (typeof DECISIONES)[number];

/** Lo que hace falta de una requisición para decidir sobre ella. */
export interface RequisicionParaDecidir {
  /** `enviada` mientras recorre la cadena; los estados de compra y de pago coinciden en esto. */
  estado: EstadoDeSolicitud | string;
  /** El paso en que espera; `null` si ya no está en la cadena. */
  paso: PasoDeLaCadena | null;
  pedidaPor: string;
}

/**
 * Por qué esta persona no puede decidir esta requisición, o `null` si puede (RF-25, RF-26,
 * RF-67, RF-76, RF-77). 409 si ya no espera ninguna decisión; 403 si no le toca:
 *
 * - nadie decide lo que pidió él mismo, en ningún paso, ni la Gerencia (RF-76, D12);
 * - la Gerencia, en cualquier paso (RF-26), así que lo suyo, sin Administradora, lo decide otra
 *   persona de la Gerencia (RF-77);
 * - los demás, solo si ocupan el paso en que está, en ese lugar (RF-25).
 *
 * Quién ocupa el paso lo dice `ocupantes`, que arma el servidor: no basta el acceso, porque un
 * Director de Obra de otra obra tiene el mismo acceso y no es de esta cadena.
 */
export function porQueNoPuedeDecidir(
  persona: { id: string; rol: Rol },
  requisicion: RequisicionParaDecidir,
  ocupantes: OcupantesDeLaCadena,
): { estado: 403 | 409; mensaje: string } | null {
  const paso = requisicion.paso;
  if (requisicion.estado !== 'enviada' || paso === null) {
    return { estado: 409, mensaje: 'Esta requisición ya no espera ninguna aprobación.' };
  }
  if (persona.id === requisicion.pedidaPor) {
    return { estado: 403, mensaje: 'Nadie aprueba, devuelve ni rechaza una requisición que pidió él mismo.' };
  }
  if (persona.rol === 'admin') return null;
  if (!ocupantes[paso].includes(persona.id)) {
    return {
      estado: 403,
      mensaje: `Esta requisición está en el paso de ${NOMBRE_DEL_PASO[paso]}: la decide quien ocupa ese paso o la Gerencia.`,
    };
  }
  return null;
}

/** Para la pantalla: los botones de decidir solo a quien le toca. */
export function puedeDecidir(
  persona: { id: string; rol: Rol },
  requisicion: RequisicionParaDecidir,
  ocupantes: OcupantesDeLaCadena,
): boolean {
  return porQueNoPuedeDecidir(persona, requisicion, ocupantes) === null;
}

/** Cómo queda una requisición después de una decisión. */
export interface TrasLaDecision {
  /** El estado de la 036 o la 037: `enviada` si sigue en la cadena. */
  estado: 'enviada' | 'aprobada' | 'devuelta' | 'rechazada';
  /** El paso en que queda esperando; `null` si salió de la cadena. */
  paso: PasoDeLaCadena | null;
  /** Los pasos que se saltaron al pasar al siguiente (RF-24). */
  saltos: PasoSaltado[];
}

/**
 * Qué pasa con una requisición tras decidirla (RF-27 a RF-32):
 *
 * - aprobar en el paso de la Administradora, o siendo la Gerencia en cualquier paso → Aprobada
 *   (RF-28, RF-29, D7);
 * - aprobar en otro paso → el siguiente con alguien, saltando los vacíos (RF-27);
 * - devolver → Devuelta a quien la pidió (RF-30); al reenviarla empieza de nuevo (`pasoInicial`);
 * - rechazar → Rechazada, sin volver a abrirse (RF-32).
 *
 * Se llama después de `porQueNoPuedeDecidir`: aquí se supone que la persona sí puede.
 */
export function trasLaDecision(
  decision: Decision,
  persona: { rol: Rol },
  paso: PasoDeLaCadena,
  ocupantes: OcupantesDeLaCadena,
): TrasLaDecision {
  if (decision === 'devolver') return { estado: 'devuelta', paso: null, saltos: [] };
  if (decision === 'rechazar') return { estado: 'rechazada', paso: null, saltos: [] };
  const sigue = persona.rol === 'admin' ? null : pasoSiguiente(paso, ocupantes);
  return sigue ? { estado: 'enviada', paso: sigue.paso, saltos: sigue.saltos } : { estado: 'aprobada', paso: null, saltos: [] };
}

/**
 * ¿Puede cambiar lo pedido al aprobar —quitar renglones, bajar cantidades, aprobar un valor
 * menor—? Solo la Administradora en su paso y la Gerencia (RF-34, RF-79, RF-80, D11): los demás
 * pasos, si algo no les cuadra, la devuelven.
 */
export function puedeRecortar(persona: { rol: Rol }, paso: PasoDeLaCadena): boolean {
  return persona.rol === 'admin' || (persona.rol === 'administradora_elemental' && paso === ULTIMO_PASO);
}

/** El rechazo de un recorte de quien no puede hacerlo (RF-80). */
export const NO_RECORTA =
  'Solo la Administradora de Elemental o la Gerencia cambian lo pedido al aprobar. Si algo no cuadra, devuélvala con lo que hay que corregir.';

/** Las decisiones que piden decir por qué (RF-30, RF-32). */
export function faltaDelMotivoDeLaDecision(decision: Decision, motivo: string): string | null {
  if (motivo.trim()) return null;
  if (decision === 'devolver') return 'Diga qué debe corregirse.';
  if (decision === 'rechazar') return 'Diga por qué se rechaza.';
  return null;
}

/* ── Reacomodar cuando un paso se queda vacío (RF-71) ── */

/** Una requisición que espera en la cadena, vista para reacomodarla. */
export interface RequisicionEnEspera {
  id: string;
  estado: string;
  paso: PasoDeLaCadena | null;
}

/**
 * Las requisiciones que hay que mover porque su paso se quedó sin nadie, a dónde y con qué saltos
 * (RF-71). Las que esperan a la Administradora no se mueven aunque no haya ninguna (RF-74). Vacío
 * si no hay nada que hacer: así el servidor no escribe.
 */
export function reacomodar(
  requisiciones: readonly RequisicionEnEspera[],
  ocupantes: OcupantesDeLaCadena,
): { id: string; desde: PasoDeLaCadena; paso: PasoDeLaCadena; saltos: PasoSaltado[] }[] {
  return requisiciones.flatMap((r) => {
    if (r.estado !== 'enviada' || r.paso === null || r.paso === ULTIMO_PASO || ocupantes[r.paso].length > 0) return [];
    const { paso, saltos } = primerPasoOcupado(r.paso, ocupantes);
    return [{ id: r.id, desde: r.paso, paso, saltos }];
  });
}

/* ── La lista del lugar y la bandeja (RF-5, RF-16, RF-17, RF-45 a RF-51, RF-82, RF-83) ── */

export type TipoDeRequisicion = 'compra' | 'pago';

/** Un renglón de una requisición de compra, visto para saber si está vencida (RF-16). */
export interface RenglonParaVencer {
  /** `YYYY-MM-DD`; `null` en las SC anteriores. */
  necesitaEl: string | null;
  cantidad: number;
  /** `null` hasta aprobar; 0 si se quitó al aprobar. */
  cantidadAprobada: number | null;
  recibido: number;
}

/**
 * Una fila de Requisiciones: una RQ de compra o de pago, o una SC o SP anterior (RF-6, RF-83).
 * `numeroRequisicion` es el RQ; nulo en las anteriores, que se ven con su `numero`.
 */
export interface FilaDeRequisicion {
  tipo: TipoDeRequisicion;
  numero: number;
  numeroRequisicion: number | null;
  estado: string;
  paso: PasoDeLaCadena | null;
  urgente: boolean;
  /** La fecha de la cabecera: en una RQ de compra, la más cercana de sus renglones. */
  paraCuando: string;
  pedidaPor: string;
  renglones?: readonly RenglonParaVencer[];
}

/** El número que se ve (RF-5, RF-53): `RQ-0001`, o el SC o SP de antes. */
export function numeroQueSeVe(fila: Pick<FilaDeRequisicion, 'tipo' | 'numero' | 'numeroRequisicion'>): string {
  if (fila.numeroRequisicion !== null) return `RQ-${String(fila.numeroRequisicion).padStart(4, '0')}`;
  return `${fila.tipo === 'compra' ? 'SC' : 'SP'}-${String(fila.numero).padStart(4, '0')}`;
}

/**
 * ¿Espera el último paso? (RF-47, RF-48, RF-83): una RQ en el paso de la Administradora, o una SC o
 * SP anterior todavía enviada, que se aprueba ahí con su paso único. Desde el cambio del 17-nov
 * Requisiciones de Elemental lista todo el grupo (RF-91), y el resumen cuenta solo estas.
 */
export function esperaElUltimoPaso(fila: Pick<FilaDeRequisicion, 'estado' | 'paso' | 'numeroRequisicion'>): boolean {
  return fila.estado === 'enviada' && (fila.numeroRequisicion === null || fila.paso === ULTIMO_PASO);
}

/** ¿Es una requisición (RQ) o una SC o SP anterior? */
export const esRequisicion = (fila: Pick<FilaDeRequisicion, 'numeroRequisicion'>) => fila.numeroRequisicion !== null;

/** ¿Todavía falta algo? La regla de la 036 o la 037, según la clase. */
export function requisicionAbierta(fila: Pick<FilaDeRequisicion, 'tipo' | 'estado'>): boolean {
  return fila.tipo === 'compra'
    ? solicitudAbierta(fila.estado as EstadoDeSolicitud)
    : pagoAbierto(fila.estado as EstadoDePago);
}

/** El estado que se lee en la lista: «En aprobación: Director de Obra» o el de siempre (RF-82). */
export function estadoQueSeVe(fila: Pick<FilaDeRequisicion, 'tipo' | 'estado' | 'paso'>): string {
  if (fila.estado === 'enviada' && fila.paso) return estadoEnLaCadena(fila.paso);
  return fila.tipo === 'compra' ? nombreDeEstadoDeSolicitud(fila.estado) : nombreDeEstadoDePago(fila.estado);
}

/**
 * ¿Pasó la fecha sin llegar o sin pagarse? (RF-16, RF-17). En una RQ de compra, la de cada
 * renglón que no se quitó y que no llegó completo: lo que ya llegó no vence a nadie. En las
 * demás, la fecha de la cabecera, como en la 036 y la 037. Las cerradas no se vencen.
 */
export function estaVencidaLaRequisicion(fila: FilaDeRequisicion, hoy: string = fechaDeJornada()): boolean {
  if (!requisicionAbierta(fila)) return false;
  if (fila.tipo === 'compra' && fila.numeroRequisicion !== null && fila.renglones) {
    return fila.renglones.some((r) => {
      const espera = r.cantidadAprobada ?? r.cantidad;
      return espera > 0 && r.recibido < espera && r.necesitaEl !== null && r.necesitaEl < hoy;
    });
  }
  return fila.paraCuando < hoy;
}

/** Las marcas de la lista (RF-16, RF-17, RF-83). */
export function marcasDeLaRequisicion(fila: FilaDeRequisicion, hoy: string = fechaDeJornada()): string[] {
  const marcas: string[] = [];
  if (!esRequisicion(fila)) marcas.push('Anterior');
  if (fila.estado === 'devuelta') marcas.push('Devuelta: corrígela');
  if (estaVencidaLaRequisicion(fila, hoy)) marcas.push('Vencida');
  return marcas;
}

/**
 * ¿Espera la aprobación de esta persona? (RF-45). En una RQ, si puede decidirla en su paso; para
 * la Gerencia, solo las del paso de la Administradora, porque puede decidirlas todas y entonces
 * «las mías» serían todas. Una SC o SP anterior enviada espera a la Administradora y a la
 * Gerencia (RF-55). Nadie espera decidir lo suyo (RF-76).
 */
export function esperaMiAprobacion(
  fila: FilaDeRequisicion,
  persona: { id: string; rol: Rol },
  ocupantes: OcupantesDeLaCadena,
): boolean {
  if (fila.estado !== 'enviada' || fila.pedidaPor === persona.id) return false;
  if (!esRequisicion(fila)) return persona.rol === 'admin' || persona.rol === 'administradora_elemental';
  if (persona.rol === 'admin') return fila.paso === ULTIMO_PASO;
  return puedeDecidir(persona, fila, ocupantes);
}

/**
 * El orden de Requisiciones (RF-45, RF-49): primero las que esperan mi aprobación, después las
 * demás abiertas —urgentes arriba y luego la que se necesita antes— y al final las cerradas, la
 * más nueva arriba. El número desempata, para que la lista no baile.
 */
export function ordenDeRequisiciones<T extends FilaDeRequisicion>(lista: readonly T[], esperaMia: (fila: T) => boolean): T[] {
  const grupo = (f: T) => (esperaMia(f) ? 0 : requisicionAbierta(f) ? 1 : 2);
  const numero = (f: T) => f.numeroRequisicion ?? f.numero;
  return [...lista].sort((a, b) => {
    const g = grupo(a) - grupo(b);
    if (g !== 0) return g;
    if (grupo(a) === 2) return numero(b) - numero(a);
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
    if (a.paraCuando !== b.paraCuando) return a.paraCuando < b.paraCuando ? -1 : 1;
    return numero(a) - numero(b);
  });
}

/** Las cifras de arriba de la bandeja de Elemental (RF-48). */
export function resumenDeRequisiciones(
  lista: readonly FilaDeRequisicion[],
  hoy: string = fechaDeJornada(),
): { esperan: number; urgentes: number; vencidas: number } {
  const esperan = lista.filter((f) => f.estado === 'enviada');
  return {
    esperan: esperan.length,
    urgentes: esperan.filter((f) => f.urgente).length,
    vencidas: lista.filter((f) => estaVencidaLaRequisicion(f, hoy)).length,
  };
}

/** Lo que se busca por texto en una fila (RF-50). */
export interface FilaParaBuscar extends Pick<FilaDeRequisicion, 'tipo' | 'numero' | 'numeroRequisicion'> {
  /** Lo que se pidió, el beneficiario, los proveedores y quien la pidió. */
  textos: readonly string[];
}

/**
 * ¿Responde a lo que se escribió? (RF-50). Por número: «RQ-0007», «rq7» o «7» encuentran la RQ-0007;
 * «sc5» la SC-0005 y «sp5» la SP-0005. Un número solo busca el que se ve: el RQ en una requisición,
 * el SC o el SP en una anterior. Por texto, sin distinguir mayúsculas ni tildes.
 */
export function coincideLaRequisicion(fila: FilaParaBuscar, texto: string): boolean {
  const buscado = normalizar(texto);
  if (!buscado) return true;
  const numero = /^(rq|sc|sp)?-?\s*0*(\d+)$/.exec(buscado);
  if (numero) {
    const n = Number(numero[2]);
    const prefijo = numero[1];
    if (fila.numeroRequisicion !== null) {
      if ((prefijo === undefined || prefijo === 'rq') && fila.numeroRequisicion === n) return true;
    } else if (fila.numero === n && (prefijo === undefined || prefijo === (fila.tipo === 'compra' ? 'sc' : 'sp'))) {
      return true;
    }
  }
  return [numeroQueSeVe(fila), ...fila.textos].some((campo) => normalizar(campo).includes(buscado));
}

/** Los filtros de Requisiciones (RF-51). Vacío o `null`: sin ese filtro. */
export interface FiltrosDeRequisiciones {
  tipo: TipoDeRequisicion | null;
  paso: PasoDeLaCadena | null;
  estado: string | null;
  soloUrgentes: boolean;
  /** El día en que se pidió, `YYYY-MM-DD`, las dos puntas incluidas. */
  desde: string | null;
  hasta: string | null;
  texto: string;
}

/** ¿Pasa los filtros? (RF-50, RF-51). */
export function pasaLosFiltrosDeRequisicion(
  fila: FilaDeRequisicion & FilaParaBuscar & { pedidaEl: string },
  filtros: FiltrosDeRequisiciones,
): boolean {
  if (filtros.tipo && fila.tipo !== filtros.tipo) return false;
  if (filtros.paso && fila.paso !== filtros.paso) return false;
  if (filtros.estado && fila.estado !== filtros.estado) return false;
  if (filtros.soloUrgentes && !fila.urgente) return false;
  if (filtros.desde && fila.pedidaEl < filtros.desde) return false;
  if (filtros.hasta && fila.pedidaEl > filtros.hasta) return false;
  return coincideLaRequisicion(fila, filtros.texto);
}

/* ── La cadena en el detalle (RF-33, RF-46) ── */

/** Un evento de la historia, como lo guardan la 036 y la 037. */
export interface EventoDeLaHistoria {
  paso: string;
  cambios: readonly unknown[];
  /** Quién lo hizo (su id), cuándo y por qué: lo que la cadena muestra de cada paso (T15). */
  por?: string | null;
  en?: string;
  motivo?: string | null;
}

/** Un paso de la cadena: cómo va y, si ya aprobó o se saltó, quién, cuándo y por qué. */
export interface PasoDeLaVuelta {
  paso: PasoDeLaCadena;
  como: ComoVaElPaso;
  por?: string;
  en?: string;
  motivo?: string;
}

/** Cómo va cada paso de la cadena en la vuelta actual. */
export type ComoVaElPaso = 'aprobado' | 'aqui' | 'falta' | 'saltado' | 'devolvio' | 'rechazo';

/** El paso que guarda un evento en su primer cambio (`{ paso }`), si lo guarda. */
function pasoDelEvento(e: EventoDeLaHistoria): PasoDeLaCadena | null {
  const primero = e.cambios[0] as { paso?: unknown } | undefined;
  const paso = primero?.paso;
  return typeof paso === 'string' && (PASOS_DE_LA_CADENA as readonly string[]).includes(paso) ? (paso as PasoDeLaCadena) : null;
}

/**
 * Cada paso de la cadena en la vuelta actual, desde donde empezó (RF-33, RF-46): aprobado, saltado,
 * aquí (donde espera) o falta. La vuelta actual empieza en el último `enviada` o `corregir` que
 * dejó la requisición en un paso: una devuelta que se corrige vuelve a empezar (RF-31), y lo que
 * se aprobó en la vuelta anterior ya no cuenta. Los pasos antes del primero no salen —quien la
 * pidió estaba en uno de ellos, o no le tocaban (RF-21)—, salvo los que se saltaron al enviarla.
 * Una devuelta o rechazada dice en qué paso fue. De lo aprobado, lo saltado, lo devuelto y lo
 * rechazado sale también quién, cuándo y el motivo (T15): quien ocupa un paso
 * no es por fuerza quien lo aprobó —la Gerencia aprueba en cualquiera (RF-26)—.
 */
export function cadenaDesdeLaHistoria(
  historia: readonly EventoDeLaHistoria[],
  pasoActual: PasoDeLaCadena | null,
): PasoDeLaVuelta[] {
  let inicio = -1;
  for (let i = historia.length - 1; i >= 0; i--) {
    const e = historia[i];
    if ((e.paso === 'enviada' || e.paso === 'corregir') && pasoDelEvento(e)) {
      inicio = i;
      break;
    }
  }
  if (inicio < 0) return [];
  const primero = pasoDelEvento(historia[inicio]) as PasoDeLaCadena;
  const como = new Map<PasoDeLaCadena, Omit<PasoDeLaVuelta, 'paso'>>();
  for (const e of historia.slice(inicio + 1)) {
    const paso = pasoDelEvento(e);
    if (!paso) continue;
    const hecho: ComoVaElPaso | null =
      e.paso === 'saltar_paso'
        ? 'saltado'
        : e.paso === 'aprobar_paso' || e.paso === 'aprobar'
          ? 'aprobado'
          : e.paso === 'devolver'
            ? 'devolvio'
            : e.paso === 'rechazar'
              ? 'rechazo'
              : null;
    if (!hecho) continue;
    como.set(paso, {
      como: hecho,
      ...(e.por ? { por: e.por } : {}),
      ...(e.en ? { en: e.en } : {}),
      ...(e.motivo ? { motivo: e.motivo } : {}),
    });
  }
  // Los pasos saltados al enviar quedan antes del primero en que esperó: desde el más temprano.
  const desde = Math.min(PASOS_DE_LA_CADENA.indexOf(primero), ...[...como.keys()].map((p) => PASOS_DE_LA_CADENA.indexOf(p)));
  return PASOS_DE_LA_CADENA.slice(desde).map((paso) =>
    paso === pasoActual ? { paso, como: 'aqui' } : { paso, ...(como.get(paso) ?? { como: 'falta' }) },
  );
}

/* ── La historia (T15) ── */

/** «al Director de Obra», «a la Administradora de Elemental». */
const AL_PASO: Record<PasoDeLaCadena, string> = {
  residente: 'al Residente',
  director_obra: 'al Director de Obra',
  director_proyectos: 'al Director de Proyectos',
  administradora: 'a la Administradora de Elemental',
};

/**
 * En una requisición, el primer cambio de cada evento de la cadena es `{ paso, siguiente }`, y
 * después vienen los cambios de la 036 y la 037 (renglones recortados, valor aprobado). Los textos
 * de la historia de esas dos specs leen los cambios desde el primero: sin separarlo, una aprobación
 * final se leería «renglón undefined» o «por $NaN». En una SC o SP de antes no hay paso.
 */
export function separarElPaso(cambios: readonly unknown[]): { paso: PasoDeLaCadena | null; resto: unknown[] } {
  const paso = pasoDelEvento({ paso: '', cambios });
  if (!paso) return { paso: null, resto: [...cambios] };
  // Corregir guarda el paso junto a lo que cambió (`{ paso, campos }`): se quita solo el paso.
  const { paso: _paso, siguiente: _siguiente, ...lodemas } = cambios[0] as Record<string, unknown>;
  return { paso, resto: Object.keys(lodemas).length ? [lodemas, ...cambios.slice(1)] : cambios.slice(1) };
}

/**
 * Lo que dice la historia de los dos eventos que trae la cadena (RF-33): aprobar en un paso que no
 * es el último y saltar un paso. El motivo del salto (RF-24) no va aquí: la historia lo pone en su
 * propia línea, como el de toda devolución o cancelación. `null` en los demás, que los nombra la 036
 * o la 037. Quien no ve los valores recibe la historia sin cambios, y el texto sale sin el paso.
 */
export function textoDelEventoDeLaCadena(e: EventoDeLaHistoria): string | null {
  const primero = e.cambios[0] as { siguiente?: unknown } | undefined;
  const paso = pasoDelEvento(e);
  if (e.paso === 'aprobar_paso') {
    const siguiente =
      typeof primero?.siguiente === 'string' && primero.siguiente in AL_PASO ? AL_PASO[primero.siguiente as PasoDeLaCadena] : null;
    return paso && siguiente ? `Aprobó como ${NOMBRE_DEL_PASO[paso]}; pasa ${siguiente}.` : 'La aprobó en su paso; pasa al siguiente.';
  }
  if (e.paso === 'saltar_paso') {
    if (!paso) return 'Se saltó un paso de la cadena.';
    return `Se saltó el paso ${AL_PASO[paso].replace(/^a la /, 'de la ').replace(/^al /, 'del ')}.`;
  }
  return null;
}

/* ── Dónde se da cada paso (T16) ── */

/** Decidir una solicitud: aprobar, rechazar o devolver. */
const PASOS_QUE_DECIDEN: readonly string[] = ['aprobar', 'rechazar', 'devolver'];
/** Lo que se hace con una compra aprobada: registrarla, anularla y recibir. */
const PASOS_DE_LA_COMPRA: readonly string[] = ['registrar_compra', 'anular_compra', 'recibir'];
/** Lo que se hace con un pago aprobado: registrarlo y anularlo. */
const PASOS_DEL_PAGO: readonly string[] = ['registrar_pago', 'anular_pago'];

/**
 * Qué botones de la gerencia ofrece cada pantalla de Elemental (RF-40, RF-47, RF-83, RF-89). Desde el
 * cambio del 2026-11-17 Requisiciones y Compras son un solo módulo: en Requisiciones de Elemental se
 * decide lo que espera aprobación —también las SC y SP de antes— y se hace lo de la compra aprobada
 * (registrarla, anularla, recibir); en Tesorería, lo del pago aprobado. Sin esta separación un mismo
 * paso salía en dos pantallas. Corregir y cancelar no salen en ninguna de las dos: son de quien la
 * pidió (o de la Administradora y la Gerencia, RF-37) y los da el propio detalle.
 * Quién puede dar el paso lo sigue decidiendo el servidor con `pasos`; esto solo dice dónde.
 */
export function pasosDeLaPantalla<P extends string>(pasos: readonly P[], donde: 'requisiciones' | 'tesoreria'): P[] {
  const deAqui = donde === 'requisiciones' ? [...PASOS_QUE_DECIDEN, ...PASOS_DE_LA_COMPRA] : PASOS_DEL_PAGO;
  return pasos.filter((p) => deAqui.includes(p));
}

/* ── Corregir sin cambiar de clase (RF-78, T18b) ── */

export const NO_CAMBIA_DE_CLASE =
  'Una requisición no cambia de compra a pago ni de pago a compra al corregirla: cancélela y pida otra de la clase que necesita.';

/** Lo que solo trae una de pago, y lo que solo trae una de compra. */
const SOLO_DE_PAGO = ['beneficiario', 'beneficiarioDocumento', 'concepto', 'valor'];
const SOLO_DE_COMPRA = ['renglones', 'proveedorSugerido', 'valorEstimado'];

/**
 * ¿La corrección que llega es de la otra clase? (RF-78). Cada clase se corrige en su propia tabla
 * y por su propia ruta, así que la de compra nunca puede volverse de pago; sin esta comprobación,
 * un cuerpo de la otra clase fallaría por lo primero que le faltara («faltan los renglones») en vez
 * de decir que para eso se cancela y se pide otra. Vale también para las SC y SP de antes.
 */
export function cambiaDeClaseAlCorregir(clase: TipoDeRequisicion, cuerpo: unknown): boolean {
  if (!cuerpo || typeof cuerpo !== 'object') return false;
  const c = cuerpo as Record<string, unknown>;
  const otra = clase === 'compra' ? 'pago' : 'compra';
  if (c.tipo === otra) return true;
  return (clase === 'compra' ? SOLO_DE_PAGO : SOLO_DE_COMPRA).some((campo) => campo in c);
}
