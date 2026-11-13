/**
 * Descartar una importación al Almacén que no se va a confirmar (spec 042, RF-48, RF-95).
 *
 * `POST /api/panel/almacen/importaciones/:id/descartar`. Vale para una que se está leyendo, una lista
 * o una que falló; la deja `descartada` y su archivo se conserva, sin mostrarse. Una ya confirmada
 * responde 409: sus ingresos se anulan uno a uno. Solo la descarta quien la subió; a otro, 404.
 */
import { descartarImportacion } from '@/features/almacen-obra/servidor/estado-de-importacion';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'importar');
    if (sesion instanceof Response) return sesion;

    const resultado = await descartarImportacion(sesion, id);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
