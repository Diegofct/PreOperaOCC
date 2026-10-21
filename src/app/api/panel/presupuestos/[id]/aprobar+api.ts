import { aprobacionDePresupuesto } from '@/features/panel/contratos';
import { aprobarPresupuesto } from '@/features/presupuestos/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Aprobar un borrador. `POST /api/panel/presupuestos/:id/aprobar` con `{ version,
 * confirmar }` (spec 031, RF-49 a RF-54). Solo la gerencia (RF-3). Pasa a vigente y el
 * que lo era, a reemplazado. 400 con las faltas; 409 con `desaparecen` si quita ítems que
 * ya tienen cantidades en la bitácora y no se confirmó.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, aprobacionDePresupuesto);
    const resultado = await aprobarPresupuesto(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
