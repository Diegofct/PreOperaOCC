import { iniciarImportacionOcc } from '@/features/requisiciones/servidor/importar-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Importar con IA la planilla de requisición de pagos de OCC (spec 047, RF-59, RF-60, RF-78, RF-79).
 *
 * `POST /api/panel/requisiciones-occ/importaciones[?requisicionId=…]` con los bytes del Excel en el
 * cuerpo y su nombre en `X-Nombre-Archivo` (codificado: una cabecera solo admite ASCII), como la
 * importación al Almacén. Responde 202 con el id y la lectura sigue por detrás. Sin `requisicionId`, la
 * requisición del viernes se crea al confirmar. Solo `.xlsx` (D9): lo demás, 422 con lo que se espera.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const requisicionId = new URL(peticion.url).searchParams.get('requisicionId') || null;
    const iniciada = await iniciarImportacionOcc(sesion, requisicionId, {
      nombre: nombreDelArchivo(peticion),
      contenido: new Uint8Array(await peticion.arrayBuffer()),
    });
    return iniciada instanceof Response ? iniciada : ok(iniciada, 202);
  });
}

/** El nombre del archivo, de su cabecera; si llega mal codificado, tal cual. */
function nombreDelArchivo(peticion: Request): string {
  const crudo = peticion.headers.get('x-nombre-archivo')?.trim() || 'planilla';
  try {
    return decodeURIComponent(crudo);
  } catch {
    return crudo;
  }
}
