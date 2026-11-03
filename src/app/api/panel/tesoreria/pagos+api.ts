import { requerirSesion } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { pagosDelRango } from '@/features/tesoreria/servidor/pagos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { veLosPagos } from '@/shared/rules/pagos';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * Los pagos del grupo entre dos fechas de pago (spec 037, RF-23), de solicitudes y de
 * compras. `GET /api/panel/tesoreria/pagos?desde=&hasta=`; sin fechas, la última semana. Solo
 * la gerencia (`veLosPagos`, D9).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    if (!veLosPagos(sesion.rol)) return errorDePeticion('Los pagos los ve la gerencia.', 403);

    const parametros = new URL(peticion.url).searchParams;
    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 422);

    return ok(await pagosDelRango(rango));
  });
}
