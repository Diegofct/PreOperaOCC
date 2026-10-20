import { pedidoDeReporte } from '@/features/reportes/servidor/datos';
import { esPestanaDeReporte, reporteDe } from '@/features/reportes/servidor/reportes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Un reporte del módulo de Reportes (spec 030). `GET /api/panel/reportes/:pestana`
 * con `?obraId=&tipo=dia|semana|mes&fecha=YYYY-MM-DD`.
 *
 * Qué trae cada pestaña lo arma `reportes/servidor/reportes.ts`, que usa también la
 * descarga en Excel.
 */
export async function GET(peticion: Request, { pestana }: { pestana: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'listar');
    if (sesion instanceof Response) return sesion;
    if (!esPestanaDeReporte(pestana)) return noEncontrado('ese reporte');

    const pedido = pedidoDeReporte(sesion, new URL(peticion.url));
    if (pedido instanceof Response) return pedido;

    return ok(await reporteDe(pestana, pedido));
  });
}
