import { disposicionDelArchivo } from '@/features/documentos/servidor/documentos';
import { excelOriginal, planificacionAlAlcance, puedeBajarElExcelOriginal } from '@/features/planificacion/servidor/planificaciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, responder } from '@/features/servidor/respuestas';

/**
 * Bajar el Excel original de una versión de la planificación (spec 043, RF-8, RF-50).
 *
 * `GET /api/panel/planificaciones/:id/excel` entrega el archivo tal como se subió, de cualquier
 * versión que nació de un Excel. Lo bajan la Gerencia y el Director de Proyectos. Spec 045,
 * RF-152: el Director de Obra ya no, porque el libro trae la nómina y él ve la mano de obra
 * indirecta solo como total (403); hasta la 045 sí lo bajaba. El Residente no tiene permiso en
 * `planificacion` (403). De otra obra, o si la versión no nació de un Excel (RF-149), 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'ver');
    if (sesion instanceof Response) return sesion;
    if (!puedeBajarElExcelOriginal(sesion)) {
      return errorDePeticion(
        'El Excel original trae la nómina del personal. La mano de obra indirecta se ve como total en la planificación.',
        403,
      );
    }

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
