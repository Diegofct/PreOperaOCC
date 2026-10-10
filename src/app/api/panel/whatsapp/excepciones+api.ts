import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { listarExcepciones } from '@/features/whatsapp/servidor/excepciones';
import { ESTADOS_DE_EXCEPCION, type EstadoDeExcepcion } from '@/shared/rules/whatsapp-automatico';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * «No se pudo guardar». `GET /api/panel/whatsapp/excepciones?estado=&obraId=&desde=&hasta=`
 * (spec 024, RF-60, RF-64; spec 025, RF-46, RF-48 a RF-51).
 *
 * Sin `estado`, los pendientes. La ven y la atienden el residente de la obra y la
 * gerencia; `obraId` solo lo usa la gerencia.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const estado = parametros.get('estado') ?? 'pendiente';
    if (!ESTADOS_DE_EXCEPCION.includes(estado as EstadoDeExcepcion)) {
      return errorDePeticion('Ese estado no existe en la lista.', 400);
    }
    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 400);

    return ok(
      await listarExcepciones(sesion, {
        obraId: parametros.get('obraId'),
        estado: estado as EstadoDeExcepcion,
        ...rango,
      }),
    );
  });
}
