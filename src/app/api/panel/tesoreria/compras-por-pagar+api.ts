import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { comprasPorPagar } from '@/features/tesoreria/servidor/pagos';

/**
 * Compras por pagar (spec 037, RF-17): las compras vigentes de la 036 que no están pagadas
 * del todo. `GET /api/panel/tesoreria/compras-por-pagar`. La gerencia y la Auxiliar
 * Administrativa, que desde la spec 040 (RF-6) también paga.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'tesoreria', 'listar');
    if (sesion instanceof Response) return sesion;

    return ok(await comprasPorPagar());
  });
}
