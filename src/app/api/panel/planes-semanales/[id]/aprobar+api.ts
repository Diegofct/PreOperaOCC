import { aprobacionDePlanSemanal } from '@/features/panel/plan-semanal';
import { aprobarPlan } from '@/features/plan-semanal/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Aprobar el borrador de un plan semanal (spec 044, RF-56 a RF-63, RF-99, RF-100, RF-106).
 *
 * `POST /api/panel/planes-semanales/:id/aprobar` con `{ version, confirmarAvisos }`. Rige desde hoy,
 * o desde el lunes si la semana no ha empezado. 403 al Residente y a quien no le toca según quién
 * creó el plan; 409 con `avisos` si los hay y no se confirmaron, si el borrador cambió, si la semana
 * ya terminó o si esa semana ya tiene un plan vigente; 404 si no está al alcance.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, aprobacionDePlanSemanal);
    const resultado = await aprobarPlan(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
