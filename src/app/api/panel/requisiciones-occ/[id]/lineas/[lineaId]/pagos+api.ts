import { pagoDeLineaOccPedido } from '@/features/panel/requisiciones-occ';
import { registrarPagoDeLineaOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Registra un pago de una línea autorizada (spec 047, RF-44, RF-45, RF-80) con las reglas del pago de
 * la 037 y la versión de la requisición; el comprobante, si lo hay, se sube antes por `…/comprobante`.
 * La Auxiliar Administrativa, la Administradora o la Gerencia; nunca más de lo que le falta a la línea.
 * Se anula por `POST /api/panel/pagos/[id]/anular`.
 */
export async function POST(peticion: Request, { id, lineaId }: { id: string; lineaId: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, pagoDeLineaOccPedido);
    const resultado = await registrarPagoDeLineaOcc(sesion, id, lineaId, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
