import { anularCorte, lugarDelCorte } from '@/features/empresas/servidor/cortes';
import { corteAnulado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { porQueNoPuedeTocarElCorte } from '@/shared/rules/cortes';

/**
 * Anular un corte con su motivo (spec 033, RF-39, RF-40). `POST /api/panel/cortes/:id/anular`.
 *
 * Un corte no se edita: se anula y se registra otro. Queda en el historial, marcado. Si
 * no existe o ya estaba anulado, 404: el primer motivo no se reescribe. 403 si es la
 * Auxiliar Administrativa y el corte no es de Elemental (spec 040, RF-7, D3).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'finanzas', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, corteAnulado);
    const lugar = await lugarDelCorte(id);
    if (!lugar) return noEncontrado('un corte vigente con ese id');
    const fueraDeSuLugar = porQueNoPuedeTocarElCorte(sesion.rol, lugar);
    if (fueraDeSuLugar) return errorDePeticion(fueraDeSuLugar, 403);
    const anulado = await anularCorte(id, motivo, sesion.id);
    return anulado ? ok({ id }) : noEncontrado('un corte vigente con ese id');
  });
}
