import { carpetasDelDrive } from '@/features/drive/servidor/lista';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Las carpetas del Drive conectadas a Kontrola. `GET /api/panel/drive/carpetas` (spec 052,
 * RF-8 a RF-10).
 *
 * Con el permiso `drive` → `activar`, que es solo de la gerencia: asociar una carpeta a una obra
 * es decidir quién ve sus documentos (RF-9). Las que no tienen obra van primero, porque son lo
 * que hay que resolver; mientras tanto nadie más las ve (RF-10).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'drive', 'activar');
    if (sesion instanceof Response) return sesion;
    return ok({ carpetas: await carpetasDelDrive() });
  });
}
