import { requisicionOccPedida } from '@/features/panel/requisiciones-occ';
import { crearRequisicionOcc, listarRequisicionesOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { veRequisicionesOcc } from '@/shared/rules/requisicion-occ';

/**
 * Las requisiciones de pagos de OCC (spec 047, RF-1 a RF-9, RF-73, RF-82).
 *
 * `GET` las lista, abiertas primero. `POST { viernes }` crea la de ese viernes en Borrador y responde
 * su número RQ; si ya hay una abierta para ese viernes, 409 con ella (RF-8). Ven quienes ven
 * Requisiciones en OCC y quienes pagan (`veRequisicionesOcc`); crean el Encargado de OCC y la Gerencia.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    if (!veRequisicionesOcc(sesion.rol)) return errorDePeticion('No tiene acceso a las requisiciones de OCC.', 403);
    return ok(await listarRequisicionesOcc(sesion));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const { viernes } = await cuerpoJson(peticion, requisicionOccPedida);
    const resultado = await crearRequisicionOcc(sesion, viernes);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
