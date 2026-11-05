import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { bandejaDeTesoreria } from '@/features/tesoreria/servidor/pagos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { IDS_DE_ESTADOS_DE_PAGO, type EstadoDePago } from '@/shared/rules/pagos';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * Tesorería de Elemental (spec 037, RF-3, RF-4, RF-10, RF-22): las solicitudes de pago de
 * todo el grupo. `GET /api/panel/tesoreria?lugar=&estado=&urgentes=1&desde=&hasta=&texto=`,
 * todos opcionales. La gerencia y la Auxiliar Administrativa (spec 040, RF-6).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'tesoreria', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const estado = parametros.get('estado') || null;
    if (estado && !IDS_DE_ESTADOS_DE_PAGO.includes(estado as EstadoDePago)) {
      return errorDePeticion('Ese estado no existe.', 422);
    }
    let desde = parametros.get('desde') || null;
    let hasta = parametros.get('hasta') || null;
    if (desde || hasta) {
      const rango = rangoDeFechas(desde, hasta, fechaDeJornada());
      if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 422);
      ({ desde, hasta } = rango);
    }

    return ok(
      await bandejaDeTesoreria(sesion, {
        lugar: parametros.get('lugar') || null,
        estado: estado as EstadoDePago | null,
        soloUrgentes: parametros.get('urgentes') === '1',
        desde,
        hasta,
        texto: parametros.get('texto') ?? '',
      }),
    );
  });
}
