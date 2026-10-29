import { gastoPorLugar } from '@/features/compras/servidor/solicitudes';
import { requerirSesion } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { veElGasto } from '@/shared/rules/compras';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * Lo comprado por lugar entre dos fechas de compra (spec 036, RF-27), sin las anuladas.
 * `GET /api/panel/compras/gasto?desde=&hasta=`; sin fechas, la última semana. Solo la
 * gerencia (`veElGasto`): la auxiliar de RR. HH. consulta Compras, pero no el gasto.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    if (!veElGasto(sesion.rol)) return errorDePeticion('El gasto de compras lo ve la gerencia.', 403);

    const parametros = new URL(peticion.url).searchParams;
    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 422);

    return ok(await gastoPorLugar(rango));
  });
}
