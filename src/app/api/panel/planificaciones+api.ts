import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { listarPlanificaciones } from '@/features/planificacion/servidor/planificaciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Las versiones de la planificación de una obra (spec 043, RF-44, RF-49).
 *
 * `GET /api/panel/planificaciones?obraId=` responde v1, v2… con su estado y desde cuándo rigen.
 * Lo ven la Gerencia, el Director de Proyectos y el Director de Obra en sus obras; una obra fuera
 * del alcance, 404.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    return ok(await listarPlanificaciones(obraId));
  });
}
