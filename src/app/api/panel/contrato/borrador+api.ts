import { contratoABorrador as devolverABorrador, obraDelContrato } from '@/features/contratos/servidor/contrato';
import { contratoABorrador } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Volver a borrador un contrato aprobado. `POST /api/panel/contrato/borrador` con
 * `{ obraId, version, motivo }`. Solo la gerencia (spec 031, RF-3), y el motivo queda
 * en el historial (RF-19).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, contratoABorrador);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await devolverABorrador(sesion, obraId, pedido.version, pedido.motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
