/**
 * Cómo se lee un reporte de WhatsApp (spec 021). Funciones puras, sin I/O.
 *
 * La IA que clasifica los mensajes ya devuelve los datos ordenados, pero el
 * servidor **no confía en ella para los formatos**: vuelve a leer la abscisa, la
 * hora y el clima con estas reglas antes de proponerlos. Dos razones:
 *
 *  · La IA es de afuera y cambia. Un modelo nuevo o un prompt retocado pueden
 *    devolver «9am» donde ayer devolvían «09:00», y la bandeja no debe enterarse.
 *  · Lo que no se entiende tiene que quedar **vacío**, no adivinado: el residente
 *    lo completa antes de aprobar (RF-26, RF-64). Por eso todas devuelven `null`
 *    cuando dudan, en vez de un valor por defecto.
 *
 * Viven en `shared/rules` aunque hoy solo las use el servidor porque son reglas
 * de negocio y llevan sus casos en `scripts/verificar-reglas.ts` (constitución 3
 * y 5).
 */
import {
  ENSAYOS_DE_CALIDAD,
  IDS_CLIMA,
  IDS_DE_NOVEDAD,
  type CondicionClima,
  type NovedadDePersonal,
} from '@/shared/catalogos/bitacora';
import { actividadPorItem, CLAVE_OTRA_ACTIVIDAD } from '@/shared/catalogos/presupuesto';

import { abreviaturaDeUnidad, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { TIPOS_VEHICULO } from '@/shared/catalogos/tipos-vehiculo';
import { CARGOS, type Cargo } from '@/shared/catalogos/cargos';

import {
  aCentesimas,
  saldoDelReporte,
  unidadDeTexto,
  validarMovimiento,
  type TipoMovimiento,
} from './almacen';
import { DESTINO_OBRA, valeLimpio, validarViaje } from './cantera';
import {
  mensajeDeFranja,
  mensajeDePersona,
  validarFranjas,
  validarPersonaDelParte,
} from './horas';
import {
  faltaContraElVehiculo,
  mensajeDeAvance,
  validarAvance,
  type ClaseDeMedidor,
  type LecturaRegistrada,
} from './jornada';
import { faltasDeActividad, faltasDelEnsayo, type UbicacionPorValidar } from './parte';
import { normalizar } from './texto';

/* ── La abscisa ────────────────────────────────────────────────────────── */

/** Una abscisa leída: el PR y los metros, sin validar todavía contra la vía. */
export interface AbscisaLeida {
  pr: number;
  metros: number;
}

/**
 * «K1+170», «ABS K1+ 190» o «pr 1 + 140» → PR 1 + 170 (RF-65).
 *
 * En la obra se escribe la misma referencia de dos maneras —«K» en los reportes
 * de actividades, «PR» en Control Cantera y en los ensayos— y OCC confirmó que son
 * la misma. Aquí solo se lee: si el PR o los metros caben en la vía, o si los
 * metros van de 25 en 25, lo dice la regla de cada destino (`validarAbscisa`),
 * para que el residente vea la falta en vez de una abscisa corregida a escondidas.
 */
const ABSCISA = /(?:^|[^a-z])(?:abs\.?\s*)?(?:k|pr)\s*(\d{1,3})\s*\+\s*(\d{1,3})(?!\d)/g;

export function abscisaDeTexto(texto: string | null | undefined): AbscisaLeida | null {
  return abscisasDeTexto(texto)[0] ?? null;
}

/** Todas las abscisas de un texto, en el orden en que se escribieron. */
function abscisasDeTexto(texto: string | null | undefined): AbscisaLeida[] {
  if (!texto) return [];
  return [...normalizar(texto).matchAll(ABSCISA)].map((c) => ({ pr: Number(c[1]), metros: Number(c[2]) }));
}

/**
 * Dónde se hizo un ensayo, leído del reporte (spec 025, RF-31, RF-33, RF-43):
 * «Pr 0 + 70 al Pr 0 +150» → un tramo, en el orden escrito; «K1+140» → una abscisa;
 * lo que no trae ninguna, el texto tal cual como lugar. Si las abscisas caben en la
 * vía lo dice la regla del ensayo, no esta lectura.
 */
export function ubicacionDeTexto(
  texto: string | null | undefined,
): { pr: number; metros: number } | { desde: AbscisaLeida; hasta: AbscisaLeida } | { lugar: string } | null {
  const lugar = texto?.trim() ?? '';
  if (!lugar) return null;
  const abscisas = abscisasDeTexto(lugar);
  if (abscisas.length >= 2) return { desde: abscisas[0], hasta: abscisas[1] };
  return abscisas[0] ?? { lugar };
}

/* ── La hora ───────────────────────────────────────────────────────────── */

/**
 * «9am», «9:00 am», «3:00 pm», «15:00» o «12 m» → «HH:MM».
 *
 * Es como se escribe la hora en un chat de obra: con o sin minutos, con «am» o
 * «a.m.», y «m» para el mediodía. La salida es la que guardan la bitácora y
 * Control Cantera. Una hora imposible —«25:00», «13 pm»— no se corrige: es `null`.
 */
export function horaDeTexto(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const limpio = normalizar(texto).replace(/\./g, '').replace(/\s+/g, ' ');
  const coincidencia = /^(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm|m)?$/.exec(limpio);
  if (!coincidencia) return null;

  let horas = Number(coincidencia[1]);
  const minutos = coincidencia[2] === undefined ? 0 : Number(coincidencia[2]);
  const sufijo = coincidencia[3];
  if (minutos > 59) return null;

  if (sufijo === undefined) {
    if (horas > 23) return null;
  } else if (sufijo === 'm') {
    // «12 m» es el mediodía, y solo ese: «3 m» no es una hora de nadie.
    if (horas !== 12 || minutos !== 0) return null;
  } else {
    if (horas < 1 || horas > 12) return null;
    if (sufijo === 'am' && horas === 12) horas = 0;
    if (sufijo === 'pm' && horas !== 12) horas += 12;
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/* ── El clima ──────────────────────────────────────────────────────────── */

/**
 * Las palabras con que se describe cada condición, **en el orden en que se
 * prueban**. El orden importa: «parcialmente nublado» contiene «nublado», y
 * «parcialmente soleado» contiene «sol»; lo parcial se mira primero. La lluvia va
 * antes que el sol porque una franja que dice «sol y luego lluvia» la tuvo que
 * partir la IA, y si no la partió, la lluvia es lo que justifica una parada.
 */
const PALABRAS_DE_CLIMA: readonly (readonly [CondicionClima, RegExp])[] = [
  ['parcialmente_nublado', /parcial|intermitente|algo nublado|medio nublado/],
  ['lloviendo', /lluvi|llovi|llueve|aguacero|chubasco|tormenta/],
  ['nublado', /nublad|nubes|nubosidad|encapotado/],
  // «sol» como palabra entera: «solo», «consolidado» o «insoluble» no son clima.
  ['soleado', /\bsol(eado)?\b|despejado/],
];

/**
 * «fue un clima soleado» → soleado; «se presentó lluvias» → lloviendo (RF-66).
 *
 * Sin coincidencia es `null`, y el residente elige una de las cuatro de la
 * bitácora antes de aprobar (RF-67).
 */
export function condicionDeClima(texto: string | null | undefined): CondicionClima | null {
  if (!texto) return null;
  const limpio = normalizar(texto);
  for (const [condicion, palabras] of PALABRAS_DE_CLIMA) {
    if (palabras.test(limpio)) return condicion;
  }
  return null;
}

/* ── Equipos y personas ────────────────────────────────────────────────── */

/** Lo que hace falta saber de un equipo para reconocerlo en un reporte. */
export interface VehiculoConocido {
  id: string;
  codigoInterno: string;
  placa: string | null;
  /** Nula en un equipo aún sin asignar a obra, como en `alcance.ts`. */
  obraId: string | null;
  /** Para reconocer la maquinaria por su nombre (spec 026, RF-1 a RF-3, RF-14). */
  tipoId?: string | null;
  marca?: string | null;
  modelo?: string | null;
}

/** Lo que hace falta saber de una persona para reconocerla en un reporte. */
export interface PersonaConocida {
  id: string;
  nombreCompleto: string;
}

/** «LLQ 375», «llq-375» y «LLQ375» son la misma placa: solo letras y cifras. */
function compacto(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]/g, '');
}

/**
 * Una placa o un código de menos de cuatro caracteres no se busca **dentro** de un
 * texto: «V1» aparece en cualquier renglón. Solo vale si es todo lo escrito.
 */
const LARGO_MINIMO_PARA_BUSCAR_DENTRO = 4;

/**
 * Los caracteres que se confunden al leer una placa en una foto, llevados a uno
 * solo (cambio 2026-10-08, RF-107): O y 0, I y 1, S y 5, B y 8, Z y 2. Sobre un
 * texto ya `compacto`, en minúsculas.
 */
const PARES_QUE_SE_CONFUNDEN: Record<string, string> = { o: '0', i: '1', s: '5', b: '8', z: '2' };

function sinConfusiones(compactado: string): string {
  return compactado.replace(/[oisbz]/g, (c) => PARES_QUE_SE_CONFUNDEN[c]);
}

/**
 * El equipo de la obra que nombra el reporte, por su placa o su código interno
 * (RF-70). «Volqueta Foton LLQ 375» reconoce la placa `LLQ375`.
 *
 * Primero se busca lo escrito igual a una placa o un código; si no, una placa o
 * un código contenidos en lo escrito. Si tampoco, lo mismo tomando como iguales
 * los caracteres que se confunden al leer una foto (RF-107): «TFO42O» reconoce
 * `TFO420`. Solo cuentan los equipos de la obra —o sin obra, como en la
 * bitácora—. **Dos candidatos es ninguno**, en cualquiera de los pasos: elegir
 * uno sería apuntarle horas a una máquina que quizá no trabajó, y el residente lo
 * elige de la lista (RF-71, RF-108).
 */
export function reconocerVehiculo(
  texto: string | null | undefined,
  vehiculos: readonly VehiculoConocido[],
  obraId: string,
): string | null {
  const candidatos = candidatosDeVehiculo(texto, vehiculos, obraId);
  return candidatos.length === 1 ? candidatos[0] : null;
}

/**
 * Los equipos de la obra que pueden ser lo escrito, del primer paso de
 * `reconocerVehiculo` que encuentra alguno. Vacío es «no se parece a ninguno», y
 * solo entonces se puede registrar una volqueta nueva (spec 024, RF-30); dos o más es
 * «puede ser cualquiera», y se elige (RF-108).
 */
export function candidatosDeVehiculo(
  texto: string | null | undefined,
  vehiculos: readonly VehiculoConocido[],
  obraId: string,
): string[] {
  if (!texto) return [];
  const escrito = compacto(texto);
  if (escrito === '') return [];

  const deLaObra = vehiculos.filter((v) => v.obraId === null || v.obraId === obraId);
  const clavesDe = (v: VehiculoConocido) =>
    [v.placa, v.codigoInterno].filter((c): c is string => !!c).map(compacto);

  const ids = (lista: VehiculoConocido[]) => lista.map((v) => v.id);

  const iguales = deLaObra.filter((v) => clavesDe(v).includes(escrito));
  if (iguales.length > 0) return ids(iguales);

  const contenidos = deLaObra.filter((v) =>
    clavesDe(v).some((c) => c.length >= LARGO_MINIMO_PARA_BUSCAR_DENTRO && escrito.includes(c)),
  );
  if (contenidos.length > 0) return ids(contenidos);

  // Con los caracteres que se confunden al leer una foto (RF-107, RF-108).
  const leido = sinConfusiones(escrito);
  const clavesLeidasDe = (v: VehiculoConocido) => clavesDe(v).map(sinConfusiones);
  const igualesLeidos = deLaObra.filter((v) => clavesLeidasDe(v).includes(leido));
  if (igualesLeidos.length > 0) return ids(igualesLeidos);

  return ids(
    deLaObra.filter((v) =>
      clavesLeidasDe(v).some((c) => c.length >= LARGO_MINIMO_PARA_BUSCAR_DENTRO && leido.includes(c)),
    ),
  );
}

/* ── La maquinaria por su nombre (spec 026) ─────────────────────────────── */

/**
 * El tipo de equipo con que empieza lo escrito (RF-2): «Vibrócompactador Volvo» es
 * «Vibro Compactadora», «Montacarga a Diesel» es «Montacargas». Se compara sin tildes,
 * espacios ni signos, y se acepta el nombre del catálogo sin su última letra (el
 * plural o el género). Gana el más largo: «Excavadora de oruga» antes que «Excavadora».
 */
export function tipoDeEquipo(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const escrito = compacto(texto);
  if (escrito.length < 4) return null;
  let mejor: { id: string; largo: number } | null = null;
  for (const tipo of TIPOS_VEHICULO) {
    const t = compacto(tipo.nombre);
    const corto = t.slice(0, -1);
    const largo = escrito.startsWith(t) ? t.length : escrito.startsWith(corto) && corto.length >= 4 ? corto.length : 0;
    if (largo > 0 && (!mejor || largo > mejor.largo)) mejor = { id: tipo.id, largo };
  }
  return mejor?.id ?? null;
}

/**
 * ¿Lo escrito nombra la marca del equipo? (RF-3). Basta con la marca entera
 * («dynapac») o con su primera palabra si es de 4 letras o más («wirtgen» de
 * «WIRTGEN WR 2000»), sin mayúsculas, tildes ni espacios.
 */
function nombraLaMarca(escrito: string, marca: string | null | undefined): boolean {
  if (!marca?.trim()) return false;
  const entera = compacto(marca);
  const primera = compacto(palabras(marca)[0] ?? '');
  return (entera.length >= 3 && escrito.includes(entera)) || (primera.length >= 4 && escrito.includes(primera));
}

export interface MaquinaReconocidaPorNombre {
  /** El equipo, o `null` si no hay uno solo. */
  id: string | null;
  /** Por dónde se reconoció; `tipo_marca` es el que puede chocar entre renglones (RF-6). */
  como: 'placa' | 'modelo' | 'tipo_marca' | null;
  /** Los equipos que pueden ser, si son dos o más (RF-5). */
  candidatos: string[];
  /** El tipo reconocido en lo escrito, aunque no haya equipo: con él se registra (RF-8). */
  tipoId: string | null;
}

/**
 * El equipo de la obra que nombra un renglón de maquinaria (spec 026, RF-1 a RF-7,
 * RF-14), en este orden:
 *
 *  1. por placa o código, como siempre (`candidatosDeVehiculo`, RF-7);
 *  2. por el modelo, cuando es exactamente lo escrito: es como queda registrada una
 *     máquina que creó el sistema, para reconocerla en el reporte siguiente (RF-14);
 *  3. por tipo y marca (RF-1 a RF-4). La IA puede traer el tipo y la marca aparte;
 *     si no, salen de lo escrito.
 *
 * Dos o más candidatos en un paso son ninguno, y se dicen (RF-5).
 */
export function reconocerMaquina(
  texto: string | null | undefined,
  vehiculos: readonly VehiculoConocido[],
  obraId: string,
  ia: { tipo?: string | null; marca?: string | null } = {},
): MaquinaReconocidaPorNombre {
  const tipoId = tipoDeEquipo(ia.tipo) ?? tipoDeEquipo(texto);
  const ninguno = { id: null, como: null, candidatos: [], tipoId };
  if (!texto?.trim()) return ninguno;

  const porPlaca = candidatosDeVehiculo(texto, vehiculos, obraId);
  if (porPlaca.length === 1) return { id: porPlaca[0], como: 'placa', candidatos: [], tipoId };
  if (porPlaca.length > 1) return { ...ninguno, candidatos: porPlaca };

  const escrito = compacto(texto);
  const deLaObra = vehiculos.filter((v) => v.obraId === null || v.obraId === obraId);
  const porModelo = deLaObra.filter((v) => v.modelo && compacto(v.modelo) === escrito);
  if (porModelo.length === 1) return { id: porModelo[0].id, como: 'modelo', candidatos: [], tipoId };

  if (!tipoId) return ninguno;
  const conMarca = compacto([texto, ia.marca ?? ''].join(' '));
  const porTipoYMarca = deLaObra.filter((v) => v.tipoId === tipoId && nombraLaMarca(conMarca, v.marca));
  if (porTipoYMarca.length === 1) return { id: porTipoYMarca[0].id, como: 'tipo_marca', candidatos: [], tipoId };
  return { ...ninguno, candidatos: porTipoYMarca.map((v) => v.id) };
}

/**
 * La unidad de una lectura, si el reporte la dice (RF-16): «km» es odómetro; «h»,
 * «hr», «hrs» u «horas» es horómetro. Lo que la IA ya separó gana a lo escrito.
 */
export function unidadDeMedidor(...textos: (string | null | undefined)[]): 'odometro' | 'horometro' | null {
  for (const texto of textos) {
    const t = normalizar(texto ?? '');
    if (/(^|[^a-z])km\b|kilometr/.test(t)) return 'odometro';
    if (/(^|[^a-z])(h|hr|hrs|hora|horas)\b|horometr/.test(t)) return 'horometro';
  }
  return null;
}

function palabras(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .split(' ')
    .filter((p) => p !== '');
}

/**
 * La persona registrada que nombra el reporte (RF-74, RF-75, RF-79).
 *
 * Sin tildes ni mayúsculas, y con las palabras escritas contenidas en el nombre
 * registrado: «silfrido medina» reconoce a «Silfrido Medina Pérez», porque en un
 * chat nadie escribe los dos apellidos. **Dos candidatos es ninguno**: un parte con
 * las horas de otra persona es peor que un hueco que el residente llena.
 */
export function reconocerPersona(
  texto: string | null | undefined,
  personas: readonly PersonaConocida[],
): string | null {
  if (!texto) return null;
  const escritas = palabras(texto);
  if (escritas.length === 0) return null;

  const iguales = personas.filter(
    (p) => palabras(p.nombreCompleto).join(' ') === escritas.join(' '),
  );
  if (iguales.length > 0) return iguales.length === 1 ? iguales[0].id : null;

  const contenidas = personas.filter((p) => {
    const delNombre = palabras(p.nombreCompleto);
    return escritas.every((palabra) => delNombre.includes(palabra));
  });
  return contenidas.length === 1 ? contenidas[0].id : null;
}

/**
 * Cómo se llaman las hojas de los formatos de OCC que no dicen el nombre del cargo
 * tal cual (spec 023, RF-62). Lo demás se reconoce por el nombre del cargo, en
 * singular o en plural.
 */
const HOJAS_CONOCIDAS: Record<string, Cargo> = {
  controladoras: 'controlador_vial',
  controladores: 'controlador_vial',
  topografia: 'topografo',
};

/**
 * El cargo que propone la hoja del archivo de donde salió una persona: «CONDUCTORES»
 * → Conductor, «CONTROLADORAS» → Controlador(a) Vial (spec 023, RF-62).
 *
 * Es solo una propuesta para registrarla, y se cambia en la bandeja. Lo que no es
 * un cargo de la lista —«INGENIEROS», «OFICIO VARIOS»— es `null`: se elige o se deja
 * «sin definir» (RF-61). Si el nombre entero no dice nada, se prueba con su primera
 * palabra («CONTROLADORAS y BOAL»); el número de una hoja repetida («(2)») no cuenta.
 */
export function cargoDeHoja(hoja: string | null | undefined): Cargo | null {
  if (!hoja) return null;
  const escritas = palabras(hoja).filter((p) => !/^\d+$/.test(p));
  if (escritas.length === 0) return null;

  const segun = (texto: string): Cargo | null => {
    if (HOJAS_CONOCIDAS[texto]) return HOJAS_CONOCIDAS[texto];
    const cargo = CARGOS.find((c) => {
      const nombre = palabras(c.nombre).join(' ');
      return texto === nombre || texto === `${nombre}s` || texto === `${nombre}es`;
    });
    return cargo ? (cargo.id as Cargo) : null;
  };
  return segun(escritas.join(' ')) ?? (escritas.length > 1 ? segun(escritas[0]) : null);
}

/** Las palabras de un nombre que sirven para compararlo: sin «de», «la», «y»… */
function palabrasDeNombre(texto: string): Set<string> {
  return new Set(palabras(texto).filter((p) => p.length >= 3));
}

/**
 * Las personas registradas que podrían ser la misma que el reporte nombra: las que
 * comparten **dos o más palabras** de su nombre, sin contar las de menos de tres
 * letras («de», «la»), sin tildes ni mayúsculas (spec 023, RF-65). La que más
 * comparte va primero.
 *
 * Se muestran antes de registrar a alguien nuevo, para no tener dos veces a la
 * misma persona escrita distinto. No eligen nada: eso lo hace quien revisa.
 */
export function posiblesCoincidencias<P extends PersonaConocida>(
  nombre: string | null | undefined,
  personas: readonly P[],
): P[] {
  if (!nombre) return [];
  const escritas = palabrasDeNombre(nombre);
  if (escritas.size < 2) return [];

  return personas
    .map((persona, orden) => {
      let comunes = 0;
      for (const p of palabrasDeNombre(persona.nombreCompleto)) if (escritas.has(p)) comunes++;
      return { persona, comunes, orden };
    })
    .filter((c) => c.comunes >= 2)
    .sort((a, b) => b.comunes - a.comunes || a.orden - b.orden)
    .map((c) => c.persona);
}

/** El usuario de las personas cabe en 40 caracteres (contrato de Personas). */
const LARGO_DEL_USUARIO = 40;

/**
 * El usuario interno de una persona registrada desde la bandeja (spec 023, RF-64):
 * «wa.» + su nombre sin tildes ni mayúsculas + las seis primeras cifras de su id.
 *
 * La columna es obligatoria y única entre las personas vigentes, pero esta persona
 * **no entra** con él: no tiene contraseña ni código de celular. El prefijo dice de
 * dónde salió, y el pedazo de id evita que dos «Juan Pérez» choquen.
 */
export function usuarioDeLaBandeja(nombre: string, id: string): string {
  const sufijo = `.${id.replace(/-/g, '').slice(0, 6)}`;
  const cuerpo =
    palabras(nombre)
      .join('.')
      .slice(0, LARGO_DEL_USUARIO - 'wa.'.length - sufijo.length)
      .replace(/\.+$/, '') || 'persona';
  return `wa.${cuerpo}${sufijo}`;
}

/** Dónde está, en el reporte, la persona que se pide registrar. */
export interface RenglonDePersona {
  /** `personal`, o `maquinaria` para el operador de una máquina. */
  seccion: 'personal' | 'maquinaria';
  renglon: number;
}

/**
 * Por qué no se puede registrar a la persona de ese renglón, o `null` (spec 023,
 * RF-57): el renglón tiene que existir y estar **sin persona elegida**. Registrar a
 * alguien en un renglón que ya tiene persona crearía un duplicado de alguien que el
 * sistema ya reconoció.
 */
export function rechazoDeRegistro(reporte: ReporteDelDia, pedido: RenglonDePersona): string | null {
  const fila =
    pedido.seccion === 'personal' ? reporte.personal[pedido.renglon] : reporte.maquinaria[pedido.renglon];
  if (!fila) return 'Ese renglón no está en el reporte.';
  const elegida = 'usuarioId' in fila ? fila.usuarioId : fila.operadorId;
  return elegida ? 'Esa persona ya está elegida en el reporte.' : null;
}

/** Una máquina del reporte, ya reconocida o no. */
export interface MaquinaReconocida {
  vehiculoId: string | null;
  operadorId: string | null;
}

/**
 * El conductor de un viaje: el operador que el mismo reporte trae para esa
 * volqueta en la sección de vehículos (RF-94). Así nadie escribe el nombre dos
 * veces.
 *
 * `null` si la volqueta no está en el reporte o está sin operador, y entonces el
 * residente lo elige antes de aprobar (RF-95).
 */
export function conductorDelViaje(
  vehiculoId: string | null,
  maquinas: readonly MaquinaReconocida[],
): string | null {
  if (!vehiculoId) return null;
  return maquinas.find((m) => m.vehiculoId === vehiculoId && m.operadorId)?.operadorId ?? null;
}

const ORIGEN_DEL_CONDUCTOR: Record<Exclude<CaminoDelConductor, 'escrito'>, string> = {
  reporte: 'el operador de esta volqueta en el mismo reporte',
  preoperacional: 'quien hizo el preoperacional de esta volqueta ese día',
  ultimo_viaje: 'quien manejó el último viaje de esta volqueta',
};

/**
 * Lo que la propuesta dice del conductor de un viaje cuando no salió del nombre
 * escrito, para que quien revisa lo confirme (cambio 2026-10-08, RF-109), o `null`.
 * Si el reporte traía un nombre que no se reconoció, se dice también.
 */
export function textoDelConductor(
  viaje: Pick<ViajeDelReporte, 'conductorId' | 'conductorPor' | 'conductorEscrito'>,
): string | null {
  if (!viaje.conductorId || !viaje.conductorPor || viaje.conductorPor === 'escrito') return null;
  const decia = viaje.conductorEscrito ? ` El reporte decía «${viaje.conductorEscrito}».` : '';
  return `Conductor propuesto: ${ORIGEN_DEL_CONDUCTOR[viaje.conductorPor]}. Confírmelo.${decia}`;
}

/** Quién hizo el preoperacional de una volqueta un día (spec 013). */
export interface PreoperacionalDelDia {
  vehiculoId: string;
  /** `YYYY-MM-DD` en Colombia. */
  fecha: string;
  usuarioId: string;
}

/** Quién condujo el último viaje vigente de una volqueta en la obra. */
export interface UltimoViajeDeVolqueta {
  vehiculoId: string;
  conductorId: string;
}

/**
 * El conductor que se propone para un viaje, y por qué camino salió (cambio
 * 2026-10-08, RF-104 a RF-106). El primero que dé uno:
 *
 *  1. el nombre escrito en el viaje, reconocido como cualquier persona (RF-104);
 *  2. el operador de esa volqueta en el mismo reporte (RF-94);
 *  3. quien hizo el preoperacional de esa volqueta el día del viaje, si fue **una
 *     sola persona**: con dos, no se sabe cuál manejó (RF-106);
 *  4. quien condujo el último viaje vigente de esa volqueta en la obra.
 *
 * `null` si ninguno: lo elige el residente (RF-95). Un nombre escrito que no se
 * reconoce no se cambia por el de la volqueta (RF-112): solo cuenta el operador del
 * mismo reporte, y si no, `null`, para que se reconozca por parecido o se registre
 * (024/RF-18).
 */
export function conductorPropuesto(
  viaje: { vehiculoId: string | null; conductorEscrito: string | null },
  contexto: {
    /** El día del viaje, `YYYY-MM-DD`; sin él no se mira el preoperacional. */
    fecha: string | null;
    maquinas: readonly MaquinaReconocida[];
    personas: readonly PersonaConocida[];
    preoperacionales?: readonly PreoperacionalDelDia[];
    ultimosViajes?: readonly UltimoViajeDeVolqueta[];
  },
): { conductorId: string; por: CaminoDelConductor } | null {
  const escrito = reconocerPersona(viaje.conductorEscrito, contexto.personas);
  if (escrito) return { conductorId: escrito, por: 'escrito' };

  const { vehiculoId } = viaje;
  if (!vehiculoId) return null;

  const delReporte = conductorDelViaje(vehiculoId, contexto.maquinas);
  if (delReporte) return { conductorId: delReporte, por: 'reporte' };
  if (viaje.conductorEscrito?.trim()) return null;

  // `personas` son las vigentes: quien ya está dado de baja no maneja, y se pasa al
  // camino siguiente en vez de proponer a alguien que no se puede elegir.
  const vigente = (id: string) => contexto.personas.some((p) => p.id === id);

  if (contexto.fecha) {
    const quienes = new Set(
      (contexto.preoperacionales ?? [])
        .filter((p) => p.vehiculoId === vehiculoId && p.fecha === contexto.fecha)
        .map((p) => p.usuarioId),
    );
    const [unico] = [...quienes];
    if (quienes.size === 1 && vigente(unico)) return { conductorId: unico, por: 'preoperacional' };
  }

  const ultimo = (contexto.ultimosViajes ?? []).find((u) => u.vehiculoId === vehiculoId);
  return ultimo && vigente(ultimo.conductorId)
    ? { conductorId: ultimo.conductorId, por: 'ultimo_viaje' }
    : null;
}

/* ── El reporte diario, listo para aprobar ─────────────────────────────── */

/**
 * El reporte diario como lo revisa el residente: lo que propuso la IA, ya
 * reconocido contra los catálogos de la obra y con sus correcciones. Cada `null`
 * en un id es algo que no se reconoció y hay que elegir; cada `escrito` es lo que
 * decía el mensaje, para que el residente sepa qué está eligiendo.
 */
export interface ReporteDelDia {
  /** `YYYY-MM-DD`: el día del hecho (RF-61). */
  fecha: string | null;
  clima: FranjaDelReporte[];
  actividades: ActividadDelReporte[];
  maquinaria: MaquinaDelReporte[];
  personal: PersonaDelReporte[];
  ensayos: EnsayoDelReporte[];
  viajes: ViajeDelReporte[];
  notas: string;
  /**
   * Los ingresos y salidas de un reporte de almacén (spec 023, RF-19, RF-20). Vacío
   * en cualquier otra categoría. Su fecha es la del reporte (RF-21).
   */
  almacen: MovimientoDelReporte[];
}

/** Un ingreso o una salida de un reporte de almacén, como lo revisa el residente. */
export interface MovimientoDelReporte {
  tipo: TipoMovimiento;
  /** El material del almacén de la obra, o `null` si no se reconoció (RF-26, RF-27). */
  materialId: string | null;
  /**
   * El material que se registra al aprobar, si quien revisa eligió «registrarlo
   * nuevo» (RF-27, RF-28). Excluye a `materialId`: o se elige uno, o se crea.
   */
  materialNuevo: { nombre: string; unidad: UnidadAlmacen | null } | null;
  /** El material como lo escribió el reporte. */
  escrito: string;
  /** En centésimas; `null` si lo escrito no era una cantidad. */
  cantidad: number | null;
  unidadEscrita: string | null;
  /** La unidad de la lista cerrada que dice lo escrito, o `null` (RF-30). */
  unidad: UnidadAlmacen | null;
  /** «Entregado por» en un ingreso, «Recibido por» en una salida (009/RF-40, RF-41). */
  responsable: string;
  /** Solo en las salidas (009/RF-13). */
  paraQue: string;
  /** Solo en los ingresos (009/RF-8). */
  observacion: string;
}

export interface FranjaDelReporte {
  condicion: string | null;
  desde: string | null;
  hasta: string | null;
}

export interface ActividadDelReporte {
  /** El ítem del presupuesto, `CLAVE_OTRA_ACTIVIDAD`, o `null` sin elegir. */
  clave: string | null;
  /** El ítem como venía en el mensaje: «5.2.16». */
  itemEscrito: string | null;
  /** Solo en «otra». */
  texto?: string | null;
  unidad?: string | null;
  /**
   * Lo que se lleva a la actividad de la bitácora (RF-34). Opcionales porque la
   * regla de faltas no los mira: una actividad sin medidas se guarda igual en la
   * bitácora (004/RF-74). Las abscisas van en la descripción, que es donde la
   * bitácora las escribe.
   */
  descripcion?: string;
  longitud?: number | null;
  ancho?: number | null;
  alto?: number | null;
  cantidad?: number | null;
}

export interface MaquinaDelReporte extends MaquinaReconocida {
  escrito: string;
  operadorEscrito: string | null;
  medidorInicial: number | null;
  medidorFinal: number | null;
  observaciones: string;
  /**
   * Spec 026. Opcionales: lo resuelto antes no los trae.
   *  · `unidad`: el medidor que dice el reporte («km» u «h», RF-16); manda sobre el del tipo.
   *  · `conflicto`: otro renglón del reporte es el mismo equipo por tipo y marca (RF-6).
   *  · `tipoId` y `marcaEscrita`: con qué se registra la máquina si no existe (RF-8, RF-9).
   */
  unidad?: 'odometro' | 'horometro' | null;
  conflicto?: boolean;
  tipoId?: string | null;
  marcaEscrita?: string | null;
}

export interface PersonaDelReporte {
  usuarioId: string | null;
  escrito: string;
  entrada: string | null;
  salida: string | null;
  observaciones: string;
  /**
   * La hoja del archivo de donde salió («CONDUCTORES»), o `null` (spec 023, RF-62):
   * de ahí se propone el cargo si hay que registrar a la persona.
   */
  hoja: string | null;
  /** Las horas como las reporta la obra y la novedad (spec 025, RF-23, RF-24). */
  horasLaboradas?: number | null;
  extraDiurnas?: number | null;
  extraNocturnas?: number | null;
  novedad?: NovedadDePersonal | null;
}

export interface EnsayoDelReporte {
  /** El id de la lista de OCC, o `null` si no se reconoció. */
  ensayo: string | null;
  escrito: string;
  horaInicio: string | null;
  horaFin: string | null;
  responsable: string | null;
  ubicacion: UbicacionPorValidar | null;
  observacion: string | null;
  /** En casillas propias (spec 025, RF-42). */
  edadDias?: number | null;
  resultado?: number | null;
  unidad?: string | null;
  cumple?: 'si' | 'no' | null;
}

export interface ViajeDelReporte {
  vehiculoId: string | null;
  materialId: string | null;
  origenId: string | null;
  /** El id de un sitio, `DESTINO_OBRA`, o `null`. */
  destino: string | null;
  pr: number | null;
  metros: number | null;
  hora: string | null;
  conductorId: string | null;
  /** El número de vale, tal como se escribió, o `null` (spec 023, RF-42, RF-50). */
  vale: string | null;
  /** El conductor como lo escribió el reporte, o `null` (cambio 2026-10-08, RF-104). */
  conductorEscrito: string | null;
  /**
   * Por qué camino se propuso el conductor (RF-105, RF-109), o `null` si no se
   * propuso o lo eligió una persona.
   */
  conductorPor: CaminoDelConductor | null;
  /**
   * La placa, el material, el origen y el destino como los escribió el reporte, o
   * `null` (spec 024). Dicen qué crear cuando no se reconoce (RF-28 a RF-30) y si
   * un destino vacío es que no lo dijo o que no se reconoció (RF-17).
   */
  placaEscrita: string | null;
  materialEscrito: string | null;
  origenEscrito: string | null;
  destinoEscrito: string | null;
}

/**
 * De dónde sale el conductor que se propone para un viaje (cambio 2026-10-08,
 * RF-105), en el orden en que se prueba.
 */
export type CaminoDelConductor = 'escrito' | 'reporte' | 'preoperacional' | 'ultimo_viaje';

export const CAMINOS_DEL_CONDUCTOR: readonly CaminoDelConductor[] = [
  'escrito',
  'reporte',
  'preoperacional',
  'ultimo_viaje',
];

/** Lo que el reporte necesita saber de fuera y la regla no puede leer sola. */
export interface ContextoDelReporte {
  /** El día de la obra, `fechaDeJornada()`. */
  hoy: string;
  /** En qué se mide cada equipo reconocido: horas de motor o kilómetros. */
  claseDeMedidor: (vehiculoId: string) => ClaseDeMedidor;
  /**
   * La última lectura registrada en Vehículos de ese medidor (spec 026, RF-18, RF-19).
   * Ausente, no se compara: es lo que pasa en la bandeja manual de la 021.
   */
  lecturaDe?: (vehiculoId: string, clase: ClaseDeMedidor) => LecturaRegistrada;
  /**
   * El almacén de la obra, para revisar un reporte de almacén (spec 023): sus
   * materiales vigentes con su unidad y su stock de hoy, en centésimas. Ausente,
   * es un almacén vacío.
   */
  almacen?: {
    materiales: readonly { id: string; nombre: string; unidad: string; stock: number }[];
  };
}

export type SeccionDelReporte =
  | 'fecha'
  | 'clima'
  | 'actividades'
  | 'maquinaria'
  | 'personal'
  | 'ensayos'
  | 'viajes'
  | 'almacen';

/**
 * Una falta, con dónde se pinta: la sección y el renglón (desde 0; `null` cuando
 * es de la sección entera, como dos franjas que se pisan).
 */
export interface FaltaDelReporte {
  seccion: SeccionDelReporte;
  renglon: number | null;
  mensaje: string;
}

const IDS_DE_ENSAYO: readonly string[] = ENSAYOS_DE_CALIDAD.map((e) => e.id);

/**
 * Todo lo que impide aprobar el reporte, **de una vez** y por renglón (RF-64).
 *
 * Una sola falta bloquea el reporte entero: aprobar la mitad dejaría una bitácora
 * a medias que nadie sabría que lo está. Por eso se devuelven todas, para que el
 * residente las corrija en una pasada y no de una en una.
 *
 * Las comprobaciones de cada sección son **las de la bitácora y Control Cantera**
 * (RF-59) —`validarAvance`, `validarHorario`, `validarFranjas`, `faltasDelEnsayo`,
 * `validarViaje`—, no unas parecidas: lo que se aprueba desde WhatsApp tiene que
 * poder guardarse igual que lo escrito a mano. Lo propio de esta regla es lo que
 * solo pasa con un reporte: lo que no se reconoció y lo que viene repetido.
 *
 * Que un equipo, una persona o un sitio elegidos existan y sean de la obra lo
 * comprueba el servidor con la base, como en Control Cantera.
 */
export function faltasDelReporte(
  reporte: ReporteDelDia,
  contexto: ContextoDelReporte,
): FaltaDelReporte[] {
  const faltas: FaltaDelReporte[] = [];
  const falta = (seccion: SeccionDelReporte, renglon: number | null, mensaje: string) =>
    faltas.push({ seccion, renglon, mensaje });

  // El día del hecho (RF-44, RF-61, RF-62).
  if (!reporte.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(reporte.fecha)) {
    falta('fecha', null, 'Falta el día del reporte.');
  } else if (reporte.fecha > contexto.hoy) {
    falta('fecha', null, 'El día del reporte no puede ser posterior a hoy.');
  }

  // Clima (RF-66, RF-67).
  reporte.clima.forEach((franja, i) => {
    if (!franja.condicion || !IDS_CLIMA.includes(franja.condicion as CondicionClima)) {
      falta('clima', i, 'Elija cómo estuvo el clima en este tramo.');
    }
  });
  const errorDeFranjas = validarFranjas(reporte.clima);
  if (errorDeFranjas) {
    const renglon = 'indice' in errorDeFranjas ? errorDeFranjas.indice : null;
    falta('clima', renglon, mensajeDeFranja(errorDeFranjas));
  }

  // Actividades (RF-32, RF-33).
  reporte.actividades.forEach((actividad, i) => {
    const otra = actividad.clave === CLAVE_OTRA_ACTIVIDAD;
    if (actividad.clave === null) {
      falta(
        'actividades',
        i,
        actividad.itemEscrito
          ? `El ítem ${actividad.itemEscrito} no está en el presupuesto de la obra: elija otra actividad o «Otra actividad».`
          : 'Elija la actividad.',
      );
      return;
    }
    if (!otra && !actividadPorItem(actividad.clave)) {
      falta('actividades', i, `El ítem ${actividad.clave} no está en el presupuesto de la obra.`);
      return;
    }
    for (const f of faltasDeActividad({ otra, texto: actividad.texto, unidad: actividad.unidad })) {
      falta('actividades', i, f.mensaje);
    }
  });

  // Maquinaria (RF-68 a RF-75).
  const maquinasVistas = new Set<string>();
  reporte.maquinaria.forEach((maquina, i) => {
    if (!maquina.vehiculoId && maquina.conflicto) {
      falta('maquinaria', i, `Dos renglones del reporte pueden ser el mismo equipo («${maquina.escrito}»): elija cuál es.`);
    } else if (!maquina.vehiculoId) {
      falta('maquinaria', i, `No se reconoció «${maquina.escrito}»: elija el equipo de la lista.`);
    } else {
      if (maquinasVistas.has(maquina.vehiculoId)) {
        falta('maquinaria', i, 'Esta máquina ya está en otro renglón del reporte.');
      }
      maquinasVistas.add(maquina.vehiculoId);
      // El medidor que dice el reporte manda sobre el del tipo (026/RF-16, RF-17).
      const clase = maquina.unidad ?? contexto.claseDeMedidor(maquina.vehiculoId);
      const error = validarAvance(clase, maquina.medidorInicial, maquina.medidorFinal);
      if (error) falta('maquinaria', i, mensajeDeAvance(clase, error, maquina.medidorInicial));
      // Contra lo registrado en Vehículos: ni hacia atrás ni más de lo posible (026/RF-18, RF-19).
      const contraElVehiculo =
        !error && contexto.lecturaDe
          ? faltaContraElVehiculo(
              clase,
              maquina.medidorFinal,
              contexto.lecturaDe(maquina.vehiculoId, clase),
              reporte.fecha ?? contexto.hoy,
            )
          : null;
      if (contraElVehiculo) falta('maquinaria', i, contraElVehiculo);
    }
    if (maquina.operadorEscrito?.trim() && !maquina.operadorId) {
      falta(
        'maquinaria',
        i,
        `No se reconoció al operador «${maquina.operadorEscrito.trim()}»: elíjalo de la lista, regístrelo o déjelo vacío.`,
      );
    }
  });

  // Personal (RF-78, RF-79).
  const personasVistas = new Set<string>();
  reporte.personal.forEach((persona, i) => {
    if (!persona.usuarioId) {
      falta(
        'personal',
        i,
        // Spec 023, RF-57: además de elegirla o quitarla, se puede registrar.
        `No se reconoció a «${persona.escrito}»: elíjalo de la lista, regístrelo o quítelo del reporte.`,
      );
    } else {
      if (personasVistas.has(persona.usuarioId)) {
        falta('personal', i, 'Esta persona ya está en otro renglón del reporte.');
      }
      personasVistas.add(persona.usuarioId);
    }
    // Horas laboradas, entrada y salida, o novedad (spec 025, RF-26, RF-28).
    const error = validarPersonaDelParte(persona);
    if (error) falta('personal', i, mensajeDePersona(error));
  });

  // Control calidad de obra (RF-36, RF-81).
  reporte.ensayos.forEach((ensayo, i) => {
    if (!ensayo.ensayo || !IDS_DE_ENSAYO.includes(ensayo.ensayo)) {
      falta('ensayos', i, `Elija el ensayo de la lista de OCC («${ensayo.escrito}»).`);
    }
    for (const f of faltasDelEnsayo(ensayo)) falta('ensayos', i, f.mensaje);
  });

  // Viajes de cantera (RF-82, RF-83, RF-86, RF-95). La fecha del viaje es la del
  // reporte, y su falta ya se dijo arriba: aquí no se repite en cada viaje.
  reporte.viajes.forEach((viaje, i) => {
    const faltasDelViaje = validarViaje(
      { ...viaje, fecha: reporte.fecha ?? contexto.hoy, hora: viaje.hora ?? '' },
      contexto.hoy,
    );
    for (const f of faltasDelViaje) {
      if (f.campo === 'fecha') continue;
      // Sin hora, «va como HH:MM» confunde: no se escribió mal, no se escribió.
      if (f.campo === 'hora' && !viaje.hora) falta('viajes', i, 'Falta la hora del viaje.');
      else falta('viajes', i, f.mensaje);
    }
  });

  for (const f of faltasDelAlmacen(reporte, contexto)) falta('almacen', f.renglon, f.mensaje);

  return faltas;
}

/**
 * Dos renglones con el mismo material nuevo son un solo material (spec 023, plan):
 * la misma clave aquí y en el servidor, que registra uno por clave.
 */
export function claveDeMaterialNuevo(nombre: string): string {
  return `nuevo:${palabras(nombre).join(' ')}`;
}

/**
 * Lo que impide aprobar los ingresos y salidas de un reporte de almacén, por
 * renglón (spec 023, RF-26 a RF-34, RF-36).
 *
 * Las comprobaciones de cada movimiento son **las del módulo Almacén**
 * (`validarMovimiento`, `rechazoDeSalida` dentro de `saldoDelReporte`, 009/RF-9 a
 * RF-15 y RF-40 a RF-42): lo aprobado desde WhatsApp se tiene que poder registrar
 * igual que a mano. Lo propio del reporte es reconocer el material, el material
 * nuevo y la unidad escrita. La fecha es la del reporte: su falta ya la dijo la
 * sección `fecha` y no se repite por renglón.
 *
 * Un renglón con el material o la unidad sin resolver no entra en el saldo: su
 * cantidad no se sabe en qué medida está, y sumarla falsearía el stock de los demás.
 */
function faltasDelAlmacen(
  reporte: ReporteDelDia,
  contexto: ContextoDelReporte,
): { renglon: number; mensaje: string }[] {
  const materiales = contexto.almacen?.materiales ?? [];
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const vigentePorNombre = new Map(materiales.map((m) => [palabras(m.nombre).join(' '), m]));
  const unidadDeNuevo = new Map<string, string>();

  const faltas: { renglon: number; mensaje: string }[] = [];
  const paraElSaldo: { renglon: number; material: string; unidad: string }[] = [];

  reporte.almacen.forEach((m, renglon) => {
    const falta = (mensaje: string) => faltas.push({ renglon, mensaje });

    // El material: uno del almacén, uno nuevo bien dicho, o nada (RF-26 a RF-29).
    let material: { clave: string; nombre: string; unidad: string | null } | null = null;
    if (m.materialId) {
      const delAlmacen = porId.get(m.materialId);
      if (!delAlmacen) falta('Ese material ya no está en el almacén de la obra: elija otro.');
      else material = { clave: delAlmacen.id, nombre: delAlmacen.nombre, unidad: delAlmacen.unidad };
    } else if (m.materialNuevo) {
      const nombre = m.materialNuevo.nombre.trim();
      const yaEsta = vigentePorNombre.get(palabras(nombre).join(' '));
      if (nombre === '') {
        falta('Escriba el nombre del material nuevo.');
      } else if (yaEsta) {
        falta(`Ya hay un material «${yaEsta.nombre}» en el almacén: elíjalo de la lista en vez de registrarlo de nuevo.`);
      } else if (!m.materialNuevo.unidad) {
        falta('Elija la unidad del material nuevo.');
      } else {
        const clave = claveDeMaterialNuevo(nombre);
        const otraUnidad = unidadDeNuevo.get(clave);
        if (otraUnidad && otraUnidad !== m.materialNuevo.unidad) {
          falta('Este material nuevo tiene otra unidad en otro renglón del reporte: use la misma.');
        } else {
          unidadDeNuevo.set(clave, m.materialNuevo.unidad);
          material = { clave, nombre, unidad: m.materialNuevo.unidad };
        }
      }
    } else {
      falta(
        `No se reconoció «${m.escrito}» en el almacén de la obra: elíjalo de la lista, regístrelo como material nuevo o quite el renglón.`,
      );
    }

    // La unidad del renglón tiene que ser la del material: no se convierte (RF-30).
    let unidadBien = false;
    if (material?.unidad) {
      const enQueSeLleva = abreviaturaDeUnidad(material.unidad);
      if (m.unidad === null) {
        falta(
          m.unidadEscrita
            ? `No se reconoció la unidad «${m.unidadEscrita}»: escriba la cantidad en ${enQueSeLleva}.`
            : `Falta la unidad: escriba la cantidad en ${enQueSeLleva}.`,
        );
      } else if (m.unidad !== material.unidad) {
        falta(
          `«${material.nombre}» se lleva en ${enQueSeLleva} y el renglón dice ${abreviaturaDeUnidad(m.unidad)}: corrija la cantidad o la unidad.`,
        );
      } else {
        unidadBien = true;
      }
    }

    // Lo del módulo Almacén: cantidad, para qué y quién (009/RF-9, RF-13, RF-40 a RF-42).
    for (const f of validarMovimiento(
      {
        tipo: m.tipo,
        fecha: reporte.fecha ?? '',
        cantidad: m.cantidad,
        paraQue: m.paraQue,
        responsable: m.responsable,
      },
      contexto.hoy,
    )) {
      if (f.campo !== 'fecha') falta(f.mensaje);
    }

    if (material && unidadBien) {
      paraElSaldo.push({ renglon, material: material.clave, unidad: material.unidad as string });
    }
  });

  // El stock, con los ingresos del mismo reporte (RF-33, RF-34).
  const unidadPorMaterial = new Map(paraElSaldo.map((p) => [p.material, p.unidad]));
  const saldo = saldoDelReporte(
    paraElSaldo.map((p) => {
      const m = reporte.almacen[p.renglon];
      return { tipo: m.tipo, fecha: reporte.fecha ?? '', cantidad: m.cantidad, material: p.material };
    }),
    (material) => porId.get(material)?.stock ?? 0,
    (material) => unidadPorMaterial.get(material) ?? '',
  );
  for (const f of saldo) faltas.push({ renglon: paraElSaldo[f.renglon].renglon, mensaje: f.mensaje });

  // Por renglón, y dentro de cada renglón en el orden en que se detectaron.
  return faltas
    .map((f, orden) => ({ ...f, orden }))
    .sort((a, b) => a.renglon - b.renglon || a.orden - b.orden)
    .map(({ renglon, mensaje }) => ({ renglon, mensaje }));
}

/* ── De la propuesta de la IA al reporte que revisa el residente ───────── */

/**
 * La propuesta de la IA tal como llega (esquema 2, `snake_case`), con solo lo que
 * esta regla lee. La forma completa y su validación están en el contrato
 * `propuestaDeIa`; aquí se describe aparte porque `shared/rules` no importa de
 * `features/`.
 */
export interface PropuestaLeible {
  fecha_evento?: string | null;
  /** La hora de la marca de agua de la foto, `HH:MM` (spec 024, RF-16). */
  hora_foto?: string | null;
  resumen?: string | null;
  clima?: readonly { condicion?: string | null; desde?: string | null; hasta?: string | null }[];
  actividades?: readonly {
    descripcion?: string | null;
    abscisa_inicio?: string | null;
    abscisa_fin?: string | null;
    longitud_m?: number | null;
    ancho_m?: number | null;
    espesor_m?: number | null;
    items_pago?: readonly { codigo?: string | null; cantidad?: number | null }[];
  }[];
  maquinaria?: readonly {
    equipo?: string | null;
    operador?: string | null;
    medidor_inicial?: number | null;
    medidor_final?: number | null;
    observacion?: string | null;
    /** Spec 026: «km» u «h», el tipo de equipo y la marca, como los separa la IA. */
    unidad_medidor?: string | null;
    tipo_equipo?: string | null;
    marca?: string | null;
  }[];
  personal?: readonly {
    nombre?: string | null;
    entrada?: string | null;
    salida?: string | null;
    observacion?: string | null;
    /** La hoja del archivo (spec 023), o el título del grupo de cargo (spec 025, RF-25). */
    cargo_hoja?: string | null;
    /** Spec 025, RF-23, RF-24. */
    horas_laboradas?: number | string | null;
    extra_diurnas?: number | string | null;
    extra_nocturnas?: number | string | null;
    novedad?: string | null;
  }[];
  ensayos?: readonly {
    tipo?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    responsable?: string | null;
    ubicacion?: string | null;
    resultado?: number | string | null;
    unidad?: string | null;
    cumple?: string | null;
    observacion?: string | null;
    /** Spec 025, RF-42. */
    edad_dias?: number | string | null;
  }[];
  viajes?: readonly {
    placa?: string | null;
    cantidad?: number | null;
    material?: string | null;
    origen?: string | null;
    destino?: string | null;
    abscisa_llegada?: string | null;
    hora?: string | null;
    /** Spec 023. */
    vale?: string | null;
    /** Cambio de la 021 del 2026-10-08 (RF-104). */
    conductor?: string | null;
  }[];
  novedades?: readonly { descripcion?: string | null }[];
  /** El reporte de almacén (spec 023). */
  almacen?: {
    ingresos?: readonly {
      material?: string | null;
      cantidad?: number | null;
      unidad?: string | null;
      entregado_por?: string | null;
      observacion?: string | null;
    }[];
    salidas?: readonly {
      material?: string | null;
      cantidad?: number | null;
      unidad?: string | null;
      recibido_por?: string | null;
      para_que?: string | null;
    }[];
  } | null;
}

/** Algo con nombre que se puede elegir: un sitio, un material, un ensayo. */
export interface OpcionConNombre {
  id: string;
  nombre: string;
}

/**
 * El sitio, el material o el ensayo que nombra lo escrito. Igual que con las
 * personas: primero el nombre exacto (sin tildes ni mayúsculas); si no, el único
 * cuyo nombre contiene lo escrito o está contenido en ello. «densidad» reconoce
 * «Densidad en campo»; «compactación» reconoce «Compactación» y no «Proctor /
 * compactación», porque el exacto gana. **Dos candidatos es ninguno.**
 */
export function reconocerPorNombre(
  texto: string | null | undefined,
  opciones: readonly OpcionConNombre[],
): string | null {
  if (!texto) return null;
  const escrito = palabras(texto).join(' ');
  if (escrito === '') return null;

  const nombreDe = (o: OpcionConNombre) => palabras(o.nombre).join(' ');
  const iguales = opciones.filter((o) => nombreDe(o) === escrito);
  if (iguales.length > 0) return iguales.length === 1 ? iguales[0].id : null;

  const parecidos = opciones.filter((o) => {
    const nombre = nombreDe(o);
    return nombre.includes(escrito) || escrito.includes(nombre);
  });
  return parecidos.length === 1 ? parecidos[0].id : null;
}

/**
 * Las palabras que no distinguen un sitio de cantera de otro: «Cantera FORTUNE»,
 * «C. Fortune» y «LA FORTUNE» son el mismo (cambio 2026-10-08, RF-111).
 */
const PALABRAS_VACIAS_DE_CANTERA = new Set(['cantera', 'el', 'la', 'c']);

/** Un nombre de cantera comparable: sin palabras vacías, espacios, guiones ni puntos. */
function compactoDeCantera(texto: string): string {
  return palabras(texto)
    .filter((p) => !PALABRAS_VACIAS_DE_CANTERA.has(p))
    .join('');
}

/**
 * El material o el sitio de Control Cantera que nombra un viaje (cambio
 * 2026-10-08, RF-110, RF-111). Primero como cualquier nombre (`reconocerPorNombre`);
 * si no da, sin espacios, guiones ni puntos y sin «cantera», «el», «la» ni «c.»:
 * «Sub-base» es «SUBBASE» y «Cantera FORTUNE» es «LA FORTUNE». Ahí también gana el
 * igual, después el único contenido —de cuatro letras o más—, y **dos candidatos es
 * ninguno**.
 */
export function reconocerEnCantera(
  texto: string | null | undefined,
  opciones: readonly OpcionConNombre[],
): string | null {
  const candidatos = candidatosEnCantera(texto, opciones);
  return candidatos.length === 1 ? candidatos[0] : null;
}

/**
 * Los materiales o sitios de cantera que pueden ser lo escrito, del primer paso de
 * `reconocerEnCantera` que encuentra alguno. Vacío es «no se parece a ninguno», y solo
 * entonces se registra uno nuevo (spec 024, RF-28, RF-29).
 */
export function candidatosEnCantera(
  texto: string | null | undefined,
  opciones: readonly OpcionConNombre[],
): string[] {
  if (!texto) return [];
  const escrito = palabras(texto).join(' ');
  if (escrito === '') return [];
  const ids = (lista: readonly OpcionConNombre[]) => lista.map((o) => o.id);

  // Primero como cualquier nombre (`reconocerPorNombre`): igual, o contenido.
  const nombreDe = (o: OpcionConNombre) => palabras(o.nombre).join(' ');
  const iguales = opciones.filter((o) => nombreDe(o) === escrito);
  if (iguales.length > 0) return ids(iguales);
  const parecidos = opciones.filter((o) => {
    const nombre = nombreDe(o);
    return nombre.includes(escrito) || escrito.includes(nombre);
  });
  if (parecidos.length === 1) return ids(parecidos);

  // Si no dio uno solo, sin espacios, guiones, puntos ni palabras vacías (RF-110, RF-111).
  const compactado = compactoDeCantera(texto);
  if (compactado.length < LARGO_MINIMO_PARA_BUSCAR_DENTRO) return ids(parecidos);
  const compactoDe = (o: OpcionConNombre) => compactoDeCantera(o.nombre);
  const igualesCompactos = opciones.filter((o) => compactoDe(o) === compactado);
  if (igualesCompactos.length > 0) return ids(igualesCompactos);
  const parecidosCompactos = opciones.filter((o) => {
    const nombre = compactoDe(o);
    return (
      nombre.length >= LARGO_MINIMO_PARA_BUSCAR_DENTRO &&
      (nombre.includes(compactado) || compactado.includes(nombre))
    );
  });
  return ids(parecidosCompactos.length > 0 ? parecidosCompactos : parecidos);
}

/** Lo que hace falta de la obra para leer una propuesta. */
export interface CatalogosDeLaObra {
  obraId: string;
  vehiculos: readonly VehiculoConocido[];
  personas: readonly PersonaConocida[];
  sitios: readonly OpcionConNombre[];
  materiales: readonly OpcionConNombre[];
  /**
   * Los materiales vigentes del almacén de la obra (spec 023, RF-26). Ausente o vacío
   * en una obra sin almacén: nada se reconoce.
   */
  materialesAlmacen?: readonly OpcionConNombre[];
  /**
   * Los preoperacionales de las volquetas de la obra en los días del reporte y el
   * conductor del último viaje vigente de cada una (cambio 2026-10-08, RF-105).
   * Ausentes, esos caminos no proponen a nadie.
   */
  preoperacionales?: readonly PreoperacionalDelDia[];
  ultimosViajes?: readonly UltimoViajeDeVolqueta[];
}

/**
 * El material del almacén que nombra el reporte: **el de igual nombre**, sin tildes
 * ni mayúsculas (spec 023, RF-26). A diferencia de los sitios y los materiales de
 * cantera, no se busca uno parecido: «Cemento» no es «Cemento gris», y un ingreso
 * apuntado al material equivocado deja mal el stock de dos.
 */
function reconocerMaterialDeAlmacen(
  texto: string | null | undefined,
  materiales: readonly OpcionConNombre[],
): string | null {
  if (!texto) return null;
  const escrito = palabras(texto).join(' ');
  if (escrito === '') return null;
  const iguales = materiales.filter((m) => palabras(m.nombre).join(' ') === escrito);
  return iguales.length === 1 ? iguales[0].id : null;
}

/** La cantidad de la IA, en centésimas; `null` si no es un número con hasta dos decimales. */
function centesimasDeIa(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? aCentesimas(valor) : null;
}

/** El reporte listo para revisar, y si su fecha se tomó del mensaje (RF-62). */
export interface ReporteResuelto {
  reporte: ReporteDelDia;
  fechaSupuesta: boolean;
}

/** Un renglón agregado («TFO420 – 4 viajes») nunca pasa de esto: más es un error de lectura. */
const VIAJES_MAXIMOS_POR_RENGLON = 30;

const ENSAYOS_COMO_OPCIONES: readonly OpcionConNombre[] = ENSAYOS_DE_CALIDAD.map((e) => ({
  id: e.id,
  nombre: e.nombre,
}));

/**
 * Lo que en la obra se escribe en vez del nombre de la lista (spec 025, RF-40):
 * «Compresión de probetas de suelo cemento con 4 %» es una compresión simple. Se
 * mira solo si el nombre no se reconoce tal cual, para que «Moldeo de probetas» siga
 * siendo el moldeo.
 */
const SINONIMOS_DE_ENSAYO: readonly [string, string][] = [
  ['compresion', 'compresion_simple'],
  ['densidad', 'densidad_en_campo'],
  ['proctor', 'proctor_compactacion'],
  ['cbr', 'cbr_sin_cemento'],
  ['granulometr', 'granulometria'],
];

/** El id del ensayo de la lista de OCC, o `null` (RF-40). */
export function reconocerEnsayo(texto: string | null | undefined): string | null {
  const directo = reconocerPorNombre(texto, ENSAYOS_COMO_OPCIONES);
  if (directo || !texto) return directo;
  const escrito = normalizar(texto);
  const ids = new Set(SINONIMOS_DE_ENSAYO.filter(([raiz]) => escrito.includes(raiz)).map(([, id]) => id));
  return ids.size === 1 ? [...ids][0] : null;
}

function textoLimpio(texto: string | null | undefined): string {
  return texto?.trim() ?? '';
}

function numeroONulo(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/**
 * Un número escrito por la IA: «8», «8,5», «2.98 MPa» o «8 Hrs.» → 8, 8.5, 2.98, 8.
 * Lo que no empieza por un número es `null`.
 */
export function numeroDeTexto(valor: number | string | null | undefined): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (!valor) return null;
  const coincidencia = /^\s*(-?\d+(?:[.,]\d+)?)/.exec(valor);
  return coincidencia ? Number(coincidencia[1].replace(',', '.')) : null;
}

/**
 * La novedad de una persona, leída del reporte (spec 025, RF-24): «Incapacitado»,
 * «incapacidad», «permiso», «vacaciones», «ausente» o «no asistió».
 */
export function novedadDeTexto(texto: string | null | undefined): NovedadDePersonal | null {
  const t = normalizar(texto ?? '');
  if (!t) return null;
  if (t.includes('incapac')) return 'incapacitado';
  if (t.includes('permiso')) return 'permiso';
  if (t.includes('vacacion')) return 'vacaciones';
  if (t.includes('ausen') || t.includes('no asisti') || t.includes('falto')) return 'ausente';
  return IDS_DE_NOVEDAD.find((id) => id === t) ?? null;
}

/**
 * La observación de un ensayo. Desde la spec 025 el resultado, si cumple y la edad
 * tienen casillas propias (RF-42); a la observación solo va lo que se anotó, más el
 * resultado si no es un número («No cumple», «Sin resultado») para no perderlo.
 */
function observacionDelEnsayo(ensayo: NonNullable<PropuestaLeible['ensayos']>[number]): string | null {
  const partes: string[] = [];
  const resultado = ensayo.resultado;
  if (typeof resultado === 'string' && resultado.trim() && numeroDeTexto(resultado) === null) {
    partes.push(`Resultado: ${resultado.trim()}`);
  }
  if (textoLimpio(ensayo.observacion)) partes.push(textoLimpio(ensayo.observacion));
  return partes.length > 0 ? partes.join('. ') : null;
}

/** Las propiedades que no son `null`: los campos opcionales que no vinieron no se escriben. */
function soloLosQueHay<T extends Record<string, unknown>>(campos: T): Partial<T> {
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== null)) as Partial<T>;
}

/** «si» o «no»; «desconocido» y lo demás, `null` (RF-36). */
function cumpleDeTexto(texto: string | null | undefined): 'si' | 'no' | null {
  const t = normalizar(texto ?? '');
  return t === 'si' || t === 'no' ? t : null;
}

/**
 * La propuesta de la IA, leída con las reglas de este archivo y reconocida contra
 * los catálogos de la obra: el reporte que el residente revisa (RF-17, RF-60 a
 * RF-95).
 *
 * Se resuelve **al leer** y no al recibir (decisión del plan): un catálogo cambia,
 * y una persona registrada mañana tiene que reconocerse en un reporte de ayer.
 *
 *  · El día del hecho es la fecha del encabezado; sin ella, la del mensaje, y se
 *    avisa (RF-61, RF-62).
 *  · Cada ítem de pago de una actividad es una actividad de la bitácora (RF-31),
 *    con las abscisas en la descripción y las medidas de la actividad (RF-34).
 *  · Las máquinas sin lecturas no entran: ese día no trabajaron (RF-69).
 *  · El conductor de un viaje sale del primer camino de `conductorPropuesto`
 *    (RF-94, RF-104 a RF-106), y un renglón con «4 viajes» son cuatro viajes (RF-87).
 *  · Las novedades van a las notas (RF-38); un mensaje de notas sin novedades
 *    lleva su resumen.
 *  · El personal trae sus horas reportadas y su novedad, y el ensayo su tramo, su
 *    edad, su resultado y si cumple en casillas propias (spec 025).
 *
 * Nada se adivina: lo que no se reconoce queda en `null`, con lo escrito al lado,
 * y `faltasDelReporte` lo exige antes de aprobar.
 */
export function resolverPropuesta(
  propuesta: PropuestaLeible,
  catalogos: CatalogosDeLaObra,
  contexto: { diaDelMensaje: string; destino: DestinoDeWhatsapp },
): ReporteResuelto {
  const fechaEscrita = textoLimpio(propuesta.fecha_evento);
  // Con la forma de una fecha y que exista en el calendario: «2026-02-30» no (spec 024).
  const enCalendario = new Date(`${fechaEscrita}T00:00:00Z`);
  const fechaValida =
    /^\d{4}-\d{2}-\d{2}$/.test(fechaEscrita) &&
    !Number.isNaN(enCalendario.getTime()) &&
    enCalendario.toISOString().slice(0, 10) === fechaEscrita;
  const fecha = fechaValida ? fechaEscrita : contexto.diaDelMensaje;

  const clima: FranjaDelReporte[] = (propuesta.clima ?? []).map((franja) => ({
    condicion: condicionDeClima(franja.condicion),
    desde: horaDeTexto(franja.desde),
    hasta: horaDeTexto(franja.hasta),
  }));

  const actividades: ActividadDelReporte[] = (propuesta.actividades ?? []).flatMap((actividad) => {
    const inicio = textoLimpio(actividad.abscisa_inicio);
    const fin = textoLimpio(actividad.abscisa_fin);
    const tramo = inicio && fin ? `desde ${inicio} hasta ${fin}` : inicio || fin;
    const descripcion = [textoLimpio(actividad.descripcion), tramo].filter(Boolean).join(', ');
    const medidas = {
      descripcion,
      longitud: numeroONulo(actividad.longitud_m),
      ancho: numeroONulo(actividad.ancho_m),
      alto: numeroONulo(actividad.espesor_m),
    };
    const items = actividad.items_pago ?? [];
    if (items.length === 0) return [{ clave: null, itemEscrito: null, cantidad: null, ...medidas }];
    return items.map((item) => {
      const codigo = textoLimpio(item.codigo);
      return {
        clave: codigo && actividadPorItem(codigo) ? codigo : null,
        itemEscrito: codigo || null,
        cantidad: numeroONulo(item.cantidad),
        ...medidas,
      };
    });
  });

  const maquinaria: MaquinaDelReporte[] = (propuesta.maquinaria ?? [])
    .filter((m) => numeroONulo(m.medidor_inicial) !== null || numeroONulo(m.medidor_final) !== null)
    .map((m) => {
      const operadorEscrito = textoLimpio(m.operador) || null;
      const marcaEscrita = textoLimpio(m.marca) || null;
      const reconocida = reconocerMaquina(m.equipo, catalogos.vehiculos, catalogos.obraId, {
        tipo: m.tipo_equipo,
        marca: marcaEscrita,
      });
      return {
        vehiculoId: reconocida.id,
        escrito: textoLimpio(m.equipo),
        operadorId: reconocerPersona(operadorEscrito, catalogos.personas),
        operadorEscrito,
        medidorInicial: numeroONulo(m.medidor_inicial),
        medidorFinal: numeroONulo(m.medidor_final),
        observaciones: textoLimpio(m.observacion),
        // Spec 026: solo lo que vino, para que lo resuelto antes se lea igual.
        ...soloLosQueHay({
          unidad: unidadDeMedidor(m.unidad_medidor, m.equipo),
          tipoId: reconocida.tipoId,
          marcaEscrita,
        }),
        ...(reconocida.como === 'tipo_marca' ? { porTipoYMarca: true } : {}),
      };
    });
  // Dos renglones que son el mismo equipo por tipo y marca: ninguno se asigna (026/RF-6).
  const porTipoYMarca = new Map<string, number>();
  for (const m of maquinaria as (MaquinaDelReporte & { porTipoYMarca?: boolean })[]) {
    if (m.porTipoYMarca && m.vehiculoId) porTipoYMarca.set(m.vehiculoId, (porTipoYMarca.get(m.vehiculoId) ?? 0) + 1);
  }
  for (const m of maquinaria as (MaquinaDelReporte & { porTipoYMarca?: boolean })[]) {
    if (m.porTipoYMarca && m.vehiculoId && (porTipoYMarca.get(m.vehiculoId) ?? 0) > 1) {
      m.vehiculoId = null;
      m.conflicto = true;
    }
    delete m.porTipoYMarca;
  }

  const personal: PersonaDelReporte[] = (propuesta.personal ?? []).map((p) => ({
    usuarioId: reconocerPersona(p.nombre, catalogos.personas),
    escrito: textoLimpio(p.nombre),
    entrada: horaDeTexto(p.entrada),
    salida: horaDeTexto(p.salida),
    observaciones: textoLimpio(p.observacion),
    hoja: textoLimpio(p.cargo_hoja) || null,
    // Solo lo que vino (spec 025): un reporte con entrada y salida se lee como antes.
    ...soloLosQueHay({
      horasLaboradas: numeroDeTexto(p.horas_laboradas),
      extraDiurnas: numeroDeTexto(p.extra_diurnas),
      extraNocturnas: numeroDeTexto(p.extra_nocturnas),
      novedad: novedadDeTexto(p.novedad),
    }),
  }));

  const ensayos: EnsayoDelReporte[] = (propuesta.ensayos ?? []).map((e) => ({
    ensayo: reconocerEnsayo(e.tipo),
    escrito: textoLimpio(e.tipo),
    horaInicio: horaDeTexto(e.hora_inicio),
    horaFin: horaDeTexto(e.hora_fin),
    responsable: textoLimpio(e.responsable) || null,
    // Un tramo, una abscisa o el texto como lugar (spec 025, RF-31, RF-43).
    ubicacion: ubicacionDeTexto(e.ubicacion),
    observacion: observacionDelEnsayo(e),
    ...soloLosQueHay({
      edadDias: numeroDeTexto(e.edad_dias),
      resultado: numeroDeTexto(e.resultado),
      unidad: textoLimpio(e.unidad) || null,
      cumple: cumpleDeTexto(e.cumple),
    }),
  }));

  const viajes: ViajeDelReporte[] = (propuesta.viajes ?? []).flatMap((v) => {
    const vehiculoId = reconocerVehiculo(v.placa, catalogos.vehiculos, catalogos.obraId);
    const destinoEscrito = textoLimpio(v.destino);
    const llegada = abscisaDeTexto(v.abscisa_llegada) ?? abscisaDeTexto(destinoEscrito);
    const vaALaObra =
      normalizar(destinoEscrito).includes('obra') || (!destinoEscrito && llegada !== null);
    const viaje: ViajeDelReporte = {
      vehiculoId,
      materialId: reconocerEnCantera(v.material, catalogos.materiales),
      origenId: reconocerEnCantera(v.origen, catalogos.sitios),
      destino: vaALaObra ? DESTINO_OBRA : reconocerEnCantera(destinoEscrito, catalogos.sitios),
      pr: vaALaObra ? (llegada?.pr ?? null) : null,
      metros: vaALaObra ? (llegada?.metros ?? null) : null,
      hora: horaDeTexto(v.hora),
      conductorId: null,
      vale: null,
      conductorEscrito: textoLimpio(v.conductor) || null,
      conductorPor: null,
      placaEscrita: textoLimpio(v.placa) || null,
      materialEscrito: textoLimpio(v.material) || null,
      origenEscrito: textoLimpio(v.origen) || null,
      destinoEscrito: destinoEscrito || null,
    };
    // El conductor por el primer camino que lo dé (cambio 2026-10-08, RF-105).
    const propuesto = conductorPropuesto(viaje, {
      fecha,
      maquinas: maquinaria,
      personas: catalogos.personas,
      preoperacionales: catalogos.preoperacionales,
      ultimosViajes: catalogos.ultimosViajes,
    });
    if (propuesto) {
      viaje.conductorId = propuesto.conductorId;
      viaje.conductorPor = propuesto.por;
    }
    const cantidad = Math.min(
      Math.max(1, Math.trunc(numeroONulo(v.cantidad) ?? 1)),
      VIAJES_MAXIMOS_POR_RENGLON,
    );
    // El vale es de un viaje (spec 023, RF-50): en un renglón con varios no se sabe
    // de cuál es, y repetirlo en todos inventaría vales. Se completa en la bandeja.
    if (cantidad === 1) viaje.vale = valeLimpio(v.vale);
    return Array.from({ length: cantidad }, () => ({ ...viaje }));
  });

  // El reporte de almacén (spec 023, RF-19 a RF-21, RF-26, RF-30). El material se
  // reconoce o queda sin elegir; registrarlo nuevo lo decide quien revisa (RF-27).
  const materialesAlmacen = catalogos.materialesAlmacen ?? [];
  const movimiento = (
    tipo: TipoMovimiento,
    m: { material?: string | null; cantidad?: number | null; unidad?: string | null },
    resto: { responsable: string; paraQue: string; observacion: string },
  ): MovimientoDelReporte => ({
    tipo,
    materialId: reconocerMaterialDeAlmacen(m.material, materialesAlmacen),
    materialNuevo: null,
    escrito: textoLimpio(m.material),
    cantidad: centesimasDeIa(m.cantidad),
    unidadEscrita: textoLimpio(m.unidad) || null,
    unidad: unidadDeTexto(m.unidad),
    ...resto,
  });
  const almacen: MovimientoDelReporte[] = [
    ...(propuesta.almacen?.ingresos ?? []).map((m) =>
      movimiento('ingreso', m, {
        responsable: textoLimpio(m.entregado_por),
        paraQue: '',
        observacion: textoLimpio(m.observacion),
      }),
    ),
    ...(propuesta.almacen?.salidas ?? []).map((m) =>
      movimiento('salida', m, {
        responsable: textoLimpio(m.recibido_por),
        paraQue: textoLimpio(m.para_que),
        observacion: '',
      }),
    ),
  ];

  const novedades = (propuesta.novedades ?? []).map((n) => textoLimpio(n.descripcion)).filter(Boolean);
  const notas =
    novedades.length > 0
      ? novedades.join('\n')
      : contexto.destino === 'notas'
        ? textoLimpio(propuesta.resumen)
        : '';

  return {
    reporte: {
      fecha,
      clima,
      actividades,
      maquinaria,
      personal,
      ensayos,
      viajes,
      notas,
      almacen,
    },
    fechaSupuesta: !fechaValida,
  };
}

/* ── Los archivos de un mensaje ────────────────────────────────────────── */

/**
 * Lo que se acepta guardar de un mensaje (RF-7, RF-52): fotos, documentos de
 * oficina, notas de voz y videos. Las notas de voz y los videos se guardan y se
 * ven aunque la IA no los analice (fuera de alcance de la spec).
 *
 * Una lista cerrada y no «cualquier cosa»: un `.exe` mandado al grupo no tiene
 * por qué terminar en el almacén de evidencia.
 */
export const TIPOS_DE_ARCHIVO_WHATSAPP: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'video/mp4',
];

/**
 * 16 MB: el doble de lo que acepta una foto del panel (8 MB), porque un PDF de
 * interventoría o un video corto pesan más que una foto. Lo que pase de ahí se
 * queda en WhatsApp.
 */
export const TAMANO_MAXIMO_DE_ARCHIVO = 16 * 1024 * 1024;

/**
 * El tipo sin parámetros y en minúsculas: «image/JPEG; charset=…» es image/jpeg.
 * `audio/ogg; codecs=opus`, que es como WhatsApp manda las notas de voz, es
 * audio/ogg.
 */
export function tipoDeArchivo(contentType: string | null | undefined): string {
  return (contentType ?? '').split(';')[0].trim().toLowerCase();
}

/** Por qué no se guarda un archivo, con el código HTTP que corresponde, o `null`. */
export function rechazoDeArchivo(
  tipo: string,
  bytes: number,
): { estado: 413 | 415 | 422; mensaje: string } | null {
  if (!TIPOS_DE_ARCHIVO_WHATSAPP.includes(tipo)) {
    return { estado: 415, mensaje: 'Ese tipo de archivo no se guarda.' };
  }
  if (bytes === 0) return { estado: 422, mensaje: 'El archivo llegó vacío.' };
  if (bytes > TAMANO_MAXIMO_DE_ARCHIVO) {
    return { estado: 413, mensaje: 'El archivo pesa más de 16 MB.' };
  }
  return null;
}

/* ── Categorías: qué se hace con cada mensaje ──────────────────────────── */

/**
 * Dónde está un mensaje en la bandeja. Aquí y no en el esquema para que la base y
 * las reglas no puedan discrepar, como `ESTADOS_ENSAYO`:
 *
 *  · `pendiente` — se ve en la bandeja y espera a una persona.
 *  · `ignorado` — la IA lo marcó «ignorar» o «seguimiento»; se consulta con el
 *    filtro y se puede devolver a pendiente (RF-23 a RF-25, RF-90).
 *  · `aprobado` — ya creó sus registros (RF-30 a RF-48).
 *  · `descartado` — con motivo, quién y cuándo (RF-54 a RF-56).
 *
 * Desde la spec 024, el sistema guarda solo y `pendiente` es «todavía sin procesar»:
 *
 *  · `en_espera` — va a la bitácora y espera a que el día tenga sus reportes (024/RF-5).
 *  · `guardado` — el sistema ya lo guardó en su módulo (024/RF-1 a RF-4, RF-43).
 *
 * `aprobado` queda para lo que aprobó una persona antes de la 024 (024/RF-69).
 */
export const ESTADOS_MENSAJE_WHATSAPP = [
  'pendiente',
  'ignorado',
  'aprobado',
  'descartado',
  'en_espera',
  'guardado',
] as const;

export type EstadoMensajeWhatsapp = (typeof ESTADOS_MENSAJE_WHATSAPP)[number];

/** Las categorías que pone la IA (RF-18). `reporte_diario` es la de la plantilla. */
export const CATEGORIAS_DE_WHATSAPP = [
  'reporte_diario',
  'reporte_actividades',
  'inicio_actividades',
  'laboratorio',
  'vehiculo_maquinaria',
  'suministro_cantera',
  'incidente',
  'administrativo',
  'reporte_almacen',
  'seguimiento',
  'ignorar',
] as const;

export type CategoriaDeWhatsapp = (typeof CATEGORIAS_DE_WHATSAPP)[number];

/**
 * A dónde va un mensaje aprobado, según su categoría:
 *
 *  · `reporte` — las secciones de la bitácora que traiga, y sus viajes a Control
 *    Cantera (RF-30, RF-39, RF-63).
 *  · `control_calidad` — sus ensayos, a esa sección de la bitácora (RF-35).
 *  · `notas` — un incidente, una novedad de una máquina, un inicio de actividades
 *    o un asunto administrativo, a las notas (RF-38).
 *  · `cantera` — solo viajes (RF-39, RF-87).
 *  · `almacen` — ingresos y salidas al módulo Almacén, sin tocar la bitácora (spec
 *    023, RF-18, RF-40).
 *  · `ninguno` — se marca revisado sin crear nada (RF-49).
 *
 * Una categoría que la IA invente mañana va a `ninguno` y no a las notas: un
 * registro creado por una categoría que nadie decidió es justo lo que la
 * aprobación existe para evitar.
 */
export type DestinoDeWhatsapp =
  | 'reporte'
  | 'control_calidad'
  | 'notas'
  | 'cantera'
  | 'almacen'
  | 'ninguno';

const DESTINOS: Record<CategoriaDeWhatsapp, DestinoDeWhatsapp> = {
  reporte_diario: 'reporte',
  reporte_actividades: 'reporte',
  laboratorio: 'control_calidad',
  inicio_actividades: 'notas',
  vehiculo_maquinaria: 'notas',
  incidente: 'notas',
  administrativo: 'notas',
  suministro_cantera: 'cantera',
  reporte_almacen: 'almacen',
  seguimiento: 'ninguno',
  ignorar: 'ninguno',
};

/** Cómo se nombra cada categoría en la bandeja (RF-18). */
const ETIQUETAS_DE_CATEGORIA: Record<CategoriaDeWhatsapp, string> = {
  reporte_diario: 'Reporte diario',
  reporte_actividades: 'Reporte de actividades',
  inicio_actividades: 'Inicio de actividades',
  laboratorio: 'Laboratorio',
  vehiculo_maquinaria: 'Vehículo o maquinaria',
  suministro_cantera: 'Suministro o cantera',
  incidente: 'Incidente',
  administrativo: 'Administrativo',
  reporte_almacen: 'Reporte de almacén',
  seguimiento: 'Seguimiento',
  ignorar: 'Ignorar',
};

/** La categoría como se lee; una que la IA estrene se muestra tal cual vino. */
export function etiquetaDeCategoria(categoria: string | null | undefined): string {
  if (!categoria) return 'Sin categoría';
  return ETIQUETAS_DE_CATEGORIA[categoria as CategoriaDeWhatsapp] ?? categoria;
}

export function destinoDeCategoria(categoria: string | null | undefined): DestinoDeWhatsapp {
  return (categoria && DESTINOS[categoria as CategoriaDeWhatsapp]) || 'ninguno';
}

/**
 * Cómo entra un mensaje a la bandeja. «Seguimiento» («¿Reporte de hoy?») se trata
 * como «ignorar»: no crea nada y solo llenaría la bandeja (RF-23, RF-90). Lo demás
 * —también una categoría desconocida— entra pendiente, y decide una persona.
 */
export function estadoInicialDeCategoria(
  categoria: string | null | undefined,
): 'pendiente' | 'ignorado' {
  return categoria === 'ignorar' || categoria === 'seguimiento' ? 'ignorado' : 'pendiente';
}

/* ── La mezcla con la bitácora del día ─────────────────────────────────── */

/**
 * Las secciones de una bitácora, con las filas ya construidas. Genérica en el tipo
 * de cada fila porque `shared/rules` no importa de `features/`: aquí solo importa
 * el id de cada fila y, en máquinas y personas, a quién se refiere.
 */
export interface SeccionesParaFusionar<
  M extends { id: string; vehiculoId: string },
  P extends { id: string; usuarioId: string },
  A extends { id: string },
  F extends { id: string },
  E extends { id: string },
> {
  maquinaria: M[];
  personal: P[];
  actividades: A[];
  clima: F[];
  laboratorio: E[];
  notas: string | null;
}

/**
 * Pone un reporte aprobado en la bitácora del día (RF-63, RF-88, RF-92, RF-93).
 *
 *  · Una máquina o una persona que ya estaba se **reemplaza** en su sitio; si no
 *    estaba, se añade al final.
 *  · El clima del reporte **reemplaza** todas las franjas: sumadas, las de dos
 *    reportes se pisarían y la bitácora las rechazaría. Un reporte sin clima deja
 *    el que había.
 *  · Actividades, ensayos y notas **se suman**: es normal que lleguen por partes.
 *
 * **Aplicarla dos veces da lo mismo que una.** Las filas del reporte llegan con
 * ids deterministas (del id del mensaje), así que lo que ya está no se vuelve a
 * añadir, y las notas no se repiten. Es lo que hace seguro reintentar una
 * aprobación cortada a mitad de camino sin transacciones (plan, paso 5).
 */
export function fusionarReporteEnParte<
  M extends { id: string; vehiculoId: string },
  P extends { id: string; usuarioId: string },
  A extends { id: string },
  F extends { id: string },
  E extends { id: string },
>(
  parte: SeccionesParaFusionar<M, P, A, F, E>,
  reporte: SeccionesParaFusionar<M, P, A, F, E>,
): SeccionesParaFusionar<M, P, A, F, E> {
  const reemplazarOAnadir = <T>(filas: T[], nuevas: T[], mismo: (a: T, b: T) => boolean) => {
    const resultado = [...filas];
    for (const nueva of nuevas) {
      const donde = resultado.findIndex((fila) => mismo(fila, nueva));
      if (donde === -1) resultado.push(nueva);
      else resultado[donde] = nueva;
    }
    return resultado;
  };
  const anadirLasQueFaltan = <T extends { id: string }>(filas: T[], nuevas: T[]) => {
    const ids = new Set(filas.map((f) => f.id));
    return [...filas, ...nuevas.filter((n) => !ids.has(n.id))];
  };

  const notasPrevias = parte.notas?.trim() ?? '';
  const notasNuevas = reporte.notas?.trim() ?? '';
  const notas =
    notasNuevas === '' || notasPrevias.includes(notasNuevas)
      ? parte.notas
      : notasPrevias === ''
        ? notasNuevas
        : `${notasPrevias}\n\n${notasNuevas}`;

  return {
    maquinaria: reemplazarOAnadir(
      parte.maquinaria,
      reporte.maquinaria,
      (a, b) => a.vehiculoId === b.vehiculoId,
    ),
    personal: reemplazarOAnadir(parte.personal, reporte.personal, (a, b) => a.usuarioId === b.usuarioId),
    clima: reporte.clima.length > 0 ? reporte.clima : parte.clima,
    actividades: anadirLasQueFaltan(parte.actividades, reporte.actividades),
    laboratorio: anadirLasQueFaltan(parte.laboratorio, reporte.laboratorio),
    notas,
  };
}

/**
 * Lo que va a reemplazar el reporte, para avisarlo **antes** de aprobar (RF-89):
 * las filas de la bitácora que desaparecen. Una fila con el mismo id que la nueva
 * no cuenta: es este mismo reporte, ya aplicado en un intento anterior.
 */
export function avisoDeReemplazo<
  M extends { id: string; vehiculoId: string },
  P extends { id: string; usuarioId: string },
  A extends { id: string },
  F extends { id: string },
  E extends { id: string },
>(
  parte: SeccionesParaFusionar<M, P, A, F, E>,
  reporte: SeccionesParaFusionar<M, P, A, F, E>,
): { maquinas: M[]; personas: P[]; franjas: F[] } {
  const idsNuevos = new Set([
    ...reporte.maquinaria.map((m) => m.id),
    ...reporte.personal.map((p) => p.id),
    ...reporte.clima.map((f) => f.id),
  ]);
  return {
    maquinas: parte.maquinaria.filter(
      (m) => !idsNuevos.has(m.id) && reporte.maquinaria.some((n) => n.vehiculoId === m.vehiculoId),
    ),
    personas: parte.personal.filter(
      (p) => !idsNuevos.has(p.id) && reporte.personal.some((n) => n.usuarioId === p.usuarioId),
    ),
    franjas: reporte.clima.length > 0 ? parte.clima.filter((f) => !idsNuevos.has(f.id)) : [],
  };
}
