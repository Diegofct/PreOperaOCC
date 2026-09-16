import { canteraDeUnParte } from '@/features/cantera/servidor/parte';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * La sección «Control Cantera» de un parte. `GET /api/panel/partes/:id/cantera`
 * (spec 010, RF-26, RF-27, RF-29, RF-31 y RF-37).
 *
 * Con el permiso de la **bitácora** y no el de cantera: es una sección del parte y
 * la lee quien lee el parte (el residente y la gerencia). Es de solo lectura: no hay
 * ruta para escribir viajes desde el parte (RF-27).
 *
 * Aparte del resto del parte, como las fotos: pide una consulta más, y solo la
 * necesita quien abre esa sección.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const seccion = await canteraDeUnParte(sesion, id);
    return seccion ? ok(seccion) : noEncontrado('ese parte');
  });
}
