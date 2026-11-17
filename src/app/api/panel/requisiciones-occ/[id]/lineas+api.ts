import { lineaOccPedida } from '@/features/panel/requisiciones-occ';
import { agregarLineaOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Agrega una línea al final de una requisición de pagos de OCC en Borrador o Devuelta (spec 047,
 * RF-10 a RF-14, RF-19, RF-36). Con la versión que se vio: una vieja, 409 (RF-75). Las faltas, 422
 * junto a su campo.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, lineaOccPedida);
    const resultado = await agregarLineaOcc(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
