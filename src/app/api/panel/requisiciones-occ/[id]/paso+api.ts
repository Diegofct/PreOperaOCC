import { pasoOccPedido } from '@/features/panel/requisiciones-occ';
import { darPasoOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Enviar, devolver o cancelar una requisición de pagos de OCC (spec 047, RF-21 a RF-25, RF-34, RF-35),
 * con la versión que se vio (RF-75). Devolver y cancelar piden motivo. Quién puede cada paso lo dice
 * `porQueNoPuedeOcc`: 403 si no le toca, 409 si la requisición no está para eso.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, pasoOccPedido);
    const resultado = await darPasoOcc(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
