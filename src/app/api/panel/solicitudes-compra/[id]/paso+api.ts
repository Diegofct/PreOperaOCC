import { darPaso } from '@/features/compras/servidor/solicitudes';
import { pasoPedido } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Cancelar, aprobar, rechazar o devolver una solicitud (spec 036, RF-11, RF-13 a RF-15).
 * `POST /api/panel/solicitudes-compra/:id/paso` con `{ paso, version, motivo, cantidades }`.
 * Cada paso pide su propio permiso, así que la guardia es solo la sesión: quién puede lo
 * dice `porQueNoPuedeDar` (403 si no le toca, 409 si la solicitud no está para eso).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, pasoPedido);
    const resultado = await darPaso(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
