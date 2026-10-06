import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { media, whatsappMensajes } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { rechazoDeArchivo, tipoDeArchivo } from '@/shared/rules/whatsapp';

/**
 * El archivo de un mensaje. `PUT /api/integraciones/whatsapp/mensajes/:id/archivo`
 * (spec 021, RF-7, RF-52, RF-53).
 *
 * El cuerpo son los bytes, con su `content-type`, igual que la foto del parte
 * (`partes/[id]/foto`): un reporte con 25 fotos son 25 peticiones pequeñas que se
 * reintentan una a una, no un JSON de decenas de megas en base64 que se pierde
 * entero si se corta.
 *
 * **Primero el mensaje, después el archivo.** La integración entrega el mensaje
 * con `POST …/mensajes` y luego sus archivos; uno sin mensaje es un 404, porque no
 * habría de qué obra decidir quién lo ve.
 *
 * **Repetir es seguro.** Si ya hay un archivo con la misma huella (SHA-256) en ese
 * mensaje, responde 200 con el que ya estaba y no sube nada. Así un reintento de
 * n8n no deja dos copias de la misma foto en la propuesta.
 *
 * **Primero R2, después la fila**, por lo mismo que la foto del parte: un corte
 * entre las dos deja un objeto huérfano en el bucket, que no se ve en ninguna
 * parte; al revés quedaría una foto rota en la bandeja.
 *
 * El bucket es privado: estos archivos solo salen por `/api/panel/media/:id`, que
 * los muestra a quien tiene la bandeja de la obra del grupo (RF-53).
 */
export async function PUT(peticion: Request, { id: crudo }: { id: string }) {
  return responder(async () => {
    const id = idDeLaRuta(crudo);
    const rechazo = await requerirIntegracion(peticion);
    if (rechazo) return rechazo;

    const tipo = tipoDeArchivo(peticion.headers.get('content-type'));
    const contenido = new Uint8Array(await peticion.arrayBuffer());
    const invalido = rechazoDeArchivo(tipo, contenido.byteLength);
    if (invalido) return errorDePeticion(invalido.mensaje, invalido.estado);

    const db = baseServidor();
    const [mensaje] = await db
      .select({ id: whatsappMensajes.id })
      .from(whatsappMensajes)
      .where(eq(whatsappMensajes.id, id))
      .limit(1);
    if (!mensaje) return noEncontrado('ese mensaje');

    const huella = aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));

    const [yaEstaba] = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(eq(media.duenoTipo, 'whatsapp'), eq(media.duenoId, id), eq(media.sha256, huella)),
      )
      .limit(1);
    if (yaEstaba) return ok({ id: yaEstaba.id, estado: 'ya_estaba' });

    const mediaId = uuidv7();
    const clave = claveDeObjeto('whatsapp', id, mediaId, tipo);
    await guardar(clave, contenido, tipo);

    await db.insert(media).values({
      id: mediaId,
      duenoTipo: 'whatsapp',
      duenoId: id,
      proposito: 'evidencia',
      mime: tipo,
      bytes: contenido.byteLength,
      sha256: huella,
      claveR2: clave,
      subidoEn: new Date(),
    });

    return ok({ id: mediaId, estado: 'guardado' }, 201);
  });
}
