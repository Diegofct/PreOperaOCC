/**
 * Evidencias fotográficas y firmas.
 *
 * Las fotos son lo único pesado que produce la app: unas 40 por preoperacional
 * con hallazgos. Se comprimen al capturarlas — no al subirlas — para que en el
 * teléfono ocupen ~250 KB en vez de 4 MB, y para que la subida por WiFi de la
 * oficina dure un minuto y no veinte.
 *
 * El archivo se guarda en el almacenamiento de la app y la fila queda con
 * `estadoSubida: 'pendiente'`. El binario y su metadato viajan por canales
 * distintos: el texto sube siempre, las fotos esperan a la WiFi. Quien lo decide
 * es `./subir.ts`, y ahí hay una excepción — **la firma sube con la red que
 * haya**, porque es lo que hace válida el acta y pesa lo que un mensaje.
 */
import { and, eq } from 'drizzle-orm';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { uuidv7 } from 'uuidv7';

import { db } from '@/db/local/client';
import { media } from '@/db/local/schema';

/** Lado mayor al que se reduce toda foto de evidencia. */
const ANCHO_MAXIMO = 1280;
const CALIDAD = 0.6;

export type ProposioMedia = 'hallazgo' | 'firma_operador' | 'foto_horometro' | 'evidencia';
export type DuenoMedia = 'preoperacional' | 'bitacora' | 'documento';

function carpetaDeMedios(): Directory {
  const carpeta = new Directory(Paths.document, 'media');
  if (!carpeta.exists) carpeta.create({ intermediates: true });
  return carpeta;
}

/** Mueve un archivo temporal al almacenamiento permanente de la app. */
function guardarEnDisco(uriOrigen: string, id: string, extension: 'jpg' | 'png'): File {
  const destino = new File(carpetaDeMedios(), `${id}.${extension}`);
  new File(uriOrigen).copy(destino);
  return destino;
}

interface DatosMedia {
  duenoTipo: DuenoMedia;
  duenoId: string;
  proposito: ProposioMedia;
  itemKey?: string;
}

/**
 * Comprime una foto recién tomada y la registra. Devuelve el id, que es lo
 * que guarda el preoperacional — nunca la ruta, que cambia entre equipos.
 */
export async function guardarFoto(uriOriginal: string, datos: DatosMedia): Promise<string> {
  const contexto = ImageManipulator.manipulate(uriOriginal);
  contexto.resize({ width: ANCHO_MAXIMO });
  const procesada = await contexto.renderAsync();
  const { uri } = await procesada.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD });

  const id = uuidv7();
  const archivo = guardarEnDisco(uri, id, 'jpg');

  await db.insert(media).values({
    id,
    duenoTipo: datos.duenoTipo,
    duenoId: datos.duenoId,
    proposito: datos.proposito,
    itemKey: datos.itemKey ?? null,
    uriLocal: archivo.uri,
    mime: 'image/jpeg',
    bytes: archivo.size ?? null,
    estadoSubida: 'pendiente',
  });

  return id;
}

/**
 * La firma llega ya como PNG del lienzo. No se recomprime: son unos pocos KB
 * y un JPEG con artefactos sobre un trazo fino se ve mal en el acta impresa.
 */
export async function guardarFirma(uriPng: string, datos: DatosMedia): Promise<string> {
  const id = uuidv7();
  const archivo = guardarEnDisco(uriPng, id, 'png');

  await db.insert(media).values({
    id,
    duenoTipo: datos.duenoTipo,
    duenoId: datos.duenoId,
    proposito: datos.proposito,
    uriLocal: archivo.uri,
    mime: 'image/png',
    bytes: archivo.size ?? null,
    estadoSubida: 'pendiente',
  });

  return id;
}

export async function mediaDe(duenoTipo: DuenoMedia, duenoId: string) {
  return db
    .select()
    .from(media)
    .where(and(eq(media.duenoTipo, duenoTipo), eq(media.duenoId, duenoId)));
}

export async function mediaDeItem(duenoId: string, itemKey: string) {
  return db
    .select()
    .from(media)
    .where(and(eq(media.duenoId, duenoId), eq(media.itemKey, itemKey)));
}

/**
 * Borra una evidencia que el operador descartó. Solo se permite mientras el
 * preoperacional es borrador: una vez firmado, la evidencia es parte del acta.
 */
export async function eliminarMedia(id: string) {
  const [fila] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!fila) return;

  try {
    const archivo = new File(fila.uriLocal);
    if (archivo.exists) archivo.delete();
  } catch {
    // Si el archivo ya no está, la fila igual debe irse.
  }

  await db.delete(media).where(eq(media.id, id));
}
