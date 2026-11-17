import { lineasOccPorPagar } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Lo autorizado por pagar de las requisiciones de pagos de OCC, para Tesorería (spec 047, RF-43):
 * cada línea autorizada con algo por pagar, por viernes de entrega. Quien ve Tesorería.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'tesoreria', 'ver');
    if (sesion instanceof Response) return sesion;
    return ok(await lineasOccPorPagar(sesion));
  });
}
