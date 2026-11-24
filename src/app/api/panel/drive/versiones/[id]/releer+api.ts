import { releerVersion } from '@/features/drive/servidor/lista';
import { esDeSusObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Volver a leer un documento que no se pudo leer. `POST /api/panel/drive/versiones/:id/releer`
 * (spec 052, RF-33).
 *
 * Con el permiso `drive` → `escribir`. La versión vuelve a «pendiente» con los intentos en 0, y
 * la lee el siguiente pulso de n8n. 404 si es de una obra que no alcanza quien pide; 409 si no
 * está «No se pudo leer» o no tiene copia (más de 50 MB).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'drive', 'escribir');
    if (sesion instanceof Response) return sesion;

    const releida = await releerVersion(sesion, idDeLaRuta(id), (obraId) => esDeSusObras(sesion, obraId));
    return releida instanceof Response ? releida : ok(releida);
  });
}
