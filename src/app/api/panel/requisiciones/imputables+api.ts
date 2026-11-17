import type { OpcionesParaImputar } from '@/features/panel/requisiciones';
import { planificacionDeLaObra } from '@/features/requisiciones/servidor/planificacion';
import { lugarDeRequisiciones } from '@/features/requisiciones/servidor/requisiciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { veLosValores } from '@/shared/rules/compras';
import { comprometidoPorOpcion } from '@/shared/rules/requisicion-planificacion';

/**
 * Las opciones para imputar los renglones de una requisición de obra (spec 048, RF-6, RF-7, RF-9,
 * RF-35, RF-46).
 *
 * `GET /api/panel/requisiciones/imputables?obraId=`: los ítems, rubros, renglones indirectos y la
 * mano de obra indirecta de la planificación vigente, con lo planeado y lo ya comprometido para que
 * el formulario muestre lo que queda mientras se escribe. Las cifras no existen para quien no ve
 * valores (el Almacenista, RF-9): ni en `null`. Sin planificación vigente, `hayPlanificacion` es
 * falso y la lista va vacía (RF-8). Pide quien lista requisiciones de esa obra; una obra a la que
 * no se entra, 403 o 404, como la lista.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraId = new URL(peticion.url).searchParams.get('obraId');
    if (!obraId) return errorDePeticion('Diga de qué obra son las opciones: solo las requisiciones de obra se imputan.');
    const lugar = await lugarDeRequisiciones(sesion, { empresa: null, obraId });
    if (lugar instanceof Response) return lugar;

    const { planificaciones, opciones, aportes } = await planificacionDeLaObra(obraId);
    const conValores = veLosValores(sesion.rol);
    const { porLlave } = comprometidoPorOpcion(aportes, opciones);
    const respuesta: OpcionesParaImputar = {
      hayPlanificacion: planificaciones.length > 0,
      opciones: opciones.map(({ planeado, ...opcion }) =>
        conValores ? { ...opcion, planeado, comprometido: porLlave[opcion.llave] ?? 0 } : opcion,
      ),
    };
    return ok(respuesta);
  });
}
