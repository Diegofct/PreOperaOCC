import { aprobarContrato, obraDelContrato } from '@/features/contratos/servidor/contrato';
import { aprobacionDeContrato } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Aprobar el contrato. `POST /api/panel/contrato/aprobar` con `{ obraId, version }`.
 * Solo la gerencia (spec 031, RF-3): el residente recibe 403 de la guardia. Con lo que
 * falta, 400 con la lista entera (RF-11, RF-17).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, aprobacionDeContrato);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await aprobarContrato(sesion, obraId, pedido.version);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
