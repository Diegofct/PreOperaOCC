import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { reemplazarPoliza } from '@/features/contratos/servidor/polizas-y-documentos';
import { polizaNueva } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Reemplazar una póliza por otra, por ejemplo al renovarla. `POST
 * /api/panel/contrato/polizas/:id/reemplazar` con la póliza nueva (spec 031, RF-26):
 * la nueva queda activa y la vieja, `reemplazada`.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, polizaNueva);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await reemplazarPoliza(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
