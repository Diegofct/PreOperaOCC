import { anulacionDePlanSemanal } from '@/features/panel/plan-semanal';
import { anularPlan } from '@/features/plan-semanal/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular el plan semanal vigente (spec 044, RF-65 a RF-67).
 *
 * `POST /api/panel/planes-semanales/:id/anular` con `{ motivo }`. Lo anula quien puede aprobarlo.
 * Deja de regir hoy: los días anteriores se siguen midiendo con él. 400 sin motivo; 403 a quien no
 * le toca; 409 si no está vigente; 404 si no está al alcance.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacionDePlanSemanal);
    const resultado = await anularPlan(sesion, id, motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
