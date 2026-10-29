/**
 * Los documentos de Elemental, OCC, Geolab y cada obra (spec 034). Reglas puras: sin
 * I/O, como todo `shared/rules`.
 *
 * Cada lugar tiene sus clases (RF-18 a RF-22): las tres empresas comparten las de la
 * vida de cualquier empresa —cámara de comercio, RUT, pólizas…— y suman las de su
 * oficio; la obra tiene las suyas, porque sus papeles son otros (planos, permisos).
 * «Información de proveedores» está en las cuatro: cada lugar guarda los papeles de
 * quienes le venden (decisión del usuario del 2026-10-28).
 *
 * Los documentos del contrato de la obra no están aquí: siguen en Contrato y
 * Presupuesto, con sus propias clases (spec 031, RF-11).
 */
import { vigenciaDePoliza, DIAS_DE_AVISO_DE_POLIZA } from './polizas';
import { esFechaReal } from './jornada';
import { normalizar } from './texto';

/**
 * Dónde vive un documento: una de las tres empresas, una obra (Proyectos no tiene), una
 * persona, en su carpeta de Recursos Humanos (spec 035, RF-23), o una solicitud de compra,
 * con sus soportes (spec 036, RF-17).
 */
export type LugarDeDocumentos = 'elemental' | 'occ' | 'geolab' | 'obra' | 'persona' | 'solicitud';

export interface ClaseDeDocumento {
  /** Slug estable. Es lo que se guarda; no se renombra ni se reutiliza. */
  id: string;
  nombre: string;
}

const clase = (id: string, nombre: string): ClaseDeDocumento => ({ id, nombre });

const PROVEEDORES = clase('proveedores', 'Información de proveedores');
const OTRO = clase('otro', 'Otro');

/** Las de las tres empresas (RF-18). «Otro» va siempre al final de cada lista. */
export const CLASES_COMUNES: readonly ClaseDeDocumento[] = [
  clase('camara_de_comercio', 'Cámara de comercio'),
  clase('rut', 'RUT'),
  clase('estados_financieros', 'Estados financieros'),
  clase('declaraciones', 'Declaraciones de impuestos'),
  clase('certificacion_bancaria', 'Certificación bancaria'),
  clase('polizas', 'Pólizas y seguros'),
  clase('contratos_terceros', 'Contratos con terceros'),
  clase('actas', 'Actas'),
  clase('certificados_experiencia', 'Certificados de experiencia'),
  PROVEEDORES,
];

/** Las propias de cada lugar (RF-19 a RF-22). */
const CLASES_PROPIAS: Record<LugarDeDocumentos, readonly ClaseDeDocumento[]> = {
  elemental: [clase('rup', 'RUP'), clase('propuestas', 'Propuestas de licitación')],
  occ: [
    clase('fichas_tecnicas', 'Fichas técnicas de equipos'),
    clase('soat_tecnomecanica', 'SOAT y revisión técnico-mecánica'),
    clase('manuales', 'Manuales de equipos'),
    clase('mantenimiento', 'Soportes de mantenimiento'),
  ],
  geolab: [
    clase('calibracion', 'Certificados de calibración'),
    clase('acreditaciones', 'Acreditaciones'),
    clase('normas', 'Normas y procedimientos'),
    clase('formatos', 'Formatos'),
  ],
  // Spec 035, RF-23: la carpeta de cada persona. Las de retiro (liquidación, paz y salvo,
  // examen o su consentimiento) son las que exige `faltasParaRetirar` (rules/ficha).
  persona: [
    clase('hoja_de_vida', 'Hoja de vida'),
    clase('identidad', 'Documento de identidad'),
    clase('contrato_laboral', 'Contrato y otrosíes'),
    clase('afiliacion_eps', 'Afiliación a EPS'),
    clase('afiliacion_arl', 'Afiliación a ARL'),
    clase('afiliacion_pension', 'Afiliación a pensiones'),
    clase('afiliacion_caja', 'Afiliación a caja de compensación'),
    clase('estudios', 'Certificados de estudio'),
    clase('cursos', 'Cursos y certificaciones'),
    clase('examen_medico', 'Examen médico ocupacional (ingreso o periódico)'),
    clase('examen_retiro', 'Examen médico de retiro'),
    clase('consentimiento_examen_retiro', 'Consentimiento de no realizar el examen médico de retiro'),
    clase('licencia_conduccion', 'Licencia de conducción'),
    clase('dotacion', 'Dotación y elementos de protección'),
    clase('liquidacion', 'Liquidación'),
    clase('paz_y_salvo', 'Paz y salvo'),
  ],
  // La obra no lleva las comunes: no tiene cámara de comercio ni RUT (RF-22).
  obra: [
    clase('planos', 'Planos'),
    clase('estudios_disenos', 'Estudios y diseños'),
    clase('permisos', 'Permisos y licencias'),
    clase('actas_obra', 'Actas de obra'),
    clase('informes', 'Informes'),
    clase('correspondencia', 'Correspondencia'),
    clase('polizas_obra', 'Pólizas de la obra'),
    PROVEEDORES,
  ],
  // Spec 036, RF-7, RF-17, RF-20: los soportes de una solicitud de compra, de quien la pide,
  // de la gerencia que compra y de quien recibe.
  solicitud: [
    clase('cotizacion', 'Cotización'),
    clase('orden_de_compra', 'Orden de compra'),
    clase('factura', 'Factura'),
    clase('remision', 'Remisión'),
    clase('foto', 'Foto'),
    clase('ficha_tecnica', 'Ficha técnica'),
  ],
};

/** Las clases que se ofrecen al subir un documento en ese lugar, con «Otro» al final. */
export function clasesDe(lugar: LugarDeDocumentos): readonly ClaseDeDocumento[] {
  const propias = CLASES_PROPIAS[lugar];
  // Las comunes son de empresa: ni la obra, ni la persona, ni la solicitud tienen cámara de
  // comercio ni RUT.
  return lugar === 'obra' || lugar === 'persona' || lugar === 'solicitud'
    ? [...propias, OTRO]
    : [...CLASES_COMUNES, ...propias, OTRO];
}

/**
 * Las clases de una solicitud que dicen cuánto costó (spec 036, RF-31): el almacenista no
 * las recibe, como no recibe los valores.
 */
const CLASES_CON_PRECIO: readonly string[] = ['cotizacion', 'orden_de_compra', 'factura'];

export function llevaPrecio(clase: string): boolean {
  return CLASES_CON_PRECIO.includes(clase);
}

export function esClaseDe(lugar: LugarDeDocumentos, id: string): boolean {
  return clasesDe(lugar).some((c) => c.id === id);
}

/**
 * El nombre de una clase en ese lugar, para congelarlo con el documento (RF-23): el
 * documento se sigue leyendo aunque la lista cambie. `null` si no es de ese lugar.
 */
export function nombreDeClase(lugar: LugarDeDocumentos, id: string): string | null {
  return clasesDe(lugar).find((c) => c.id === id)?.nombre ?? null;
}

/* ── El archivo (RF-25 a RF-28) ─────────────────────────────────────────── */

/** Lo más que pesa un documento (RF-27), igual que en el contrato. */
export const TAMANO_MAXIMO_DE_DOCUMENTO = 20 * 1024 * 1024;

/** Cuántos bytes del principio hacen falta para reconocer la firma (WEBP es el más largo). */
export const BYTES_DE_FIRMA = 12;

/** Cómo está hecho el archivo por dentro, según sus primeros bytes. */
export type FirmaDeArchivo = 'pdf' | 'jpeg' | 'png' | 'webp' | 'zip' | 'ole';

/**
 * Las extensiones admitidas (RF-25), con su tipo y la firma que deben tener. Word y
 * Excel nuevos son un ZIP por dentro; los viejos (.doc, .xls), un contenedor OLE.
 */
const EXTENSIONES: Record<string, { mime: string; firma: FirmaDeArchivo }> = {
  pdf: { mime: 'application/pdf', firma: 'pdf' },
  jpg: { mime: 'image/jpeg', firma: 'jpeg' },
  jpeg: { mime: 'image/jpeg', firma: 'jpeg' },
  png: { mime: 'image/png', firma: 'png' },
  webp: { mime: 'image/webp', firma: 'webp' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', firma: 'zip' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', firma: 'zip' },
  doc: { mime: 'application/msword', firma: 'ole' },
  xls: { mime: 'application/vnd.ms-excel', firma: 'ole' },
};

/** Los tipos que se guardan, para que el servidor y la pantalla hablen de lo mismo. */
export const MIMES_DE_DOCUMENTOS = [...new Set(Object.values(EXTENSIONES).map((e) => e.mime))];

/** Lo que acepta el selector de archivos de la pantalla. */
export const ACEPTA_DOCUMENTOS = Object.keys(EXTENSIONES)
  .map((e) => `.${e}`)
  .join(',');

const TIPOS_ADMITIDOS =
  'Solo se admiten archivos PDF, imágenes JPG, PNG o WEBP, Word (.doc, .docx) o Excel (.xls, .xlsx).';

function empiezaCon(cabecera: Uint8Array, firma: readonly number[], desde = 0): boolean {
  return firma.every((b, i) => cabecera[desde + i] === b);
}

/**
 * La firma del archivo por sus primeros bytes, o `null` si no es ninguna de las
 * admitidas. Es lo que delata un ejecutable renombrado a .pdf: el nombre lo pone
 * cualquiera; los primeros bytes, no.
 *
 * Un ZIP cualquiera renombrado a .docx pasaría: abrirlo para ver si de verdad es Word
 * sería leer el archivo entero en el servidor, y el riesgo no es ejecutar nada (el
 * panel solo lo guarda y lo devuelve como descarga), sino un archivo que no abre.
 */
export function tipoPorFirma(cabecera: Uint8Array): FirmaDeArchivo | null {
  if (empiezaCon(cabecera, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (empiezaCon(cabecera, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (empiezaCon(cabecera, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // RIFF····WEBP: entre las dos marcas va el tamaño.
  if (empiezaCon(cabecera, [0x52, 0x49, 0x46, 0x46]) && empiezaCon(cabecera, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  if (empiezaCon(cabecera, [0x50, 0x4b, 0x03, 0x04])) return 'zip'; // PK··
  if (empiezaCon(cabecera, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
  return null;
}

/** La extensión del nombre, en minúsculas y sin el punto; `''` si no tiene. */
export function extensionDe(nombreDeArchivo: string): string {
  const punto = nombreDeArchivo.lastIndexOf('.');
  return punto < 0 ? '' : nombreDeArchivo.slice(punto + 1).trim().toLowerCase();
}

export type RevisionDeDocumento =
  | { ok: true; mime: string }
  | { ok: false; mensaje: string; estado: 413 | 415 | 422 };

/**
 * Si se acepta el archivo (RF-25 a RF-28) y con qué tipo se guarda.
 *
 * No usa el tipo que manda el navegador: lo pone quien sube, y para .doc y .xls varía
 * de un equipo a otro. Decide la extensión, y la confirman los primeros bytes.
 */
export function revisarDocumento(nombreDeArchivo: string, bytes: number, cabecera: Uint8Array): RevisionDeDocumento {
  const extension = extensionDe(nombreDeArchivo);
  const tipo = Object.hasOwn(EXTENSIONES, extension) ? EXTENSIONES[extension] : undefined;
  if (!tipo) return { ok: false, mensaje: TIPOS_ADMITIDOS, estado: 415 };
  if (bytes === 0) return { ok: false, mensaje: 'El archivo llegó vacío.', estado: 422 };
  if (bytes > TAMANO_MAXIMO_DE_DOCUMENTO) {
    return { ok: false, mensaje: 'El archivo pesa más de 20 MB. Redúzcalo antes de subirlo.', estado: 413 };
  }
  if (tipoPorFirma(cabecera) !== tipo.firma) {
    return {
      ok: false,
      mensaje: `El archivo dice ser .${extension}, pero su contenido no lo es. ${TIPOS_ADMITIDOS}`,
      estado: 415,
    };
  }
  return { ok: true, mime: tipo.mime };
}

/* ── Los datos del documento (RF-24, RF-29) ─────────────────────────────── */

export interface DatosDelDocumento {
  clase: string;
  nombre: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `YYYY-MM-DD`, o `null` si no vence. */
  vence: string | null;
}

/**
 * Lo que le falta o le sobra a un documento antes de guardarlo, en el orden del
 * formulario; vacío si está bien. Lo usan la pantalla y el servidor (RF-50).
 */
export function faltasDelDocumento(lugar: LugarDeDocumentos, datos: DatosDelDocumento): string[] {
  const faltas: string[] = [];
  if (!datos.clase) faltas.push('Elija la clase del documento.');
  else if (!esClaseDe(lugar, datos.clase)) faltas.push('Esa clase no es de este lugar.');
  if (!datos.nombre.trim()) faltas.push('Escriba el nombre del documento.');
  const conFecha = esFechaReal(datos.fecha);
  if (!conFecha) faltas.push('Escriba la fecha del documento.');
  if (datos.vence !== null) {
    if (!esFechaReal(datos.vence)) faltas.push('La fecha de vencimiento no es válida.');
    // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
    else if (conFecha && datos.vence < datos.fecha) {
      faltas.push('El vencimiento no puede ser antes de la fecha del documento.');
    }
  }
  return faltas;
}

/* ── Vencimientos (RF-38 a RF-42) ───────────────────────────────────────── */

/** Desde cuántos días antes un documento sale «Vence en N días» (RF-38), como las pólizas. */
export const DIAS_DE_AVISO_DE_DOCUMENTO = DIAS_DE_AVISO_DE_POLIZA;

export interface AvisoDeVencimiento {
  estado: 'por_vencer' | 'vencido';
  /** La marca de la fila: «Vence en 12 días», «Vence hoy», «Vencido». */
  texto: string;
  /** El detalle al pasar el puntero: «Vence el 2026-11-09», «Venció hace 3 días». */
  detalle: string;
}

/**
 * El aviso de un documento el día `hoy`, o `null` si no avisa: sin vencimiento, anulado
 * (RF-42) o con más de 30 días por delante. Es la misma cuenta de las pólizas del
 * contrato (spec 031): el día del vencimiento todavía vale.
 */
export function estadoDelVencimiento(
  documento: { vence: string | null; anulado: boolean },
  hoy: string,
): AvisoDeVencimiento | null {
  if (documento.anulado || documento.vence === null) return null;
  const { vigencia, texto } = vigenciaDePoliza(documento.vence, hoy);
  if (vigencia === 'vigente') return null;
  if (vigencia === 'vencida') return { estado: 'vencido', texto: 'Vencido', detalle: texto };
  return { estado: 'por_vencer', texto, detalle: `Vence el ${documento.vence}` };
}

/** Cuántos documentos vigentes del lugar están vencidos y cuántos por vencer (RF-41). */
export function resumenDeVencimientos(
  documentos: readonly { vence: string | null; anulado: boolean }[],
  hoy: string,
): { vencidos: number; porVencer: number } {
  let vencidos = 0;
  let porVencer = 0;
  for (const documento of documentos) {
    const aviso = estadoDelVencimiento(documento, hoy);
    if (aviso?.estado === 'vencido') vencidos += 1;
    else if (aviso?.estado === 'por_vencer') porVencer += 1;
  }
  return { vencidos, porVencer };
}

/* ── Buscar (RF-34) ─────────────────────────────────────────────────────── */

/**
 * Si el documento aparece al buscar `texto`: en el nombre, el proveedor, la
 * descripción o el nombre del archivo, sin mayúsculas ni tildes. Sin texto, todos.
 */
export function coincideBusqueda(
  documento: { nombre: string; proveedor: string; descripcion: string; nombreArchivo: string },
  texto: string,
): boolean {
  const buscado = normalizar(texto);
  if (!buscado) return true;
  return [documento.nombre, documento.proveedor, documento.descripcion, documento.nombreArchivo].some((campo) =>
    normalizar(campo).includes(buscado),
  );
}
