import { decisionPedida } from '@/features/panel/requisiciones';
import { decidirRequisicion } from '@/features/requisiciones/servidor/requisiciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Decidir una requisición en su paso (spec 046, RF-25 a RF-34, RF-67, RF-68, RF-76 a RF-81).
 *
 * `POST /api/panel/requisiciones/:tipo/:id/decision`, con `tipo` `compra` o `pago` (cada clase
 * vive en su tabla). Cuerpo: `{ decision, version, motivo?, cantidades?, valorAprobado? }`. La
 * guardia pide ver requisiciones; quién decide en ese paso lo dice la regla con los ocupantes del
 * lugar (403 si no le toca o la pidió él; 409 si cambió o ya no espera; 422 si falta el motivo o
 * el recorte no vale). Una que no alcanza, 404 (RF-69).
 */
export async function POST(peticion: Request, { tipo, id }: { tipo: string; id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'ver');
    if (sesion instanceof Response) return sesion;
    if (tipo !== 'compra' && tipo !== 'pago') return errorDePeticion('La requisición es de compra o de pago.', 400);

    const pedido = await cuerpoJson(peticion, decisionPedida);
    const resultado = await decidirRequisicion(sesion, tipo, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
