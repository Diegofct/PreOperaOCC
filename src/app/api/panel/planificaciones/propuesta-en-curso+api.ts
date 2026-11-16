import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { propuestaEnCurso } from '@/features/planificacion/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * La propuesta del calendario que corre en una obra (spec 045, RF-28).
 *
 * `GET /api/panel/planificaciones/propuesta-en-curso?obraId=` responde `{ lecturaId, desde }` o
 * `null`. Hasta la validación de la 045, la espera solo la veía el navegador que lanzó la propuesta,
 * porque la llevaba anotada; quien abría la pantalla desde otro se enteraba al chocar con el 409.
 * Lo pide quien escribe planificación, que es quien ve el botón de crear; una obra fuera del
 * alcance, 404.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    return ok(await propuestaEnCurso(obraId));
  });
}
