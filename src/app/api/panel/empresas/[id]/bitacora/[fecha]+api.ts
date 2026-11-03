import { corregirDia, verDia } from '@/features/empresas/servidor/bitacora-occ';
import { correccionDeBitacoraDeEmpresa } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Un día de la Bitácora de una empresa (spec 038, RF-18, RF-23, RF-24).
 *
 * `GET …/:fecha?equipo=&estado=`: el día vigente con sus secciones, filtradas por equipo
 * y por estado (operativo o inoperativo).
 *
 * `PATCH …/:fecha` con `{ version, estadoEquipos?, trabajos?, actividades?, pendientes? }`:
 * corregir. 409 si cambió en medio; 422 si está cerrada.
 */
export async function GET(peticion: Request, { id, fecha }: { id: string; fecha: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const parametros = new URL(peticion.url).searchParams;
    const dia = await verDia(sesion, id, fecha, { equipo: parametros.get('equipo'), estado: parametros.get('estado') });
    return dia instanceof Response ? dia : ok(dia);
  });
}

export async function PATCH(peticion: Request, { id, fecha }: { id: string; fecha: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const dia = await corregirDia(sesion, id, fecha, await cuerpoJson(peticion, correccionDeBitacoraDeEmpresa));
    return dia instanceof Response ? dia : ok(dia);
  });
}
