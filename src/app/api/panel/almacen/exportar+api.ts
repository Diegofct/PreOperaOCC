import { libroDelAlmacen, TIPO_XLSX } from '@/features/almacen-obra/servidor/excel';
import { requerirPermiso } from '@/features/servidor/guardia';
import { responder } from '@/features/servidor/respuestas';

/**
 * Descargar el almacén en Excel. `GET /api/panel/almacen/exportar?obraId=` (spec 009,
 * cambio del 2026-09-22, RF-45 a RF-50).
 *
 * Lo puede descargar quien puede consultar el almacén: la misma guardia que el
 * listado de materiales, y el mismo alcance (lo decide `libroDelAlmacen`: el
 * `obraId` solo cuenta para la gerencia). El archivo va como adjunto para que el
 * navegador lo guarde en vez de intentar mostrarlo.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraPedida = new URL(peticion.url).searchParams.get('obraId') || null;
    const { archivo, nombre } = await libroDelAlmacen(sesion, obraPedida);

    return new Response(archivo, {
      status: 200,
      headers: {
        'Content-Type': TIPO_XLSX,
        'Content-Disposition': `attachment; filename="${nombre}"`,
      },
    });
  });
}
