import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra } from '@/db/servidor/esquema';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { fotosDeLaBitacora } from '@/features/whatsapp/servidor/fotos-del-dia';

/**
 * Las «Fotos del día» de una bitácora (spec 027, RF-13 a RF-18, RF-25).
 * `GET /api/panel/partes/:id/fotos-del-dia`.
 *
 * Se pide aparte de la bitácora, como la foto principal (`…/foto`): la pantalla las pide
 * por su lado, y meterlas en `ParteFila` tocaría el contrato de la bitácora entera por un
 * dato de una sección.
 *
 * El alcance se comprueba igual que en `…/foto` y no con `parteEditable`, que rechaza las
 * cerradas: una bitácora cerrada se sigue consultando con sus fotos. Sin esto, conocer un id
 * bastaría para ver la evidencia de otra obra (RF-33). Las imágenes mismas pasan después por
 * `/api/panel/media/:id`, que vuelve a mirar el alcance del mensaje.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const [parte] = await baseServidor()
      .select({ obraId: partesDeObra.obraId })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, id))
      .limit(1);
    if (!parte || !alcanzaLaObra(sesion, parte.obraId)) return noEncontrado('esa bitácora');

    return ok(await fotosDeLaBitacora(id));
  });
}
