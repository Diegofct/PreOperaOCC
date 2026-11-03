import { excepcionGuardada } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { guardarExcepcion } from '@/features/whatsapp/servidor/excepciones';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Guardar un renglón de «No se pudo guardar», ya completado. `POST
 * /api/panel/whatsapp/excepciones/:id/guardar` con `{ datos, fecha? }` (spec 024,
 * RF-61, RF-62, RF-71). Lo del mensaje entero va sin `datos` y se reintenta.
 *
 * 400 con las faltas por renglón, como la propuesta; 409 si otro ya lo resolvió.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Quién puede lo decide la excepción: aprobar en una obra, o la Bitácora de la empresa (spec 038).
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const resultado = await guardarExcepcion(sesion, idDeLaRuta(id), await cuerpoJson(peticion, excepcionGuardada));
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
