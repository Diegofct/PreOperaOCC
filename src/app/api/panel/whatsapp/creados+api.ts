import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { listarCreados } from '@/features/whatsapp/servidor/creados';

/**
 * «Creado automáticamente». `GET /api/panel/whatsapp/creados?obraId=&revisados=1` (spec
 * 024, RF-33, RF-64).
 *
 * Sin `revisados`, lo que nadie ha revisado. La ven y la atienden el residente de la
 * obra y la gerencia; `obraId` solo lo usa la gerencia.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const creados = await listarCreados(sesion, {
      obraId: parametros.get('obraId'),
      revisados: parametros.get('revisados') === '1',
    });
    return ok({ creados });
  });
}
