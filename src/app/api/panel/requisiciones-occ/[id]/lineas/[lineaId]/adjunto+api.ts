import { adjuntarALineaOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Adjunta el RUT o la cuenta bancaria a una línea (spec 047, RF-15, RF-16).
 *
 * `POST …/adjunto?clase=rut|cuenta&version=N` con los bytes del archivo en el cuerpo y su nombre en
 * `X-Nombre-Archivo` (codificado: una cabecera solo admite ASCII), como la importación al Almacén.
 * Cambiar un adjunto reemplaza la línea (RF-37) y responde el id de la nueva.
 */
export async function POST(peticion: Request, { id, lineaId }: { id: string; lineaId: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const clase = parametros.get('clase');
    if (clase !== 'rut' && clase !== 'cuenta') return errorDePeticion('Diga si el archivo es el RUT o la cuenta bancaria.');
    const version = Number(parametros.get('version'));
    if (!Number.isInteger(version) || version < 1) return errorDePeticion('Falta la versión de la requisición que vio.');

    const resultado = await adjuntarALineaOcc(sesion, id, lineaId, clase, version, {
      nombre: nombreDelArchivo(peticion),
      contenido: new Uint8Array(await peticion.arrayBuffer()),
    });
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}

/** El nombre del archivo, de su cabecera; si llega mal codificado, tal cual. */
function nombreDelArchivo(peticion: Request): string {
  const crudo = peticion.headers.get('x-nombre-archivo')?.trim() || 'archivo';
  try {
    return decodeURIComponent(crudo);
  } catch {
    return crudo;
  }
}
