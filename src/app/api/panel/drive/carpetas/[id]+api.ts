import { asociarCarpeta } from '@/features/drive/servidor/lista';
import { carpetaAsociada } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Asociar una carpeta del Drive a una obra, o cambiarla. `PATCH /api/panel/drive/carpetas/:id`
 * con `{ obraId }` (spec 052, RF-8, RF-9).
 *
 * Solo la gerencia (`activar`). 409 si la obra ya tiene otra carpeta: una obra, una carpeta.
 * Quitarle la obra no se ofrece: su Drive dejaría de verse donde ya se veía.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'drive', 'activar');
    if (sesion instanceof Response) return sesion;

    const { obraId } = await cuerpoJson(peticion, carpetaAsociada);
    const carpeta = await asociarCarpeta(sesion, idDeLaRuta(id), obraId);
    return carpeta instanceof Response ? carpeta : ok(carpeta);
  });
}
