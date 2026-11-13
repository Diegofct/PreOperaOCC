/**
 * Una importación al Almacén, para ver en qué va y revisarla (spec 042, RF-8, RF-10 a RF-33, RF-43,
 * RF-65, RF-90).
 *
 * `GET /api/panel/almacen/importaciones/:id` devuelve su estado y, si está lista, la propuesta con
 * su versión, los materiales vigentes de la obra y si el documento ya entró, mirado ahora. Solo la ve
 * quien la subió: a cualquier otro, 404. La consulta la pantalla una y otra vez mientras se lee, así
 * que este módulo no importa la IA ni los lectores de archivos.
 */
import { detalleDeImportacion } from '@/features/almacen-obra/servidor/estado-de-importacion';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'importar');
    if (sesion instanceof Response) return sesion;

    const detalle = await detalleDeImportacion(sesion, id);
    return detalle instanceof Response ? detalle : ok(detalle);
  });
}
