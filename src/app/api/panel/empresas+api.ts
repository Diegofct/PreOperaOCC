import { listarEmpresas } from '@/features/empresas/servidor/empresas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Las cuatro empresas del grupo para las tarjetas del Inicio (spec 033, RF-1 a RF-4).
 * `GET /api/panel/empresas`.
 *
 * Solo gerencia: es la única que ve las tarjetas, y la tarjeta lleva el saldo, que es
 * información financiera (RF-44).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'empresa', 'listar');
    if (sesion instanceof Response) return sesion;

    return ok(await listarEmpresas());
  });
}
