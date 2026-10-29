import { lugarDelPedido, personalDelLugar } from '@/features/rrhh/servidor/personal';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * El personal de una empresa o de una obra (spec 035, RF-1 a RF-7, RF-27 a RF-33).
 * `GET /api/panel/rrhh/personal?empresa=occ` o `?obraId=`. Responde las personas con sus
 * avisos y el resumen; el salario, solo a quien lo ve (RF-13).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'rrhh', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const lugar = await lugarDelPedido(sesion, { empresa: parametros.get('empresa'), obraId: parametros.get('obraId') });
    if (lugar instanceof Response) return lugar;

    return ok(await personalDelLugar(sesion, lugar));
  });
}
