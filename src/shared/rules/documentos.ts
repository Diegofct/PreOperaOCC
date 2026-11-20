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
 * persona, en su carpeta de Recursos Humanos (spec 035, RF-23), una solicitud de compra,
 * con sus soportes (spec 036, RF-17), o una solicitud de pago (spec 037, RF-6).
 */
export type LugarDeDocumentos = 'elemental' | 'occ' | 'geolab' | 'obra' | 'persona' | 'solicitud' | 'pago';

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
    // Spec 037, RF-18: el comprobante del pago de una compra va con su solicitud de compra.
    clase('comprobante_de_pago', 'Comprobante de pago'),
  ],
  // Spec 037, RF-6, RF-13: los soportes de una solicitud de pago y el comprobante de cada pago.
  // La certificación bancaria reemplaza los datos bancarios del beneficiario (D5).
  pago: [
    clase('cuenta_de_cobro', 'Cuenta de cobro'),
    clase('factura', 'Factura'),
    clase('cotizacion', 'Cotización'),
    clase('rut', 'RUT'),
    clase('certificacion_bancaria', 'Certificación bancaria'),
    clase('comprobante_de_pago', 'Comprobante de pago'),
  ],
};

/** Las clases que se ofrecen al subir un documento en ese lugar, con «Otro» al final. */
export function clasesDe(lugar: LugarDeDocumentos): readonly ClaseDeDocumento[] {
  const propias = CLASES_PROPIAS[lugar];
  // Las comunes son de empresa: ni la obra, ni la persona, ni la solicitud tienen cámara de
  // comercio ni RUT.
  return lugar === 'obra' || lugar === 'persona' || lugar === 'solicitud' || lugar === 'pago'
    ? [...propias, OTRO]
    : [...CLASES_COMUNES, ...propias, OTRO];
}

/**
 * Las clases de una solicitud que dicen cuánto costó (spec 036, RF-31): el almacenista no
 * las recibe, como no recibe los valores.
 */
const CLASES_CON_PRECIO: readonly string[] = ['cotizacion', 'orden_de_compra', 'factura', 'comprobante_de_pago'];

export function llevaPrecio(clase: string): boolean {
  return CLASES_CON_PRECIO.includes(clase);
}

export function esClaseDe(lugar: LugarDeDocumentos, id: string): boolean {
  if (esLugarConCarpetas(lugar) && esCarpetaPropia(id)) return true;
  return clasesDe(lugar).some((c) => c.id === id);
}

/* ── Carpetas creadas al subir (spec 051, cambio del 2026-11-20) ────────── */

/**
 * Una carpeta que crea quien sube no tiene tabla propia: es una clase guardada en el documento,
 * `carpeta:<clave>`, con el nombre que se escribió en `clase_nombre`. La clave sale del nombre
 * —sin tildes, sin mayúsculas, con `_` en lugar de espacios y signos—, así que dos personas que
 * escriben «Pólizas de obra» y «polizas DE obra» caen en la misma carpeta sin consultar la base
 * (RF-74). Y si el nombre es el de una clase de siempre, se usa esa (RF-73): nadie tiene que saber
 * que «Cámara de comercio» ya existía para no duplicarla.
 *
 * Una carpeta existe mientras tiene documentos; no se crean vacías, ni se renombran ni se borran.
 * La regla la aplican igual la pantalla y el servidor, que la recalcula al guardar (RF-79).
 */
export const PREFIJO_DE_CARPETA = 'carpeta:';

/** Lo más largo que puede ser el nombre de una carpeta nueva (RF-72). */
export const LARGO_MAXIMO_DE_CARPETA = 60;

/** Lo más larga que puede ser una clase guardada (la entrada de la API admite 64). */
const LARGO_MAXIMO_DE_CLASE = 64;

/** El valor de «＋ Nueva carpeta…» en el selector: no se confunde con ninguna clase. */
export const VALOR_NUEVA_CARPETA = 'nueva-carpeta';

/**
 * Dónde se pueden crear carpetas: Documentos de las empresas y de las obras. La ficha, la
 * requisición y el pago siguen con sus clases de siempre (RF-78).
 */
export function esLugarConCarpetas(lugar: LugarDeDocumentos): boolean {
  return lugar === 'elemental' || lugar === 'occ' || lugar === 'geolab' || lugar === 'obra';
}

/** El nombre escrito, sin espacios en los bordes ni repetidos. */
function limpiarNombreDeCarpeta(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ');
}

/** La clave de un nombre: «  Pólizas  de obra » → `polizas_de_obra`. Vacía si no queda nada. */
function claveDeNombre(nombre: string): string {
  return normalizar(nombre)
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, LARGO_MAXIMO_DE_CLASE - PREFIJO_DE_CARPETA.length)
    .replace(/^_+|_+$/g, '');
}

const CLAVE_DE_CARPETA = /^carpeta:[a-z0-9]+(?:_[a-z0-9]+)*$/;

/** Si la clase es una carpeta creada al subir, con la forma que da `claveDeNombre`. */
export function esCarpetaPropia(clase: string): boolean {
  return clase.length <= LARGO_MAXIMO_DE_CLASE && CLAVE_DE_CARPETA.test(clase);
}

/**
 * La clase con que se guarda un documento subido a una carpeta nueva con ese nombre: la clase de
 * siempre si el nombre coincide con una (RF-73), o `carpeta:<clave>` con el nombre como se escribió
 * (RF-74). `null` si en ese lugar no se crean carpetas o si el nombre no sirve: vacío, de solo
 * signos o de más de 60 caracteres.
 */
export function claseParaNombre(
  lugar: LugarDeDocumentos,
  nombre: string,
): { clase: string; claseNombre: string } | null {
  if (!esLugarConCarpetas(lugar)) return null;
  const limpio = limpiarNombreDeCarpeta(nombre);
  if (!limpio || limpio.length > LARGO_MAXIMO_DE_CARPETA) return null;
  const clave = claveDeNombre(limpio);
  if (!clave) return null;
  const deSiempre = clasesDe(lugar).find((c) => claveDeNombre(c.nombre) === clave);
  if (deSiempre) return { clase: deSiempre.id, claseNombre: deSiempre.nombre };
  return { clase: `${PREFIJO_DE_CARPETA}${clave}`, claseNombre: limpio };
}

/**
 * La clase y el nombre con que se guarda un documento (RF-79, y 034/RF-23). Lo decide el servidor
 * con esta misma regla, no la pantalla: una carpeta propia sale de su nombre —y cae en la clase de
 * siempre si es la misma (RF-73)—, y una clase de siempre se guarda con el nombre del catálogo, que
 * queda congelado con el documento. Se llama después de `faltasDelDocumento`, que ya rechazó lo
 * que no sirve.
 */
export function claseAGuardar(
  lugar: LugarDeDocumentos,
  datos: { clase: string; claseNombre?: string },
): { clase: string; claseNombre: string } {
  if (esCarpetaPropia(datos.clase)) {
    const resuelta = claseParaNombre(lugar, datos.claseNombre ?? '');
    if (resuelta) return resuelta;
  }
  return { clase: datos.clase, claseNombre: nombreDeClase(lugar, datos.clase) ?? datos.clase };
}

/** Lo que le falta al nombre de una carpeta nueva; `null` si sirve. La ventana de subir lo muestra igual. */
export function faltaDelNombreDeCarpeta(nombre: string): string | null {
  const limpio = limpiarNombreDeCarpeta(nombre);
  if (!limpio) return 'Escriba el nombre de la carpeta.';
  if (limpio.length > LARGO_MAXIMO_DE_CARPETA) {
    return `El nombre de la carpeta no puede pasar de ${LARGO_MAXIMO_DE_CARPETA} caracteres.`;
  }
  if (!claveDeNombre(limpio)) return 'El nombre de la carpeta tiene que llevar letras o números.';
  return null;
}

/**
 * Lo que ofrece la ventana de subir como carpeta (RF-71, D20): primero las que ya tiene el lugar,
 * después las clases de siempre que todavía no tienen documentos —como sugerencia—, «Otro» y,
 * al final, «＋ Nueva carpeta…». Ninguna se repite.
 */
export function opcionesDeCarpeta(
  lugar: LugarDeDocumentos,
  carpetas: readonly { id: string; nombre: string }[],
): { valor: string; etiqueta: string }[] {
  const yaEstan = new Set(carpetas.map((c) => c.id));
  const existentes = carpetas.filter((c) => c.id !== OTRO.id).map((c) => ({ valor: c.id, etiqueta: c.nombre }));
  const sugeridas = clasesDe(lugar)
    .filter((c) => c.id !== OTRO.id && !yaEstan.has(c.id))
    .map((c) => ({ valor: c.id, etiqueta: c.nombre }));
  return [
    ...existentes,
    ...sugeridas,
    { valor: OTRO.id, etiqueta: OTRO.nombre },
    { valor: VALOR_NUEVA_CARPETA, etiqueta: '＋ Nueva carpeta…' },
  ];
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
  /** El nombre de una carpeta creada al subir (spec 051, RF-72); con una clase de siempre no se usa. */
  claseNombre?: string;
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
  else if (esCarpetaPropia(datos.clase)) {
    const falta = faltaDelNombreDeCarpeta(datos.claseNombre ?? '');
    if (falta) faltas.push(falta);
  }
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

/* ── Carpetas (spec 051) ────────────────────────────────────────────────── */

/**
 * Una carpeta de Documentos: una clase del lugar con lo que hay que saber de ella sin
 * abrirla (spec 051, RF-6 a RF-10). Se llama «del archivador» porque `CarpetaDeDocumentos`
 * ya es el nombre de la lista que usan la ficha, la requisición y el pago.
 */
export interface CarpetaDelArchivador {
  /** La clave de la clase, que es también la de la carpeta en la dirección. */
  id: string;
  nombre: string;
  /** No anulados, aunque estén vencidos (D8). */
  vigentes: number;
  vencidos: number;
  porVencer: number;
  /** Sin vigentes: se pinta en gris con «0» (RF-9). */
  vacia: boolean;
  /** Tiene anulados: se deja abrir aunque esté vacía (RF-68). */
  tieneAnulados: boolean;
  /** Su clase ya no está en el catálogo del lugar (RF-13). */
  retirada: boolean;
  /** La creó alguien al subir (cambio del 2026-11-20). */
  propia: boolean;
}

/** Lo que `carpetasDe` necesita de cada documento; `DocumentoDelLugar` lo cumple. */
export interface DocumentoParaCarpeta {
  clase: string;
  claseNombre: string;
  fecha: string;
  anulado: object | null;
  aviso: { estado: AvisoDeVencimiento['estado'] } | null;
}

/**
 * Las carpetas de un lugar: una por cada clase con documentos vigentes (RF-4), y con
 * `conAnulados` también las que solo tienen anulados, para «Ver anulados» (RF-9, RF-67, RF-76).
 * Sin documentos, ninguna: la pantalla muestra el vacío (RF-70). Desde el cambio del 2026-11-20 no
 * hay carpetas vacías del catálogo; las clases de siempre se ofrecen al subir (RF-71).
 *
 * El orden (RF-5, RF-57): las del catálogo en su orden; después las creadas al subir y las de clases
 * retiradas, juntas por alfabeto sin distinguir tildes ni mayúsculas; «Otro» al final. Una carpeta
 * que no es del catálogo lleva el nombre de su documento más reciente (RF-13).
 *
 * Cuenta con el `aviso` que manda el servidor y no con la fecha de este equipo: así las
 * carpetas suman exactamente lo que dicen las cifras de arriba (RF-54), aunque el reloj de
 * la computadora esté mal. `estadoDelVencimiento` nunca avisa de un anulado, y aquí además
 * los anulados no cuentan como vigentes (RF-10).
 */
export function carpetasDe(
  lugar: LugarDeDocumentos,
  documentos: readonly DocumentoParaCarpeta[],
  { conAnulados = false }: { conAnulados?: boolean } = {},
): CarpetaDelArchivador[] {
  const catalogo = clasesDe(lugar);
  const delCatalogo = new Map(catalogo.map((c) => [c.id, c]));
  const porId = new Map<string, CarpetaDelArchivador>();
  // De las que no son del catálogo, la fecha del documento que dio el nombre: si una clave llegó
  // con dos nombres, vale el más reciente.
  const fechaDelNombre = new Map<string, string>();

  for (const documento of documentos) {
    let carpeta = porId.get(documento.clase);
    const deSiempre = delCatalogo.get(documento.clase);
    if (!carpeta) {
      const propia = !deSiempre && esCarpetaPropia(documento.clase);
      carpeta = {
        id: documento.clase,
        nombre: deSiempre?.nombre ?? documento.claseNombre,
        vigentes: 0,
        vencidos: 0,
        porVencer: 0,
        vacia: true,
        tieneAnulados: false,
        retirada: !deSiempre && !propia,
        propia,
      };
      porId.set(documento.clase, carpeta);
      fechaDelNombre.set(documento.clase, documento.fecha);
    } else if (!deSiempre && documento.fecha > (fechaDelNombre.get(documento.clase) ?? '')) {
      carpeta.nombre = documento.claseNombre;
      fechaDelNombre.set(documento.clase, documento.fecha);
    }
    if (documento.anulado) {
      carpeta.tieneAnulados = true;
      continue;
    }
    carpeta.vigentes += 1;
    carpeta.vacia = false;
    if (documento.aviso?.estado === 'vencido') carpeta.vencidos += 1;
    else if (documento.aviso?.estado === 'por_vencer') carpeta.porVencer += 1;
  }

  const visibles = [...porId.values()].filter((c) => c.vigentes > 0 || (conAnulados && c.tieneAnulados));
  const orden = new Map(catalogo.map((c, i) => [c.id, i]));
  const deSiempre = visibles
    .filter((c) => orden.has(c.id) && c.id !== OTRO.id)
    .sort((a, b) => orden.get(a.id)! - orden.get(b.id)!);
  const lasDemas = visibles
    .filter((c) => !orden.has(c.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  const otro = visibles.filter((c) => c.id === OTRO.id);
  return [...deSiempre, ...lasDemas, ...otro];
}

/**
 * El tamaño de un archivo para leerlo en la tarjeta (spec 051, RF-33, D14): en KB sin
 * decimales por debajo de 1.024 KB, y en MB con un decimal desde ahí, con coma. Un archivo
 * de unos bytes dice «1 KB» y no «0 KB», que se leería como vacío.
 *
 * `null` cuando el documento no tiene tamaño guardado: la tarjeta no muestra la línea, en
 * vez de inventar un «0 KB» (RF-69, D19).
 */
export function tamanoLegible(bytes: number | null): string | null {
  if (bytes === null) return null;
  const kb = bytes / 1024;
  if (kb < 1024) {
    const entero = Math.max(1, Math.round(kb));
    return `${String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} KB`;
  }
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}

export type FormatoDeArchivo = 'pdf' | 'imagen' | 'word' | 'excel';

/**
 * Qué clase de archivo es, por el tipo que se guardó al subirlo (spec 051, RF-26): es lo que
 * dice la tarjeta con su ícono. Sale de `EXTENSIONES`, así que un tipo admitido nuevo sin su
 * clase aquí lo atrapa la verificación. `null` para un tipo que no es de documentos.
 */
export function formatoDeArchivo(mime: string): FormatoDeArchivo | null {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'imagen';
  const extension = Object.entries(EXTENSIONES).find(([, e]) => e.mime === mime)?.[0];
  if (extension === 'doc' || extension === 'docx') return 'word';
  if (extension === 'xls' || extension === 'xlsx') return 'excel';
  return null;
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
