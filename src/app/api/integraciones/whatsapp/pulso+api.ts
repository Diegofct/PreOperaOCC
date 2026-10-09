import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { ok, responder } from '@/features/servidor/respuestas';
import { pulso } from '@/features/whatsapp/servidor/pulso';

/**
 * El pulso del guardado automático. `POST /api/integraciones/whatsapp/pulso` (spec
 * 024, RF-46, RF-68).
 *
 * Lo llama n8n cada 15 minutos, con la misma guardia que la entrega de mensajes:
 * arma las bitácoras que llegaron a su hora límite y procesa los mensajes pendientes
 * (`pulso.ts`). Con `WHATSAPP_GUARDADO_AUTOMATICO` en otro valor que `1` no hace nada
 * y lo dice: es la vuelta atrás, igual que en la ruta de mensajes.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion);
    if (rechazo) return rechazo;
    if (process.env.WHATSAPP_GUARDADO_AUTOMATICO !== '1') return ok({ apagado: true });
    return ok(await pulso());
  });
}
