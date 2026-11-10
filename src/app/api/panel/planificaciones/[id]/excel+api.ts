import { disposicionDelArchivo } from '@/features/documentos/servidor/documentos';
import { excelOriginal, planificacionAlAlcance } from '@/features/planificacion/servidor/planificaciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, responder } from '@/features/servidor/respuestas';

/**
 * Bajar el Excel original de una versión de la planificación (spec 043, RF-8, RF-50).
 *
 * `GET /api/panel/planificaciones/:id/excel` entrega el archivo tal como se subió, de cualquier
 * versión. Lo bajan la Gerencia, el Director de Proyectos y el Director de Obra en sus obras: el
 * libro trae costos y nómina, y el Residente no tiene permiso en `planificacion` (403). De otra
 * obra, o si el archivo no está, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'ver');
    if (sesion instanceof Response) return sesion;

    const fila = await planificacionAlAlcance(sesion, id);
    if (!fila) return noEncontrado('esa planificación');
    const archivo = await excelOriginal(fila);
    if (!archivo) return noEncontrado('ese archivo');

    return new Response(archivo.contenido, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': String(archivo.contenido.byteLength),
        // Lleva costos: ningún proxy compartido lo guarda.
        'Cache-Control': 'private, no-store',
        'Content-Disposition': disposicionDelArchivo(archivo.nombre, true),
      },
    });
  });
}
