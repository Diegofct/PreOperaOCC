import { anularPoliza } from '@/features/contratos/servidor/polizas-y-documentos';
import { anulacionEnContrato } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Anular una póliza, con motivo. `POST /api/panel/contrato/polizas/:id/anular` (spec 031, RF-26). */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacionEnContrato);
    const resultado = await anularPoliza(sesion, id, motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
