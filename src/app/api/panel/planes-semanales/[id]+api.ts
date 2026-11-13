import { guardadoDePlanSemanal } from '@/features/panel/plan-semanal';
import { detalleDelPlan, guardarPlan, planAlAlcance } from '@/features/plan-semanal/servidor/planes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Un plan semanal (spec 044, RF-22, RF-23, RF-29, RF-30, RF-64, RF-79, RF-86, RF-87, RF-102).
 *
 * `GET /api/panel/planes-semanales/:id` responde el plan con sus valores y avisos, o sin plata para el
 * Residente. `PUT` con `{ version, estructura }` guarda el borrador: 400 si una actividad no cuadra,
 * diciendo cuál; 409 si cambió desde que se abrió o ya no es borrador. Uno de otra obra, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'ver');
    if (sesion instanceof Response) return sesion;

    const plan = await planAlAlcance(sesion, id);
    return plan ? ok(await detalleDelPlan(sesion, plan)) : noEncontrado('ese plan semanal');
  });
}

export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'escribir');
    if (sesion instanceof Response) return sesion;

    const plan = await planAlAlcance(sesion, id);
    if (!plan) return noEncontrado('ese plan semanal');

    const pedido = await cuerpoJson(peticion, guardadoDePlanSemanal);
    const guardado = await guardarPlan(sesion, plan, pedido);
    return guardado instanceof Response ? guardado : ok(guardado);
  });
}
