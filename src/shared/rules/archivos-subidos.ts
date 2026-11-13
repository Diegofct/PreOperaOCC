/**
 * Qué es un archivo que alguien sube, mirando sus bytes y no lo que dice el navegador. Puro: recibe
 * los bytes y decide, sin abrir nada.
 *
 * Las comprobaciones de bytes (foto, PDF, ZIP, páginas del PDF) eran del asistente (spec 028) y se
 * movieron aquí sin cambiarlas para que la importación al Almacén (spec 042) use las mismas. Cada uno
 * pone sus límites encima: el asistente acepta 10 MB, 100 páginas y fotos WEBP; la importación, 20 MB,
 * 10 páginas y solo JPG o PNG (RF-3, RF-6, RF-59).
 *
 * ── El contenido manda ──
 *
 * Un `.xls` viejo con el nombre cambiado a `.xlsx` sigue siendo un `.xls`: lo que se mira son los
 * primeros bytes (RF-4, RF-5). Los formatos de Office viejos empiezan con la firma OLE
 * (`D0 CF 11 E0`); los nuevos son un ZIP (`PK`).
 *
 * ── El PDF con contraseña ──
 *
 * Un PDF cifrado lleva en su tráiler la entrada `/Encrypt`, con una referencia (`/Encrypt 5 0 R`) o
 * un diccionario (`/Encrypt << … >>`). Se busca esa forma y no la palabra suelta: una página que diga
 * «Encrypt» en su texto no está cifrada (RF-61).
 */
import { claseDeAdjunto, type ClaseDeAdjunto } from './asistente';
import { faltaDeTamano } from './almacen-importacion-ia';

/** La foto por sus primeros bytes, no por lo que diga el navegador. */
export function mimeDeImagen(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp';
  return null;
}

export const esPdf = (b: Uint8Array) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
export const esZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b; // PK
/** Excel y Word viejos (.xls, .doc): la firma de los documentos compuestos de OLE. */
export const esOfficeViejo = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

const comoTexto = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

/**
 * Las páginas de un PDF, por su árbol de páginas: el `/Count` más grande de los objetos
 * `/Type /Pages`. `null` si el PDF lo esconde en un flujo comprimido; entonces el límite
 * lo pone la API, que también rechaza los PDF demasiado largos.
 */
export function paginasDelPdf(b: Uint8Array): number | null {
  const textoDelPdf = comoTexto(b);
  let mayor: number | null = null;
  for (const m of textoDelPdf.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) {
    const n = Number(m[1] ?? m[2]);
    if (mayor === null || n > mayor) mayor = n;
  }
  return mayor;
}

/** RF-61: ¿el PDF está cifrado? Por la entrada `/Encrypt` de su tráiler. */
export function pdfCifrado(b: Uint8Array): boolean {
  return /\/Encrypt\s*(\d+\s+\d+\s+R|<<)/.test(comoTexto(b));
}

export const MIME_DE_CLASE: Record<Exclude<ClaseDeAdjunto, 'imagen'>, string> = {
  pdf: 'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/* ── La importación al Almacén (spec 042) ───────────────────────────────── */

export const BYTES_MAXIMOS_PARA_IMPORTAR = 20 * 1024 * 1024;

export interface DocumentoSubido {
  nombre: string;
  /** Lo que dice el navegador; puede venir vacío. */
  tipo: string;
  contenido: Uint8Array;
}

export type RevisionDelDocumento =
  | {
      ok: true;
      clase: ClaseDeAdjunto;
      mime: string;
      /** Una foto es una página; un Excel o un Word, `null` (RF-59). */
      paginas: number | null;
    }
  /** `estado` es el código de la respuesta: 413 si pesa de más, 422 si no sirve. */
  | { ok: false; estado: 413 | 422; error: string };

const rechazo = (error: string, estado: 413 | 422 = 422): RevisionDelDocumento => ({ ok: false, estado, error });

/**
 * RF-3 a RF-6, RF-59, RF-61: si el documento se puede importar, con su clase y sus páginas, o por qué
 * no. Se mira antes de guardar nada y antes de pagar a la IA. El escaneo sin texto no se distingue
 * aquí: va como PDF y el modelo lo lee como imagen (RF-62).
 */
export function revisarDocumentoParaImportar(archivo: DocumentoSubido): RevisionDelDocumento {
  const { nombre, contenido: b } = archivo;
  if (b.byteLength === 0) return rechazo(`«${nombre}» llegó vacío.`);
  if (b.byteLength > BYTES_MAXIMOS_PARA_IMPORTAR) {
    const mb = (b.byteLength / 1024 / 1024).toFixed(1).replace('.', ',');
    return rechazo(`«${nombre}» pesa ${mb} MB; el máximo es 20 MB.`, 413);
  }

  // RF-4: el contenido viejo manda aunque el nombre diga .xlsx; el nombre viejo, aunque el tipo no.
  const extension = nombre.toLowerCase().split('.').pop() ?? '';
  if (esOfficeViejo(b) || extension === 'xls' || extension === 'doc') {
    return rechazo(`«${nombre}» es un Excel o un Word del formato antiguo. Ábralo y guárdelo como .xlsx o .docx.`);
  }

  const clase = claseDeAdjunto(nombre, archivo.tipo);
  const esWebp = archivo.tipo.toLowerCase() === 'image/webp' || extension === 'webp';
  if (!clase || esWebp) return rechazo(`«${nombre}»: solo se importan PDF, Excel (.xlsx), Word (.docx) y fotos JPG o PNG.`);

  // RF-5: que sea lo que dice ser.
  if (clase === 'imagen') {
    const mime = mimeDeImagen(b);
    if (mime !== 'image/jpeg' && mime !== 'image/png') return rechazo(`«${nombre}» no es una foto JPG o PNG, aunque su nombre lo diga.`);
    return { ok: true, clase, mime, paginas: 1 };
  }
  if (clase === 'pdf') {
    if (!esPdf(b)) return rechazo(`«${nombre}» no es un PDF, aunque su nombre lo diga.`);
    if (pdfCifrado(b)) return rechazo(`«${nombre}» está protegido con contraseña. Quítele la contraseña y súbalo de nuevo.`);
    const paginas = paginasDelPdf(b);
    const largo = faltaDeTamano('pdf', paginas);
    if (largo) return rechazo(largo);
    return { ok: true, clase, mime: MIME_DE_CLASE.pdf, paginas };
  }
  if (!esZip(b)) {
    return rechazo(`«${nombre}» no es un ${clase === 'excel' ? 'Excel (.xlsx)' : 'Word (.docx)'}, aunque su nombre lo diga.`);
  }
  return { ok: true, clase, mime: MIME_DE_CLASE[clase], paginas: null };
}
