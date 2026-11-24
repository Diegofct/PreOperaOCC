import { pulsoDelDrive } from '@/features/drive/servidor/leer';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * El pulso que lee el Drive de la obra. `POST /api/integraciones/drive/pulso` (spec 052,
 * RF-12 a RF-16).
 *
 * Lo llama n8n cada 5 minutos, después del inventario, con **el token del Drive**. La lectura
 * va aquí y no al recibir el archivo: leer un documento largo toma minutos, y dentro de la
 * subida n8n esperaría hasta que el proxy cortara (plan, «Decisiones técnicas»).
 *
 * Lee Word, Excel y texto sin IA, y los PDF y las imágenes con la IA; retoma las lecturas
 * cortadas, reintenta las fallas pasajeras hasta 3 veces y resume lo leído (`leer.ts`). No toma
 * otra versión pasados unos 4 minutos: lo que queda, lo sigue el próximo pulso. Sin
 * `DRIVE_LECTURA_ACTIVA=1` no se gasta IA, y la respuesta lo dice en `sinIa`.
 *
 * Responde `{ leidas, fallidas, reintentos, resumidas, pendientes, sinIa? }`.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion, 'TOKEN_INTEGRACION_DRIVE');
    if (rechazo) return rechazo;
    return ok(await pulsoDelDrive());
  });
}
