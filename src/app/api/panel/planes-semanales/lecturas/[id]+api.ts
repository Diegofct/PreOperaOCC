import { estadoDeLecturaDePlan } from '@/features/plan-semanal/servidor/estado-de-lectura';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * En qué va una propuesta o una lectura de plan semanal (spec 044, RF-49, RF-101).
 *
 * `GET /api/panel/planes-semanales/lecturas/:id` responde `en_curso`, `lista` con el id del borrador
 * o `fallida` con el motivo. La pantalla la consulta cada pocos segundos; consultar no escribe nada.
 * Una de otra obra, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await estadoDeLecturaDePlan(sesion, id);
    return estado ? ok(estado) : noEncontrado('esa propuesta o lectura');
  });
}
