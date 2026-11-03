import { listarDias } from '@/features/empresas/servidor/bitacora-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Los días de la Bitácora de una empresa (spec 038, RF-23). `GET
 * /api/panel/empresas/:id/bitacora?desde=&hasta=`: vigentes y anulados, con su estado y
 * cuántos equipos quedaron operativos e inoperativos. El permiso lo decide
 * `empresaAlAlcance` (RF-29).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const parametros = new URL(peticion.url).searchParams;
    const dias = await listarDias(sesion, id, { desde: parametros.get('desde'), hasta: parametros.get('hasta') });
    return dias instanceof Response ? dias : ok({ dias });
  });
}
