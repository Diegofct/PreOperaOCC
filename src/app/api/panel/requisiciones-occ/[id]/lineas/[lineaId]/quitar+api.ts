import { lineaOccQuitada } from '@/features/panel/requisiciones-occ';
import { quitarLineaOcc } from '@/features/requisiciones/servidor/requisicion-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Quita una línea vigente: queda marcada con quién y cuándo, no se borra (spec 047, RF-20, RF-76). */
export async function POST(peticion: Request, { id, lineaId }: { id: string; lineaId: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const { version } = await cuerpoJson(peticion, lineaOccQuitada);
    const resultado = await quitarLineaOcc(sesion, id, lineaId, version);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
