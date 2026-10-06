import { aprobacion } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { aprobarPropuesta } from '@/features/whatsapp/servidor/aprobacion';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Aprobar una propuesta. `POST /api/panel/whatsapp/propuestas/:id/aprobar` con
 * `{ version, propuesta, fotos, soloViajes }` (spec 021, RF-30 a RF-51, RF-57,
 * RF-59 a RF-98).
 *
 * Lo que se aprueba es la propuesta **tal como la manda el residente**, que es la
 * que vio en pantalla, y queda guardada como la corregida. Responde la bitácora a
 * la que fue. Las faltas responden 400 con todas, por renglón (RF-64); una
 * bitácora cerrada o un cambio de otra persona, 409.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, aprobacion);
    const resultado = await aprobarPropuesta(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
