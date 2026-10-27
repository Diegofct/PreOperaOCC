import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { usuarios } from '@/db/servidor/esquema';
import { limitesDelAsistente, ponerLimite } from '@/features/asistente/servidor/uso';
import { limiteDelAsistente } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los límites del día del asistente (spec 028, RF-59): solo la gerencia.
 * `GET` los puestos; `PUT { usuarioId, limite }` pone el de todos (`usuarioId` nulo) o el
 * de una persona, y `limite` nulo lo quita.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'escribir');
    if (sesion instanceof Response) return sesion;
    return ok(await limitesDelAsistente());
  });
}

export async function PUT(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'escribir');
    if (sesion instanceof Response) return sesion;
    const { usuarioId, limite } = await cuerpoJson(peticion, limiteDelAsistente);
    if (usuarioId) {
      const [persona] = await baseServidor().select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
      if (!persona) return noEncontrado('esa persona');
    }
    await ponerLimite(usuarioId, limite, sesion.id);
    return ok(await limitesDelAsistente());
  });
}
