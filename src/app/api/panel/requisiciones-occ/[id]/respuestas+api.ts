import { respuestasOccPedidas } from '@/features/panel/requisiciones-occ';
import { responderLineasOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Autorizar o no autorizar una o varias líneas (spec 047, RF-26 a RF-33, RF-77). La Administradora
 * de Elemental o la Gerencia, nunca quien la elaboró; NO autorizada, con motivo. Cuando ya no queda
 * ninguna sin respuesta, la requisición se cierra en Autorizada o No autorizada.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, respuestasOccPedidas);
    const resultado = await responderLineasOcc(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
