import { detalleDeRequisicionOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Una requisición de pagos de OCC con sus líneas vigentes, totales, pagos, historia y lo que puede
 * hacer quien la mira (spec 047, RF-39 a RF-42, RF-58, RF-68). A quien no la ve, 404 (RF-73).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const detalle = await detalleDeRequisicionOcc(sesion, id);
    return detalle instanceof Response ? detalle : ok(detalle);
  });
}
