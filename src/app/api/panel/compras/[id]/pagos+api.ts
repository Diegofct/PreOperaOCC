import { pagoPedido } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { registrarPagoDeCompra } from '@/features/tesoreria/servidor/pagos';

/**
 * Pagar una compra de la spec 036 (spec 037, RF-17, RF-18). `POST /api/panel/compras/:id/pagos`
 * con `{ fecha, valor, medio, referencia, documentoId }`, sin versión: lo ya pagado se revisa
 * en la misma sentencia. Solo la gerencia; nunca de más.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, pagoPedido);
    const resultado = await registrarPagoDeCompra(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
