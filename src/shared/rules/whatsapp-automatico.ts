/**
 * El guardado automático de lo que llega por WhatsApp (spec 024). Reglas puras: sin
 * I/O ni dependencias, como todo `shared/rules`.
 *
 * Aquí viven las listas cerradas que la base y las reglas comparten —si cada una
 * tuviera la suya, un día discreparían sin que nada falle a la vista—, y las
 * reglas que deciden qué se guarda, cuándo se repite un viaje y cuándo está
 * completo un día.
 */
import { DESTINO_OBRA, mismoVale, valeLimpio } from './cantera';
import { diaDeLaSemana, esDominicalOFestivo } from './festivos';
import type { HorarioDeObra } from './horas';
import { DESFASE_COLOMBIA_MS } from './jornada';
import type { Cargo } from '../catalogos/cargos';
import { normalizar } from './texto';
import {
  cargoDeHoja,
  horaDeTexto,
  posiblesCoincidencias,
  reconocerPersona,
  type PersonaConocida,
  type ReporteDelDia,
  type ViajeDelReporte,
} from './whatsapp';

/**
 * Los reportes que la bitácora de un día puede esperar (RF-38). `viajes` cuenta
 * con cualquier vale o renglón de viajes de ese día.
 */
export const TIPOS_DE_REPORTE = [
  'reporte_diario',
  'personal',
  'control_calidad',
  'inicio_actividades',
  'viajes',
] as const;

export type TipoDeReporte = (typeof TIPOS_DE_REPORTE)[number];

/** Cómo se nombra cada reporte esperado en el panel (RF-38, RF-55). */
export const ETIQUETAS_DE_REPORTE: Record<TipoDeReporte, string> = {
  reporte_diario: 'Reporte diario',
  personal: 'Reporte de personal',
  control_calidad: 'Control de calidad',
  inicio_actividades: 'Inicio de actividades',
  viajes: 'Viajes de cantera',
};

/**
 * En qué va la bitácora de un día armada desde WhatsApp (RF-56). Cerrada no está
 * aquí: se lee de la bitácora misma, que es la que manda.
 *
 *  · `en_espera` — hay mensajes del día y faltan reportes esperados.
 *  · `armada` — se armó con todos los esperados (RF-43).
 *  · `incompleta` — se armó sin alguno: por la hora límite o a mano (RF-46 a RF-48).
 */
export const ESTADOS_DEL_DIA = ['en_espera', 'armada', 'incompleta'] as const;

export type EstadoDelDia = (typeof ESTADOS_DEL_DIA)[number];

/** Un renglón que no se pudo guardar: pendiente, o ya guardado o descartado (RF-60 a RF-63). */
export const ESTADOS_DE_EXCEPCION = ['pendiente', 'guardada', 'descartada'] as const;

export type EstadoDeExcepcion = (typeof ESTADOS_DE_EXCEPCION)[number];

/** Lo que el sistema puede registrar solo (RF-22 a RF-31). */
export const TIPOS_CREADOS = [
  'persona',
  'vehiculo',
  'material_cantera',
  'sitio_cantera',
  'material_almacen',
] as const;

export type TipoCreado = (typeof TIPOS_CREADOS)[number];

/**
 * El usuario de sistema «IA WhatsApp»: el autor de lo que se guarda sin una persona
 * (RF-10). Fijo, porque la migración lo inserta y el código lo nombra.
 */
export const USUARIO_IA_WHATSAPP = {
  id: '00000000-0000-5000-8000-000000000024',
  usuario: 'sistema.ia-whatsapp',
  nombreCompleto: 'IA WhatsApp',
} as const;

/* ── Qué reporte es un mensaje ─────────────────────────────────────────── */

/** Un reporte que no trae más que su sección de personal: el archivo de horas del día. */
function soloTraePersonal(reporte: ReporteDelDia): boolean {
  return (
    reporte.personal.length > 0 &&
    reporte.clima.length === 0 &&
    reporte.actividades.length === 0 &&
    reporte.maquinaria.length === 0 &&
    reporte.ensayos.length === 0 &&
    reporte.viajes.length === 0 &&
    reporte.notas.trim() === ''
  );
}

/**
 * A cuál de los reportes esperados cuenta un mensaje (RF-38), o `null` si a
 * ninguno: un incidente o un reporte de almacén no completan la bitácora de nadie.
 * El reporte diario que solo trae personal es el reporte de personal (el Excel de
 * horas de la spec 023).
 */
export function tipoDeReporte(
  categoria: string | null | undefined,
  reporte: ReporteDelDia,
): TipoDeReporte | null {
  switch (categoria) {
    case 'reporte_diario':
    case 'reporte_actividades':
      return soloTraePersonal(reporte) ? 'personal' : 'reporte_diario';
    case 'laboratorio':
      return 'control_calidad';
    case 'inicio_actividades':
      return 'inicio_actividades';
    case 'suministro_cantera':
      return 'viajes';
    default:
      return null;
  }
}

/* ── Lo que le falta a un viaje ────────────────────────────────────────── */

/** «HH:MM» en Colombia de un instante. */
function horaDeColombia(instanteMs: number): string {
  return new Date(instanteMs - DESFASE_COLOMBIA_MS).toISOString().slice(11, 16);
}

/**
 * El viaje con lo que se puede suponer sin inventar (RF-16, RF-17):
 *
 *  · sin hora, la de la marca de agua de la foto y, sin ella, la del mensaje en
 *    Colombia: el vale se manda poco después del viaje, y es la mejor hora que hay;
 *  · sin destino **escrito**, la obra: un vale de despacho que no dice adónde va es
 *    material para la obra. Un destino escrito que no se reconoció («Vía las
 *    Margaritas») no se toca: decide qué hacer con él quien lo crea (RF-29).
 */
export function completarViaje(
  viaje: ViajeDelReporte,
  contexto: { horaFoto: string | null | undefined; enviadoEn: number },
): ViajeDelReporte {
  return {
    ...viaje,
    hora: viaje.hora ?? horaDeTexto(contexto.horaFoto) ?? horaDeColombia(contexto.enviadoEn),
    destino: viaje.destino ?? (viaje.destinoEscrito ? null : DESTINO_OBRA),
  };
}

/* ── Crear una volqueta ────────────────────────────────────────────────── */

/** Menos letras y cifras que esto es una placa cortada o mal leída, no una placa. */
const LARGO_MINIMO_DE_PLACA = 5;

/**
 * La placa con la que se puede registrar una volqueta nueva (RF-30, RF-31): solo
 * letras y cifras, en mayúsculas. `null` si tiene menos de cinco: «TFO4…», de una
 * foto cortada, crearía una volqueta que no existe.
 */
export function placaRegistrable(texto: string | null | undefined): string | null {
  const placa = (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return placa.length >= LARGO_MINIMO_DE_PLACA ? placa : null;
}

/* ── Viajes sin duplicar ───────────────────────────────────────────────── */

/** Lo que hace falta de un viaje para saber si ya está guardado. */
export interface ViajeComparable {
  vale: string | null;
  vehiculoId: string | null;
  hora: string | null;
}

/** Hasta cuántos minutos de diferencia la misma volqueta sin vale es el mismo viaje (RF-12). */
const MINUTOS_DEL_MISMO_VIAJE = 30;

function minutosDelDia(hora: string | null): number | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(hora ?? '');
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

/**
 * El viaje ya guardado ese día en la obra que es este mismo, o `null` (RF-11 a
 * RF-13). `guardados` son los del mismo día y la misma obra.
 *
 *  · Con número de vale, solo cuenta el vale: dos fotos del mismo vale son el mismo
 *    viaje aunque la IA lea distinta la hora, y dos vales distintos son dos viajes
 *    aunque sean de la misma volqueta a la misma hora.
 *  · Sin vale —un renglón del reporte diario—, la misma volqueta a 30 minutos o
 *    menos, tenga o no vale el guardado: es el vale que alguien ya mandó en foto.
 *
 * Los anulados no cuentan: anular un viaje mal guardado y volver a mandarlo tiene que
 * guardarlo otra vez.
 */
export function viajeRepetido(
  viaje: ViajeComparable,
  guardados: readonly (ViajeComparable & { id: string; anulado: boolean })[],
): string | null {
  const vigentes = guardados.filter((g) => !g.anulado);
  if (valeLimpio(viaje.vale) !== null) {
    return vigentes.find((g) => mismoVale(g.vale, viaje.vale))?.id ?? null;
  }

  const minutos = minutosDelDia(viaje.hora);
  if (!viaje.vehiculoId || minutos === null) return null;
  return (
    vigentes.find((g) => {
      const suyos = minutosDelDia(g.hora);
      return (
        g.vehiculoId === viaje.vehiculoId &&
        suyos !== null &&
        Math.abs(suyos - minutos) <= MINUTOS_DEL_MISMO_VIAJE
      );
    })?.id ?? null
  );
}

/**
 * Cuántos viajes de un renglón agregado («TFO420 – 4 viajes») faltan por guardar,
 * contando los de esa volqueta que ya están guardados ese día (RF-14). Nunca menos
 * de cero: si ya hay más, el reporte no los quita.
 */
export function viajesQueFaltan(cantidad: number, yaGuardados: number): number {
  return Math.max(0, cantidad - yaGuardados);
}

/* ── Personas que no se reconocen ──────────────────────────────────────── */

/** Qué hacer con el nombre de una persona del reporte (RF-22 a RF-26). */
export type DecisionDePersona =
  /** Es una persona registrada (021/RF-74, RF-79). */
  | { tipo: 'reconocida'; usuarioId: string }
  /** Una sola persona comparte dos o más palabras de su nombre: es ella (RF-23). */
  | { tipo: 'coincidencia'; usuarioId: string }
  /** Varias pueden ser: no se registra a nadie y se elige (RF-24). */
  | { tipo: 'ambigua'; candidatos: string[] }
  /** Nadie se le parece: se registra en la obra, sin acceso (RF-22). */
  | { tipo: 'crear'; nombre: string; cargo: Cargo | null };

/** Las palabras de un nombre, sin tildes, mayúsculas ni signos. */
function palabrasDe(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .split(' ')
    .filter((p) => p !== '');
}

/**
 * Qué hacer con una persona que nombra el reporte (RF-22 a RF-26), en este orden:
 *
 *  1. reconocida, como siempre (`reconocerPersona`);
 *  2. si todas las palabras escritas están en el nombre de **dos o más** personas
 *     («Diego» con dos Diegos), es ambigua: registrar a un «Diego» nuevo sería un
 *     tercero que no existe;
 *  3. si una sola persona comparte dos o más palabras de su nombre, es ella (RF-23);
 *     si son varias, ambigua (RF-24);
 *  4. si no, se registra: conductor si viene de un viaje o de una volqueta (RF-25), y
 *     del archivo de personal con el cargo de su hoja, o «sin definir» (RF-26).
 *
 * `personas` son las registradas que pueden ser: las vigentes de la obra.
 */
export function decisionDePersona(
  nombre: string | null | undefined,
  personas: readonly PersonaConocida[],
  origen: { seccion: 'viajes' | 'maquinaria' | 'personal'; hoja?: string | null },
): DecisionDePersona | null {
  const escrito = (nombre ?? '').replace(/\s+/g, ' ').trim();
  if (escrito === '') return null;

  const reconocida = reconocerPersona(escrito, personas);
  if (reconocida) return { tipo: 'reconocida', usuarioId: reconocida };

  const escritas = palabrasDe(escrito);
  const contienenTodo = personas.filter((p) => {
    const delNombre = palabrasDe(p.nombreCompleto);
    return escritas.every((palabra) => delNombre.includes(palabra));
  });
  if (contienenTodo.length > 1) return { tipo: 'ambigua', candidatos: contienenTodo.map((p) => p.id) };

  const parecidas = posiblesCoincidencias(escrito, personas);
  if (parecidas.length === 1) return { tipo: 'coincidencia', usuarioId: parecidas[0].id };
  if (parecidas.length > 1) return { tipo: 'ambigua', candidatos: parecidas.map((p) => p.id) };

  const cargo: Cargo | null =
    origen.seccion === 'personal' ? cargoDeHoja(origen.hoja) : 'conductor';
  return { tipo: 'crear', nombre: escrito, cargo };
}

/* ── Cuándo se arma la bitácora del día ────────────────────────────────── */

/** Un reporte que la bitácora de la obra espera (RF-37, RF-39). */
export interface ReporteEsperado {
  tipoReporte: TipoDeReporte;
  /** El `lid` de WhatsApp de quien lo manda, o `null` si vale cualquiera. */
  autorId: string | null;
  autorNombre: string | null;
}

/** «280036280139944@lid» y «280036280139944» son el mismo autor. */
function mismoAutor(a: string | null, b: string | null): boolean {
  const limpio = (x: string | null) => (x ?? '').split('@')[0].trim();
  return limpio(a) !== '' && limpio(a) === limpio(b);
}

const SABADO = 6;

/**
 * ¿La obra trabaja ese día según su horario? (RF-40). Los domingos y festivos no:
 * su horario solo dice cuál es la jornada de referencia para el recargo (spec 016),
 * no que se trabaje. El sábado, si la obra tiene jornada de sábado.
 */
function trabajaEseDia(horario: HorarioDeObra, fecha: string): boolean {
  if (esDominicalOFestivo(fecha)) return false;
  return diaDeLaSemana(fecha) === SABADO ? horario.sabado.length > 0 : horario.semana.length > 0;
}

/**
 * Si el día de una obra ya tiene sus reportes, y cuáles faltan (RF-39 a RF-43).
 *
 *  · Sin ningún mensaje, nunca: no hay bitácora que armar (RF-49).
 *  · Sin lista, o en un día que la obra no trabaja según su horario, basta el primer
 *    mensaje (RF-40, RF-41).
 *  · Si no, cada reporte esperado tiene que tener al menos un mensaje de su tipo, y
 *    de su autor si se dijo quién lo manda (RF-39).
 */
export function diaCompleto(entrada: {
  esperados: readonly ReporteEsperado[];
  recibidos: readonly { tipoReporte: TipoDeReporte | null; autorId: string }[];
  horario: HorarioDeObra;
  fecha: string;
}): { completo: boolean; faltan: ReporteEsperado[] } {
  const { esperados, recibidos, horario, fecha } = entrada;
  if (recibidos.length === 0) return { completo: false, faltan: [...esperados] };
  if (esperados.length === 0 || !trabajaEseDia(horario, fecha)) {
    return { completo: true, faltan: [] };
  }
  const faltan = esperados.filter(
    (e) =>
      !recibidos.some(
        (r) => r.tipoReporte === e.tipoReporte && (e.autorId === null || mismoAutor(e.autorId, r.autorId)),
      ),
  );
  return { completo: faltan.length === 0, faltan };
}

/** La hora del día siguiente a la que la bitácora se arma con lo que haya (RF-46). */
const HORA_LIMITE_DEL_DIA_SIGUIENTE = 12;

/**
 * ¿Ya pasó la hora límite del día? Las 12:00 m del día siguiente, en Colombia
 * (RF-46). Una fecha mal escrita nunca vence: no se arma nada con ella.
 */
export function diaVencido(fecha: string, ahoraMs: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const limite =
    Date.parse(`${fecha}T00:00:00Z`) +
    (24 + HORA_LIMITE_DEL_DIA_SIGUIENTE) * 60 * 60 * 1000 +
    DESFASE_COLOMBIA_MS;
  return ahoraMs >= limite;
}

/* ── Lo que se guarda y lo que no ──────────────────────────────────────── */

/** Una falta de `faltasDelReporte`: de un renglón, o de una sección entera si `renglon` es nulo. */
export interface FaltaDeRenglon {
  seccion: string;
  renglon: number | null;
  mensaje: string;
}

/** Lo que va a «No se pudo guardar»: el renglón, por qué y cómo quedó (RF-60). */
export interface RenglonApartado {
  seccion: string;
  renglon: number | null;
  motivo: string;
  datos: unknown;
}

/** Las secciones del reporte que son listas de renglones. */
const SECCIONES_CON_RENGLONES = [
  'clima',
  'actividades',
  'maquinaria',
  'personal',
  'ensayos',
  'viajes',
  'almacen',
] as const;

type SeccionConRenglones = (typeof SECCIONES_CON_RENGLONES)[number];

function esSeccionConRenglones(seccion: string): seccion is SeccionConRenglones {
  return (SECCIONES_CON_RENGLONES as readonly string[]).includes(seccion);
}

/**
 * Parte el reporte en lo que se puede guardar y lo que va a «No se pudo guardar»
 * (RF-19, RF-20, RF-21). `faltas` son las de `faltasDelReporte` y las de las
 * opciones de la obra.
 *
 *  · La falta de un renglón aparta ese renglón, con todos sus motivos juntos.
 *  · La de una sección entera (las franjas de clima que se cruzan) aparta la sección.
 *  · Sin fecha no se sabe a qué día va nada: no se guarda nada (`guardable` nulo).
 *
 * Los renglones apartados conservan su número en el reporte original, que es el que
 * se completa después.
 */
export function separarRenglones(
  reporte: ReporteDelDia,
  faltas: readonly FaltaDeRenglon[],
): { guardable: ReporteDelDia | null; excepciones: RenglonApartado[] } {
  const deFecha = faltas.filter((f) => f.seccion === 'fecha');
  if (deFecha.length > 0) {
    return {
      guardable: null,
      excepciones: [
        { seccion: 'fecha', renglon: null, motivo: deFecha.map((f) => f.mensaje).join(' '), datos: null },
      ],
    };
  }

  const excepciones: RenglonApartado[] = [];
  const guardable: ReporteDelDia = { ...reporte };
  for (const seccion of SECCIONES_CON_RENGLONES) {
    const suyas = faltas.filter((f) => f.seccion === seccion);
    if (suyas.length === 0) continue;
    const renglones = reporte[seccion] as readonly unknown[];

    const deLaSeccion = suyas.filter((f) => f.renglon === null);
    if (deLaSeccion.length > 0) {
      excepciones.push({
        seccion,
        renglon: null,
        motivo: deLaSeccion.map((f) => f.mensaje).join(' '),
        datos: { renglones },
      });
      (guardable[seccion] as unknown[]) = [];
      continue;
    }

    const apartados = [...new Set(suyas.map((f) => f.renglon as number))].sort((a, b) => a - b);
    for (const renglon of apartados) {
      excepciones.push({
        seccion,
        renglon,
        motivo: suyas
          .filter((f) => f.renglon === renglon)
          .map((f) => f.mensaje)
          .join(' '),
        datos: renglones[renglon] ?? null,
      });
    }
    (guardable[seccion] as unknown[]) = renglones.filter((_, i) => !apartados.includes(i));
  }
  // Una falta de una sección desconocida no se pierde: va entera, como la fecha.
  for (const f of faltas) {
    if (!esSeccionConRenglones(f.seccion) && f.seccion !== 'fecha') {
      excepciones.push({ seccion: f.seccion, renglon: f.renglon, motivo: f.mensaje, datos: null });
    }
  }
  return { guardable, excepciones };
}

/**
 * La placa colombiana que trae escrita una máquina del reporte —tres letras y tres
 * cifras: «Volqueta Foton LLQ 375» es LLQ375—, para registrarla si no existe (RF-30).
 * `null` si no trae una: un serial de maquinaria amarilla no es una placa, y con él
 * no se registra una volqueta.
 */
export function placaDeLaMaquina(texto: string | null | undefined): string | null {
  const limpio = (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const placa = /(?:^|[^A-Z0-9])([A-Z]{3})[\s-]*(\d{3})(?![A-Z0-9])/.exec(limpio);
  return placa ? `${placa[1]}${placa[2]}` : null;
}
