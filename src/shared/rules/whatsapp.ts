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
import { ENSAYOS_DE_CALIDAD, IDS_CLIMA, type CondicionClima } from '@/shared/catalogos/bitacora';
import { actividadPorItem, CLAVE_OTRA_ACTIVIDAD } from '@/shared/catalogos/presupuesto';

import { DESTINO_OBRA, validarViaje } from './cantera';
import { mensajeDeFranja, mensajeDeHorario, validarFranjas, validarHorario } from './horas';
import { mensajeDeAvance, validarAvance, type ClaseDeMedidor } from './jornada';
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
export function abscisaDeTexto(texto: string | null | undefined): AbscisaLeida | null {
  if (!texto) return null;
  const coincidencia = /(?:^|[^a-z])(?:abs\.?\s*)?(?:k|pr)\s*(\d{1,3})\s*\+\s*(\d{1,3})(?!\d)/.exec(
    normalizar(texto),
  );
  if (!coincidencia) return null;
  return { pr: Number(coincidencia[1]), metros: Number(coincidencia[2]) };
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
 * El equipo de la obra que nombra el reporte, por su placa o su código interno
 * (RF-70). «Volqueta Foton LLQ 375» reconoce la placa `LLQ375`.
 *
 * Primero se busca lo escrito igual a una placa o un código; si no, una placa o
 * un código contenidos en lo escrito. Solo cuentan los equipos de la obra —o sin
 * obra, como en la bitácora—. **Dos candidatos es ninguno**: elegir uno sería
 * apuntarle horas a una máquina que quizá no trabajó, y el residente lo elige de
 * la lista (RF-71).
 */
export function reconocerVehiculo(
  texto: string | null | undefined,
  vehiculos: readonly VehiculoConocido[],
  obraId: string,
): string | null {
  if (!texto) return null;
  const escrito = compacto(texto);
  if (escrito === '') return null;

  const deLaObra = vehiculos.filter((v) => v.obraId === null || v.obraId === obraId);
  const clavesDe = (v: VehiculoConocido) =>
    [v.placa, v.codigoInterno].filter((c): c is string => !!c).map(compacto);

  const iguales = deLaObra.filter((v) => clavesDe(v).includes(escrito));
  if (iguales.length > 0) return iguales.length === 1 ? iguales[0].id : null;

  const contenidos = deLaObra.filter((v) =>
    clavesDe(v).some((c) => c.length >= LARGO_MINIMO_PARA_BUSCAR_DENTRO && escrito.includes(c)),
  );
  return contenidos.length === 1 ? contenidos[0].id : null;
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
}

export interface PersonaDelReporte {
  usuarioId: string | null;
  escrito: string;
  entrada: string | null;
  salida: string | null;
  observaciones: string;
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
}

/** Lo que el reporte necesita saber de fuera y la regla no puede leer sola. */
export interface ContextoDelReporte {
  /** El día de la obra, `fechaDeJornada()`. */
  hoy: string;
  /** En qué se mide cada equipo reconocido: horas de motor o kilómetros. */
  claseDeMedidor: (vehiculoId: string) => ClaseDeMedidor;
}

export type SeccionDelReporte =
  | 'fecha'
  | 'clima'
  | 'actividades'
  | 'maquinaria'
  | 'personal'
  | 'ensayos'
  | 'viajes';

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
    if (!maquina.vehiculoId) {
      falta('maquinaria', i, `No se reconoció «${maquina.escrito}»: elija el equipo de la lista.`);
    } else {
      if (maquinasVistas.has(maquina.vehiculoId)) {
        falta('maquinaria', i, 'Esta máquina ya está en otro renglón del reporte.');
      }
      maquinasVistas.add(maquina.vehiculoId);
      const clase = contexto.claseDeMedidor(maquina.vehiculoId);
      const error = validarAvance(clase, maquina.medidorInicial, maquina.medidorFinal);
      if (error) falta('maquinaria', i, mensajeDeAvance(clase, error, maquina.medidorInicial));
    }
    if (maquina.operadorEscrito?.trim() && !maquina.operadorId) {
      falta(
        'maquinaria',
        i,
        `No se reconoció al operador «${maquina.operadorEscrito.trim()}»: elíjalo de la lista o déjelo vacío.`,
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
        `No se reconoció a «${persona.escrito}»: elíjalo de la lista o quítelo del reporte.`,
      );
    } else {
      if (personasVistas.has(persona.usuarioId)) {
        falta('personal', i, 'Esta persona ya está en otro renglón del reporte.');
      }
      personasVistas.add(persona.usuarioId);
    }
    const error = validarHorario(persona.entrada, persona.salida);
    if (error) falta('personal', i, mensajeDeHorario(error));
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

  return faltas;
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
  }[];
  personal?: readonly {
    nombre?: string | null;
    entrada?: string | null;
    salida?: string | null;
    observacion?: string | null;
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
  }[];
  viajes?: readonly {
    placa?: string | null;
    cantidad?: number | null;
    material?: string | null;
    origen?: string | null;
    destino?: string | null;
    abscisa_llegada?: string | null;
    hora?: string | null;
  }[];
  novedades?: readonly { descripcion?: string | null }[];
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

/** Lo que hace falta de la obra para leer una propuesta. */
export interface CatalogosDeLaObra {
  obraId: string;
  vehiculos: readonly VehiculoConocido[];
  personas: readonly PersonaConocida[];
  sitios: readonly OpcionConNombre[];
  materiales: readonly OpcionConNombre[];
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

function textoLimpio(texto: string | null | undefined): string {
  return texto?.trim() ?? '';
}

function numeroONulo(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** La observación de un ensayo: resultado, si cumple y lo que se anotó (RF-37). */
function observacionDelEnsayo(ensayo: NonNullable<PropuestaLeible['ensayos']>[number]): string | null {
  const partes: string[] = [];
  const resultado = ensayo.resultado;
  if (resultado !== null && resultado !== undefined && String(resultado).trim() !== '') {
    partes.push(`Resultado: ${String(resultado).trim()}${ensayo.unidad ? ` ${ensayo.unidad.trim()}` : ''}`);
  }
  const cumple = normalizar(ensayo.cumple ?? '');
  if (cumple === 'si') partes.push('Cumple');
  if (cumple === 'no') partes.push('No cumple');
  if (textoLimpio(ensayo.observacion)) partes.push(textoLimpio(ensayo.observacion));
  return partes.length > 0 ? partes.join('. ') : null;
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
 *  · El conductor de un viaje es el operador de esa volqueta en el mismo reporte
 *    (RF-94), y un renglón con «4 viajes» son cuatro viajes (RF-87).
 *  · Las novedades van a las notas (RF-38); un mensaje de notas sin novedades
 *    lleva su resumen.
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
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaEscrita);

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
      return {
        vehiculoId: reconocerVehiculo(m.equipo, catalogos.vehiculos, catalogos.obraId),
        escrito: textoLimpio(m.equipo),
        operadorId: reconocerPersona(operadorEscrito, catalogos.personas),
        operadorEscrito,
        medidorInicial: numeroONulo(m.medidor_inicial),
        medidorFinal: numeroONulo(m.medidor_final),
        observaciones: textoLimpio(m.observacion),
      };
    });

  const personal: PersonaDelReporte[] = (propuesta.personal ?? []).map((p) => ({
    usuarioId: reconocerPersona(p.nombre, catalogos.personas),
    escrito: textoLimpio(p.nombre),
    entrada: horaDeTexto(p.entrada),
    salida: horaDeTexto(p.salida),
    observaciones: textoLimpio(p.observacion),
  }));

  const ensayos: EnsayoDelReporte[] = (propuesta.ensayos ?? []).map((e) => {
    const lugar = textoLimpio(e.ubicacion);
    const abscisa = abscisaDeTexto(lugar);
    return {
      ensayo: reconocerPorNombre(e.tipo, ENSAYOS_COMO_OPCIONES),
      escrito: textoLimpio(e.tipo),
      horaInicio: horaDeTexto(e.hora_inicio),
      horaFin: horaDeTexto(e.hora_fin),
      responsable: textoLimpio(e.responsable) || null,
      ubicacion: abscisa ?? (lugar ? { lugar } : null),
      observacion: observacionDelEnsayo(e),
    };
  });

  const viajes: ViajeDelReporte[] = (propuesta.viajes ?? []).flatMap((v) => {
    const vehiculoId = reconocerVehiculo(v.placa, catalogos.vehiculos, catalogos.obraId);
    const destinoEscrito = textoLimpio(v.destino);
    const llegada = abscisaDeTexto(v.abscisa_llegada) ?? abscisaDeTexto(destinoEscrito);
    const vaALaObra =
      normalizar(destinoEscrito).includes('obra') || (!destinoEscrito && llegada !== null);
    const viaje: ViajeDelReporte = {
      vehiculoId,
      materialId: reconocerPorNombre(v.material, catalogos.materiales),
      origenId: reconocerPorNombre(v.origen, catalogos.sitios),
      destino: vaALaObra ? DESTINO_OBRA : reconocerPorNombre(destinoEscrito, catalogos.sitios),
      pr: vaALaObra ? (llegada?.pr ?? null) : null,
      metros: vaALaObra ? (llegada?.metros ?? null) : null,
      hora: horaDeTexto(v.hora),
      conductorId: conductorDelViaje(vehiculoId, maquinaria),
    };
    const cantidad = Math.min(
      Math.max(1, Math.trunc(numeroONulo(v.cantidad) ?? 1)),
      VIAJES_MAXIMOS_POR_RENGLON,
    );
    return Array.from({ length: cantidad }, () => ({ ...viaje }));
  });

  const novedades = (propuesta.novedades ?? []).map((n) => textoLimpio(n.descripcion)).filter(Boolean);
  const notas =
    novedades.length > 0
      ? novedades.join('\n')
      : contexto.destino === 'notas'
        ? textoLimpio(propuesta.resumen)
        : '';

  return {
    reporte: {
      fecha: fechaValida ? fechaEscrita : contexto.diaDelMensaje,
      clima,
      actividades,
      maquinaria,
      personal,
      ensayos,
      viajes,
      notas,
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
 */
export const ESTADOS_MENSAJE_WHATSAPP = ['pendiente', 'ignorado', 'aprobado', 'descartado'] as const;

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
 *  · `ninguno` — se marca revisado sin crear nada (RF-49).
 *
 * Una categoría que la IA invente mañana va a `ninguno` y no a las notas: un
 * registro creado por una categoría que nadie decidió es justo lo que la
 * aprobación existe para evitar.
 */
export type DestinoDeWhatsapp = 'reporte' | 'control_calidad' | 'notas' | 'cantera' | 'ninguno';

const DESTINOS: Record<CategoriaDeWhatsapp, DestinoDeWhatsapp> = {
  reporte_diario: 'reporte',
  reporte_actividades: 'reporte',
  laboratorio: 'control_calidad',
  inicio_actividades: 'notas',
  vehiculo_maquinaria: 'notas',
  incidente: 'notas',
  administrativo: 'notas',
  suministro_cantera: 'cantera',
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
