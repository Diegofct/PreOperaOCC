/**
 * Subir un documento al Almacén y leerlo por detrás (spec 042, RF-1 a RF-9, RF-56, RF-59 a RF-68,
 * RF-94). **Solo servidor.**
 *
 * ── Qué se rechaza antes de guardar y antes de pagar ──
 *
 * En la petición, y en este orden: lo que dice la regla del archivo (tipo, contenido, 20 MB, formato
 * viejo, PDF cifrado o de más de 10 páginas, RF-3 a RF-6, RF-59, RF-61) y, en un Excel o un Word, lo
 * que sale de leerlo (más de 200 renglones, sin datos, dañado, RF-60). Nada de eso guarda un archivo
 * ni llama a la IA: responde 413 o 422 con su motivo.
 *
 * ── Las páginas de un PDF ──
 *
 * La regla cuenta las páginas leyendo los bytes, y no las ve cuando el PDF guarda su árbol de páginas
 * comprimido, que es lo que hacen los programas modernos (nota de la T10: un PDF real de 186 páginas
 * pasó). Entonces se cuentan aquí con `pdf-lib`, que ya usa el asistente, y se rechaza con el mismo
 * mensaje de la regla (RF-59). `pdf-lib` tampoco abre un PDF cifrado: es la segunda red de RF-61.
 *
 * ── Por detrás ──
 *
 * Aceptado, el archivo se guarda en el almacén privado con dueño `almacen` y la importación queda
 * `en_curso` (RF-94); la ruta responde 202 y la lectura sigue en el mismo proceso, como la del plan
 * semanal, porque el proxy del VPS corta a los 120 s (RF-64). Nadie espera esa promesa, así que no
 * lanza: todo termina en la fila, `lista` con su propuesta y su vencimiento de un día (RF-66), o
 * `fallida` con el motivo (RF-9, RF-67, RF-68). Si el proceso muere a mitad, `vence_lectura_en` deja
 * que la siguiente consulta la dé por perdida (T13).
 *
 * Una persona puede tener varias importaciones a la vez (D32): no hay reserva por obra.
 */
import { and, eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenImportaciones, almacenMateriales, media, obras } from '@/db/servidor/esquema';
import { leerWord } from '@/features/asistente/servidor/leer-word';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import { TIEMPO_MAXIMO_DE_LECTURA_MS } from '@/features/planificacion/servidor/leer-con-ia';
import { libroConNombres } from '@/features/presupuestos/servidor/leer-excel';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import {
  faltaDeTamano,
  propuestaDeLaLectura,
  textoDelExcelParaImportar,
  textoDelWordParaImportar,
  type FuenteDeLaLectura,
  type MaterialParaLaIa,
} from '@/shared/rules/almacen-importacion-ia';
import { revisarDocumentoParaImportar, type DocumentoSubido } from '@/shared/rules/archivos-subidos';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { leerDocumentoDelAlmacen, type ArchivoParaLaIa } from './con-ia';

/** Más que el tope de la IA: si se pasa, el proceso murió a mitad (T13 la da por perdida). */
const VIGENCIA_DE_UNA_LECTURA_MS = TIEMPO_MAXIMO_DE_LECTURA_MS + 2 * 60 * 1000;
/** RF-66: un día para revisarla. */
const VIGENCIA_DE_UNA_PROPUESTA_MS = 24 * 60 * 60 * 1000;

/** Lo que se le manda a la IA: texto citado (Excel, Word) o el archivo (foto, PDF). */
type ContenidoParaLeer = { fuente: FuenteDeLaLectura; texto: string | null; archivo: ArchivoParaLaIa | null };

const falla = (error: string, estado: 413 | 422 = 422) => errorDePeticion(error, estado);

/** RF-59, RF-61: las páginas de un PDF que la regla no pudo contar, o por qué no se puede leer. */
async function paginasConPdfLib(contenido: Uint8Array, nombre: string): Promise<number | Response> {
  try {
    const pdf = await PDFDocument.load(contenido, { updateMetadata: false });
    return pdf.getPageCount();
  } catch (fallo) {
    const cifrado = fallo instanceof Error && /encrypt/i.test(fallo.message);
    return falla(
      cifrado
        ? `«${nombre}» está protegido con contraseña. Quítele la contraseña y súbalo de nuevo.`
        : `«${nombre}» no se pudo abrir como PDF. Revise que no esté dañado.`,
    );
  }
}

/**
 * RF-3 a RF-6, RF-59 a RF-62: revisa el archivo y lo deja listo para la IA, o dice por qué no.
 * Lo de Excel y Word se lee aquí, antes de guardar, para rechazar sin pagar.
 */
async function prepararDocumento(archivo: DocumentoSubido): Promise<ContenidoParaLeer | Response> {
  const revision = revisarDocumentoParaImportar(archivo);
  if (!revision.ok) return falla(revision.error, revision.estado);
  const { nombre, contenido } = archivo;

  if (revision.clase === 'pdf' || revision.clase === 'imagen') {
    if (revision.clase === 'pdf' && revision.paginas === null) {
      const paginas = await paginasConPdfLib(contenido, nombre);
      if (paginas instanceof Response) return paginas;
      const largo = faltaDeTamano('pdf', paginas);
      if (largo) return falla(largo);
    }
    return {
      fuente: { tipo: revision.clase },
      texto: null,
      archivo: { nombre, clase: revision.clase, mime: revision.mime, contenido },
    };
  }

  if (revision.clase === 'excel') {
    let libro;
    try {
      libro = await libroConNombres(contenido.slice().buffer);
    } catch {
      return falla(`«${nombre}» no se pudo abrir como Excel. Revise que no esté dañado ni protegido.`);
    }
    const leido = textoDelExcelParaImportar(libro);
    if ('error' in leido) return falla(leido.error);
    return { fuente: { tipo: 'excel', hojas: leido.hojas }, texto: leido.texto, archivo: null };
  }

  const word = await leerWord(contenido);
  if ('error' in word) return falla(`«${nombre}»: ${word.error}`);
  const leido = textoDelWordParaImportar(word.texto);
  if (!leido.texto) return falla(`«${nombre}» no tiene texto.`);
  return { fuente: { tipo: 'word', lineas: leido.lineas }, texto: leido.texto, archivo: null };
}

/** Lo que la IA necesita saber de la obra: su nombre y sus materiales (RF-19, RF-22, RF-75). */
async function obraParaLeer(obraId: string): Promise<{ obra: string; materiales: MaterialParaLaIa[] }> {
  const db = baseServidor();
  const [obra] = await db.select({ codigo: obras.codigo, nombre: obras.nombre }).from(obras).where(eq(obras.id, obraId)).limit(1);
  const materiales = await db
    .select({ id: almacenMateriales.id, nombre: almacenMateriales.nombre, unidad: almacenMateriales.unidad, eliminadoEn: almacenMateriales.eliminadoEn })
    .from(almacenMateriales)
    .where(eq(almacenMateriales.obraId, obraId));
  return {
    obra: obra ? `${obra.codigo} ${obra.nombre}` : '',
    materiales: materiales.map((m) => ({ id: m.id, nombre: m.nombre, unidad: m.unidad, vigente: m.eliminadoEn === null })),
  };
}

/** Deja la importación `fallida`, solo si sigue en curso: una que ya venció no se toca. */
async function fallar(id: string, error: string): Promise<void> {
  await baseServidor()
    .update(almacenImportaciones)
    .set({ estado: 'fallida', error, actualizadoEn: new Date() })
    .where(and(eq(almacenImportaciones.id, id), eq(almacenImportaciones.estado, 'en_curso')));
}

/** RF-7, RF-9, RF-67, RF-68: la lectura por detrás. No lanza: todo termina en la fila. */
async function correrLectura(id: string, obraId: string, contenido: ContenidoParaLeer): Promise<void> {
  try {
    const { obra, materiales } = await obraParaLeer(obraId);
    const respuesta = await leerDocumentoDelAlmacen({ obra, materiales, contenido: contenido.texto }, contenido.archivo);
    if (!respuesta.ok) return fallar(id, respuesta.error);

    const ahora = new Date();
    const resultado = propuestaDeLaLectura(respuesta.datos, { obra, hoy: fechaDeJornada(ahora.getTime()), materiales, fuente: contenido.fuente });
    if (!resultado.ok) return fallar(id, resultado.error);

    await baseServidor()
      .update(almacenImportaciones)
      .set({
        estado: 'lista',
        propuesta: resultado.propuesta,
        vencePropuestaEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_PROPUESTA_MS),
        version: 2,
        actualizadoEn: ahora,
      })
      .where(and(eq(almacenImportaciones.id, id), eq(almacenImportaciones.estado, 'en_curso')));
  } catch (fallo) {
    console.error(`[almacen] la importación ${id} falló:`, fallo);
    await fallar(id, 'No se pudo leer el documento. Vuelva a intentarlo.').catch(() => undefined);
  }
}

/**
 * RF-1 a RF-9, RF-56, RF-59 a RF-64, RF-94: recibe el documento, lo guarda y arranca la lectura.
 * La guardia (`almacen/importar`) y el alcance de la obra los pone la ruta; aquí se mira además que
 * la obra tenga el Almacén activo (RF-63).
 */
export async function iniciarImportacion(sesion: PersonaEnSesion, obraId: string, archivo: DocumentoSubido): Promise<{ importacionId: string } | Response> {
  // RF-63: «no existe», como el resto del panel con lo que no está a la vista.
  if (!(await modulosDeLaObra(obraId)).almacen) return noEncontrado('el Almacén de esa obra');

  const contenido = await prepararDocumento(archivo);
  if (contenido instanceof Response) return contenido;

  const id = uuidv7();
  const mediaId = uuidv7();
  const mime = contenido.archivo?.mime ?? (contenido.fuente.tipo === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const bytes = new Uint8Array(archivo.contenido);
  const clave = claveDeObjeto('almacen', id, mediaId, mime);
  await guardar(clave, bytes, mime);

  const ahora = new Date();
  const db = baseServidor();
  // El archivo y su importación, juntos (RF-94).
  await db.batch([
    db.insert(media).values({
      id: mediaId,
      duenoTipo: 'almacen',
      duenoId: id,
      proposito: 'evidencia',
      mime,
      bytes: bytes.byteLength,
      sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))),
      claveR2: clave,
      subidoEn: ahora,
    }),
    db.insert(almacenImportaciones).values({
      id,
      obraId,
      mediaId,
      nombreArchivo: archivo.nombre,
      estado: 'en_curso',
      venceLecturaEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_LECTURA_MS),
      creadoPor: sesion.id,
    }),
  ]);

  void correrLectura(id, obraId, contenido);
  return { importacionId: id };
}
