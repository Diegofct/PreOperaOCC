import { pagoPedido } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { registrarPagoDeSolicitud } from '@/features/tesoreria/servidor/pagos';

/**
 * Registrar un pago de una solicitud aprobada (spec 037, RF-13 a RF-15).
 * `POST /api/panel/solicitudes-pago/:id/pagos` con `{ version, fecha, valor, medio,
 * referencia, documentoId }`. Solo la gerencia (`porQueNoPuedeDarPaso`); nunca de más.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, pagoPedido);
    const resultado = await registrarPagoDeSolicitud(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
