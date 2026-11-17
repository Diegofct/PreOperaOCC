import { bandejaDeRequisiciones } from '@/features/requisiciones/servidor/requisiciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * La bandeja de Elemental (spec 046, RF-47, RF-48, RF-55, RF-75, RF-83).
 *
 * `GET /api/panel/requisiciones/bandeja` responde lo que espera el paso de la Administradora —RQ
 * de compra y de pago— y las SC y SP anteriores y de OCC que siguen enviadas, con el resumen y el
 * aviso de que no hay Administradora activa. Solo la Gerencia y la Administradora (`aprobaciones`).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'aprobaciones', 'listar');
    if (sesion instanceof Response) return sesion;
    return ok(await bandejaDeRequisiciones(sesion));
  });
}
