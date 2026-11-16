import { copiaDePlanificacion } from '@/features/panel/planificacion';
import { copiarVigente } from '@/features/planificacion/servidor/borradores';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, errorDeValidacion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Una versión nueva de la planificación copiando la vigente (spec 045, RF-138 a RF-144).
 *
 * `POST /api/panel/planificaciones/:id/copiar` con `{ sustituir? }`. Responde 201 con el detalle del
 * borrador nuevo, con `origen = 'copia'` y la versión de la que salió. 404 si no existe o es de otra
 * obra; 409 si no es la vigente, si hay una lectura o una propuesta en curso, o si ya hay borrador y
 * no vino `sustituir` (con el borrador, para pedir confirmación). Lo hace quien escribe
 * planificación: la Dirección de Proyectos y la Gerencia.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    let cuerpo: unknown = {};
    const texto = await peticion.text();
    if (texto.trim() !== '') {
      try {
        cuerpo = JSON.parse(texto);
      } catch {
        return errorDePeticion('El pedido no vino bien escrito.');
      }
    }
    const pedido = copiaDePlanificacion.safeParse(cuerpo);
    if (!pedido.success) return errorDeValidacion(pedido.error);

    const creada = await copiarVigente(sesion, id, pedido.data);
    return creada instanceof Response ? creada : ok(creada, 201);
  });
}
