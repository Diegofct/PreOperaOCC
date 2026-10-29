import { anularCorte } from '@/features/empresas/servidor/cortes';
import { corteAnulado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular un corte con su motivo (spec 033, RF-39, RF-40). `POST /api/panel/cortes/:id/anular`.
 *
 * Un corte no se edita: se anula y se registra otro. Queda en el historial, marcado. Si
 * no existe o ya estaba anulado, 404: el primer motivo no se reescribe.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'finanzas', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, corteAnulado);
    const anulado = await anularCorte(id, motivo, sesion.id);
    return anulado ? ok({ id }) : noEncontrado('un corte vigente con ese id');
  });
}
