import { descartarImportacionOcc } from '@/features/requisiciones/servidor/importar-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/** Descarta una importación de planilla de OCC sin confirmar (spec 047, RF-62). El archivo no se borra. */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const resultado = await descartarImportacionOcc(sesion, id);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
