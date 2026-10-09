import { descarte } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { descartarPropuesta } from '@/features/whatsapp/servidor/decisiones';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Descartar una propuesta. `POST /api/panel/whatsapp/propuestas/:id/descartar` con
 * `{ version, motivo }` (spec 021, RF-54 a RF-56).
 *
 * Con el permiso de aprobar: descartar es decidir sobre el reporte, igual que
 * aprobarlo. El motivo es obligatorio y queda con quién y cuándo.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;
    // Spec 024, RF-70: con el guardado automático, la bandeja ya no decide nada.
    if (process.env.WHATSAPP_GUARDADO_AUTOMATICO === '1') {
      return errorDePeticion('El sistema guarda solo lo que llega por WhatsApp: esta propuesta ya no se decide aquí.', 409);
    }

    const pedido = await cuerpoJson(peticion, descarte);
    const resultado = await descartarPropuesta(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
