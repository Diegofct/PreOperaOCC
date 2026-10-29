import { recibir } from '@/features/compras/servidor/compras';
import { reciboPedido } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Lo que llegó de una solicitud comprada (spec 036, RF-20 a RF-22).
 * `POST /api/panel/solicitudes-compra/:id/recibir` con `{ version, fecha, nota, documentoId,
 * recibos }`. Recibe quien ve Solicitudes de compra de ese lugar (`porQueNoPuedeDar`). No
 * toca el Almacén.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, reciboPedido);
    const resultado = await recibir(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
