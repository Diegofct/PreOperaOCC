import { baseServidor } from '@/db/servidor/cliente';
import {
  ejecutarLote,
  obrasQueNoExisten,
  personaConObras,
  sentenciasDeObras,
} from '@/features/auth/servidor/accesos';
import { obrasDelDirector } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { motivoParaNoAsignarObras } from '@/shared/rules/cargos-de-obra';
import { reparoDeObrasDelAcceso } from '@/shared/rules/empresas';

/**
 * Asignar y retirar obras a un Director de Obra (spec 041, RF-13, RF-17, RF-28, RF-29, RF-31).
 * `POST /api/panel/personas/:id/obras` con `{ asignar, retirar }`.
 *
 * Por diferencia y no con la lista entera, para que dos personas que asignan a la vez obras
 * distintas no se pisen: cada una cambia solo lo que nombra. Si las dos tocan la misma obra, gana
 * la última, y la historia guarda quién asignó y quién retiró cada una.
 *
 * Retirar cierra la fila con `hasta`, no la borra (RF-30, RF-31): lo que el director registró,
 * aprobó o anuló en esa obra sigue con su nombre, y la sesión deja de mostrársela desde su
 * siguiente petición sin cerrarse (RF-29), porque la sesión lee sus obras en cada petición.
 *
 * Lo hacen el Director de Proyectos y la gerencia; el Director de Obra no, tampoco sobre sí
 * mismo (RF-28). Por eso la guardia pide `personas · escribir` y la regla decide lo demás: con
 * `activar` bastaría para que un director se asignara obras.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const persona = await personaConObras(id);
    if (!persona) return noEncontrado('esa persona');

    const noPuede = motivoParaNoAsignarObras(sesion, { id, rol: persona.rol });
    if (noPuede) {
      // Quien sí asigna obras, pero a alguien que no es Director de Obra: el pedido está mal,
      // no le falta permiso.
      const deQuien = sesion.rol === 'admin' || sesion.rol === 'director_proyectos';
      return errorDePeticion(noPuede, deQuien ? 422 : 403);
    }

    const { asignar, retirar } = await cuerpoJson(peticion, obrasDelDirector);
    if ((await obrasQueNoExisten(asignar)).length > 0) return noEncontrado('esa obra');

    // No se le quita la última (RF-18): un Director de Obra sin obras no ve nada.
    const quedan = [...persona.asignadas.filter((o) => !retirar.includes(o)), ...asignar.filter((o) => !persona.asignadas.includes(o))];
    const reparo = reparoDeObrasDelAcceso('director_obra', quedan);
    if (reparo) return Response.json({ error: reparo.mensaje, campos: { obras: reparo.mensaje } }, { status: 422 });

    const db = baseServidor();
    await ejecutarLote(db, sentenciasDeObras(db, id, { asignar, retirar }, sesion.id, new Date()));

    const despues = await personaConObras(id);
    return ok({ obras: despues?.asignadas ?? [] });
  });
}
