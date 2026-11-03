import { pagoAnulado } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { anularPago } from '@/features/tesoreria/servidor/pagos';

/**
 * Anular un pago (spec 037, RF-16). `POST /api/panel/pagos/:id/anular` con `{ version,
 * motivo }`. Solo la gerencia; el pago se queda, marcado.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, pagoAnulado);
    const resultado = await anularPago(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
