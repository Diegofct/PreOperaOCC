import { registrarCompra } from '@/features/compras/servidor/compras';
import { compraPedida } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Registrar una compra de una solicitud aprobada (spec 036, RF-16, RF-18, RF-19).
 * `POST /api/panel/solicitudes-compra/:id/compras` con `{ version, proveedor, valor, fecha,
 * factura, renglonIds }`. Quién puede lo dice `porQueNoPuedeDar` (la gerencia).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, compraPedida);
    const resultado = await registrarCompra(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
