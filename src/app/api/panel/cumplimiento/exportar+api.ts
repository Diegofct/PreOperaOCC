import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { FORMATOS_DE_DESCARGA, pedidoDeInformeDeCumplimiento, type FormatoDeDescarga } from '@/features/panel/planificacion';
import { TIPO_PDF } from '@/features/asistente/servidor/archivos/pdf';
import { excelDelInforme, pdfDelInforme } from '@/features/planificacion/servidor/descargas';
import { TIPO_XLSX } from '@/features/reportes/servidor/excel';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, errorDeValidacion, responder } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';

function esFormato(valor: string): valor is FormatoDeDescarga {
  return (FORMATOS_DE_DESCARGA as readonly string[]).includes(valor);
}

/**
 * Descargar el informe de cumplimiento (spec 043, RF-92, RF-93, RF-96).
 *
 * `GET /api/panel/cumplimiento/exportar?obraId=&tipo=semana|mes&fecha=&formato=excel|pdf` entrega el
 * informe del periodo con las mismas cifras que la pantalla. Al Residente le sale sin columnas de
 * plata. Mismo permiso y mismo alcance que `GET /cumplimiento`.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cumplimiento', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const obraId = await obraDelContrato(sesion, parametros.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const pedido = pedidoDeInformeDeCumplimiento.safeParse({
      tipo: parametros.get('tipo') ?? 'semana',
      fecha: parametros.get('fecha') ?? fechaDeJornada(),
    });
    if (!pedido.success) return errorDeValidacion(pedido.error);
    const formato = parametros.get('formato') ?? 'excel';
    if (!esFormato(formato)) return errorDePeticion('El formato es excel o pdf.');

    const { archivo, nombre } =
      formato === 'pdf'
        ? await pdfDelInforme(sesion, obraId, pedido.data.tipo, pedido.data.fecha)
        : await excelDelInforme(sesion, obraId, pedido.data.tipo, pedido.data.fecha);
    return new Response(archivo, {
      headers: {
        'Content-Type': formato === 'pdf' ? TIPO_PDF : TIPO_XLSX,
        'Content-Disposition': `attachment; filename="${nombre}"`,
        // Lleva plata: ningún proxy compartido lo guarda.
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
