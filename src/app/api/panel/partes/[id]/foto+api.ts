import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { media, partesDeObra } from '@/db/servidor/esquema';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import { agregarSubidaALaLista } from '@/features/whatsapp/servidor/fotos-del-dia';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Subir una fotografía al parte. `POST /api/panel/partes/:id/foto`.
 *
 * La del día, o la de una actividad concreta —se distingue por `item`, que
 * lleva el id de la fila de actividad—.
 *
 * El cuerpo son los bytes de la imagen, igual que en la ruta del celular. Se
 * manda así y no como formulario porque el almacén guarda bytes y convertir a
 * `multipart` solo para volver a desmontarlo aquí no aporta nada.
 *
 * **Primero R2, después la fila.** Si el corte ocurre entre las dos, queda un
 * archivo huérfano en el bucket, que no molesta a nadie; al revés quedaría una
 * fila apuntando a un archivo que no existe, y eso sí se ve como una foto rota
 * en el parte.
 */

/** Ocho megas: lo que da una cámara de teléfono sin comprimir demasiado. */
const TAMANO_MAXIMO = 8 * 1024 * 1024;

const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await parteEditable(sesion, id);
    if (estado instanceof Response) return estado;

    const mime = peticion.headers.get('content-type') ?? '';
    if (!MIMES.has(mime)) {
      return errorDePeticion('Solo se admiten imágenes JPG, PNG o WEBP.', 415);
    }

    const contenido = new Uint8Array(await peticion.arrayBuffer());
    if (contenido.byteLength === 0) return errorDePeticion('La imagen llegó vacía.', 422);
    if (contenido.byteLength > TAMANO_MAXIMO) {
      return errorDePeticion('La imagen pesa más de 8 MB. Redúzcala antes de subirla.', 422);
    }

    // El id de la fila de actividad, cuando la foto es de una actividad y no
    // del día. Se guarda en `itemKey`, que es la misma columna con la que el
    // preoperacional ata una foto a su ítem del checklist.
    const item = new URL(peticion.url).searchParams.get('item');

    const mediaId = uuidv7();
    const clave = claveDeObjeto('bitacora', id, mediaId, mime);
    await guardar(clave, contenido, mime);

    // La huella: con ella la sección no repite la misma foto subida dos veces (027/RF-36).
    const huella = aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));

    const [fila] = await baseServidor()
      .insert(media)
      .values({
        id: mediaId,
        duenoTipo: 'bitacora',
        duenoId: id,
        proposito: 'evidencia',
        itemKey: item,
        mime,
        bytes: contenido.byteLength,
        sha256: huella,
        claveR2: clave,
        subidoEn: new Date(),
      })
      .returning({ id: media.id, itemKey: media.itemKey });

    // La foto del día entra a la sección como las de WhatsApp: así se ve, se cuenta y se
    // quita igual (spec 027, cambio del 2026-10-14, RF-34, RF-39). La de una actividad no.
    if (item === null) await agregarSubidaALaLista({ parteId: id, mediaId, sha256: huella });

    return ok(fila, 201);
  });
}

/** Las fotografías de un parte. `GET /api/panel/partes/:id/foto`. */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    // El alcance por obra se comprueba igual, y no vale `parteEditable`: ese
    // rechaza los partes cerrados, y un parte cerrado se sigue consultando con
    // sus fotos. Sin esto, conocer un id bastaría para ver la evidencia de otra
    // obra (RF-33).
    const [parte] = await baseServidor()
      .select({ obraId: partesDeObra.obraId })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, id))
      .limit(1);

    if (!parte || !alcanzaLaObra(sesion, parte.obraId)) return noEncontrado('esa bitácora');

    const filas = await baseServidor()
      .select({
        id: media.id,
        itemKey: media.itemKey,
        disponible: media.claveR2,
      })
      .from(media)
      .where(eq(media.duenoId, id));

    return ok(
      filas.map((f) => ({ id: f.id, itemKey: f.itemKey, disponible: f.disponible !== null })),
    );
  });
}
