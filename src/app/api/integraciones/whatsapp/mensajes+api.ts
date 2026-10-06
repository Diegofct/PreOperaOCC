import { entregaDeWhatsapp } from '@/features/panel/contratos';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { recibirMensaje } from '@/features/whatsapp/servidor/recepcion';

/**
 * La entrada de la integración de WhatsApp. `POST /api/integraciones/whatsapp/mensajes`
 * (spec 021, RF-1 a RF-6).
 *
 * La llama n8n con cada mensaje que la IA ya clasificó. **No abre con la guardia
 * del panel ni con la del celular**, sino con la suya (`guardia-integracion.ts`):
 * aquí no hay persona en sesión, y ninguna de las otras dos puertas sirve para
 * entrar aquí, ni esta para entrar allá.
 *
 * Responde `{ estado: 'nuevo' | 'reemplazado' | 'conservado' }`. Las tres son un
 * éxito: una entrega repetida es lo normal cuando n8n reintenta, y responder un
 * error la haría reintentar para siempre.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion);
    if (rechazo) return rechazo;

    const entrega = await cuerpoJson(peticion, entregaDeWhatsapp);
    return ok({ estado: await recibirMensaje(entrega) });
  });
}
