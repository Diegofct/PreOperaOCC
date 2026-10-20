import { anulacionDeMantenimiento } from '@/features/panel/contratos';
import { anularMantenimiento } from '@/features/reportes/servidor/mantenimientos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Anular un mantenimiento con su motivo (spec 030, RF-35). 409 si ya estaba anulado. */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'escribir');
    if (sesion instanceof Response) return sesion;
    const { motivo } = await cuerpoJson(peticion, anulacionDeMantenimiento);
    const hecho = await anularMantenimiento(sesion, id, motivo);
    return hecho instanceof Response ? hecho : ok(hecho);
  });
}
