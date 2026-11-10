import { anulacionDePlanificacion } from '@/features/panel/planificacion';
import { anularPlanificacion } from '@/features/planificacion/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular la planificación vigente (spec 043, RF-47, RF-48, RF-55, RF-118, RF-138).
 *
 * `POST /api/panel/planificaciones/:id/anular` con `{ motivo }`. Solo la Gerencia y el Director de
 * Proyectos (RF-48). Rige hasta ayer y los días desde hoy quedan sin meta. 400 sin motivo; 409 si
 * no es la vigente; 404 si no está al alcance.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacionDePlanificacion);
    const resultado = await anularPlanificacion(sesion, id, motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
