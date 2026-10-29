import { consolidadoDelGrupo } from '@/features/empresas/servidor/cortes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * El Consolidado del grupo (spec 033, RF-41 a RF-43): una fila por Elemental, OCC,
 * Geolab y cada obra con su último corte, y el total. `GET /api/panel/cortes/consolidado`.
 * Solo gerencia (RF-44).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'finanzas', 'listar');
    if (sesion instanceof Response) return sesion;

    return ok(await consolidadoDelGrupo());
  });
}
