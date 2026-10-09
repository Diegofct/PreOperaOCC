import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { esTipoCreado, marcarRevisado } from '@/features/whatsapp/servidor/creados';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Marcar revisado algo creado automáticamente. `POST
 * /api/panel/whatsapp/creados/:tipo/:id/revisado` (spec 024, RF-34). 409 si ya lo estaba.
 */
export async function POST(peticion: Request, { tipo, id }: { tipo: string; id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;
    if (!esTipoCreado(tipo)) return noEncontrado('ese registro');

    const resultado = await marcarRevisado(sesion, tipo, idDeLaRuta(id));
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
