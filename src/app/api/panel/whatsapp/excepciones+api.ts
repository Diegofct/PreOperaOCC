import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { listarExcepciones } from '@/features/whatsapp/servidor/excepciones';
import { ESTADOS_DE_EXCEPCION, type EstadoDeExcepcion } from '@/shared/rules/whatsapp-automatico';

/**
 * «No se pudo guardar». `GET /api/panel/whatsapp/excepciones?estado=&obraId=` (spec
 * 024, RF-60, RF-64).
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
    const excepciones = await listarExcepciones(sesion, {
      obraId: parametros.get('obraId'),
      estado: estado as EstadoDeExcepcion,
    });
    return ok({ excepciones });
  });
}
