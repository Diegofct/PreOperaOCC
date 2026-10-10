import { creadoUnido } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { esTipoCreado, unirCreado } from '@/features/whatsapp/servidor/creados';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * «Es el mismo que…». `POST /api/panel/whatsapp/creados/:tipo/:id/unir` con `{
 * conRegistroId }` (spec 024, RF-36, RF-75, RF-76).
 *
 * Pasa al registro bueno los viajes (anulados y registrados de nuevo), los renglones de
 * las bitácoras abiertas y los movimientos de almacén, y da de baja lo creado. Lo de
 * bitácoras cerradas no se toca: la respuesta dice cuántos quedaron así (`sinTocar`).
 */
export async function POST(peticion: Request, { tipo, id }: { tipo: string; id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;
    if (!esTipoCreado(tipo)) return noEncontrado('ese registro');

    const { conRegistroId } = await cuerpoJson(peticion, creadoUnido);
    const resultado = await unirCreado(sesion, tipo, idDeLaRuta(id), conRegistroId);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
