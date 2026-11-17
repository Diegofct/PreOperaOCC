import { importacionOccConfirmada } from '@/features/panel/requisiciones-occ';
import { confirmarImportacionOcc } from '@/features/requisiciones/servidor/importar-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Confirma una importación de planilla de OCC (spec 047, RF-60 a RF-63, RF-68): las líneas revisadas
 * entran al final de la requisición, o de la del viernes que se crea. 422 con la línea y lo que le falta;
 * 409 si ya entró, venció, cambió o ya hay una abierta para ese viernes (con ella).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const pedido = await cuerpoJson(peticion, importacionOccConfirmada);
    const resultado = await confirmarImportacionOcc(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
