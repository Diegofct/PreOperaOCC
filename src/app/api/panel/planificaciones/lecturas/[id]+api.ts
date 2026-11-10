import { estadoDeLectura } from '@/features/planificacion/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * En qué va una lectura de planificación (spec 043, RF-9, RF-107).
 *
 * `GET /api/panel/planificaciones/lecturas/:id` responde `en_curso`, `lista` con el id del
 * borrador, `falta_grupo` con los frentes y sus candidatos, o `fallida` con el motivo. La pantalla
 * la consulta cada pocos segundos; consultar no escribe nada. Una lectura de otra obra, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await estadoDeLectura(sesion, id);
    return estado ? ok(estado) : noEncontrado('esa lectura');
  });
}
