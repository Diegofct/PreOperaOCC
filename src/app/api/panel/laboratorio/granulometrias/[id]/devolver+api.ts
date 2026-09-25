import { darPaso } from '@/features/laboratorio/servidor/ensayos';
import { devolucion } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, responder } from '@/features/servidor/respuestas';

/**
 * Devolver un ensayo enviado. `POST /api/panel/laboratorio/granulometrias/:id/devolver`
 * (spec 018, RF-78 a RF-81).
 *
 * Con el comentario de qué corregir, obligatorio (RF-79): una devolución sin motivo
 * deja al laboratorista adivinando. El ensayo vuelve a sus manos para corregirlo y
 * reenviarlo. El comentario queda en el ensayo mientras está devuelto y, para
 * siempre, en la historia.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const { comentario } = await cuerpoJson(peticion, devolucion);

    return darPaso({
      sesion,
      id,
      accion: 'devolver',
      texto: comentario,
      cambios: () => ({ estado: 'devuelto', comentarioDevolucion: comentario }),
    });
  });
}
