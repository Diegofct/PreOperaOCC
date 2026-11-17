import { subirComprobanteOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Sube el comprobante de un pago de una línea de OCC antes de registrarlo (spec 047, RF-44). Los bytes
 * van en el cuerpo y el nombre en `X-Nombre-Archivo`; responde el id del archivo, que el pago nombra
 * en `comprobanteMediaId`. Lo sube quien puede pagar esa requisición.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const crudo = peticion.headers.get('x-nombre-archivo')?.trim() || 'comprobante';
    let nombre = crudo;
    try {
      nombre = decodeURIComponent(crudo);
    } catch {
      // Mal codificado: tal cual.
    }
    const resultado = await subirComprobanteOcc(sesion, id, { nombre, contenido: new Uint8Array(await peticion.arrayBuffer()) });
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
