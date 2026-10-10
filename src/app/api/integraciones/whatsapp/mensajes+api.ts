import { entregaDeWhatsapp } from '@/features/panel/contratos';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { anotarFalloDelProceso, procesarMensaje } from '@/features/whatsapp/servidor/automatico';
import { recibirMensaje } from '@/features/whatsapp/servidor/recepcion';

/**
 * La entrada de la integración de WhatsApp. `POST /api/integraciones/whatsapp/mensajes`
 * (spec 021, RF-1 a RF-6; spec 024, RF-1).
 *
 * La llama n8n con cada mensaje que la IA ya clasificó. **No abre con la guardia
 * del panel ni con la del celular**, sino con la suya (`guardia-integracion.ts`):
 * aquí no hay persona en sesión, y ninguna de las otras dos puertas sirve para
 * entrar aquí, ni esta para entrar allá.
 *
 * Responde `{ estado: 'nuevo' | 'reemplazado' | 'conservado' }`. Las tres son un
 * éxito: una entrega repetida es lo normal cuando n8n reintenta, y responder un
 * error la haría reintentar para siempre.
 *
 * Con `WHATSAPP_GUARDADO_AUTOMATICO=1` (spec 024), además lo guarda en su módulo y
 * responde también `guardado`. Si guardar falla, el mensaje ya quedó recibido y
 * pendiente, el error queda escrito en él, y se responde 500 para que n8n reintente:
 * recibir y guardar se pueden repetir sin duplicar nada. Con la variable en otro
 * valor, todo queda pendiente en la bandeja, como en la 021: es la vuelta atrás.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion);
    if (rechazo) return rechazo;

    const entrega = await cuerpoJson(peticion, entregaDeWhatsapp);
    const estado = await recibirMensaje(entrega);
    if (process.env.WHATSAPP_GUARDADO_AUTOMATICO !== '1') return ok({ estado });

    try {
      const guardado = await procesarMensaje(entrega.mensaje.id);
      return ok({ estado, guardado });
    } catch (fallo) {
      await anotarFalloDelProceso(entrega.mensaje.id, fallo);
      return errorDePeticion('El mensaje quedó recibido, pero no se pudo guardar. Se reintentará.', 500);
    }
  });
}
