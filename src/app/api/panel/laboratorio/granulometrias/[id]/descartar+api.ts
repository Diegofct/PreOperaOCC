import { darPaso } from '@/features/laboratorio/servidor/ensayos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { responder } from '@/features/servidor/respuestas';

/**
 * Descartar un ensayo. `POST /api/panel/laboratorio/granulometrias/:id/descartar`
 * (spec 018, RF-90, RF-91).
 *
 * Solo lo que el laboratorista todavía tiene en sus manos —borrador o devuelto—, y
 * sin motivo: nunca fue evidencia. **No se borra**: se marca `descartado_en`, deja de
 * listarse y de salir en el parte, y su número de informe queda libre (RF-41). Lo
 * enviado se devuelve y lo aprobado se anula; no se descartan.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'escribir');
    if (sesion instanceof Response) return sesion;

    return darPaso({ sesion, id, accion: 'descartar', cambios: () => ({ descartadoEn: new Date() }) });
  });
}
