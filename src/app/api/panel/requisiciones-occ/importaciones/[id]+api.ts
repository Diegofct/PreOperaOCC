import { detalleDeImportacionOcc } from '@/features/requisiciones/servidor/importar-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * En qué va una importación de planilla de OCC y, si está lista, las líneas que propone la IA (spec 047,
 * RF-61). Solo quien la subió. Liviana: la pantalla la consulta seguido mientras se lee.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const detalle = await detalleDeImportacionOcc(sesion, id);
    return detalle instanceof Response ? detalle : ok(detalle);
  });
}
