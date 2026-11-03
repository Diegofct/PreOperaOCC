import { anularDia } from '@/features/empresas/servidor/bitacora-occ';
import { anulacionDeBitacoraDeEmpresa } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular un día de la Bitácora de una empresa con motivo (spec 038, RF-20). `POST` con
 * `{ version, motivo }`. No se borra: queda con quién, cuándo y por qué.
 */
export async function POST(peticion: Request, { id, fecha }: { id: string; fecha: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const anulada = await anularDia(sesion, id, fecha, await cuerpoJson(peticion, anulacionDeBitacoraDeEmpresa));
    return anulada instanceof Response ? anulada : ok(anulada);
  });
}
