import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, media, preoperacionales } from '@/db/servidor/esquema';
import { leer } from '@/features/media/servidor/almacen';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { noEncontrado, responder } from '@/features/servidor/respuestas';

/**
 * Sirve una imagen al panel. `GET /api/panel/media/:id`.
 *
 * **Los bytes pasan por aquí y no por una URL del bucket.** Es la decisión
 * importante de este archivo: el bucket de R2 es privado y no se expone jamás,
 * ni siquiera con un enlace temporal. Son actas con la firma de una persona y
 * fotos del estado de la maquinaria; con un bucket público, adivinar un id
 * bastaría para leer la evidencia de cualquier obra.
 *
 * Pasando por el servidor, cada imagen atraviesa las dos puertas que ya protegen
 * al resto del panel: la sesión y el filtro por obra. Un residente no puede ver
 * la evidencia de una obra que no es la suya, igual que no puede ver sus
 * preoperacionales.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Guardia genérica a propósito: una imagen puede colgar de un
    // preoperacional o de una bitácora, así que el módulo no se sabe hasta
    // haber leído la fila. El control real es el alcance por obra de más
    // abajo, que sí mira de quién es la imagen.
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const db = baseServidor();

    const [fila] = await db
      .select({
        duenoTipo: media.duenoTipo,
        duenoId: media.duenoId,
        claveR2: media.claveR2,
        mime: media.mime,
      })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    // Sin `claveR2` la fila existe pero el archivo todavía no ha subido: el
    // teléfono lo tiene en la cola esperando una WiFi. No es un error.
    if (!fila?.claveR2) return noEncontrado('esa imagen');

    // "No existe" y no "no puede", igual que en el resto del panel: confirmar
    // que el id es real ya le diría a un residente qué se registra en las obras
    // que no le tocan.
    if (!alcanzaLaObra(sesion, await obraDeLaImagen(fila.duenoTipo, fila.duenoId))) {
      return noEncontrado('esa imagen');
    }

    const archivo = await leer(fila.claveR2);
    if (!archivo) return noEncontrado('esa imagen');

    return new Response(archivo.contenido, {
      headers: {
        'Content-Type': archivo.mime || fila.mime,
        'Content-Length': String(archivo.contenido.byteLength),
        // La imagen no cambia nunca: su clave sale de un id que no se reutiliza.
        // `private` importa tanto como el tiempo — sin él, un proxy compartido
        // podría guardar el acta de un operador y servírsela a otro.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  });
}

/** La obra del registro al que cuelga la imagen, para poder filtrar por alcance. */
async function obraDeLaImagen(
  tipo: 'preoperacional' | 'bitacora' | 'documento',
  duenoId: string,
): Promise<string | null> {
  const db = baseServidor();

  if (tipo === 'preoperacional') {
    const [fila] = await db
      .select({ obraId: preoperacionales.obraId })
      .from(preoperacionales)
      .where(eq(preoperacionales.id, duenoId))
      .limit(1);
    return fila?.obraId ?? null;
  }

  if (tipo === 'bitacora') {
    const [fila] = await db
      .select({ obraId: bitacoras.obraId })
      .from(bitacoras)
      .where(eq(bitacoras.id, duenoId))
      .limit(1);
    return fila?.obraId ?? null;
  }

  return null;
}
