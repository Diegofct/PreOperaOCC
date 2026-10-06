import { devolucionAPendiente } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { devolverAPendiente } from '@/features/whatsapp/servidor/decisiones';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Devolver a la bandeja un mensaje ignorado. `POST
 * /api/panel/whatsapp/propuestas/:id/devolver` con `{ version }` (spec 021, RF-25).
 *
 * Es lo que se hace cuando la IA marcó «ignorar» algo que sí servía. Queda
 * pendiente, y una entrega repetida de la integración ya no lo vuelve a esconder:
 * la versión subió (`recepcion.ts`).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, devolucionAPendiente);
    const resultado = await devolverAPendiente(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
