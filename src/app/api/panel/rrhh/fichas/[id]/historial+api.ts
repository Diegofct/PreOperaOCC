import { historialDeLaFicha, personaAlAlcance } from '@/features/rrhh/servidor/fichas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Quién cambió la ficha, cuándo y qué campos (spec 035, RF-15). `GET
 * /api/panel/rrhh/fichas/:id/historial`. Lo ven quienes llevan las fichas —gerencia y la
 * auxiliar, los que tienen `escribir` en RR. HH.—; el resto, 403.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'rrhh', 'escribir');
    if (sesion instanceof Response) return sesion;

    if (!(await personaAlAlcance(sesion, id))) return noEncontrado('esa persona');
    return ok(await historialDeLaFicha(id));
  });
}
