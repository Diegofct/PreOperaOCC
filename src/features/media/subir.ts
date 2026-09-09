/**
 * La subida de una imagen desde el teléfono.
 *
 * Vive aparte de `sync/push.ts` porque es la única entidad de la cola que no
 * viaja como JSON: hay que abrir un archivo del disco, pesarlo y calcularle la
 * huella antes de mandarlo. Meter eso dentro del bucle de la cola habría
 * convertido un archivo que se lee de un vistazo en uno que hay que estudiar.
 *
 * ── La regla de la red, que es la decisión de fondo ──
 *
 * Una foto de hallazgo pesa ~250 KB; la firma, ~30 KB. Subirlas todas por datos
 * móviles se comería el plan del operador, que lo paga él. Por eso las fotos
 * **esperan a una WiFi**, como ya decía `media/repositorio.ts` desde la Fase 1.
 *
 * Con una excepción deliberada: **la firma sube siempre**, tenga la red que
 * tenga. Es la pieza que hace válida el acta —lo que prueba que el operador
 * revisó la máquina—, pesa lo que un mensaje de texto, y una cuadrilla que pase
 * semanas en un frente sin ver una WiFi se quedaría sin ella. Perder eso para
 * ahorrar 30 KB sería el peor cambio posible.
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { eq } from 'drizzle-orm';
import { File } from 'expo-file-system';
import * as Network from 'expo-network';

import { db } from '@/db/local/client';
import { media } from '@/db/local/schema';
import { pedirBinarioConToken } from '@/features/sync/cliente-http';
import { aHex } from '@/shared/cripto/formato-pbkdf2';

export type ResultadoImagen =
  /** Llegó al servidor. */
  | 'subida'
  /** Hay red, pero no la que esta imagen necesita. Se queda en la cola. */
  | 'espera_wifi'
  /** No hay nada que subir: la fila o el archivo ya no están. Es definitivo. */
  | 'sin_archivo';

/**
 * Sube una imagen. Los fallos de red y del servidor **se propagan** para que
 * `push.ts` los trate igual que los de cualquier otra fila de la cola.
 */
export async function subirImagen(
  mediaId: string,
  claveIdempotencia: string,
): Promise<ResultadoImagen> {
  const [fila] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);

  if (!fila) return 'sin_archivo';
  if (fila.estadoSubida === 'subida') return 'subida';

  if (!(await puedeSubirAhora(fila.proposito))) return 'espera_wifi';

  const archivo = new File(fila.uriLocal);
  if (!archivo.exists) return 'sin_archivo';

  const contenido = new Uint8Array(await archivo.arrayBuffer());
  if (contenido.byteLength === 0) return 'sin_archivo';

  // La huella se calcula sobre los **mismos bytes que se envían**, no sobre una
  // segunda lectura del archivo. El servidor la recalcula y rechaza lo que no
  // cuadre: una foto que llegó corrupta es peor que una que no llegó, porque se
  // da por buena y tapa el hueco.
  const huella = aHex(sha256(contenido));

  await db
    .update(media)
    .set({ sha256: huella, bytes: contenido.byteLength })
    .where(eq(media.id, mediaId));

  const cabeceras: Record<string, string> = {
    'content-type': fila.mime,
    'x-media-dueno-tipo': fila.duenoTipo,
    'x-media-dueno-id': fila.duenoId,
    'x-media-proposito': fila.proposito,
    'x-media-sha256': huella,
    'x-idempotencia': claveIdempotencia,
  };
  if (fila.itemKey) cabeceras['x-media-item-key'] = fila.itemKey;

  await pedirBinarioConToken(`/api/movil/media/${mediaId}`, contenido, cabeceras);

  return 'subida';
}

/**
 * ¿Toca subir esta imagen con la red que hay ahora mismo?
 *
 * Si no se puede leer el estado de la red, se deja pasar. Quedarse esperando una
 * WiFi que nunca se confirma sería peor que gastar unos KB: la evidencia se
 * quedaría en el teléfono indefinidamente y nadie se enteraría.
 */
async function puedeSubirAhora(proposito: string): Promise<boolean> {
  if (proposito === 'firma_operador') return true;

  try {
    const estado = await Network.getNetworkStateAsync();
    return estado.type === Network.NetworkStateType.WIFI;
  } catch {
    return true;
  }
}

/** Cuántas imágenes siguen esperando, para poder decírselo al operador. */
export async function imagenesSinSubir(): Promise<number> {
  const filas = await db
    .select({ id: media.id })
    .from(media)
    .where(eq(media.estadoSubida, 'pendiente'));
  return filas.length;
}
