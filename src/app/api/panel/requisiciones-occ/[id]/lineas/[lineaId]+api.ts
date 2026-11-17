import { lineaOccPedida } from '@/features/panel/requisiciones-occ';
import { cambiarLineaOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Cambia una línea vigente (spec 047, RF-19, RF-36, RF-37): la de antes queda marcada como
 * reemplazada y responde el id de la nueva. Con la versión que se vio (RF-75).
 */
export async function PUT(peticion: Request, { id, lineaId }: { id: string; lineaId: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, lineaOccPedida);
    const resultado = await cambiarLineaOcc(sesion, id, lineaId, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
