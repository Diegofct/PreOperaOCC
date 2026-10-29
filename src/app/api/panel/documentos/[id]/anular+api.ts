import { anularDocumento } from '@/features/documentos/servidor/documentos';
import { anulacionDeDocumento } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Anular un documento, con motivo. `POST /api/panel/documentos/:id/anular` (spec 034, RF-10,
 * RF-43). El permiso depende del dueño —Documentos o, si es de una persona, Recursos
 * Humanos (035/RF-6)—, así que lo decide `anularDocumento` después de leerlo; aquí, la sesión.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacionDeDocumento);
    const resultado = await anularDocumento(sesion, id, motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
