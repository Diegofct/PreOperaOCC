import { libroDeLaRequisicionOcc, TIPO_XLSX } from '@/features/requisiciones/servidor/excel-occ';
import { requerirSesion } from '@/features/servidor/guardia';
import { responder } from '@/features/servidor/respuestas';

/**
 * Descarga una requisición de pagos de OCC en Excel, con el formato de su hoja REQUISICIONES (spec 047,
 * RF-52 a RF-58). La ve quien ve la requisición; a los demás, 404 (RF-73).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const libro = await libroDeLaRequisicionOcc(sesion, id);
    if (libro instanceof Response) return libro;

    return new Response(libro.archivo, {
      status: 200,
      headers: {
        'Content-Type': TIPO_XLSX,
        'Content-Disposition': `attachment; filename="${libro.nombre}"`,
      },
    });
  });
}
