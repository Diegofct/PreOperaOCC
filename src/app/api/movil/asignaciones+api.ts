import { requerirEquipo } from '@/features/servidor/guardia-movil';
import { errorDePeticion, responder } from '@/features/servidor/respuestas';

/**
 * Rechaza las asignaciones que manda un celular. `POST /api/movil/asignaciones`.
 *
 * Hasta la spec 012 esta ruta **creaba** la asignación que el operador se ponía a
 * sí mismo cuando llegaba a obra sin ninguna, marcada como `autoasignada` para
 * que la administración la confirmara. OCC decidió lo contrario: quién opera qué
 * lo decide la obra desde el panel, y el celular solo muestra lo asignado.
 *
 * ── Por qué la ruta sigue existiendo ──
 *
 * Porque durante días habrá teléfonos sin actualizar que sigan mandando
 * autoasignaciones, y **lo que importa es cómo se les dice que no**. Si la ruta
 * desapareciera, el router respondería 404, que la cola de subida trata como un
 * fallo pasajero: la fila se reintentaría hasta ocho veces, cortando la tanda en
 * cada intento, y los **preoperacionales firmados que van detrás no subirían**.
 * Se responde 422 —definitivo para `fallaDefinitiva`— para que esa fila se marque
 * fallida de una vez y la cola siga drenando el trabajo del operador.
 *
 * Se mantiene la guardia de token: un rechazo no es motivo para dejar de
 * comprobar quién llama.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const equipo = await requerirEquipo(peticion);
    if (equipo instanceof Response) return equipo;

    return errorDePeticion('Las asignaciones las registra la administración desde el panel.', 422);
  });
}
