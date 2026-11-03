import { excepcionDescartada } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { descartarExcepcion } from '@/features/whatsapp/servidor/excepciones';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Descartar un renglón de «No se pudo guardar». `POST
 * /api/panel/whatsapp/excepciones/:id/descartar` con `{ motivo }` (spec 024, RF-63).
 * Sin motivo, 400; si otro ya lo resolvió, 409.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Quién puede lo decide la excepción: aprobar en una obra, o la Bitácora de la empresa (spec 038).
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, excepcionDescartada);
    const resultado = await descartarExcepcion(sesion, idDeLaRuta(id), motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
