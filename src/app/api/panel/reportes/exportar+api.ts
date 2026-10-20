import { pedidoDeReporte } from '@/features/reportes/servidor/datos';
import { libroDelReporte, TIPO_XLSX } from '@/features/reportes/servidor/excel';
import { esPestanaDeReporte } from '@/features/reportes/servidor/reportes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, responder } from '@/features/servidor/respuestas';

/**
 * Descargar un reporte en Excel (spec 030, RF-9).
 * `GET /api/panel/reportes/exportar?pestana=&obraId=&tipo=&fecha=`.
 *
 * La misma guardia y el mismo alcance que la consulta de la pestaña: el archivo dice
 * lo mismo que la pantalla. Va como adjunto para que el navegador lo guarde.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'listar');
    if (sesion instanceof Response) return sesion;

    const url = new URL(peticion.url);
    const pestana = url.searchParams.get('pestana') ?? '';
    if (!esPestanaDeReporte(pestana)) return errorDePeticion('Diga qué reporte descarga.');
    const pedido = pedidoDeReporte(sesion, url);
    if (pedido instanceof Response) return pedido;

    const { archivo, nombre } = await libroDelReporte(pestana, pedido);
    return new Response(archivo, {
      status: 200,
      headers: { 'Content-Type': TIPO_XLSX, 'Content-Disposition': `attachment; filename="${nombre}"` },
    });
  });
}
