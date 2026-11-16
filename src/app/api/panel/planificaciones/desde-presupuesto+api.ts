import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { pedidoDesdePresupuesto } from '@/features/panel/planificacion';
import { iniciarPropuesta, lanzarPropuesta } from '@/features/planificacion/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, errorDeValidacion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Crear un borrador de planificación desde el presupuesto vigente, con el calendario que propone la
 * IA (spec 045, RF-8 a RF-31, RF-112, RF-113, RF-142, RF-143).
 *
 * `POST /api/panel/planificaciones/desde-presupuesto?obraId=` con `{ plazo: { meses, arranque },
 * grupoId?, copiarIndirectosDe?, sustituir? }`. Responde 202 con `{ lecturaId }`: la IA sigue por
 * detrás, porque el proxy corta a los 120 s, y el estado se consulta en `lecturas/:id`, el mismo de
 * la lectura de un Excel. El borrador nace cuando la IA termina o falla, no antes (RF-30).
 *
 * Lo crea quien escribe planificación: la Dirección de Proyectos y la Gerencia (RF-8). 400 si el
 * pedido no tiene forma; 409 si ya hay una lectura o una propuesta en curso en la obra, o si hay
 * borrador y no vino `sustituir`; 422 si la obra no tiene presupuesto vigente, si falta el grupo o
 * si la planificación de la cual copiar los indirectos no sirve.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    let cuerpo: unknown;
    try {
      cuerpo = await peticion.json();
    } catch {
      return errorDePeticion('El pedido no vino bien escrito.');
    }
    const pedido = pedidoDesdePresupuesto.safeParse(cuerpo);
    if (!pedido.success) return errorDeValidacion(pedido.error);

    const abierta = await iniciarPropuesta(sesion, obraId, pedido.data);
    if (abierta instanceof Response) return abierta;
    lanzarPropuesta(sesion, obraId, abierta);
    return ok({ lecturaId: abierta.lecturaId }, 202);
  });
}
