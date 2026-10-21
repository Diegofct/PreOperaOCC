import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { crearDocumento } from '@/features/contratos/servidor/polizas-y-documentos';
import { documentoNuevo } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Registrar un documento del contrato. `POST /api/panel/contrato/documentos` con el
 * archivo ya subido a `contrato/archivos` (spec 031, RF-27).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, documentoNuevo);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await crearDocumento(sesion, obraId, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
