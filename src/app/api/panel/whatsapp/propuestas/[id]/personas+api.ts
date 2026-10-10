import { personasDesdeLaBandeja } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';
import { registrarPersonasDesdeLaBandeja } from '@/features/whatsapp/servidor/personas';

/**
 * Registrar desde la bandeja a las personas del reporte que no están en el sistema.
 * `POST /api/panel/whatsapp/propuestas/:id/personas` con `{ version, propuesta,
 * personas }` (spec 023, RF-57 a RF-68).
 *
 * Pide el permiso de **aprobar** en la bandeja, no el de escribir en Personas: el
 * residente registra desde aquí y solo desde aquí (RF-58, RF-59). Responde la
 * versión nueva de la propuesta y el id de cada persona; un renglón que no existe o
 * ya tiene persona, 400; un cambio de otra persona, 409.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;
    // Spec 024, RF-70: con el guardado automático, la bandeja ya no decide nada.
    if (process.env.WHATSAPP_GUARDADO_AUTOMATICO === '1') {
      return errorDePeticion('El sistema guarda solo lo que llega por WhatsApp: esta propuesta ya no se decide aquí.', 409);
    }

    const pedido = await cuerpoJson(peticion, personasDesdeLaBandeja);
    const resultado = await registrarPersonasDesdeLaBandeja(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
