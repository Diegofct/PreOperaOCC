import { listarConversaciones } from '@/features/asistente/servidor/conversaciones';
import { cupoDelDia } from '@/features/asistente/servidor/uso';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { alcanceDelAsistente } from '@/shared/rules/asistente';

/**
 * Las conversaciones de quien pregunta (spec 028, RF-39, RF-46, RF-47), con su cupo de
 * hoy (RF-51). `GET /api/panel/asistente/conversaciones[?archivadas=1]`. Solo las suyas:
 * ni la gerencia ve las de otros (RF-40).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'listar');
    if (sesion instanceof Response) return sesion;
    const archivadas = new URL(peticion.url).searchParams.get('archivadas') === '1';
    const [conversaciones, cupo] = await Promise.all([
      listarConversaciones(sesion.id, alcanceDelAsistente(sesion), archivadas),
      cupoDelDia(sesion.id),
    ]);
    return ok({ conversaciones, cupo });
  });
}
