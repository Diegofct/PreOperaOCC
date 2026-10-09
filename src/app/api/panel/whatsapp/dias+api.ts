import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { leerDias } from '@/features/whatsapp/servidor/estado-dias';

/**
 * El estado de los días. `GET /api/panel/whatsapp/dias?obraId=&desde=&hasta=` (spec
 * 024, RF-55 a RF-57).
 *
 * De cada día con mensajes: los reportes esperados que llegaron o faltan, de quién y
 * a qué hora, y si la bitácora espera, está armada, incompleta o cerrada. Sin rango,
 * la última semana. `obraId` lo usa la gerencia; el residente ve la suya, y otra obra
 * responde 404.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const dias = await leerDias(sesion, {
      obraId: parametros.get('obraId'),
      desde: parametros.get('desde'),
      hasta: parametros.get('hasta'),
    });
    return dias instanceof Response ? dias : ok({ dias });
  });
}
