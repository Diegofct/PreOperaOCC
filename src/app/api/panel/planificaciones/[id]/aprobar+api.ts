import { aprobacionDePlanificacion } from '@/features/panel/planificacion';
import { aprobarPlanificacion } from '@/features/planificacion/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Aprobar un borrador de planificación (spec 043, RF-34 a RF-39, RF-46, RF-99, RF-120 a RF-122).
 *
 * `POST /api/panel/planificaciones/:id/aprobar` con `{ version, confirmarHallazgos,
 * mesesCumplidos? }`. Solo la Gerencia y el Director de Proyectos (RF-36). Pasa a vigente desde
 * hoy y la que lo era, a reemplazada hasta ayer. 409 con `hallazgos` si hay y no se confirmaron,
 * con `mesesPorMarcar` si es la primera y no se respondieron, o si el borrador cambió; 404 si no
 * está al alcance.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, aprobacionDePlanificacion);
    const resultado = await aprobarPlanificacion(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
