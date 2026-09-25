import { darPaso } from '@/features/laboratorio/servidor/ensayos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { responder } from '@/features/servidor/respuestas';

/**
 * Aprobar un ensayo enviado. `POST /api/panel/laboratorio/granulometrias/:id/aprobar`
 * (spec 018, RF-77, RF-82 a RF-85).
 *
 * Lo hacen el residente, el director o la gerencia —la guardia lo decide con la
 * acción `aprobar`—; el laboratorista no (RF-92). Quien aprueba queda como «Aprobó»,
 * con su cargo y la fecha, que es la fecha de emisión del informe (RF-84). Desde aquí
 * el ensayo es evidencia: no se corrige, se anula (RF-85, RF-86).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'aprobar');
    if (sesion instanceof Response) return sesion;

    return darPaso({
      sesion,
      id,
      accion: 'aprobar',
      cambios: () => ({ estado: 'aprobado', aprobadoPor: sesion.id, aprobadoEn: new Date() }),
    });
  });
}
