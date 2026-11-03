import { pasoDePagoPedido } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { darPasoDePago } from '@/features/tesoreria/servidor/solicitudes-pago';

/**
 * Cancelar, aprobar, rechazar o devolver una solicitud de pago (spec 037, RF-9, RF-11,
 * RF-12). `POST /api/panel/solicitudes-pago/:id/paso` con `{ paso, version, motivo,
 * valorAprobado }`. Cada paso pide su permiso en `porQueNoPuedeDarPaso`.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, pasoDePagoPedido);
    const resultado = await darPasoDePago(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
