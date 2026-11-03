import { grupoAsociado } from '@/features/panel/contratos';
import { requerirAdmin } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { asociarGrupo } from '@/features/whatsapp/servidor/grupos';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Asociar un grupo de WhatsApp a una obra **o** a una empresa, o cambiarlo. `PATCH
 * /api/panel/whatsapp/grupos/:id` con `{ obraId }` o `{ empresaId }` (spec 021, RF-8,
 * RF-9, RF-12, RF-13; spec 038, RF-1 a RF-5).
 *
 * Solo la gerencia (021/RF-9). Qué se mueve y qué se queda lo explica
 * `whatsapp/servidor/grupos.ts`. Quitarle el dueño no se ofrece: sus mensajes dejarían
 * de verse en la bandeja donde ya estaban.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, grupoAsociado);
    const grupo = await asociarGrupo(sesion, idDeLaRuta(id), pedido);
    return grupo instanceof Response ? grupo : ok(grupo);
  });
}
