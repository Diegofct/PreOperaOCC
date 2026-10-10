import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { listarCreados } from '@/features/whatsapp/servidor/creados';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * «Creado automáticamente». `GET /api/panel/whatsapp/creados?obraId=&revisados=1&desde=&hasta=`
 * (spec 024, RF-33, RF-64; spec 025, RF-47, RF-49 a RF-51).
 *
 * Sin `revisados`, lo que nadie ha revisado. La ven y la atienden el residente de la
 * obra y la gerencia; `obraId` solo lo usa la gerencia.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 400);

    return ok(
      await listarCreados(sesion, {
        obraId: parametros.get('obraId'),
        revisados: parametros.get('revisados') === '1',
        ...rango,
      }),
    );
  });
}
