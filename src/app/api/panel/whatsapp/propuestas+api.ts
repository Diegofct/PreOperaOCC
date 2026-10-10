import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { leerBandeja } from '@/features/whatsapp/servidor/bandeja';
import { ESTADOS_MENSAJE_WHATSAPP, type EstadoMensajeWhatsapp } from '@/shared/rules/whatsapp';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * La bandeja. `GET /api/panel/whatsapp/propuestas?estado=&obraId=&desde=&hasta=` (spec
 * 021, RF-14 a RF-24; spec 025, RF-45 a RF-53: sin fechas, la última semana).
 *
 * Sin `estado`, los pendientes: es lo que la bandeja muestra al abrir. Con él, los
 * ignorados, los aprobados o los descartados (RF-24). `obraId` solo lo usa la
 * gerencia; al residente se le ignora y ve la suya (RF-14).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const estado = parametros.get('estado') ?? 'pendiente';
    if (!ESTADOS_MENSAJE_WHATSAPP.includes(estado as EstadoMensajeWhatsapp)) {
      return errorDePeticion('Ese estado no existe en la bandeja.', 400);
    }

    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 400);

    const propuestas = await leerBandeja(sesion, {
      estado: estado as EstadoMensajeWhatsapp,
      obraId: parametros.get('obraId'),
      ...rango,
    });
    return ok({ propuestas });
  });
}
