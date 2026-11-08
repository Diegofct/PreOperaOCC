import { baseServidor } from '@/db/servidor/cliente';
import { ejecutarLote, personaConObras, sentenciaDeRevisado } from '@/features/auth/servidor/accesos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { puedeMarcarRevisado } from '@/shared/rules/cargos-de-obra';

/**
 * Dar por revisada a una persona de la lista «Pasaron a Residente: revisar» (spec 041, RF-51).
 * `POST /api/panel/personas/:id/revisado`.
 *
 * La migración dejó como Residente, marcado, a quien tenía «Residente / Director» con un cargo
 * que no decía qué era, y a quien quedó sin obra (RF-48, RF-65). Si de verdad le toca otro
 * acceso, se lo cambian desde Personas; si Residente estaba bien, esta ruta apaga la marca.
 * Cambiarle el acceso también la apaga, porque la fila nueva de su historia nace sin ella.
 *
 * Lo hacen la gerencia y el Director de Proyectos (`puedeMarcarRevisado`). No hace falta mirar
 * la obra: los dos ven todas.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;
    if (!puedeMarcarRevisado(sesion.rol)) {
      return errorDePeticion('Dar por revisado un acceso lo hacen el Director de Proyectos o la Gerencia.', 403);
    }

    const persona = await personaConObras(id);
    if (!persona) return noEncontrado('esa persona');

    const db = baseServidor();
    await ejecutarLote(db, [sentenciaDeRevisado(db, id)]);
    return ok({ id, revisar: false });
  });
}
