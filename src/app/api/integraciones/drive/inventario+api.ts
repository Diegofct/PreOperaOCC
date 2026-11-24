import { recibirInventario } from '@/features/drive/servidor/inventario';
import { inventarioDelDrive } from '@/features/panel/contratos';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * El inventario de la carpeta del Drive de la obra. `POST /api/integraciones/drive/inventario`
 * (spec 052, RF-1, RF-4, RF-6, RF-8, RF-10, RF-19 a RF-21, RF-34, RF-40).
 *
 * La llama n8n cada 5 minutos con el listado **completo** de la carpeta y sus subcarpetas.
 * Abre con la puerta de las integraciones y **el token del Drive**, no el de WhatsApp
 * (RF-2, RF-3): con cualquier otra credencial, 401 sin guardar nada.
 *
 * Responde qué versiones tiene que subir n8n (`pedir`), y cuánto cambió. Repetir la misma
 * entrega es lo normal cuando n8n reintenta, y responde lo mismo sin duplicar nada: lo que
 * ya se pidió y no ha subido se vuelve a pedir.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion, 'TOKEN_INTEGRACION_DRIVE');
    if (rechazo) return rechazo;

    const inventario = await cuerpoJson(peticion, inventarioDelDrive);
    return ok(await recibirInventario(inventario));
  });
}
