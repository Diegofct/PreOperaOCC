import { limitesDelAsistente, usoDelPeriodo } from '@/features/asistente/servidor/uso';
import type { UsoDelAsistente } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El uso del asistente para la gerencia (spec 028, RF-56 a RF-59).
 * `GET /api/panel/asistente/uso?desde=&hasta=`: preguntas y costo estimado por persona y
 * obra, **sin el contenido** de las conversaciones (RF-58), y los límites puestos.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'escribir');
    if (sesion instanceof Response) return sesion;
    const parametros = new URL(peticion.url).searchParams;
    const desde = parametros.get('desde') ?? '';
    const hasta = parametros.get('hasta') ?? '';
    if (!FECHA.test(desde) || !FECHA.test(hasta)) return errorDePeticion('El periodo va con dos fechas en formato AAAA-MM-DD.');
    if (desde > hasta) return errorDePeticion('La fecha inicial es posterior a la final.');
    const [filas, limites] = await Promise.all([usoDelPeriodo(desde, hasta), limitesDelAsistente()]);
    return ok({ filas, limites } satisfies UsoDelAsistente);
  });
}
