import { cerrarSesion, cookieDeCierre } from '@/features/auth/servidor/sesion';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * `POST /api/auth/salir`.
 *
 * Revoca la sesión en la base **y** borra la cookie del navegador. Las dos, y no
 * solo la segunda: borrar la cookie sin revocar la fila deja el token vivo, y
 * cualquiera que lo hubiera copiado antes seguiría dentro.
 *
 * No exige sesión válida. Salir cuando ya se salió tiene que funcionar, no
 * responder un error que deje al navegador sin saber qué hacer.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    await cerrarSesion(peticion);
    return ok({ ok: true }, 200, { 'Set-Cookie': cookieDeCierre() });
  });
}
