import { detalleDePlanificacion, planificacionAlAlcance } from '@/features/planificacion/servidor/planificaciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Una versión de la planificación, en solo lectura (spec 043, RF-25 a RF-33, RF-40, RF-49, RF-86).
 *
 * `GET /api/panel/planificaciones/:id` responde la estructura, los hallazgos, el resumen, las
 * cifras descartadas y si se cruzó contra un presupuesto que ya no es el vigente. A propósito no
 * hay `PUT`: un borrador se corrige volviendo a subir el Excel (RF-51) y una aprobada no se edita
 * (RF-45). Una de otra obra, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'ver');
    if (sesion instanceof Response) return sesion;

    const fila = await planificacionAlAlcance(sesion, id);
    return fila ? ok(await detalleDePlanificacion(fila)) : noEncontrado('esa planificación');
  });
}
