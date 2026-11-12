import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { creacionDePlanSemanal } from '@/features/panel/plan-semanal';
import { crearPlanVacio, listarPlanesSemanales } from '@/features/plan-semanal/servidor/planes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los planes semanales de una obra (spec 044, RF-1 a RF-5, RF-55, RF-78).
 *
 * `GET /api/panel/planes-semanales?obraId=` responde las semanas que se pueden planear hoy y los
 * planes de la obra con su estado, autor y aprobador. `POST` con `{ obraId, semana }` empieza un
 * borrador en blanco: 201; 400 si la semana no se puede planear; 409 si ya hay borrador de esa semana
 * o la obra no tiene planificación vigente. Una obra fuera del alcance, 404.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    return ok(await listarPlanesSemanales(obraId));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, creacionDePlanSemanal);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const creado = await crearPlanVacio(sesion, obraId, pedido.semana);
    return creado instanceof Response ? creado : ok(creado, 201);
  });
}
