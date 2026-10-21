import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { crearPoliza } from '@/features/contratos/servidor/polizas-y-documentos';
import { polizaNueva } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Registrar una póliza del contrato. `POST /api/panel/contrato/polizas` (spec 031, RF-23). */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, polizaNueva);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await crearPoliza(sesion, obraId, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
