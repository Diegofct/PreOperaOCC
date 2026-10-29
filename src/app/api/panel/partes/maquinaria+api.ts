import { maquinariaDeLasObras } from '@/features/empresas/servidor/maquinaria';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * La Bitácora de maquinaria de OCC (spec 033, RF-22): las máquinas de las bitácoras de
 * todas las obras en un rango de días, con `?obraId=` para una. Sin rango, la última
 * semana, como la bandeja de WhatsApp. `GET /api/panel/partes/maquinaria`.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 400);

    return ok(await maquinariaDeLasObras(sesion, { obraId: parametros.get('obraId'), ...rango }));
  });
}
