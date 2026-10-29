/**
 * La ficha laboral de una persona (spec 035, RF-12 a RF-18, RF-26). Reglas puras: sin
 * I/O, como todo `shared/rules`.
 *
 * Lo que ya se sabía de la persona —nombre, documento, cargo, acceso, obra, empresa— sigue
 * en `usuarios`; esto es lo de Recursos Humanos, que vive aparte (`fichas_laborales`) para
 * que el salario no se cuele en ninguna consulta que no lo pida a propósito.
 */
import { fechaDelCorte } from './cortes';
import { estadoDelVencimiento } from './documentos';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, empresaDeLaPersona } from './empresas';
import { esFechaReal } from './jornada';
import { alcanza, type Rol } from './permisos';
import { vigenciaDePoliza } from './polizas';

export const TIPOS_DE_DOCUMENTO = [
  { id: 'cc', nombre: 'Cédula de ciudadanía' },
  { id: 'ce', nombre: 'Cédula de extranjería' },
  { id: 'ppt', nombre: 'Permiso por protección temporal' },
  { id: 'pasaporte', nombre: 'Pasaporte' },
] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number]['id'];

/** Los tipos de contrato (RF-12). `conFin`: los que terminan en una fecha que se conoce. */
export const TIPOS_DE_CONTRATO = [
  { id: 'termino_fijo', nombre: 'Término fijo', conFin: true },
  { id: 'termino_indefinido', nombre: 'Término indefinido', conFin: false },
  { id: 'obra_labor', nombre: 'Obra o labor', conFin: true },
  { id: 'prestacion_servicios', nombre: 'Prestación de servicios', conFin: false },
  { id: 'aprendizaje', nombre: 'Aprendizaje', conFin: false },
] as const;
export type TipoDeContrato = (typeof TIPOS_DE_CONTRATO)[number]['id'];

/** El estado laboral (RF-18). Retirar tiene sus propias reglas (`faltasParaRetirar`). */
export const ESTADOS_LABORALES = [
  { id: 'activo', nombre: 'Activo' },
  { id: 'vacaciones', nombre: 'En vacaciones' },
  { id: 'incapacidad', nombre: 'Incapacitado' },
  { id: 'licencia', nombre: 'En licencia' },
  { id: 'retirado', nombre: 'Retirado' },
] as const;
export type EstadoLaboral = (typeof ESTADOS_LABORALES)[number]['id'];

const nombreDe = <L extends readonly { id: string; nombre: string }[]>(lista: L, id: string | null) =>
  lista.find((x) => x.id === id)?.nombre ?? null;

export const nombreDeTipoDeContrato = (id: string | null) => nombreDe(TIPOS_DE_CONTRATO, id);
export const nombreDeEstadoLaboral = (id: string | null) => nombreDe(ESTADOS_LABORALES, id);

/** Lo que se escribe en la ficha (RF-12). Vacío es `null`. */
export interface DatosDeLaFicha {
  tipoDocumento: string | null;
  fechaNacimiento: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  emergenciaNombre: string | null;
  emergenciaParentesco: string | null;
  emergenciaTelefono: string | null;
  fechaIngreso: string | null;
  tipoContrato: string | null;
  finContrato: string | null;
  /** Pesos, sin decimales. Solo llega de quien puede verlo (`veElSalario`). */
  salario: number | null;
  eps: string | null;
  arl: string | null;
  pension: string | null;
  caja: string | null;
  notas: string | null;
}

/**
 * Lo que impide guardar la ficha, en el orden del formulario; vacío si está bien (RF-16,
 * RF-17). Lo que falta no impide guardar: eso es «ficha incompleta» (RF-26), un aviso.
 */
export function faltasDeLaFicha(datos: DatosDeLaFicha): string[] {
  const faltas: string[] = [];
  if (datos.tipoDocumento !== null && !TIPOS_DE_DOCUMENTO.some((t) => t.id === datos.tipoDocumento)) {
    faltas.push('Ese tipo de documento no existe.');
  }
  if (datos.fechaNacimiento !== null && !esFechaReal(datos.fechaNacimiento)) {
    faltas.push('La fecha de nacimiento no es válida.');
  }
  if (datos.correo !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    faltas.push('El correo no es válido.');
  }
  if (datos.fechaIngreso !== null && !esFechaReal(datos.fechaIngreso)) {
    faltas.push('La fecha de ingreso no es válida.');
  }
  const tipo = TIPOS_DE_CONTRATO.find((t) => t.id === datos.tipoContrato);
  if (datos.tipoContrato !== null && !tipo) faltas.push('Ese tipo de contrato no existe.');
  if (datos.finContrato !== null) {
    if (!esFechaReal(datos.finContrato)) faltas.push('La fecha de terminación del contrato no es válida.');
    else if (tipo && !tipo.conFin) faltas.push(`Un contrato de ${tipo.nombre.toLowerCase()} no tiene fecha de terminación.`);
    // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
    else if (datos.fechaIngreso !== null && esFechaReal(datos.fechaIngreso) && datos.finContrato < datos.fechaIngreso) {
      faltas.push('El contrato no puede terminar antes de la fecha de ingreso.');
    }
  }
  if (datos.salario !== null && !(Number.isInteger(datos.salario) && datos.salario > 0)) {
    faltas.push('El salario va en pesos, sin decimales y mayor que cero.');
  }
  return faltas;
}

/** Lo que no puede faltar en una ficha (RF-26), con cómo se dice. */
const CAMPOS_DE_LA_FICHA_COMPLETA = [
  ['fechaIngreso', 'fecha de ingreso'],
  ['tipoContrato', 'tipo de contrato'],
  ['eps', 'EPS'],
  ['arl', 'ARL'],
] as const;

/**
 * Lo que le falta a una ficha para estar completa (RF-26), o `[]`. Sin ficha, le falta
 * todo: son las personas de antes de esta spec y las que crea WhatsApp.
 */
export function faltasDeFichaCompleta(
  ficha: Pick<DatosDeLaFicha, 'fechaIngreso' | 'tipoContrato' | 'eps' | 'arl'> | null,
): string[] {
  return CAMPOS_DE_LA_FICHA_COMPLETA.filter(([campo]) => !ficha?.[campo]?.trim()).map(([, nombre]) => nombre);
}

/** ¿Este rol ve y cambia el salario? (RF-13): la gerencia y la auxiliar de RR. HH. */
export function veElSalario(rol: Rol): boolean {
  return rol === 'admin' || rol === 'auxiliar_rrhh';
}

/**
 * Lo que falta para retirar a una persona (RF-19), dicho para quien lo intenta; `[]` si se
 * puede. `clasesVigentes` son las clases de sus documentos sin anular.
 *
 *  · el paz y salvo, siempre;
 *  · la liquidación, salvo en prestación de servicios, que no la tiene (D7). Sin tipo de
 *    contrato en la ficha se exige: no se sabe que no la tenga;
 *  · el examen médico de retiro, que no es obligatorio: si la persona no lo quiere hacer,
 *    firma el consentimiento de no realizarlo, y ese documento lo reemplaza (D7).
 */
export function faltasParaRetirar(tipoContrato: string | null, clasesVigentes: readonly string[]): string[] {
  const tiene = (clase: string) => clasesVigentes.includes(clase);
  const faltas: string[] = [];
  if (!tiene('paz_y_salvo')) faltas.push('Paz y salvo');
  if (tipoContrato !== 'prestacion_servicios' && !tiene('liquidacion')) faltas.push('Liquidación');
  if (!tiene('examen_retiro') && !tiene('consentimiento_examen_retiro')) {
    faltas.push('Examen médico de retiro, o el consentimiento firmado de no realizarlo');
  }
  return faltas;
}

/**
 * Los documentos de retiro que le faltan **hoy** a una persona ya retirada (caso límite de
 * la spec: un documento de retiro anulado después del retiro). Sigue retirada —nada la
 * reactiva—, pero su ficha lo dice. `[]` si no está retirada o si tiene todo. Solo para la
 * ficha: en el listado las retiradas no avisan (RF-31).
 */
export function faltasDeLaRetirada(
  estado: string,
  tipoContrato: string | null,
  clasesVigentes: readonly string[],
): string[] {
  return estado === 'retirado' ? faltasParaRetirar(tipoContrato, clasesVigentes) : [];
}

/**
 * Lo que está mal en los datos del retiro (RF-20), o `[]`: la fecha, que exista y no sea
 * antes del ingreso, y el motivo. Los documentos son aparte (`faltasParaRetirar`).
 */
export function faltasDelRetiro(retiro: { fecha: string; motivo: string }, fechaIngreso: string | null): string[] {
  const faltas: string[] = [];
  if (!esFechaReal(retiro.fecha)) faltas.push('Escriba la fecha del retiro.');
  // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
  else if (fechaIngreso !== null && retiro.fecha < fechaIngreso) faltas.push('El retiro no puede ser antes de la fecha de ingreso.');
  if (!retiro.motivo.trim()) faltas.push('Escriba el motivo del retiro.');
  return faltas;
}

/**
 * ¿Se ofrece esta persona al elegir quién opera una máquina, quién trabajó en el parte o a
 * quién se le asigna un vehículo? (RF-21). No, si la cuenta está inactiva o la ficha
 * retirada. Las dos, porque una cuenta se puede reactivar en Personas sin que la persona
 * deje de estar retirada. Solo decide qué se ofrece: donde ya aparece, sigue apareciendo.
 */
export function seOfreceEnSelectores(persona: { activo: boolean; retirado?: boolean }): boolean {
  return persona.activo && !persona.retirado;
}

/* ── Avisos (RF-26 a RF-31) ─────────────────────────────────────────────── */

export type TipoDeAvisoDePersona =
  | 'documentos_vencidos'
  | 'documentos_por_vencer'
  | 'contrato_por_terminar'
  | 'contrato_terminado'
  | 'ficha_incompleta';

export interface AvisoDePersona {
  tipo: TipoDeAvisoDePersona;
  /** La marca de la fila: «2 documentos vencidos», «Vence en 12 días», «Ficha incompleta». */
  texto: string;
  /** El detalle al pasar el puntero o en la ficha: qué documento, qué falta. */
  detalle: string;
  tono: 'malo' | 'atencion';
}

/** Lo que hace falta de una persona para calcular sus avisos. */
export interface PersonaParaAvisos {
  /** `false` es una cuenta desactivada: como la retirada, no avisa. */
  activo: boolean;
  /** `null` es que no tiene ficha todavía. */
  ficha: (Pick<DatosDeLaFicha, 'fechaIngreso' | 'tipoContrato' | 'eps' | 'arl' | 'finContrato'> & { estado: string }) | null;
  documentos: readonly { nombre: string; vence: string | null; anulado: boolean }[];
}

/**
 * Los avisos de una persona el día `hoy` (RF-26, RF-28), de lo más grave a lo menos:
 * documentos vencidos, contrato terminado, ficha incompleta, documento por vencer y
 * contrato por terminar. Una persona retirada o desactivada no avisa (RF-31).
 *
 * Los vencimientos son los de Documentos (spec 034) y el contrato se mide como una póliza
 * (spec 031): el día de la fecha todavía vale, y avisa desde 30 días antes.
 */
export function avisosDeLaPersona(persona: PersonaParaAvisos, hoy: string): AvisoDePersona[] {
  if (!persona.activo || persona.ficha?.estado === 'retirado') return [];
  const avisos: AvisoDePersona[] = [];

  const conAviso = persona.documentos
    .map((d) => ({ nombre: d.nombre, vence: d.vence, aviso: estadoDelVencimiento(d, hoy) }))
    .filter((d) => d.aviso !== null);
  const vencidos = conAviso.filter((d) => d.aviso?.estado === 'vencido');
  if (vencidos.length) {
    avisos.push({
      tipo: 'documentos_vencidos',
      texto: vencidos.length === 1 ? 'Documento vencido' : `${vencidos.length} documentos vencidos`,
      detalle: vencidos.map((d) => d.nombre).join(', '),
      tono: 'malo',
    });
  }

  const fin = persona.ficha?.finContrato ? vigenciaDePoliza(persona.ficha.finContrato, hoy) : null;
  if (fin?.vigencia === 'vencida') {
    avisos.push({
      tipo: 'contrato_terminado',
      texto: 'Contrato terminado',
      detalle: `El contrato terminó el ${fechaDelCorte(persona.ficha?.finContrato ?? '')} y la persona sigue activa.`,
      tono: 'malo',
    });
  }

  const faltan = faltasDeFichaCompleta(persona.ficha);
  if (faltan.length) {
    avisos.push({ tipo: 'ficha_incompleta', texto: 'Ficha incompleta', detalle: `Falta: ${faltan.join(', ')}.`, tono: 'atencion' });
  }

  // El que vence antes: es el que hay que renovar primero.
  const porVencer = conAviso
    .filter((d) => d.aviso?.estado === 'por_vencer')
    .sort((a, b) => (a.vence ?? '').localeCompare(b.vence ?? ''));
  if (porVencer.length) {
    avisos.push({
      tipo: 'documentos_por_vencer',
      texto: porVencer[0].aviso?.texto ?? '',
      detalle: porVencer.map((d) => `${d.nombre}: ${d.aviso?.texto.toLowerCase()}`).join(', '),
      tono: 'atencion',
    });
  }

  if (fin?.vigencia === 'por_vencer') {
    avisos.push({
      tipo: 'contrato_por_terminar',
      // «Vence en 12 días» → «Contrato termina en 12 días».
      texto: fin.texto.replace(/^Vence/, 'Contrato termina'),
      detalle: `El contrato termina el ${fechaDelCorte(persona.ficha?.finContrato ?? '')}.`,
      tono: 'atencion',
    });
  }
  return avisos;
}

export interface ResumenDelPersonal {
  conDocumentosVencidos: number;
  conDocumentosPorVencer: number;
  contratosPorTerminar: number;
  contratosTerminados: number;
  fichasIncompletas: number;
}

/** Cuántas personas tienen cada aviso (RF-27); las retiradas y desactivadas no cuentan (RF-31). */
export function resumenDelPersonal(personas: readonly PersonaParaAvisos[], hoy: string): ResumenDelPersonal {
  const resumen: ResumenDelPersonal = {
    conDocumentosVencidos: 0,
    conDocumentosPorVencer: 0,
    contratosPorTerminar: 0,
    contratosTerminados: 0,
    fichasIncompletas: 0,
  };
  const campo: Record<TipoDeAvisoDePersona, keyof ResumenDelPersonal> = {
    documentos_vencidos: 'conDocumentosVencidos',
    documentos_por_vencer: 'conDocumentosPorVencer',
    contrato_por_terminar: 'contratosPorTerminar',
    contrato_terminado: 'contratosTerminados',
    ficha_incompleta: 'fichasIncompletas',
  };
  for (const persona of personas) {
    for (const aviso of avisosDeLaPersona(persona, hoy)) resumen[campo[aviso.tipo]] += 1;
  }
  return resumen;
}

/* ── Alcance y cambios (RF-15, RF-32, RF-33) ────────────────────────────── */

/**
 * ¿Quien consulta llega a la ficha de esta persona? (RF-32, RF-33). Lo mismo que el listado
 * de su lugar (RF-2 a RF-5): quien entra a Elemental, a todas; a OCC o a Geolab, a las de
 * esa empresa; el residente, a las de su obra. Y antes que nada, ver Recursos Humanos.
 */
export function alcanzaLaPersona(
  quien: { rol: Rol; obraId: string | null },
  persona: { rol: Rol; empresa: string | null; obraId: string | null },
): boolean {
  if (!alcanza(quien.rol, 'rrhh', 'ver')) return false;
  if (alcanzaLaEmpresa(quien.rol, 'elemental')) return true;
  const empresa = empresaDeLaPersona(persona.empresa, persona.rol);
  // Proyectos no tiene personal propio: es el de sus obras.
  if (empresa !== 'proyectos' && alcanzaLaEmpresa(quien.rol, empresa)) return true;
  return persona.obraId !== null && alcanzaLaObraDeLaRuta(quien, persona.obraId);
}

/** Los campos de la ficha que se escriben, con cómo se dicen en el historial (RF-15). */
export const CAMPOS_DE_LA_FICHA = {
  tipoDocumento: 'Tipo de documento',
  fechaNacimiento: 'Fecha de nacimiento',
  telefono: 'Teléfono',
  correo: 'Correo',
  direccion: 'Dirección',
  ciudad: 'Ciudad',
  emergenciaNombre: 'Contacto de emergencia',
  emergenciaParentesco: 'Parentesco del contacto',
  emergenciaTelefono: 'Teléfono del contacto',
  fechaIngreso: 'Fecha de ingreso',
  tipoContrato: 'Tipo de contrato',
  finContrato: 'Terminación del contrato',
  salario: 'Salario',
  eps: 'EPS',
  arl: 'ARL',
  pension: 'Fondo de pensiones',
  caja: 'Caja de compensación',
  notas: 'Notas',
  estado: 'Estado laboral',
} as const satisfies Record<keyof DatosDeLaFicha | 'estado', string>;
export type CampoDeLaFicha = keyof typeof CAMPOS_DE_LA_FICHA;

export type FichaGuardable = DatosDeLaFicha & { estado: string };

/**
 * Los campos que cambian de `antes` a `despues`, en el orden del formulario (RF-15). Sin
 * ficha antes, se compara con una vacía. Solo los nombres: el historial no lleva valores,
 * y así no tiene salarios que esconder.
 */
export function camposCambiados(antes: FichaGuardable | null, despues: FichaGuardable): CampoDeLaFicha[] {
  const campos = Object.keys(CAMPOS_DE_LA_FICHA) as CampoDeLaFicha[];
  const previo = (campo: CampoDeLaFicha) => antes?.[campo] ?? (campo === 'estado' ? 'activo' : null);
  return campos.filter((campo) => previo(campo) !== (despues[campo] ?? null));
}
