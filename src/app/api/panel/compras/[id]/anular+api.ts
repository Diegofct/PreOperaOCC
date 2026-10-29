import { anularCompra } from '@/features/compras/servidor/compras';
import { compraAnulada } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular una compra (spec 036, RF-30). `POST /api/panel/compras/:id/anular` con
 * `{ version, motivo }`, la versión de su solicitud. Solo la gerencia; la compra se queda,
 * marcada, y sus renglones quedan libres.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, compraAnulada);
    const resultado = await anularCompra(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
