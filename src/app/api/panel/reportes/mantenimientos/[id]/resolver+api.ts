import { resolucionDeCorrectivo } from '@/features/panel/contratos';
import { resolverCorrectivo } from '@/features/reportes/servidor/mantenimientos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Marcar resuelto un correctivo (spec 030, RF-29). 409 si ya estaba resuelto o anulado. */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'escribir');
    if (sesion instanceof Response) return sesion;
    const datos = await cuerpoJson(peticion, resolucionDeCorrectivo);
    const hecho = await resolverCorrectivo(sesion, id, datos);
    return hecho instanceof Response ? hecho : ok(hecho);
  });
}
