import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { propuestaDeHojas } from '@/features/planificacion/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Proponer las hojas de un Excel de planificación (spec 043, RF-1 a RF-5, RF-100).
 *
 * `POST /api/panel/planificaciones/hojas?obraId=` con los bytes del .xlsx en el cuerpo responde
 * qué hojas propone la IA y para qué, las hojas visibles y el borrador que se sustituiría. No
 * escribe nada: la lectura empieza cuando la persona confirma las hojas, en `leer`.
 *
 * 409 si la obra no tiene presupuesto vigente, 413 si pasa de 20 MB, 422 si el contenido no es
 * `.xlsx` y 503 si la IA falla. Solo suben la Gerencia y el Director de Proyectos (RF-1).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const propuesta = await propuestaDeHojas(obraId, new Uint8Array(await peticion.arrayBuffer()));
    return propuesta instanceof Response ? propuesta : ok(propuesta);
  });
}
