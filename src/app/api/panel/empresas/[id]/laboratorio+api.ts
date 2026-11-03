import { laboratorioDeLasObras } from '@/features/empresas/servidor/laboratorio';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * La Bitácora de Geolab (spec 038, RF-27): `GET /api/panel/empresas/geolab/laboratorio
 * ?obraId=&desde=&hasta=`. Los ensayos del laboratorio de las bitácoras de todas las
 * obras, sin las anuladas. Gerencia y el laboratorista (RF-29).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const parametros = new URL(peticion.url).searchParams;
    const ensayos = await laboratorioDeLasObras(sesion, id, {
      obraId: parametros.get('obraId'),
      desde: parametros.get('desde'),
      hasta: parametros.get('hasta'),
    });
    return ensayos instanceof Response ? ensayos : ok({ ensayos });
  });
}
