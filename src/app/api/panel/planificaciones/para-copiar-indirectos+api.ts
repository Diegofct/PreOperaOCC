import { fuentesDeIndirectos } from '@/features/planificacion/servidor/borradores';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * De dónde se pueden copiar los indirectos al crear un borrador desde el presupuesto (spec 045,
 * RF-112, RF-113).
 *
 * `GET /api/panel/planificaciones/para-copiar-indirectos` responde las planificaciones vigentes y
 * reemplazadas, de esta obra o de otra al alcance, que tienen sus indirectos desglosados por
 * renglón; las de la 043, que solo tienen «Indirectos sin desglose», no salen. Lo pide quien escribe
 * planificación, que es quien crea el borrador.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;
    return ok(await fuentesDeIndirectos(sesion));
  });
}
