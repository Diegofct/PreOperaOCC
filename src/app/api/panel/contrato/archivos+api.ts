import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { subirArchivo } from '@/features/contratos/servidor/polizas-y-documentos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Subir un archivo del contrato. `POST /api/panel/contrato/archivos?obraId=`, con los
 * bytes del PDF o de la imagen en el cuerpo y su tipo en `Content-Type` (spec 031,
 * RF-30). Responde `{ mediaId }`, que la póliza o el documento citan después.
 *
 * Los bytes van tal cual y no como formulario, como las fotos del parte: el almacén
 * guarda bytes, y armar un `multipart` para volver a desmontarlo aquí no aporta nada.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const mime = (peticion.headers.get('content-type') ?? '').split(';')[0].trim();
    const contenido = new Uint8Array(await peticion.arrayBuffer());
    const resultado = await subirArchivo(obraId, mime, contenido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
