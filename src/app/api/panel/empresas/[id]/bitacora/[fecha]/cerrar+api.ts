import { cerrarDia } from '@/features/empresas/servidor/bitacora-occ';
import { cierreDeBitacoraDeEmpresa } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Cerrar un día de la Bitácora de una empresa (spec 038, RF-18, RF-19). `POST` con `{ version }`. */
export async function POST(peticion: Request, { id, fecha }: { id: string; fecha: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const dia = await cerrarDia(sesion, id, fecha, await cuerpoJson(peticion, cierreDeBitacoraDeEmpresa));
    return dia instanceof Response ? dia : ok(dia);
  });
}
