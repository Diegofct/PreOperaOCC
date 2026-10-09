import { devolucionAPendiente } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
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
    // Spec 024, RF-70: con el guardado automático, la bandeja ya no decide nada.
    if (process.env.WHATSAPP_GUARDADO_AUTOMATICO === '1') {
      return errorDePeticion('El sistema guarda solo lo que llega por WhatsApp: esta propuesta ya no se decide aquí.', 409);
    }

    const pedido = await cuerpoJson(peticion, devolucionAPendiente);
    const resultado = await devolverAPendiente(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
